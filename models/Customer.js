const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, default: "" },
    ordersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Blocked"],
      default: "Active",
      index: true,
    },
    addresses: [
      {
        label: { type: String, default: "Default Address" },
        address: String,
        city: String,
        state: String,
        zip: String,
        country: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    notes: [
      {
        content: { type: String, required: true },
        author: { type: String, default: "Admin" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastOrderDate: { type: Date, default: null },
  },
  { timestamps: true }
);

customerSchema.index({ ordersCount: -1, totalSpent: -1 });
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
