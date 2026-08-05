const express = require("express");
const router = express.Router();
const analyticsService = require("../services/analyticsService");

/**
 * Helper — extract period opts from query params.
 * All analytics endpoints share this helper for consistent period resolution.
 */
function getPeriodOpts(query) {
  const { period = "30days", startDate, endDate, groupBy } = query;
  return { period, startDate: startDate || null, endDate: endDate || null, groupBy: groupBy || "day" };
}

// ── INDIVIDUAL ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/analytics/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const opts = getPeriodOpts(req.query);
    const data = await analyticsService.getDashboardAnalytics(opts);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch dashboard analytics: " + error.message });
  }
});

// GET /api/analytics/revenue
router.get("/revenue", async (req, res) => {
  try {
    const opts = getPeriodOpts(req.query);
    const data = await analyticsService.getRevenueAnalytics(opts);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Revenue Analytics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch revenue analytics: " + error.message });
  }
});

// GET /api/analytics/orders
router.get("/orders", async (req, res) => {
  try {
    const opts = getPeriodOpts(req.query);
    const data = await analyticsService.getOrdersAnalytics(opts);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Orders Analytics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch orders analytics: " + error.message });
  }
});

// GET /api/analytics/customers
router.get("/customers", async (req, res) => {
  try {
    const opts = getPeriodOpts(req.query);
    const data = await analyticsService.getCustomerAnalytics(opts);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Customer Analytics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch customer analytics: " + error.message });
  }
});

// GET /api/analytics/products
router.get("/products", async (req, res) => {
  try {
    const opts = getPeriodOpts(req.query);
    const data = await analyticsService.getProductAnalytics(opts);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Product Analytics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch product analytics: " + error.message });
  }
});

// ── UNIFIED ENDPOINT ──────────────────────────────────────────────────────────

// GET / — handles /api/admin/analytics?period=30days (all data in one request)
router.get("/", async (req, res) => {
  try {
    const opts = getPeriodOpts(req.query);

    // Fetch all in parallel — every call receives the same period opts
    const [dashboard, revenue, orders, customers, products, monthlyTrend] = await Promise.all([
      analyticsService.getDashboardAnalytics(opts),
      analyticsService.getRevenueAnalytics(opts),
      analyticsService.getOrdersAnalytics(opts),
      analyticsService.getCustomerAnalytics(opts),
      analyticsService.getProductAnalytics(opts),
      analyticsService.getMonthlyTrend(opts),
    ]);

    // Build a clean, comprehensive overview object for the frontend KPI cards
    const overview = {
      // Revenue (paid non-cancelled, all-time)
      totalRevenue: dashboard.kpis.allTimeRevenue,
      // Revenue within the selected period
      revenueThisPeriod: dashboard.kpis.periodRevenue,
      // Orders (all statuses) within period
      totalOrders: dashboard.kpis.periodOrders,
      // Paid completed orders within period
      paidOrdersInPeriod: dashboard.kpis.periodPaidOrders,
      // AOV from paid completed orders in period
      averageOrderValue: dashboard.kpis.averageOrderValue,
      // Customers
      totalCustomers: dashboard.kpis.totalCustomers,
      newCustomersInPeriod: dashboard.kpis.newCustomersInPeriod,
      returningCustomers: dashboard.kpis.returningCustomers,
      // Products (excludes Archived)
      totalProducts: dashboard.kpis.totalProducts,
      activeProducts: dashboard.kpis.activeProducts,
      draftProducts: dashboard.kpis.draftProducts,
      lowStockProducts: dashboard.kpis.lowStockProducts,
      outOfStockProducts: dashboard.kpis.outOfStockProducts,
    };

    res.json({
      success: true,
      data: {
        period: opts.period,
        overview,
        revenue,
        orders,
        customers,
        products,
        recentOrders: dashboard.recentOrders,
        monthlyTrend,
        statusBreakdown: dashboard.statusBreakdown,
      },
    });
  } catch (error) {
    console.error("Unified Analytics Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch analytics: " + error.message });
  }
});

module.exports = router;
