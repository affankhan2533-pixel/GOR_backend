const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, index: true },
    customerPhone: { type: String, default: "" },
    shippingAddress: {
      address: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        sku: String,
        price: Number,
        quantity: Number,
        itemTotal: Number,
        image: String,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Processing", "New", "Fulfilled"],
      default: "Pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
      index: true,
    },
    paymentMethod: { type: String, default: "cod" },
    timeline: [
      {
        status: { type: String, required: true },
        note: { type: String, default: "" },
        date: { type: Date, default: Date.now },
      },
    ],
    notes: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        author: { type: String, default: "Admin" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Performance Indexes for Aggregation Queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ "items.productId": 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
