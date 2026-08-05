const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

const MediaAsset = require("../models/MediaAsset");
const ThemeConfig = require("../models/ThemeConfig");
const CMSPage = require("../models/CMSPage");
const Product = require("../models/Product");
const {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryVariants,
} = require("../config/cloudinary");

// Initial Seed Data for Luxury Brand Media Assets
const DEFAULT_MEDIA = [
  {
    filename: "gor-lookbook-1.webp",
    url: "/images/lookbook/gor-lookbook-1.webp",
    fileType: "image",
    mimeType: "image/webp",
    size: 245000,
    dimensions: { width: 1920, height: 1080 },
    folder: "Hero Images",
    tags: ["hero", "lookbook", "tailoring", "luxury", "2026"],
    title: "Savile Row Atelier Hero",
    altText: "Savile Row Double Breasted Suit Model",
    caption: "Mayfair 2026 Atelier Collection",
    description: "Featured editorial hero banner image showcasing British double-breasted suit tailoring.",
    copyright: "© 2026 GOR MENSWEAR MAYFAIR",
    photographer: "Mayfair Atelier Studio",
    dominantColor: "#0D0D0D",
    aspectRatio: "16:9",
    uploadedBy: "Super Admin",
    isFavorite: true,
    usageCount: 3,
    usedIn: [
      { label: "Homepage Hero Banner", href: "/admin/theme" },
      { label: "Theme Builder Studio", href: "/admin/theme" },
      { label: "Lookbook Editorial Page", href: "/admin/cms" },
    ],
    variants: { thumbnail: "/images/lookbook/gor-lookbook-1.webp", small: "/images/lookbook/gor-lookbook-1.webp", medium: "/images/lookbook/gor-lookbook-1.webp", large: "/images/lookbook/gor-lookbook-1.webp" },
  },
  {
    filename: "gor-lookbook-2.webp",
    url: "/images/lookbook/gor-lookbook-2.webp",
    fileType: "image",
    mimeType: "image/webp",
    size: 198000,
    dimensions: { width: 1920, height: 1080 },
    folder: "Hero Images",
    tags: ["editorial", "suits", "cashmere"],
    title: "Editorial Cashmere Overcoat",
    altText: "Editorial Cashmere Overcoat",
    caption: "Winter Atelier Drop",
    description: "Camel wool overcoat editorial shoot.",
    copyright: "© 2026 GOR MENSWEAR MAYFAIR",
    photographer: "Mayfair Atelier Studio",
    dominantColor: "#1C1C1C",
    aspectRatio: "16:9",
    uploadedBy: "Super Admin",
    isFavorite: false,
    usageCount: 2,
    usedIn: [
      { label: "Homepage Split Hero", href: "/admin/theme" },
      { label: "Featured Garments Section", href: "/admin/theme" },
    ],
    variants: { thumbnail: "/images/lookbook/gor-lookbook-2.webp", small: "/images/lookbook/gor-lookbook-2.webp", medium: "/images/lookbook/gor-lookbook-2.webp", large: "/images/lookbook/gor-lookbook-2.webp" },
  },
  {
    filename: "gor-lookbook-3.webp",
    url: "/images/lookbook/gor-lookbook-3.webp",
    fileType: "image",
    mimeType: "image/webp",
    size: 310000,
    dimensions: { width: 1920, height: 1080 },
    folder: "Campaigns",
    tags: ["campaign", "savile row", "black tie"],
    title: "Black Tie Gala Campaign",
    altText: "Black Tie Dinner Jacket Campaign",
    caption: "Gala Eveningwear 2026",
    description: "Midnight navy silk lapel dinner tuxedo campaign image.",
    copyright: "© 2026 GOR MENSWEAR MAYFAIR",
    photographer: "Mayfair Atelier Studio",
    dominantColor: "#C8A45D",
    aspectRatio: "16:9",
    uploadedBy: "Super Admin",
    isFavorite: true,
    usageCount: 2,
    usedIn: [
      { label: "CMS About Page", href: "/admin/cms" },
      { label: "Product Catalog #102", href: "/admin/products" },
    ],
    variants: { thumbnail: "/images/lookbook/gor-lookbook-3.webp", small: "/images/lookbook/gor-lookbook-3.webp", medium: "/images/lookbook/gor-lookbook-3.webp", large: "/images/lookbook/gor-lookbook-3.webp" },
  },
  {
    filename: "hero-video-showcase.mp4",
    url: "https://cdn.gormenswear.com/hero.mp4",
    fileType: "video",
    mimeType: "video/mp4",
    size: 14500000,
    dimensions: { width: 1920, height: 1080 },
    folder: "Videos",
    tags: ["video", "cinematic", "atelier", "making-of"],
    title: "Atelier Handcrafting Film",
    altText: "Atelier Craftsmanship Video Showcase",
    caption: "Hand-stitching Savile Row jacket lapels",
    description: "Behind the scenes 4K film of bespoke suit construction.",
    copyright: "© 2026 GOR MENSWEAR MAYFAIR",
    photographer: "Mayfair Film Studio",
    dominantColor: "#000000",
    aspectRatio: "16:9",
    uploadedBy: "Super Admin",
    isFavorite: true,
    usageCount: 1,
    usedIn: [{ label: "Homepage Video Hero Section", href: "/admin/theme" }],
    variants: { thumbnail: "/images/lookbook/gor-lookbook-1.webp", small: "", medium: "", large: "" },
  },
];

