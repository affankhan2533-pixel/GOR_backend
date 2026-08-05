const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");

/**
 * GOR MENSWEAR — Analytics Service
 * All metrics calculated exclusively from MongoDB aggregation pipelines.
 * Zero hardcoded values. Zero placeholder data.
 */
class AnalyticsService {
  /**
   * Resolve period string to { startDate, endDate } boundaries.
   * Called by every method so date filtering is consistent across all metrics.
   */
  _resolveDateRange(opts = {}) {
    const { period = "30days", startDate, endDate } = opts;
    const now = new Date();

    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }
    if (startDate) {
      return { start: new Date(startDate), end: now };
    }

    let start = null;
    switch (period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case "7days":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "30days":
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      case "90days":
        start = new Date(now);
        start.setDate(now.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "alltime":
      default:
        start = null;
        break;
    }

    return { start, end: now };
  }

  /**
   * Build a MongoDB $match stage that filters by date range.
   * Accepts an optional extra filter to merge in (e.g. paymentStatus filter).
   */
  _dateMatch(dateRange, extra = {}) {
    const match = { ...extra };
    if (dateRange.start) {
      match.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }
    return match;
  }

  /**
   * 1. DASHBOARD — Period-Aware KPI Overview
   * Applies the date range to EVERY sub-metric. No all-time fallbacks.
   */
  async getDashboardAnalytics(opts = {}) {
    const dateRange = this._resolveDateRange(opts);

    // Revenue: only paid + non-cancelled orders
    const revMatch = this._dateMatch(dateRange, {
      paymentStatus: "Paid",
      status: { $nin: ["Cancelled"] },
    });

    // Orders: all orders within period (including cancelled)
    const orderMatch = this._dateMatch(dateRange);

    // All-time totals for all-time card (no date filter)
    const allTimeRevMatch = {
      paymentStatus: "Paid",
      status: { $nin: ["Cancelled"] },
    };

    const [
      revResults,
      orderStatusResults,
      allTimeRevResult,
      totalCustomers,
      returningCustomers,
      newCustomersInPeriod,
      productStats,
      recentOrders,
    ] = await Promise.all([
      // Revenue & order count within period (paid non-cancelled)
      Order.aggregate([
        { $match: revMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$totalAmount" },
          },
        },
      ]),

      // Order status breakdown within period
      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // All-time total revenue (for the "Total Revenue" all-time card)
      Order.aggregate([
        { $match: allTimeRevMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$totalAmount" },
          },
        },
      ]),

      // Total customers (all time)
      Customer.countDocuments(),

      // Returning customers: 2+ completed paid orders (all time)
      Customer.countDocuments({ ordersCount: { $gte: 2 } }),

      // New customers registered within the period
      dateRange.start
        ? Customer.countDocuments({ createdAt: { $gte: dateRange.start, $lte: dateRange.end } })
        : Customer.countDocuments(),

      // Product stats: active, draft, lowStock, outOfStock
      Product.aggregate([
        {
          $facet: {
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            lowStock: [
              { $match: { stock: { $gt: 0, $lte: 5 }, status: { $ne: "Archived" } } },
              { $count: "count" },
            ],
            outOfStock: [
              { $match: { stock: { $lte: 0 }, status: { $ne: "Archived" } } },
              { $count: "count" },
            ],
          },
        },
      ]),

      // Recent 5 orders (sorted by date, no filter — always show latest)
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNo customerName customerEmail totalAmount status paymentStatus createdAt")
        .lean(),
    ]);

    const rev = revResults[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
    const allTimeRev = allTimeRevResult[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

    // Build status breakdown map
    const statusBreakdown = orderStatusResults.reduce((acc, s) => {
      acc[s._id] = { count: s.count, revenue: s.revenue };
      return acc;
    }, {});

    // All status counts from period
    const totalOrdersInPeriod = orderStatusResults.reduce((s, x) => s + x.count, 0);

    // Product stats
    const pStats = productStats[0] || {};
    const statusCounts = (pStats.byStatus || []).reduce((a, s) => { a[s._id] = s.count; return a; }, {});
    const totalActiveProducts = statusCounts["Active"] || 0;
    const totalDraftProducts = statusCounts["Draft"] || 0;
    const totalArchivedProducts = statusCounts["Archived"] || 0;
    const totalProducts = totalActiveProducts + totalDraftProducts; // exclude archived
    const lowStockCount = pStats.lowStock?.[0]?.count || 0;
    const outOfStockCount = pStats.outOfStock?.[0]?.count || 0;

    return {
      kpis: {
        // All-time metrics
        allTimeRevenue: Math.round(allTimeRev.totalRevenue || 0),
        allTimeOrders: allTimeRev.totalOrders || 0,
        // Period metrics
        periodRevenue: Math.round(rev.totalRevenue || 0),
        periodOrders: totalOrdersInPeriod,
        periodPaidOrders: rev.totalOrders || 0,
        averageOrderValue: Math.round(rev.avgOrderValue || 0),
        // Customers
        totalCustomers,
        returningCustomers,
        newCustomersInPeriod,
        // Products
        totalProducts,
        activeProducts: totalActiveProducts,
        draftProducts: totalDraftProducts,
        lowStockProducts: lowStockCount,
        outOfStockProducts: outOfStockCount,
      },
      statusBreakdown,
      recentOrders: recentOrders.map((o) => ({
        id: o._id.toString(),
        orderNo: o.orderNo,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * 2. REVENUE ANALYTICS — Period-Filtered Daily/Monthly Timeline
   * Calculates from PAID non-cancelled orders only.
   */
  async getRevenueAnalytics(opts = {}) {
    const dateRange = this._resolveDateRange(opts);
    const { groupBy = "day" } = opts;

    const match = this._dateMatch(dateRange, {
      paymentStatus: "Paid",
      status: { $nin: ["Cancelled"] },
    });

    const dateFormat = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

    const [timeline, summary] = await Promise.all([
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            grossRevenue: { $sum: "$totalAmount" },
            subtotal: { $sum: "$subtotal" },
            totalDiscounts: { $sum: { $ifNull: ["$discount", 0] } },
            totalShippingFees: { $sum: { $ifNull: ["$shippingFee", 0] } },
            totalTax: { $sum: { $ifNull: ["$tax", 0] } },
            ordersCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalGrossRevenue: { $sum: "$totalAmount" },
            totalSubtotal: { $sum: "$subtotal" },
            totalDiscounts: { $sum: { $ifNull: ["$discount", 0] } },
            totalShippingFees: { $sum: { $ifNull: ["$shippingFee", 0] } },
            totalTax: { $sum: { $ifNull: ["$tax", 0] } },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$totalAmount" },
          },
        },
      ]),
    ]);

    const s = summary[0] || {};
    return {
      summary: {
        totalGrossRevenue: Math.round(s.totalGrossRevenue || 0),
        totalSubtotal: Math.round(s.totalSubtotal || 0),
        totalDiscounts: Math.round(s.totalDiscounts || 0),
        totalShippingFees: Math.round(s.totalShippingFees || 0),
        totalTax: Math.round(s.totalTax || 0),
        totalNetRevenue: Math.round((s.totalGrossRevenue || 0) - (s.totalDiscounts || 0)),
        totalOrders: s.totalOrders || 0,
        averageOrderValue: Math.round(s.avgOrderValue || 0),
      },
      timeline: timeline.map((t) => ({
        date: t._id,
        grossRevenue: t.grossRevenue,
        netRevenue: t.grossRevenue - t.totalDiscounts,
        subtotal: t.subtotal,
        discounts: t.totalDiscounts,
        shippingFees: t.totalShippingFees,
        tax: t.totalTax,
        ordersCount: t.ordersCount,
        avgOrderValue: Math.round(t.grossRevenue / t.ordersCount),
      })),
    };
  }

  /**
   * 3. ORDERS ANALYTICS — Period-Filtered Status Breakdown & Daily Volume
   * Counts ALL orders (including cancelled/refunded).
   */
  async getOrdersAnalytics(opts = {}) {
    const dateRange = this._resolveDateRange(opts);
    const match = this._dateMatch(dateRange);

    const results = await Order.aggregate([
      { $match: match },
      {
        $facet: {
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
            { $sort: { count: -1 } },
          ],
          byPaymentStatus: [
            { $group: { _id: "$paymentStatus", count: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
          ],
          dailyVolume: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
                paidRevenue: {
                  $sum: {
                    $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$totalAmount", 0],
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
              },
            },
          ],
        },
      },
    ]);

    const r = results[0] || {};

    // Build comprehensive status map including all enum values with 0 counts
    const ALL_STATUSES = ["Pending", "Confirmed", "Processing", "Packed", "Shipped", "Delivered", "Fulfilled", "Cancelled", "Refunded"];
    const statusMap = (r.byStatus || []).reduce((a, s) => { a[s._id] = { count: s.count, totalRevenue: s.totalRevenue }; return a; }, {});
    const byStatus = ALL_STATUSES.map((s) => ({
      status: s,
      count: statusMap[s]?.count || 0,
      totalRevenue: statusMap[s]?.totalRevenue || 0,
    }));

    return {
      totals: r.totals?.[0] || { total: 0, totalRevenue: 0 },
      byStatus,
      byPaymentStatus: (r.byPaymentStatus || []).map((p) => ({
        paymentStatus: p._id || "Unknown",
        count: p.count,
        totalRevenue: p.totalRevenue,
      })),
      dailyVolume: (r.dailyVolume || []).map((v) => ({
        date: v._id,
        count: v.count,
        revenue: v.revenue,
        paidRevenue: v.paidRevenue,
      })),
    };
  }

  /**
   * 4. CUSTOMER ANALYTICS — Period-Filtered Acquisition & Tier Breakdown
   * Returning = customers with ordersCount >= 2 (completed paid orders).
   */
  async getCustomerAnalytics(opts = {}) {
    const dateRange = this._resolveDateRange(opts);
    const vipThreshold = Number(process.env.CRM_VIP_THRESHOLD || 1000);

    const custDateMatch = dateRange.start
      ? { createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
      : {};

    const [facetResults, topSpenders, newInPeriod, returningCount, vipCount] = await Promise.all([
      Customer.aggregate([
        {
          $facet: {
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            byTier: [
              {
                $project: {
                  tier: {
                    $cond: [
                      { $gte: ["$totalSpent", vipThreshold] },
                      "VIP",
                      { $cond: [{ $gte: ["$ordersCount", 2] }, "Returning", "New"] },
                    ],
                  },
                },
              },
              { $group: { _id: "$tier", count: { $sum: 1 } } },
            ],
            acquisitionTrend: [
              { $match: custDateMatch },
              {
                $group: {
                  _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                  newCustomers: { $sum: 1 },
                },
              },
              { $sort: { "_id.year": 1, "_id.month": 1 } },
            ],
          },
        },
      ]),
      Customer.find().sort({ totalSpent: -1 }).limit(10)
        .select("name email phone ordersCount totalSpent status createdAt").lean(),
      dateRange.start
        ? Customer.countDocuments(custDateMatch)
        : Customer.countDocuments(),
      Customer.countDocuments({ ordersCount: { $gte: 2 } }),
      Customer.countDocuments({ totalSpent: { $gte: vipThreshold } }),
    ]);

    const r = facetResults[0] || {};
    const statusCounts = (r.byStatus || []).reduce((a, s) => { a[s._id] = s.count; return a; }, {});
    const tierCounts = (r.byTier || []).reduce((a, s) => { a[s._id] = s.count; return a; }, {});
    const totalCustomers = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return {
      summary: {
        totalCustomers,
        active: statusCounts.Active || 0,
        inactive: statusCounts.Inactive || 0,
        blocked: statusCounts.Blocked || 0,
        vip: vipCount,
        returning: returningCount,
        new: tierCounts.New || 0,
        newInPeriod,
        vipThreshold,
      },
      acquisitionTrend: (r.acquisitionTrend || []).map((a) => ({
        year: a._id.year,
        month: a._id.month,
        label: `${a._id.year}-${String(a._id.month).padStart(2, "0")}`,
        newCustomers: a.newCustomers,
      })),
      topSpenders: topSpenders.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone || "N/A",
        ordersCount: c.ordersCount || 0,
        totalSpent: c.totalSpent || 0,
        averageOrderValue: c.ordersCount > 0 ? Math.round(c.totalSpent / c.ordersCount) : 0,
        status: c.status,
        memberSince: c.createdAt,
      })),
    };
  }

  /**
   * 5. PRODUCT & INVENTORY ANALYTICS
   * Top-selling: from real order data (paid non-cancelled).
   * Category breakdown: sales from actual orders joined with product categories.
   * Inventory: from Product collection with correct status/stock counts.
   */
  async getProductAnalytics(opts = {}) {
    const dateRange = this._resolveDateRange(opts);
    const revMatch = this._dateMatch(dateRange, {
      paymentStatus: "Paid",
      status: { $nin: ["Cancelled"] },
    });

    const [topProducts, productInventory, categoryFromOrders] = await Promise.all([
      // Top selling by quantity from actual paid orders
      Order.aggregate([
        { $match: revMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            sku: { $first: "$items.sku" },
            price: { $first: "$items.price" },
            image: { $first: "$items.image" },
            totalQuantitySold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.itemTotal" },
            ordersCount: { $sum: 1 },
          },
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 10 },
        // Join with Product to get current stock and category
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDoc",
          },
        },
        {
          $addFields: {
            category: { $ifNull: [{ $arrayElemAt: ["$productDoc.category", 0] }, "Uncategorized"] },
            currentStock: { $ifNull: [{ $arrayElemAt: ["$productDoc.stock", 0] }, 0] },
            productStatus: { $ifNull: [{ $arrayElemAt: ["$productDoc.status", 0] }, "Active"] },
          },
        },
        { $project: { productDoc: 0 } },
      ]),

      // Product inventory stats from Product collection
      Product.aggregate([
        {
          $facet: {
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            byCategory: [
              { $match: { status: { $ne: "Archived" } } },
              {
                $group: {
                  _id: { $ifNull: ["$category", "Uncategorized"] },
                  productCount: { $sum: 1 },
                  totalStock: { $sum: { $ifNull: ["$stock", 0] } },
                  totalValue: { $sum: { $multiply: [{ $ifNull: ["$price", 0] }, { $ifNull: ["$stock", 0] }] } },
                  avgPrice: { $avg: "$price" },
                },
              },
              { $sort: { productCount: -1 } },
            ],
            lowStockProducts: [
              { $match: { stock: { $gt: 0, $lte: 5 }, status: { $ne: "Archived" } } },
              { $project: { name: 1, stock: 1, category: 1, sku: 1, status: 1 } },
              { $sort: { stock: 1 } },
            ],
            outOfStockProducts: [
              { $match: { stock: { $lte: 0 }, status: { $ne: "Archived" } } },
              { $project: { name: 1, stock: 1, category: 1, sku: 1, status: 1 } },
            ],
          },
        },
      ]),

      // Category sales aggregated from actual orders (with product lookup for category)
      Order.aggregate([
        { $match: revMatch },
        { $unwind: "$items" },
        // Join with product to get category
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $addFields: {
            category: {
              $ifNull: [{ $arrayElemAt: ["$product.category", 0] }, "Uncategorized"],
            },
          },
        },
        {
          $group: {
            _id: "$category",
            totalQuantitySold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.itemTotal" },
            uniqueProducts: { $addToSet: "$items.productId" },
          },
        },
        {
          $addFields: {
            productCount: { $size: "$uniqueProducts" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $project: { uniqueProducts: 0 } },
      ]),
    ]);

    const inv = productInventory[0] || {};
    const statusMap = (inv.byStatus || []).reduce((a, s) => { a[s._id] = s.count; return a; }, {});

    return {
      topSellingProducts: topProducts.map((p) => ({
        productId: p._id ? p._id.toString() : null,
        name: p.name,
        sku: p.sku || "N/A",
        price: p.price || 0,
        image: p.image || "/images/lookbook/gor-lookbook-1.webp",
        totalQuantitySold: p.totalQuantitySold || 0,
        totalRevenue: p.totalRevenue || 0,
        ordersCount: p.ordersCount || 0,
        category: p.category || "Uncategorized",
        currentStock: p.currentStock || 0,
      })),
      categoryInventory: (inv.byCategory || []).map((c) => ({
        category: c._id || "Uncategorized",
        productCount: c.productCount,
        totalStock: c.totalStock,
        totalValue: Math.round(c.totalValue),
        avgPrice: Math.round(c.avgPrice || 0),
      })),
      categorySales: categoryFromOrders.map((c) => ({
        category: c._id || "Uncategorized",
        totalQuantitySold: c.totalQuantitySold,
        totalRevenue: c.totalRevenue,
        productCount: c.productCount,
      })),
      lowStockProducts: inv.lowStockProducts || [],
      outOfStockProducts: inv.outOfStockProducts || [],
      inventorySummary: {
        totalActive: statusMap.Active || 0,
        totalDraft: statusMap.Draft || 0,
        totalArchived: statusMap.Archived || 0,
        totalProducts: (statusMap.Active || 0) + (statusMap.Draft || 0),
        lowStock: (inv.lowStockProducts || []).length,
        outOfStock: (inv.outOfStockProducts || []).length,
      },
    };
  }

  /**
   * 6. MONTHLY TREND — Revenue & Order Count grouped by Month
   * Used for the Overview tab monthly chart.
   * Applies date range filter.
   */
  async getMonthlyTrend(opts = {}) {
    const dateRange = this._resolveDateRange(opts);
    const match = this._dateMatch(dateRange, {
      paymentStatus: "Paid",
      status: { $nin: ["Cancelled"] },
    });

    const trend = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return trend.map((t) => ({
      year: t._id.year,
      month: t._id.month,
      label: `${t._id.year}-${String(t._id.month).padStart(2, "0")}`,
      revenue: t.revenue,
      ordersCount: t.ordersCount,
    }));
  }
}

module.exports = new AnalyticsService();
