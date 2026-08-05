const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { createOrderService } = require("../services/createOrderService");

// GET /api/orders — List & Filter Orders
router.get("/", async (req, res) => {
  try {
    const { search, status, paymentStatus, startDate, endDate, page = 1, limit = 100 } = req.query;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { orderNo: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } },
        { customerEmail: { $regex: q, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    const formattedOrders = orders.map((o) => ({
      ...o,
      id: o.id || o._id.toString(),
    }));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch orders from MongoDB: " + error.message });
  }
});

// GET /api/orders/:id — Single Order Details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let query = { $or: [{ orderNo: id }, { id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const order = await Order.findOne(query).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({
      success: true,
      order: {
        ...order,
        id: order.id || order._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch order detail: " + error.message });
  }
});

// POST /api/orders — Create Order via createOrderService
router.post("/", async (req, res) => {
  try {
    const order = await createOrderService(req.body);
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    const isValidationError = error.message.includes("Insufficient stock") || error.message.includes("required");
    const statusCode = isValidationError ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/orders/:id — Update Status / Payment Status with Automatic Timeline & Idempotent Stock Restoration
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, paymentStatus: newPaymentStatus, note } = req.body;

    let query = { $or: [{ orderNo: id }, { id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const prevStatus = order.status;

    if (newStatus && newStatus !== order.status) {
      order.status = newStatus;
      // Auto-generate backend timeline entry
      order.timeline.push({
        status: newStatus,
        note: note || `Order status updated to ${newStatus}`,
        date: new Date(),
      });
    }

    if (newPaymentStatus) {
      order.paymentStatus = newPaymentStatus;
    }

    // IDEMPOTENT Stock Restoration on Cancellation
    if (newStatus === "Cancelled" && !order.stockRestored) {
      for (const item of order.items || []) {
        const qty = Number(item.quantity) || 1;
        if (item.productId) {
          await Product.updateOne({ _id: item.productId }, { $inc: { stock: qty } });
        } else if (item.sku) {
          await Product.updateOne({ sku: item.sku }, { $inc: { stock: qty } });
        }
      }
      order.stockRestored = true;

      // Adjust customer total spent on cancellation
      if (order.customerId) {
        await Customer.updateOne(
          { _id: order.customerId },
          { $inc: { totalSpent: -Math.max(0, order.totalAmount) } }
        );
      }
    }

    const updatedOrder = await order.save();

    // Async non-blocking Email Status Update & Audit Log
    if (newStatus && newStatus !== prevStatus) {
      try {
        const emailService = require("../services/emailService");
        emailService.sendOrderStatusEmail(updatedOrder, newStatus);
      } catch (emailErr) {
        console.warn("Status update email error (non-blocking):", emailErr.message);
      }

      try {
        const auditLogService = require("../services/auditLogService");
        auditLogService.logActivity(req, {
          action: "ORDER_STATUS_CHANGED",
          module: "Orders",
          description: `Order ${updatedOrder.orderNo} status updated to ${newStatus}`,
          targetId: updatedOrder.orderNo,
          targetName: updatedOrder.customerName,
          beforeValue: { status: prevStatus },
          afterValue: { status: newStatus },
        });
      } catch (aErr) {}
    }

    res.json({
      success: true,
      message: "Order updated successfully",
      order: {
        ...updatedOrder.toObject(),
        id: updatedOrder.id || updatedOrder._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update order: " + error.message });
  }
});

// POST /api/orders/bulk-status — Bulk Update Status for Multiple Orders
router.post("/bulk-status", async (req, res) => {
  try {
    const { orderIds, status: newStatus, note } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0 || !newStatus) {
      return res.status(400).json({ success: false, error: "orderIds array and newStatus are required" });
    }

    const updatedOrders = [];
    for (const id of orderIds) {
      let query = { $or: [{ orderNo: id }, { id: id }] };
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: id });
      }

      const order = await Order.findOne(query);
      if (order) {
        if (order.status !== newStatus) {
          order.status = newStatus;
          order.timeline.push({
            status: newStatus,
            note: note || `Bulk status update to ${newStatus}`,
            date: new Date(),
          });

          if (newStatus === "Cancelled" && !order.stockRestored) {
            for (const item of order.items || []) {
              const qty = Number(item.quantity) || 1;
              if (item.productId) {
                await Product.updateOne({ _id: item.productId }, { $inc: { stock: qty } });
              } else if (item.sku) {
                await Product.updateOne({ sku: item.sku }, { $inc: { stock: qty } });
              }
            }
            order.stockRestored = true;
          }

          const saved = await order.save();
          updatedOrders.push(saved);
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${updatedOrders.length} order(s)`,
      count: updatedOrders.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Bulk status update failed: " + error.message });
  }
});

// POST /api/orders/:id/notes — Add Internal Admin Note
router.post("/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author = "Admin" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "Note text is required" });
    }

    let query = { $or: [{ orderNo: id }, { id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const newNote = {
      id: "note-" + Date.now(),
      text: text.trim(),
      author: author.trim(),
      createdAt: new Date(),
    };

    if (!order.notes) order.notes = [];
    order.notes.push(newNote);

    const savedOrder = await order.save();

    res.status(201).json({
      success: true,
      message: "Note added successfully",
      note: newNote,
      order: {
        ...savedOrder.toObject(),
        id: savedOrder.id || savedOrder._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add order note: " + error.message });
  }
});

// PATCH /api/orders/:id/status — Alias for status update
router.patch("/:id/status", async (req, res) => {
  return router.handle(req, res);
});

module.exports = router;
