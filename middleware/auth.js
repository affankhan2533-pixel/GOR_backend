const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Granular Role Permission Matrix
const ROLE_PERMISSIONS = {
  "Super Admin": ["*"],
  "Admin": [
    "products:view", "products:create", "products:edit", "products:delete",
    "orders:view", "orders:update", "orders:cancel",
    "customers:view", "customers:edit",
    "analytics:view",
    "settings:view", "settings:edit",
    "coupons:create", "coupons:edit", "coupons:delete",
    "inventory:update"
  ],
  "Inventory Manager": [
    "products:view", "products:create", "products:edit",
    "inventory:update",
    "analytics:view"
  ],
  "Order Manager": [
    "orders:view", "orders:update", "orders:cancel",
    "customers:view",
    "inventory:update"
  ],
  "Customer Support": [
    "orders:view",
    "customers:view", "customers:edit"
  ],
  "Content Manager": [
    "products:view", "products:create", "products:edit",
    "coupons:create", "coupons:edit"
  ]
};

const hasPermission = (userRole, requiredPermission) => {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes("*")) return true;
  return permissions.includes(requiredPermission);
};

const authenticateUser = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.gor_auth_token) {
      token = req.cookies.gor_auth_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please sign in to access this resource.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is missing");
    }

    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select("-password").lean();
    if (!user) {
      return res.status(401).json({ success: false, error: "User account no longer exists." });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ success: false, error: "Your account has been deactivated." });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ success: false, error: "Invalid authentication token." });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== "Super Admin") {
      return res.status(403).json({
        success: false,
        error: `Access denied. Insufficient permissions for role '${req.user.role}'. Required: [${allowedRoles.join(", ")}]`,
      });
    }

    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Permission '${permission}' required for role '${req.user.role}'.`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateUser,
  requireRole,
  requirePermission,
  hasPermission,
  ROLE_PERMISSIONS,
};