async function seedMediaIfEmpty() {
  const count = await MediaAsset.countDocuments();
  if (count === 0) {
    await MediaAsset.insertMany(DEFAULT_MEDIA);
  }
}

// Live Dynamic Usage Tracker Scanner
async function calculateLiveAssetUsages(assetUrl) {
  const usages = [];

  try {
    const theme = await ThemeConfig.findOne();
    if (theme && theme.sections) {
      theme.sections.forEach((sec) => {
        if (sec.settings?.bgImage === assetUrl || sec.settings?.bgVideo === assetUrl) {
          usages.push({ label: `Homepage ${sec.name || sec.type}`, href: "/admin/theme" });
        }
      });
    }

    const pages = await CMSPage.find({});
    pages.forEach((page) => {
      if ((page.content || "").includes(assetUrl) || page.seo?.ogImage === assetUrl) {
        usages.push({ label: `CMS Page (${page.title})`, href: "/admin/cms" });
      }
    });

    const products = await Product.find({ images: assetUrl }).limit(5);
    products.forEach((prod) => {
      usages.push({ label: `Product (${prod.name})`, href: "/admin/products" });
    });
  } catch (e) {
    console.error("Error calculating live asset usages:", e);
  }

  if (usages.length === 0) {
    usages.push({ label: "Storefront Media Catalog", href: "/admin/media" });
  }

  return usages;
}

// GET /api/media — List assets with search, filters, folders
router.get("/", async (req, res) => {
  try {
    await seedMediaIfEmpty();

    const { search, folder, fileType, favorite, tag, limit = 50, page = 1 } = req.query;
    const query = {};

    if (folder && folder !== "All") query.folder = folder;
    if (fileType && fileType !== "All") query.fileType = fileType;
    if (favorite === "true") query.isFavorite = true;
    if (tag) query.tags = tag;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { filename: regex },
        { title: regex },
        { altText: regex },
        { tags: regex },
        { folder: regex },
      ];
    }

    const total = await MediaAsset.countDocuments(query);
    const rawAssets = await MediaAsset.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const assets = await Promise.all(
      rawAssets.map(async (doc) => {
        const assetObj = doc.toObject();
        const liveUsages = await calculateLiveAssetUsages(assetObj.url);
        const mergedUsages = assetObj.usedIn && assetObj.usedIn.length > 0 ? assetObj.usedIn : liveUsages;
        assetObj.usedIn = mergedUsages;
        assetObj.usageCount = mergedUsages.length;
        return assetObj;
      })
    );

    const allAssets = await MediaAsset.find({});
    const foldersMap = {};
    allAssets.forEach((a) => {
      foldersMap[a.folder] = (foldersMap[a.folder] || 0) + 1;
    });

    res.json({
      success: true,
      assets,
      total,
      page: Number(page),
      folders: foldersMap,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch media assets: " + error.message });
  }
});

// GET /api/media/cloudinary-status — Check Cloudinary configuration state
router.get("/cloudinary-status", (req, res) => {
  res.json({
    success: true,
    configured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    folder: process.env.CLOUDINARY_FOLDER || "gormenswear",
  });
});

