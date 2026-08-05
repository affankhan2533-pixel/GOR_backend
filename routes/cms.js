const express = require("express");
const router = express.Router();
const CMSPage = require("../models/CMSPage");

// Helper to seed initial pages if collection is empty
async function seedCMSPagesIfEmpty() {
  const count = await CMSPage.countDocuments();
  if (count === 0) {
    const initialPages = [
      {
        title: "About GOR Atelier",
        slug: "about",
        template: "standard",
        status: "Published",
        content: "<h2>THE MAYFAIR ATELIER LEGACY</h2><p>Founded at the intersection of British tailoring heritage and urban street culture, GOR Menswear creates bespoke garments for the modern gentleman.</p>",
        metaTitle: "About GOR Atelier — Luxury British Menswear",
        metaDescription: "Discover the heritage, craftsmanship, and tailoring story behind GOR Atelier Mayfair.",
      },
      {
        title: "Contact & Concierge",
        slug: "contact",
        template: "contact",
        status: "Published",
        content: "<p>Speak with our London Mayfair concierge team for private appointments, order inquiries, or custom tailoring requests.</p>",
        metaTitle: "Contact Concierge — GOR Atelier",
        metaDescription: "Contact the GOR Atelier Mayfair concierge team for private styling appointments.",
      },
      {
        title: "Privacy Policy",
        slug: "privacy-policy",
        template: "legal",
        status: "Published",
        content: "<h2>PRIVACY & DATA PROTECTION</h2><p>We handle all customer information with strict confidentiality under UK & EU GDPR regulations.</p>",
        metaTitle: "Privacy Policy — GOR Atelier",
        metaDescription: "Read the GOR Atelier privacy policy and data security practices.",
      },
      {
        title: "Terms & Conditions",
        slug: "terms",
        template: "legal",
        status: "Published",
        content: "<h2>TERMS OF SERVICE</h2><p>Terms governing your purchases and interactions with GOR Atelier London online and in-store.</p>",
        metaTitle: "Terms of Service — GOR Atelier",
        metaDescription: "Terms of service and purchasing terms for GOR Atelier.",
      },
      {
        title: "Shipping & Worldwide Delivery",
        slug: "shipping-policy",
        template: "standard",
        status: "Published",
        content: "<h2>COMPLIMENTARY EXPRESS DELIVERY</h2><p>Complimentary express worldwide shipping on all orders over ₹15,000 via DHL Express.</p>",
        metaTitle: "Shipping & Delivery — GOR Atelier",
        metaDescription: "Worldwide express shipping policies and delivery timelines.",
      },
      {
        title: "Returns & Exchanges",
        slug: "returns",
        template: "standard",
        status: "Published",
        content: "<h2>14-DAY COMPLIMENTARY RETURNS</h2><p>We offer 14-day complimentary worldwide returns on all unworn garments in original luxury packaging.</p>",
        metaTitle: "Returns & Exchanges — GOR Atelier",
        metaDescription: "14-day complimentary return policy and exchange instructions.",
      },
      {
        title: "Frequently Asked Questions",
        slug: "faq",
        template: "faq",
        status: "Published",
        content: "<h2>FREQUENTLY ASKED QUESTIONS</h2><p>Find answers regarding sizing, bespoke tailoring, express delivery, and payment options.</p>",
        metaTitle: "FAQ — GOR Atelier",
        metaDescription: "Answers to common questions regarding orders, sizing, and delivery.",
      },
    ];
    await CMSPage.insertMany(initialPages);
  }
}

// GET /api/cms — List CMS Pages
router.get("/", async (req, res) => {
  try {
    await seedCMSPagesIfEmpty();
    const { search = "", status = "all", template = "all" } = req.query;

    const query = {};
    if (status && status !== "all") query.status = status;
    if (template && template !== "all") query.template = template;

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ];
    }

    const pages = await CMSPage.find(query).sort({ updatedAt: -1 }).lean();
    const formatted = pages.map((p) => ({
      ...p,
      id: p._id.toString(),
      revisionsCount: (p.revisions || []).length,
    }));

    res.json({ success: true, pages: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch CMS pages: " + error.message });
  }
});

