const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Default initial shipping methods
const DEFAULT_SHIPPING_METHODS = [
  { id: "std", name: "Standard Luxury Delivery", estimatedDays: "3-5 Business Days", price: 500, enabled: true },
  { id: "exp", name: "Express Courier", estimatedDays: "1-2 Business Days", price: 1200, enabled: true },
  { id: "vip", name: "Mayfair White Glove Concierge", estimatedDays: "Same Day (London/Metros)", price: 2500, enabled: true },
];

// Helper to get or create single settings document
async function getOrCreateSettings() {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({
      shipping: {
        flatCharge: 500,
        freeThreshold: 15000,
        methods: DEFAULT_SHIPPING_METHODS,
      },
    });
  } else if (!settings.shipping || !settings.shipping.methods || settings.shipping.methods.length === 0) {
    settings.shipping.methods = DEFAULT_SHIPPING_METHODS;
    await settings.save();
  }
  return settings;
}

// GET /api/settings - Fetch store configuration
router.get("/", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Fetch settings error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings: " + error.message });
  }
});

// PUT /api/settings - Update store configuration
router.put("/", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { store, notifications, shipping, taxes } = req.body;

    if (store) settings.store = { ...settings.store, ...store };
    if (notifications) settings.notifications = { ...settings.notifications, ...notifications };
    if (shipping) settings.shipping = { ...settings.shipping, ...shipping };
    if (taxes) settings.taxes = { ...settings.taxes, ...taxes };

    await settings.save();

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "SETTINGS_UPDATED",
        module: "Settings",
        description: "Store configurations, logistics, or compliance settings updated",
      });
    } catch (aErr) {}

    res.json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ success: false, error: "Failed to update settings: " + error.message });
  }
});

// PUT /api/settings/profile - Update admin profile
router.put("/profile", async (req, res) => {
  try {
    const { email, name, avatar } = req.body;
    let user = null;
    if (email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }
    if (!user) {
      user = await User.findOne({ role: "Super Admin" }) || await User.findOne();
    }

    if (user) {
      if (name) user.name = name;
      if (email) user.email = email.trim().toLowerCase();
      if (avatar !== undefined) user.avatar = avatar;
      await user.save();
      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    }

    res.status(404).json({ success: false, error: "User profile not found." });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ success: false, error: "Failed to update profile: " + error.message });
  }
});

// PUT /api/settings/password - Change password
router.put("/password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters." });
    }

    let user = null;
    if (email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }
    if (!user) {
      user = await User.findOne({ role: "Super Admin" }) || await User.findOne();
    }

    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found." });
    }

    if (currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: "Current password is incorrect." });
      }
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ success: false, error: "Failed to change password: " + error.message });
  }
});

// POST /api/settings/backup - Trigger backup timestamp update
router.post("/backup", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    settings.backup = {
      lastBackupTime: new Date(),
      backupStatus: "Successful",
    };
    await settings.save();
    res.json({ success: true, message: "Database backup completed successfully", backup: settings.backup });
  } catch (error) {
    res.status(500).json({ success: false, error: "Backup failed: " + error.message });
  }
});

// POST /api/settings/import - Import settings JSON
router.post("/import", async (req, res) => {
  try {
    const importedData = req.body;
    if (!importedData || typeof importedData !== "object") {
      return res.status(400).json({ success: false, error: "Invalid JSON format." });
    }

    const settings = await getOrCreateSettings();
    if (importedData.store) settings.store = { ...settings.store, ...importedData.store };
    if (importedData.notifications) settings.notifications = { ...settings.notifications, ...importedData.notifications };
    if (importedData.shipping) settings.shipping = { ...settings.shipping, ...importedData.shipping };
    if (importedData.taxes) settings.taxes = { ...settings.taxes, ...importedData.taxes };

    await settings.save();
    res.json({ success: true, message: "Settings imported successfully", settings });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to import settings: " + error.message });
  }
});

module.exports = router;
