const express = require("express");
const router = express.Router();
const { createOrderService } = require("../services/createOrderService");

// POST /api/checkout — Handle customer storefront checkout & order creation
router.post("/", async (req, res) => {
  try {
    const { customer = {}, cart = {}, paymentMethod = "cod" } = req.body;

    if (!customer.email || !customer.firstName || !customer.address) {
      return res.status(400).json({ success: false, error: "Missing required customer details (email, name, or address)." });
    }

    const customerName = `${customer.firstName} ${customer.lastName || ""}`.trim();

    const orderItems = (cart.items || []).map((item) => ({
      productId: item.product?._id || item.productId || item.product?.id || item.id || null,
      name: item.product?.name || item.name || "GARMENT",
      sku: item.product?.sku || item.sku || "GOR-SKU",
      price: item.price !== undefined ? Number(item.price) : item.product?.price || 0,
      quantity: Number(item.quantity) || 1,
      image: item.image || item.product?.imageUrl || (item.product?.images && item.product?.images[0]) || "/images/lookbook/gor-lookbook-1.webp",
    }));

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, error: "Your bag is empty. Please add items to checkout." });
    }

    // Determine payment status based on payment method
    const isCod = paymentMethod.toLowerCase().includes("cod") || paymentMethod.toLowerCase().includes("cash");
    const paymentStatus = isCod ? "Pending" : "Paid";

    // Format human-readable payment method name
    let formattedPaymentMethod = "Cash on Delivery (COD)";
    if (paymentMethod === "upi") formattedPaymentMethod = "Instant UPI";
    else if (paymentMethod === "credit-card") formattedPaymentMethod = "Credit / Debit Card";
    else if (paymentMethod === "net-banking") formattedPaymentMethod = "Net Banking";
    else if (paymentMethod) formattedPaymentMethod = paymentMethod;

    const discountVal = cart.discountAmount !== undefined ? Number(cart.discountAmount) : Number(cart.discount || 0);
    const shippingVal = cart.shippingFee !== undefined ? Number(cart.shippingFee) : Number(cart.shipping || 0);
    const taxVal = Number(cart.tax || 0);
    const subtotalVal = Number(cart.subtotal || 0);
    const totalVal = cart.grandTotal !== undefined ? Number(cart.grandTotal) : cart.total !== undefined ? Number(cart.total) : subtotalVal + shippingVal + taxVal - discountVal;

    const orderPayload = {
      customerName,
      customerEmail: customer.email.trim().toLowerCase(),
      customerPhone: customer.phone || "",
      shippingAddress: {
        address: customer.address,
        city: customer.city || "Mayfair",
        state: customer.state || "London",
        zip: customer.zip || "W1K 2RH",
        country: customer.country || "United Kingdom",
      },
      items: orderItems,
      subtotal: subtotalVal,
      discount: discountVal,
      shippingFee: shippingVal,
      tax: taxVal,
      totalAmount: Math.max(0, totalVal),
      status: "Pending",
      paymentStatus,
      paymentMethod: formattedPaymentMethod,
    };

    const newOrder = await createOrderService(orderPayload);

    const estimatedDelivery = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully in MongoDB",
      order: {
        id: newOrder.id || newOrder._id?.toString(),
        orderId: newOrder.orderNo,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
        totalAmount: newOrder.totalAmount,
        date: newOrder.createdAt,
        estimatedDelivery,
        customer,
        cart,
        paymentMethod: formattedPaymentMethod,
      },
    });
  } catch (error) {
    console.error("Checkout route error:", error);
    const isValidationError = error.message.includes("stock") || error.message.includes("required") || error.message.includes("Conflict");
    const statusCode = isValidationError ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

module.exports = router;
