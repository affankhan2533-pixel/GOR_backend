const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Order = require("../models/Order");

const getVipThreshold = () => Number(process.env.CRM_VIP_THRESHOLD || 1000);

// GET /api/customers/stats — Dedicated CRM Analytics Endpoint
router.get("/stats", async (req, res) => {
  try {
    const vipThreshold = getVipThreshold();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalCustomers, activeCustomers, returningCustomers, newThisMonth, customers] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: "Active" }),
      Customer.countDocuments({ ordersCount: { $gte: 2 } }),
      Customer.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Customer.find().select("totalSpent ordersCount").lean(),
    ]);

    const lifetimeRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + (c.ordersCount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? Math.round(lifetimeRevenue / totalOrders) : 0;

    res.json({
      success: true,
      stats: {
        totalCustomers,
        activeCustomers,
        returningCustomers,
        newThisMonth,
        lifetimeRevenue,
        averageOrderValue,
        vipThreshold,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch CRM stats: " + error.message });
  }
});

// GET /api/customers — List & Filter Customers
router.get("/", async (req, res) => {
  try {
    const { search, filter = "all", page = 1, limit = 100 } = req.query;
    const vipThreshold = getVipThreshold();

    const query = {};

    if (filter === "active") query.status = "Active";
    else if (filter === "inactive") query.status = "Inactive";
    else if (filter === "blocked") query.status = "Blocked";
    else if (filter === "new") query.ordersCount = { $lte: 1 };
    else if (filter === "returning" || filter === "repeat") query.ordersCount = { $gte: 2 };
    else if (filter === "vip") query.totalSpent = { $gte: vipThreshold };

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limitNum).lean(),
      Customer.countDocuments(query),
    ]);

    const formattedCustomers = customers.map((c) => {
      const ordersCount = c.ordersCount || 0;
      const totalSpent = c.totalSpent || 0;
      const aov = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
      let tier = "New";
      if (totalSpent >= vipThreshold) tier = "VIP";
      else if (ordersCount >= 2) tier = "Returning";

      return {
        ...c,
        id: c.id || c._id.toString(),
        averageOrderValue: aov,
        tier,
      };
    });

    res.json({
      success: true,
      data: formattedCustomers,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch customers: " + error.message });
  }
});

// GET /api/customers/:id — Detailed Customer Profile & Linked Order History
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let query = { $or: [{ id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const customer = await Customer.findOne(query).lean();
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    // Fetch linked orders from MongoDB
    const orders = await Order.find({
      $or: [{ customerId: customer._id }, { customerEmail: customer.email }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map((o) => ({
      ...o,
      id: o.id || o._id.toString(),
    }));

    // Construct customer timeline events
    const timeline = [
      {
        title: "Account Registered",
        description: `Customer account registered for ${customer.name}`,
        date: customer.createdAt,
      },
      ...formattedOrders.map((o) => ({
        title: `Order Placed (${o.orderNo})`,
        description: `${(o.items || []).length} item(s) • Total: ₹${o.totalAmount} • Status: ${o.status}`,
        date: o.createdAt,
      })),
      ...(customer.notes || []).map((n) => ({
        title: `Admin Note Added by ${n.author || "Admin"}`,
        description: n.content,
        date: n.createdAt,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const vipThreshold = getVipThreshold();
    const ordersCount = formattedOrders.length || customer.ordersCount || 0;
    const totalSpent = formattedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || customer.totalSpent || 0;
    const aov = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
    const lastOrderDate = formattedOrders.length > 0 ? formattedOrders[0].createdAt : customer.lastOrderDate || "No orders yet";

    let tier = "New";
    if (totalSpent >= vipThreshold) tier = "VIP";
    else if (ordersCount >= 2) tier = "Returning";

    res.json({
      success: true,
      customer: {
        ...customer,
        id: customer.id || customer._id.toString(),
        ordersCount,
        totalSpent,
        lifetimeValue: totalSpent,
        averageOrderValue: aov,
        lastOrderDate,
        tier,
        orders: formattedOrders,
        timeline,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch customer profile: " + error.message });
  }
});

// PUT /api/customers/:id — Update Customer Details / Status
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let query = { $or: [{ id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    const { name, email, phone, status, addresses } = req.body;

    if (name) customer.name = name.trim();
    if (email) customer.email = email.trim().toLowerCase();
    if (phone !== undefined) customer.phone = phone;
    if (status && ["Active", "Inactive", "Blocked"].includes(status)) {
      customer.status = status;
    }
    if (Array.isArray(addresses)) {
      customer.addresses = addresses;
    }

    const updated = await customer.save();

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer: {
        ...updated.toObject(),
        id: updated.id || updated._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update customer: " + error.message });
  }
});

// POST /api/customers/:id/notes — Append-Only Note Addition
router.post("/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const { content, author } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Note content is required" });
    }

    let query = { $or: [{ id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    const newNote = {
      content: content.trim(),
      author: author || "Admin",
      createdAt: new Date(),
    };

    customer.notes.push(newNote);
    await customer.save();

    res.status(201).json({
      success: true,
      message: "Note added successfully",
      notes: customer.notes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add note: " + error.message });
  }
});

// DELETE /api/customers/:id/notes/:noteId — Delete Note
router.delete("/:id/notes/:noteId", async (req, res) => {
  try {
    const { id, noteId } = req.params;

    let query = { $or: [{ id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    customer.notes = customer.notes.filter((n) => n._id.toString() !== noteId);
    await customer.save();

    res.json({
      success: true,
      message: "Note removed successfully",
      notes: customer.notes,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete note: " + error.message });
  }
});

module.exports = router;
