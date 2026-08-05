const express = require("express");
const router = express.Router();
const auditLogService = require("../services/auditLogService");
const { authenticateUser, requireRole } = require("../middleware/auth");

// Protect all audit log routes for Super Admin and Admin only
router.use(authenticateUser, requireRole("Super Admin", "Admin"));

// GET /api/admin/audit — Query audit logs with search, filters & pagination
router.get("/", async (req, res) => {
  try {
    const data = await auditLogService.getAuditLogs(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch audit logs: " + error.message });
  }
});

// GET /api/admin/audit/export — Export logs as CSV
router.get("/export", async (req, res) => {
  try {
    const data = await auditLogService.getAuditLogs({ ...req.query, limit: 1000 });
    const logs = data.logs || [];

    const headers = ["Timestamp", "User Name", "User Email", "Role", "Module", "Action", "Description", "IP Address"];
    const rows = logs.map((l) => [
      `"${new Date(l.createdAt).toISOString()}"`,
      `"${(l.userName || "").replace(/"/g, '""')}"`,
      `"${(l.userEmail || "").replace(/"/g, '""')}"`,
      `"${l.userRole || "Admin"}"`,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${l.ipAddress || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="gor_audit_logs_${new Date().toISOString().split("T")[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to export audit logs: " + error.message });
  }
});

module.exports = router;
