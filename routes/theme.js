const express = require("express");
const router = express.Router();
const ThemeConfig = require("../models/ThemeConfig");

async function getOrCreateTheme() {
  let theme = await ThemeConfig.findOne();
  if (!theme) {
    theme = await ThemeConfig.create({});
  }
  return theme;
}

// GET /api/theme — Fetch current theme config
router.get("/", async (req, res) => {
  try {
    const theme = await getOrCreateTheme();
    res.json({ success: true, theme });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch theme: " + error.message });
  }
});

// PUT /api/theme — Save draft theme config
router.put("/", async (req, res) => {
  try {
    const { sections, themeTokens } = req.body;
    const theme = await getOrCreateTheme();

    if (sections) theme.sections = sections;
    if (themeTokens) theme.themeTokens = { ...theme.themeTokens, ...themeTokens };
    theme.status = "Draft";

    await theme.save();

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "THEME_DRAFT_SAVED",
        module: "Settings",
        description: "Saved draft theme configuration in Theme Builder",
      });
    } catch (e) {}

    res.json({ success: true, message: "Draft theme saved successfully", theme });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to save draft theme: " + error.message });
  }
});

// PUT /api/theme/section-update — Client Website Manager single section update
router.put("/section-update", async (req, res) => {
  try {
    const { sectionId, settings, enabled } = req.body;
    const theme = await getOrCreateTheme();

    let found = false;
    theme.sections = theme.sections.map((sec) => {
      const secObj = typeof sec.toObject === "function" ? sec.toObject() : sec;
      if (secObj.id === sectionId) {
        found = true;
        return {
          ...secObj,
          enabled: enabled !== undefined ? enabled : secObj.enabled,
          settings: { ...(secObj.settings || {}), ...settings },
        };
      }
      return secObj;
    });

    if (!found) {
      return res.status(404).json({ success: false, error: "Section not found." });
    }

    theme.status = "Draft";
    await theme.save();

    res.json({ success: true, message: "Section updated successfully", theme });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update section: " + error.message });
  }
});

// POST /api/theme/publish — Publish theme and save version snapshot
router.post("/publish", async (req, res) => {
  try {
    const theme = await getOrCreateTheme();
    const versionId = `v_${Date.now()}`;
    const newSnapshot = {
      versionId,
      name: `Published Version ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      notes: "Automatic live publish snapshot",
      createdBy: req?.user?.name || "Super Admin",
      publishedAt: new Date(),
      status: "Published",
      sections: theme.sections,
      themeTokens: theme.themeTokens,
    };

    theme.status = "Published";
    theme.versionHistory = [newSnapshot, ...(theme.versionHistory || [])].slice(0, 100);
    await theme.save();

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "THEME_PUBLISHED",
        module: "Settings",
        description: `Published new storefront theme version (${versionId})`,
      });
    } catch (e) {}

    res.json({ success: true, message: "Theme published live to storefront", theme });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to publish theme: " + error.message });
  }
});

// POST /api/theme/version — Create manual named version snapshot
router.post("/version", async (req, res) => {
  try {
    const { name, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Version name is required." });
    }

    const theme = await getOrCreateTheme();
    const versionId = `v_${Date.now()}`;
    const newSnapshot = {
      versionId,
      name: name.trim(),
      notes: notes || "",
      createdBy: req?.user?.name || "Super Admin",
      publishedAt: new Date(),
      status: "Draft",
      sections: theme.sections,
      themeTokens: theme.themeTokens,
    };

    theme.versionHistory = [newSnapshot, ...(theme.versionHistory || [])].slice(0, 100);
    await theme.save();

    res.status(201).json({ success: true, message: "Version snapshot created", version: newSnapshot });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create version: " + error.message });
  }
});

// POST /api/theme/restore/:versionId — Rollback to a specific version
router.post("/restore/:versionId", async (req, res) => {
  try {
    const theme = await getOrCreateTheme();
    const targetVersion = (theme.versionHistory || []).find((v) => v.versionId === req.params.versionId);

    if (!targetVersion) {
      return res.status(404).json({ success: false, error: "Version snapshot not found." });
    }

    theme.sections = targetVersion.sections;
    if (targetVersion.themeTokens) theme.themeTokens = targetVersion.themeTokens;
    theme.status = "Draft";

    await theme.save();

    res.json({ success: true, message: `Restored layout to version '${targetVersion.name}'`, theme });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to restore version: " + error.message });
  }
});

module.exports = router;
