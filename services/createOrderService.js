const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Counter = require("../models/Counter");

/**
 * Generate concurrency-safe sequential order number (e.g. GOR-YYYYMMDD-0001)
 */
async function getNextOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const counterId = `orders_${dateStr}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqPadded = String(counter.seq).padStart(4, "0");
  return `GOR-${dateStr}-${seqPadded}`;
}

/**
 * Single source of truth for all order creation in GOR MENSWEAR
 */
async function createOrderService(payload) {
  const {
    customerName,
    customerEmail,
    customerPhone = "",
    shippingAddress = {},
    items = [],
    subtotal,
    discount = 0,
    shippingFee = 0,
    tax = 0,
    totalAmount,
    paymentMethod = "Credit Card",
    paymentStatus = "Paid",
    status = "Pending",
  } = payload;

  if (!customerName || !customerEmail) {
    throw new Error("Customer name and email are required to create an order");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  // STEP 1: Validate Stock for ALL products before performing any mutations
  const productDocs = [];
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    let query = {};
    if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
      query._id = item.productId;
    } else if (item.sku) {
      query.sku = item.sku;
    } else if (item.id && mongoose.Types.ObjectId.isValid(item.id)) {
      query._id = item.id;
    } else {
      query.name = item.name;
    }

    const product = await Product.findOne(query);
    if (!product) {
      throw new Error(`Product not found for item: ${item.name || item.sku}`);
    }

    if (product.stock < qty) {
      throw new Error(
        `Insufficient stock for product '${product.name}'. Available: ${product.stock}, requested: ${qty}`
      );
    }

    productDocs.push({ product, quantity: qty, itemPayload: item });
  }

  // STEP 2: Concurrency-Safe Order Number Generation
  const orderNo = await getNextOrderNumber();

  // STEP 3: Stock Deduction with Rollback Protection
  const successfulDeductions = [];
  try {
    for (const { product, quantity } of productDocs) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        throw new Error(`Stock validation conflict for product '${product.name}'. Please try again.`);
      }

      successfulDeductions.push({ productId: product._id, quantity });
    }
  } catch (deductError) {
    // Roll back any completed stock deductions
    for (const rollback of successfulDeductions) {
      await Product.updateOne(
        { _id: rollback.productId },
        { $inc: { stock: rollback.quantity } }
      );
    }
    throw deductError;
  }

  // STEP 4: Link Customer & Update Stats
  let dbCustomer = null;
  try {
    dbCustomer = await Customer.findOne({ email: customerEmail.trim() });
    const orderTotal = totalAmount !== undefined ? Number(totalAmount) : Number(subtotal || 0);

    if (!dbCustomer) {
      dbCustomer = await Customer.create({
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone || "",
        ordersCount: 1,
        totalSpent: orderTotal,
      });
    } else {
      dbCustomer.ordersCount = (dbCustomer.ordersCount || 0) + 1;
      dbCustomer.totalSpent = (dbCustomer.totalSpent || 0) + orderTotal;
      if (customerPhone) dbCustomer.phone = customerPhone;
      await dbCustomer.save();
    }
  } catch (custErr) {
    console.warn("Customer stats update non-fatal error:", custErr.message);
  }

  // STEP 5 & 6: Map Items, Initial Timeline, & Create Order
  const formattedItems = productDocs.map(({ product, quantity, itemPayload }) => ({
    productId: product._id,
    name: product.name,
    sku: product.sku,
    price: itemPayload.price !== undefined ? Number(itemPayload.price) : product.price,
    quantity,
    itemTotal:
      (itemPayload.price !== undefined ? Number(itemPayload.price) : product.price) * quantity,
    image: product.imageUrl || (product.images && product.images[0]) || "/images/lookbook/gor-lookbook-1.webp",
  }));

  const calculatedSubtotal = subtotal !== undefined ? Number(subtotal) : formattedItems.reduce((acc, i) => acc + i.itemTotal, 0);
  const calculatedTotal = totalAmount !== undefined ? Number(totalAmount) : calculatedSubtotal + Number(shippingFee) + Number(tax) - Number(discount);

  const initialTimeline = [
    {
      status,
      note: "Order created successfully",
      date: new Date(),
    },
  ];

  const newOrder = new Order({
    orderNo,
    customerId: dbCustomer ? dbCustomer._id : null,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim(),
    customerPhone: customerPhone || "",
    shippingAddress: {
      address: shippingAddress.address || "Main Address",
      city: shippingAddress.city || "Mayfair",
      state: shippingAddress.state || "London",
      zip: shippingAddress.zip || "W1K 2RH",
      country: shippingAddress.country || "United Kingdom",
    },
    items: formattedItems,
    subtotal: calculatedSubtotal,
    discount: Number(discount || 0),
    shippingFee: Number(shippingFee || 0),
    tax: Number(tax || 0),
    totalAmount: calculatedTotal,
    status,
    paymentStatus,
    paymentMethod,
    timeline: initialTimeline,
    stockRestored: false,
  });

  const savedOrder = await newOrder.save();

  // Async non-blocking Email Notifications
  try {
    const emailService = require("./emailService");
    emailService.sendOrderConfirmationEmail(savedOrder);
    emailService.sendAdminNewOrderAlert(savedOrder);

    // Check for low stock items to alert admin
    const lowStockItems = productDocs
      .filter(({ product, quantity }) => product.stock - quantity <= 5)
      .map(({ product, quantity }) => ({ name: product.name, stock: product.stock - quantity }));
    if (lowStockItems.length > 0) {
      emailService.sendAdminLowStockAlert(lowStockItems);
    }
  } catch (emailErr) {
    console.warn("Email notification error (non-blocking):", emailErr.message);
  }

  return {
    ...savedOrder.toObject(),
    id: savedOrder.id || savedOrder._id.toString(),
  };
}

module.exports = { createOrderService, getNextOrderNumber };