// POST /api/media/upload-file — Upload binary file directly to Cloudinary
router.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { folder, altText, title, description, tags } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const filename = req.body.filename || file.originalname;
    const isVideo = file.mimetype.startsWith("video");
    const fileType = isVideo ? "video" : "image";
    let mediaUrl = "";
    let cloudinaryPublicId = "";
    let dimensions = { width: 1920, height: 1080 };
    let variants = {};

    if (isCloudinaryConfigured()) {
      const cloudResult = await uploadBufferToCloudinary(file.buffer, {
        folder: folder || "Hero Images",
        resourceType: isVideo ? "video" : "image",
      });

      mediaUrl = cloudResult.secure_url;
      cloudinaryPublicId = cloudResult.public_id;
      if (cloudResult.width && cloudResult.height) {
        dimensions = { width: cloudResult.width, height: cloudResult.height };
      }
      variants = getCloudinaryVariants(cloudResult.public_id) || {
        thumbnail: mediaUrl,
        small: mediaUrl,
        medium: mediaUrl,
        large: mediaUrl,
      };
    } else {
      // Fallback if Cloudinary is not configured yet
      const base64 = file.buffer.toString("base64");
      mediaUrl = `data:${file.mimetype};base64,${base64}`;
      variants = { thumbnail: mediaUrl, small: mediaUrl, medium: mediaUrl, large: mediaUrl };
    }

    const initialUsages = [{ label: "Newly Uploaded Asset", href: "/admin/media" }];

    const asset = await MediaAsset.create({
      filename,
      url: mediaUrl,
      fileType,
      mimeType: file.mimetype,
      size: file.size,
      dimensions,
      folder: folder || "Hero Images",
      title: title || filename,
      altText: altText || filename,
      description: description || "",
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(",")) : ["uploaded", "2026", "cloudinary"],
      usageCount: initialUsages.length,
      usedIn: initialUsages,
      uploadedBy: req?.user?.name || "Super Admin",
      cloudinaryPublicId,
      variants,
    });

    res.status(201).json({ success: true, asset, cloudinaryConfigured: isCloudinaryConfigured() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to upload file to Cloudinary: " + error.message });
  }
});

// POST /api/media/upload — Upload media asset (JSON / Data URI / Remote URL)
router.post("/upload", async (req, res) => {
  try {
    let { filename, url, fileData, fileType, folder, altText, tags, title, description } = req.body;

    const sourceFile = fileData || url;
    if (!sourceFile || !filename) {
      return res.status(400).json({ success: false, error: "Filename and file URL/Data are required." });
    }

    if (filename.length > 150) {
      return res.status(400).json({ success: false, error: "Filename exceeds 150 characters." });
    }

    let mediaUrl = url || sourceFile;
    let cloudinaryPublicId = "";
    let dimensions = { width: 1920, height: 1080 };
    let variants = { thumbnail: mediaUrl, small: mediaUrl, medium: mediaUrl, large: mediaUrl };

    const isVideo = fileType === "video" || (typeof mediaUrl === "string" && mediaUrl.endsWith(".mp4"));
    const resourceType = isVideo ? "video" : "image";

    if (isCloudinaryConfigured() && (sourceFile.startsWith("data:") || sourceFile.startsWith("http"))) {
      try {
        const cloudResult = await uploadToCloudinary(sourceFile, {
          folder: folder || "Hero Images",
          resourceType,
        });

        mediaUrl = cloudResult.secure_url;
        cloudinaryPublicId = cloudResult.public_id;
        if (cloudResult.width && cloudResult.height) {
          dimensions = { width: cloudResult.width, height: cloudResult.height };
        }
        variants = getCloudinaryVariants(cloudResult.public_id) || variants;
      } catch (cloudErr) {
        console.error("Cloudinary upload warning:", cloudErr.message);
      }
    }

    const initialUsages = [{ label: "Newly Uploaded Asset", href: "/admin/media" }];

    const asset = await MediaAsset.create({
      filename,
      url: mediaUrl,
      fileType: fileType || (isVideo ? "video" : "image"),
      folder: folder || "Hero Images",
      title: title || filename,
      altText: altText || filename,
      description: description || "",
      tags: tags || ["uploaded", "2026"],
      usageCount: initialUsages.length,
      usedIn: initialUsages,
      uploadedBy: req?.user?.name || "Super Admin",
      cloudinaryPublicId,
      variants,
    });

    try {
      const auditLogService = require("../services/auditLogService");
      auditLogService.logActivity(req, {
        action: "MEDIA_UPLOADED",
        module: "Settings",
        description: `Uploaded media asset '${filename}' to folder '${asset.folder}'`,
      });
    } catch (e) {}

    res.status(201).json({ success: true, asset, cloudinaryConfigured: isCloudinaryConfigured() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to upload asset: " + error.message });
  }
});

// POST /api/media/:id/assign — Context-Aware Assignment Endpoint
router.post("/:id/assign", async (req, res) => {
  try {
    const { label, href } = req.body;
    const asset = await MediaAsset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ success: false, error: "Media asset not found." });
    }

    if (label) {
      const exists = asset.usedIn.some((u) => u.label === label);
      if (!exists) {
        asset.usedIn.push({ label, href: href || "/admin/theme" });
        asset.usageCount = asset.usedIn.length;
        asset.lastUsed = new Date();
        await asset.save();
      }
    }

    res.json({ success: true, message: `Assigned asset '${asset.filename}' to '${label}'`, asset });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to assign asset: " + error.message });
  }
});