// GET /api/cms/:slug — Get single page by slug or ID
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    let page = await CMSPage.findOne({ slug: slug.toLowerCase() });
    if (!page && slug.match(/^[0-9a-fA-F]{24}$/)) {
      page = await CMSPage.findById(slug);
    }

    if (!page) {
      return res.status(404).json({ success: false, error: "CMS Page not found." });
    }

    // Increment view counter asynchronously
    page.viewsCount = (page.viewsCount || 0) + 1;
    await page.save();

    res.json({
      success: true,
      page: {
        ...page.toObject(),
        id: page._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch page: " + error.message });
  }
});

// POST /api/cms — Create new CMS Page
router.post("/", async (req, res) => {
  try {
    const { title, slug, template = "standard", content = "", metaTitle = "", metaDescription = "", ogImage = "", status = "Draft", scheduledAt = null } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ success: false, error: "Page title and slug are required." });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const existing = await CMSPage.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, error: `A page with slug '${cleanSlug}' already exists.` });
    }

    const newPage = await CMSPage.create({
      title: title.trim(),
      slug: cleanSlug,
      template,
      content,
      metaTitle: metaTitle || title,
      metaDescription,
      ogImage,
      status,
      scheduledAt,
    });

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "CMS_PAGE_CREATED",
        module: "CMS",
        description: `Created CMS page '${title}' (${cleanSlug})`,
        targetId: newPage._id.toString(),
        targetName: title,
      });
    } catch (e) {}

    res.status(201).json({ success: true, message: "CMS Page created successfully", page: newPage });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create CMS page: " + error.message });
  }
});

// PUT /api/cms/:id — Update CMS Page & Save Revision Snapshot
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, template, content, metaTitle, metaDescription, ogImage, status, scheduledAt } = req.body;

    const page = await CMSPage.findById(id);
    if (!page) {
      return res.status(404).json({ success: false, error: "CMS Page not found." });
    }

    // Save previous state as revision snapshot
    const revisionSnapshot = {
      revisionId: `rev_${Date.now()}`,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      savedAt: new Date(),
    };

    if (title) page.title = title.trim();
    if (slug) page.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (template) page.template = template;
    if (content !== undefined) page.content = content;
    if (metaTitle !== undefined) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    if (ogImage !== undefined) page.ogImage = ogImage;
    if (status) page.status = status;
    if (scheduledAt !== undefined) page.scheduledAt = scheduledAt;

    page.revisions = [revisionSnapshot, ...(page.revisions || [])].slice(0, 15);
    await page.save();

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "CMS_PAGE_UPDATED",
        module: "CMS",
        description: `Updated CMS page '${page.title}'`,
        targetId: page._id.toString(),
        targetName: page.title,
      });
    } catch (e) {}

    res.json({ success: true, message: "CMS Page updated successfully", page });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update CMS page: " + error.message });
  }
});

// DELETE /api/cms/:id — Delete CMS Page
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const page = await CMSPage.findByIdAndDelete(id);
    if (!page) {
      return res.status(404).json({ success: false, error: "CMS Page not found." });
    }

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "CMS_PAGE_DELETED",
        module: "CMS",
        description: `Deleted CMS page '${page.title}'`,
        targetId: page._id.toString(),
        targetName: page.title,
      });
    } catch (e) {}

    res.json({ success: true, message: "CMS Page deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete CMS page: " + error.message });
  }
});

// POST /api/cms/:id/restore/:revisionId — Restore Historical Revision
router.post("/:id/restore/:revisionId", async (req, res) => {
  try {
    const { id, revisionId } = req.params;
    const page = await CMSPage.findById(id);
    if (!page) {
      return res.status(404).json({ success: false, error: "CMS Page not found." });
    }

    const revision = (page.revisions || []).find((r) => r.revisionId === revisionId);
    if (!revision) {
      return res.status(404).json({ success: false, error: "Revision snapshot not found." });
    }

    page.title = revision.title || page.title;
    page.content = revision.content || page.content;
    page.metaTitle = revision.metaTitle || page.metaTitle;
    page.metaDescription = revision.metaDescription || page.metaDescription;

    await page.save();
    res.json({ success: true, message: "Page revision restored successfully", page });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to restore revision: " + error.message });
  }
});

module.exports = router;
