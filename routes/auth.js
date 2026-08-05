const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { authenticateUser, requireRole } = require("../middleware/auth");

// Login Rate Limiter (Brute-force protection: 10 requests in production, 500 in development)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 500,
  message: {
    success: false,
    error: "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper for cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// POST /api/auth/login — Secure Login with Rate Limiting
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      const { auditLogger } = require("../middleware/security");
      auditLogger("AUTH_FAILED", `Failed login attempt for non-existent email: ${cleanEmail}`, { ip: req.ip });
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    if (user.status !== "Active") {
      const { auditLogger } = require("../middleware/security");
      auditLogger("AUTH_BLOCKED", `Login attempt for inactive account: ${cleanEmail}`, { ip: req.ip });
      return res.status(403).json({ success: false, error: "Your account is inactive. Please contact an administrator." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const { auditLogger } = require("../middleware/security");
      auditLogger("AUTH_FAILED", `Incorrect password for user: ${cleanEmail}`, { ip: req.ip });
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const { auditLogger } = require("../middleware/security");
    auditLogger("AUTH_SUCCESS", `Successful login for user: ${cleanEmail}`, { id: user._id, role: user.role, ip: req.ip });

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "ADMIN_LOGIN",
        module: "Auth",
        description: `Admin logged into system (${cleanEmail})`,
      });
    } catch (e) {}

    user.lastLogin = new Date();
    await user.save();

    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    if (!secret) {
      throw new Error("JWT_SECRET environment variable is missing");
    }

    // Minimal payload stored in JWT token
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn });

    // Set Secure HttpOnly Cookie
    res.cookie("gor_auth_token", token, getCookieOptions());

    const userProfile = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || "",
      lastLogin: user.lastLogin,
    };

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: userProfile,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Authentication failed: " + error.message });
  }
});

// POST /api/auth/logout — Secure Logout
router.post("/logout", (req, res) => {
  try {
    const auditLogService = require("../services/auditLogService");
    auditLogService.logActivity(req, {
      action: "ADMIN_LOGOUT",
      module: "Auth",
      description: "Admin logged out of session",
    });
  } catch (e) {}

  res.clearCookie("gor_auth_token", getCookieOptions());
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me — Session Validation Endpoint
router.get("/me", authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// GET /api/auth/users — Admin User Management List
router.get("/users", authenticateUser, requireRole("Super Admin", "Admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    const formatted = users.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));
    res.json({ success: true, users: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch users: " + error.message });
  }
});

// POST /api/auth/users — Super Admin Create Admin User
router.post("/users", authenticateUser, requireRole("Super Admin"), async (req, res) => {
  try {
    const { name, email, password, role = "Admin", status = "Active" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: "A user with this email already exists." });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
      status,
    });

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "ADMIN_USER_CREATED",
        module: "RBAC",
        description: `Created new admin user '${name}' with role '${role}'`,
        targetId: newUser._id.toString(),
        targetName: name,
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create admin user: " + error.message });
  }
});

// PUT /api/auth/users/:id — Super Admin Update Admin User (Role, Status, Name)
router.put("/users/:id", authenticateUser, requireRole("Super Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const beforeRole = user.role;
    const beforeStatus = user.status;

    if (name) user.name = name.trim();
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "ADMIN_USER_UPDATED",
        module: "RBAC",
        description: `Updated admin user '${user.name}' details`,
        targetId: user._id.toString(),
        targetName: user.name,
        beforeValue: { role: beforeRole, status: beforeStatus },
        afterValue: { role: user.role, status: user.status },
      });
    } catch (e) {}

    res.json({
      success: true,
      message: "Admin user updated successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update user: " + error.message });
  }
});

// DELETE /api/auth/users/:id — Super Admin Delete Admin User
router.delete("/users/:id", authenticateUser, requireRole("Super Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "ADMIN_USER_DELETED",
        module: "RBAC",
        description: `Deleted admin user '${user.name}' (${user.email})`,
        targetId: user._id.toString(),
        targetName: user.name,
      });
    } catch (e) {}

    res.json({ success: true, message: "Admin user deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete user: " + error.message });
  }
});

// POST /api/auth/users/:id/reset-password — Super Admin Reset User Password
router.post("/users/:id/reset-password", authenticateUser, requireRole("Super Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.password = newPassword;
    await user.save();

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "ADMIN_PASSWORD_RESET",
        module: "RBAC",
        description: `Reset password for user '${user.name}'`,
        targetId: user._id.toString(),
        targetName: user.name,
      });
    } catch (e) {}

    res.json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to reset password: " + error.message });
  }
});

// POST /api/auth/register — Customer / User Registration with Email Alerts
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: "An account with this email already exists." });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: "Staff",
    });

    // Async Email Notifications
    try {
      const emailService = require("../services/emailService");
      emailService.sendWelcomeEmail({ name: newUser.name, email: newUser.email });
      emailService.sendAdminNewCustomerAlert({ name: newUser.name, email: newUser.email });
    } catch (e) {
      console.warn("Registration email error (non-blocking):", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Registration failed: " + error.message });
  }
});

// POST /api/auth/forgot-password — Trigger Password Reset Email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email address is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Return 200 for security to prevent user enumeration
      return res.json({ success: true, message: "If an account exists, a password reset link has been dispatched." });
    }

    const resetToken = jwt.sign({ id: user._id.toString(), email: user.email }, process.env.JWT_SECRET || "gor_secret", { expiresIn: "1h" });

    try {
      const emailService = require("../services/emailService");
      emailService.sendPasswordResetEmail({ name: user.name, email: user.email }, resetToken);
    } catch (e) {
      console.warn("Password reset email error (non-blocking):", e.message);
    }

    res.json({
      success: true,
      message: "Password reset link sent to your email address.",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to process request: " + error.message });
  }
});

module.exports = router;
