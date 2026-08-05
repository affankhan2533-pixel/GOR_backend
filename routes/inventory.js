const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");

// GET /api/admin/inventory — Dedicated True Inventory API
router.get("/", async (req, res) => {
  try {
    const { productId } = req.query;

    // Single item query
    if (productId) {
      let singleQuery = { $or: [{ id: productId }, { sku: productId }] };
      if (String(productId).match(/^[0-9a-fA-F]{24}$/)) {
        singleQuery.$or.push({ _id: productId });
      }

      const p = await Product.findOne(singleQuery).lean();
      if (!p) {
        return res.status(404).json({ success: false, error: "Inventory product not found" });
      }

      const threshold = Number(p.minStockThreshold) || 5;
      const currentStock = Number(p.stock) || 0;
      let status = "In Stock";
      if (currentStock === 0) status = "Out of Stock";
      else if (currentStock <= threshold) status = "Low Stock";

      return res.json({
        success: true,
        inventory: {
          productId: p.id || p._id.toString(),
          productName: p.name,
          sku: p.sku || `GOR-SKU-${p._id}`,
          image: p.imageUrl || (p.images && p.images[0]) || "/images/lookbook/gor-lookbook-1.webp",
          category: p.category || "General",
          collection: p.collection || "Streetwear Core",
          currentStock,
          reservedStock: 0,
          availableStock: currentStock,
          minStockThreshold: threshold,
          status,
          lastUpdated: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
        },
      });
    }

    // 1. Fetch non-archived products from MongoDB
    const products = await Product.find({ status: { $ne: "Archived" } }).lean();

    // 2. Fetch unfulfilled active orders to compute reserved stock per product
    const activeOrders = await Order.find({
      status: { $nin: ["Delivered", "Cancelled", "Fulfilled"] },
    }).lean();

    const reservedMap = new Map();
    activeOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const pIdStr = String(item.productId || item.id || "");
        const qty = Number(item.quantity) || 1;
        if (pIdStr) {
          reservedMap.set(pIdStr, (reservedMap.get(pIdStr) || 0) + qty);
        }
      });
    });

    // 3. Build inventory array
    const inventory = products.map((p) => {
      const pIdStr = p._id.toString();
      const pCustomId = p.id || "";
      const currentStock = Number(p.stock) || 0;
      const reservedStock = reservedMap.get(pIdStr) || (pCustomId ? reservedMap.get(pCustomId) : 0) || 0;
      const availableStock = Math.max(0, currentStock - reservedStock);
      const minStockThreshold = Number(p.minStockThreshold) || 5;

      let status = "In Stock";
      if (currentStock === 0) {
        status = "Out of Stock";
      } else if (currentStock <= minStockThreshold) {
        status = "Low Stock";
      }

      return {
        productId: p.id || pIdStr,
        productName: p.name,
        sku: p.sku || `GOR-SKU-${p._id}`,
        image: p.imageUrl || (p.images && p.images[0]) || "/images/lookbook/gor-lookbook-1.webp",
        category: p.category || "General",
        collection: p.collection || "Streetwear Core",
        currentStock,
        reservedStock,
        availableStock,
        minStockThreshold,
        status,
        lastUpdated: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
      };
    });

    // 4. Compute summary
    const summary = {
      total: inventory.length,
      inStock: inventory.filter((i) => i.status === "In Stock").length,
      lowStock: inventory.filter((i) => i.status === "Low Stock").length,
      outOfStock: inventory.filter((i) => i.status === "Out of Stock").length,
    };

    res.json({
      success: true,
      summary,
      inventory,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/inventory/adjust — Stock adjustment
router.post("/adjust", async (req, res) => {
  try {
    const { productId, delta, newQty, reason } = req.body;

    let query = { $or: [{ id: productId }, { sku: productId }] };
    if (String(productId).match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: productId });
    }

    const p = await Product.findOne(query);
    if (!p) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    let targetStock = Number(p.stock) || 0;
    if (newQty !== undefined) {
      targetStock = Math.max(0, Number(newQty) || 0);
    } else if (delta !== undefined) {
      targetStock = Math.max(0, targetStock + (Number(delta) || 0));
    }

    p.stock = targetStock;
    await p.save();

    res.json({
      success: true,
      product: {
        productId: p.id || p._id.toString(),
        currentStock: targetStock,
        reason: reason || "Stock adjustment",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
