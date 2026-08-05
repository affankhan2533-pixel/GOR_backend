const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    store: {
      storeName: { type: String, default: "GOR MENSWEAR" },
      brandName: { type: String, default: "GOR LONDON" },
      email: { type: String, default: "concierge@gormenswear.com" },
      phone: { type: String, default: "+44 20 7946 0912" },
      address: { type: String, default: "28 Savile Row, Mayfair, London W1S 3PR, UK" },
      gstNumber: { type: String, default: "GB 987 6543 21" },
      currency: { type: String, default: "INR" },
      timezone: { type: String, default: "Asia/Kolkata" },
      storeLogo: { type: String, default: "" },
      favicon: { type: String, default: "" },
    },
    notifications: {
      newOrderAlerts: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: true },
      customerRegAlerts: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },
    shipping: {
      flatCharge: { type: Number, default: 500 },
      freeThreshold: { type: Number, default: 15000 },
      methods: [
        {
          id: { type: String },
          name: { type: String },
          estimatedDays: { type: String },
          price: { type: Number },
          enabled: { type: Boolean, default: true },
        },
      ],
    },
    taxes: {
      taxPercentage: { type: Number, default: 18 },
      taxName: { type: String, default: "GST / VAT" },
      taxEnabled: { type: Boolean, default: true },
    },
    backup: {
      lastBackupTime: { type: Date, default: Date.now },
      backupStatus: { type: String, default: "Successful" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
