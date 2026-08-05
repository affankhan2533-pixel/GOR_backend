const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

// GET /api/admin/dashboard — Real MongoDB counts and aggregation
router.get("/", async (req, res) => {
  try {
    const activeProducts = await Product.find({ status: { $ne: "Archived" } }).lean();
    const totalProducts = activeProducts.length;

    const lowStockCount = activeProducts.filter(
      (p) => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (Number(p.minStockThreshold) || 5)
    ).length;

    const outOfStockCount = activeProducts.filter((p) => (Number(p.stock) || 0) === 0).length;

    const [totalOrders, totalCustomers, revenueAggregation] = await Promise.all([
      Order.countDocuments({}),
      Customer.countDocuments({}),
      Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: null, monthlyRevenue: { $sum: "$totalAmount" } } },
      ]),
    ]);

    const monthlyRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].monthlyRevenue : 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalOrders,
        totalCustomers,
        monthlyRevenue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to compute dashboard metrics: " + err.message });
  }
});

module.exports = router;
