/**
 * GOR MENSWEAR — Production Security & Hardening Middleware Suite
 * Provides HTTP security headers, NoSQL query sanitization, file upload limits, and audit logging
 */

// 1. HTTP Security Headers (Helmet equivalent)
const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

// 2. NoSQL Query Injection Protection & Input Trimming
const sanitizeValue = (val) => {
  if (typeof val === "string") {
    return val.trim();
  }
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const clean = {};
    for (const key of Object.keys(val)) {
      // Prevent Mongo operator injection (e.g. $gt, $ne, $where) in inputs
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      clean[key] = sanitizeValue(val[key]);
    }
    return clean;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  return val;
};

const sanitizeInputs = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params);
  }
  next();
};

// 3. File Upload Security Middleware
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const FORBIDDEN_EXTENSIONS = [".exe", ".bat", ".sh", ".php", ".js", ".html", ".py", ".pl", ".dll"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

const validateFileUpload = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check File Size
      if (file.size && file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ success: false, error: `File '${file.originalname || "upload"}' exceeds max limit of 5MB.` });
      }

      // Check MIME Type
      if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ success: false, error: `Invalid file type '${file.mimetype}'. Only images (JPG, PNG, WEBP) are permitted.` });
      }

      // Check File Extension
      const name = (file.originalname || file.name || "").toLowerCase();
      if (FORBIDDEN_EXTENSIONS.some((ext) => name.endsWith(ext))) {
        return res.status(400).json({ success: false, error: "Executable and script file uploads are strictly prohibited." });
      }
    }
  }
  next();
};

// 4. Structured Audit Logger
const auditLogger = (type, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT LOG] [${timestamp}] [${type.toUpperCase()}] ${message}`, JSON.stringify(metadata));
};

// 5. Production Global Error Handler (Hides stack trace in production)
const globalErrorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[CRITICAL ERROR] [${timestamp}] ${req.method} ${req.url}:`, err.stack || err.message);

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  res.status(statusCode).json({
    success: false,
    error: isProd ? "An internal error occurred. Please try again later." : err.message || "Internal Server Error",
    ...(isProd ? {} : { stack: err.stack }),
  });
};

module.exports = {
  securityHeaders,
  sanitizeInputs,
  validateFileUpload,
  auditLogger,
  globalErrorHandler,
};
