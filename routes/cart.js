const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// POST /api/cart/validate — Validate cart items against MongoDB
router.post("/validate", async (req, res) => {
  try {
    const { items = [] } = req.body;

    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const pId = item.productId || item.id;
      let query = { $or: [{ id: pId }, { sku: pId }] };
      if (String(pId).match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: pId });
      }

      const product = await Product.findOne(query).lean();
      if (product) {
        const qty = Number(item.quantity) || 1;
        const itemTotal = product.price * qty;
        subtotal += itemTotal;
        validatedItems.push({
          ...item,
          product: {
            ...product,
            id: product.id || product._id.toString(),
          },
          price: product.price,
          itemTotal,
          inStock: (product.stock || 0) >= qty,
        });
      }
    }

    res.json({
      success: true,
      subtotal,
      items: validatedItems,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Cart validation failed: " + error.message });
  }
});

module.exports = router;
