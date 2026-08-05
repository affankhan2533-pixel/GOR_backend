require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/connect");
const seedDatabase = require("./config/seed");
const Product = require("./models/Product");

const cookieParser = require("cookie-parser");

const productsRouter = require("./routes/products");
const cartRouter = require("./routes/cart");
const checkoutRouter = require("./routes/checkout");
const newsletterRouter = require("./routes/newsletter");
const dashboardRouter = require("./routes/dashboard");
const inventoryRouter = require("./routes/inventory");
const analyticsRouter = require("./routes/analytics");
const ordersRouter = require("./routes/orders");
const authRouter = require("./routes/auth");
const customersRouter = require("./routes/customers");
const settingsRouter = require("./routes/settings");
const auditRouter = require("./routes/audit");
const themeRouter = require("./routes/theme");
const cmsRouter = require("./routes/cms");
const mediaRouter = require("./routes/media");

const rateLimit = require("express-rate-limit");
const { securityHeaders, sanitizeInputs, globalErrorHandler } = require("./middleware/security");

const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === "production" ? 300 : 5000,
  message: { success: false, error: "Too many API requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const startServer = async () => {
  // Connect MongoDB Database
  const conn = await connectDB();
  if (conn) {
    console.log("MongoDB Connected");
    await seedDatabase();
  }

  // Production Security Middleware
  app.use(securityHeaders);
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(sanitizeInputs);

  app.use("/uploads", express.static(path.join(__dirname, "../frontend/public/uploads")));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // API Rate Limiter
  app.use("/api", apiLimiter);

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/newsletter", newsletterRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/theme", themeRouter);
  app.use("/api/cms", cmsRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/admin/dashboard", dashboardRouter);
  app.use("/api/admin/inventory", inventoryRouter);
  app.use("/api/admin/analytics", analyticsRouter);
  app.use("/api/admin/settings", settingsRouter);
  app.use("/api/admin/audit", auditRouter);

  // Health check endpoint using MongoDB count
  app.get("/api/health", async (req, res) => {
    try {
      const totalProducts = await Product.countDocuments();
      res.json({
        status: "ok",
        service: "GOR MENSWEAR REST API",
        totalProducts,
        database: "MongoDB / Mongoose",
        time: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Production Global Error Handler
  app.use(globalErrorHandler);

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✨ GOR MENSWEAR Production Backend running on http://localhost:${PORT}`);
    console.log(`🍃 Engine: 100% MongoDB Mongoose Single Source of Truth`);
    console.log(`🛡️ Security: Hardened with NoSQL Sanitization, Headers & Rate Limiting`);
    console.log(`======================================================\n`);
  });
};

startServer();
