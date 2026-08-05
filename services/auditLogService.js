const AuditLog = require("../models/AuditLog");

class AuditLogService {
  /**
   * Non-blocking, concurrency-safe activity logger
   */
  logActivity(req, options = {}) {
    setImmediate(async () => {
      try {
        const {
          action = "SYSTEM_EVENT",
          module = "General",
          description = "Admin action recorded",
          targetId = null,
          targetName = null,
          beforeValue = null,
          afterValue = null,
        } = options;

        const user = req?.user || {};
        const userName = user.name || req?.body?.name || "Super Admin";
        const userEmail = user.email || req?.body?.email || "superadmin@gormenswear.com";
        const userRole = user.role || "Super Admin";

        const ipAddress =
          req?.headers?.["x-forwarded-for"]?.split(",")[0] ||
          req?.socket?.remoteAddress ||
          req?.ip ||
          "127.0.0.1";

        const userAgent = req?.headers?.["user-agent"] || "GOR Admin Panel";

        await AuditLog.create({
          userName,
          userEmail,
          userRole,
          action,
          module,
          description,
          targetId,
          targetName,
          beforeValue,
          afterValue,
          ipAddress,
          userAgent,
        });

        console.log(`📋 [AUDIT LOGGED] [${module}] ${action}: ${description} (by ${userEmail})`);
      } catch (err) {
        console.error("Audit log creation error (non-blocking):", err.message);
      }
    });
  }

  /**
   * Fetch paginated audit logs with search & filtering
   */
  async getAuditLogs(opts = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      module = "all",
      action = "all",
      userEmail = "all",
      startDate,
      endDate,
    } = opts;

    const query = {};

    if (module && module !== "all") {
      query.module = module;
    }

    if (action && action !== "all") {
      query.action = action;
    }

    if (userEmail && userEmail !== "all") {
      query.userEmail = userEmail;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { userName: { $regex: q, $options: "i" } },
        { userEmail: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { targetName: { $regex: q, $options: "i" } },
        { targetId: { $regex: q, $options: "i" } },
        { action: { $regex: q, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs: logs.map((l) => ({
        ...l,
        id: l._id.toString(),
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

module.exports = new AuditLogService();