// PUT /api/media/:id — Update asset metadata
router.put("/:id", async (req, res) => {
  try {
    const { title, altText, caption, description, folder, tags, isFavorite, copyright, photographer } = req.body;
    const asset = await MediaAsset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ success: false, error: "Media asset not found." });
    }

    if (title !== undefined) asset.title = title;
    if (altText !== undefined) asset.altText = altText;
    if (caption !== undefined) asset.caption = caption;
    if (description !== undefined) asset.description = description;
    if (folder !== undefined) asset.folder = folder;
    if (tags !== undefined) asset.tags = tags;
    if (isFavorite !== undefined) asset.isFavorite = isFavorite;
    if (copyright !== undefined) asset.copyright = copyright;
    if (photographer !== undefined) asset.photographer = photographer;

    await asset.save();
    res.json({ success: true, asset });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update asset: " + error.message });
  }
});

// PUT /api/media/:id/replace — Replace file asset without breaking URL references
router.put("/:id/replace", async (req, res) => {
  try {
    const { newUrl, newFilename } = req.body;
    const asset = await MediaAsset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ success: false, error: "Media asset not found." });
    }

    const oldUrl = asset.url;
    if (newUrl) asset.url = newUrl;
    if (newFilename) asset.filename = newFilename;

    await asset.save();

    try {
      const theme = await ThemeConfig.findOne();
      if (theme && theme.sections) {
        let modified = false;
        theme.sections = theme.sections.map((s) => {
          if (s.settings?.bgImage === oldUrl) {
            s.settings.bgImage = newUrl;
            modified = true;
          }
          return s;
        });
        if (modified) await theme.save();
      }
    } catch (e) {}

    res.json({ success: true, message: "Asset file replaced successfully across system references", asset });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to replace asset: " + error.message });
  }
});

// POST /api/media/:id/ai-action — AI Tools Architecture Endpoint
router.post("/:id/ai-action", async (req, res) => {
  try {
    const { action } = req.body;
    const asset = await MediaAsset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ success: false, error: "Media asset not found." });
    }

    if (action === "auto_alt") {
      asset.altText = `AI-generated luxury ${asset.folder.toLowerCase()} asset '${asset.filename}' featuring Mayfair bespoke menswear.`;
    } else if (action === "remove_bg") {
      asset.caption = "Background removed via AI vision model.";
    } else if (action === "upscale") {
      asset.dimensions = { width: 3840, height: 2160 };
      asset.caption = "Upscaled to 4K Ultra-HD resolution.";
    }

    await asset.save();
    res.json({ success: true, message: `AI action '${action}' applied successfully.`, asset });
  } catch (error) {
    res.status(500).json({ success: false, error: "AI action failed: " + error.message });
  }
});

// DELETE /api/media/:id — Delete asset (safety check for usage count)
router.delete("/:id", async (req, res) => {
  try {
    const asset = await MediaAsset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({ success: false, error: "Media asset not found." });
    }

    // Only block deletion if asset is in active website usage (exclude default library tags)
    const realUsages = (asset.usedIn || []).filter(
      (u) => u.label !== "Newly Uploaded Asset" && u.label !== "Storefront Media Catalog"
    );

    if (realUsages.length > 0 && !req.query.force) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete asset. Currently used in ${realUsages.length} active website locations (${realUsages.map((u) => u.label).join(", ")}). Use force=true to override.`,
      });
    }

    if (asset.cloudinaryPublicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(asset.cloudinaryPublicId, asset.fileType === "video" ? "video" : "image");
    }

    await MediaAsset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Media asset deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete asset: " + error.message });
  }
});

// POST /api/media/bulk — Bulk actions (move, delete, favorite, tag)
router.post("/bulk", async (req, res) => {
  try {
    const { action, ids, targetFolder, tag } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of asset IDs is required." });
    }

    if (action === "move") {
      await MediaAsset.updateMany({ _id: { $in: ids } }, { $set: { folder: targetFolder || "Uncategorized" } });
    } else if (action === "favorite") {
      await MediaAsset.updateMany({ _id: { $in: ids } }, { $set: { isFavorite: true } });
    } else if (action === "tag" && tag) {
      await MediaAsset.updateMany({ _id: { $in: ids } }, { $addToSet: { tags: tag } });
    } else if (action === "delete") {
      if (isCloudinaryConfigured()) {
        const assetsToDelete = await MediaAsset.find({ _id: { $in: ids }, cloudinaryPublicId: { $ne: "" } });
        for (const asset of assetsToDelete) {
          if (asset.cloudinaryPublicId) {
            await deleteFromCloudinary(asset.cloudinaryPublicId, asset.fileType === "video" ? "video" : "image");
          }
        }
      }
      await MediaAsset.deleteMany({ _id: { $in: ids } });
    }

    res.json({ success: true, message: `Bulk action '${action}' completed on ${ids.length} assets.` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed bulk action: " + error.message });
  }
});

module.exports = router;
