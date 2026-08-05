const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true, default: "System Admin" },
    userEmail: { type: String, required: true, default: "admin@gormenswear.com", index: true },
    userRole: { type: String, default: "Admin" },
    action: { type: String, required: true, index: true }, // e.g., "LOGIN", "PRODUCT_CREATE", "ORDER_STATUS_UPDATE", "SETTINGS_UPDATE"
    module: { type: String, required: true, index: true }, // e.g., "Auth", "Products", "Orders", "Inventory", "Settings", "Customers"
    description: { type: String, required: true },
    targetId: { type: String, default: null },
    targetName: { type: String, default: null },
    beforeValue: { type: mongoose.Schema.Types.Mixed, default: null },
    afterValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "Browser / Desktop" },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
