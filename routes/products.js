const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");

const DEFAULT_FALLBACK_IMAGE = "/images/lookbook/gor-lookbook-1.webp";

// Collision-safe slug generation helper
async function generateUniqueSlug(name, currentId = null) {
  let baseSlug = name
    ? name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "product";

  if (!baseSlug) baseSlug = "product";

  let slug = baseSlug;
  let count = 1;

  while (true) {
    const existing = await Product.findOne({ slug }).lean();
    if (!existing || (currentId && (existing._id.toString() === currentId.toString() || existing.id === currentId))) {
      break;
    }
    count++;
    slug = `${baseSlug}-${count}`;
  }

  return slug;
}

// Process base64 uploads and filter out temporary blob: URLs
function processImageUploads(imagesInput = [], imageUrlInput = "") {
  const uploadDirs = [
    path.join(__dirname, "../../frontend/public/uploads/products"),
    path.join(__dirname, "../uploads/products"),
  ];

  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const rawImages = Array.isArray(imagesInput)
    ? imagesInput
    : typeof imagesInput === "string"
    ? [imagesInput]
    : [];
  if (imageUrlInput && !rawImages.includes(imageUrlInput)) {
    rawImages.unshift(imageUrlInput);
  }

  const processedImages = [];

  for (let i = 0; i < rawImages.length; i++) {
    const imgStr = rawImages[i];
    if (!imgStr || typeof imgStr !== "string") continue;

    // Ignore blob: URLs
    if (imgStr.startsWith("blob:")) {
      continue;
    }

    // Handle base64 data URLs
    if (imgStr.startsWith("data:image/")) {
      try {
        const matches = imgStr.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const base64Data = matches[2];
          const filename = `prod_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}.${ext}`;
          const relPath = `/uploads/products/${filename}`;

          uploadDirs.forEach((dir) => {
            fs.writeFileSync(path.join(dir, filename), Buffer.from(base64Data, "base64"));
          });

          processedImages.push(relPath);
          continue;
        }
      } catch (err) {
        console.error("Error saving base64 image:", err);
      }
    }

    // Keep existing relative/http URLs (not blob)
    if (!imgStr.startsWith("blob:")) {
      processedImages.push(imgStr);
    }
  }

  const finalImages = processedImages.length > 0 ? processedImages : [DEFAULT_FALLBACK_IMAGE];
  const finalImageUrl = finalImages[0] || DEFAULT_FALLBACK_IMAGE;

  return { images: finalImages, imageUrl: finalImageUrl };
}

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, page = 1, limit = 100, includeArchived } = req.query;

    const query = {};
    if (includeArchived !== "true") {
      query.status = { $ne: "Archived" };
    }

    if (category && category !== "all") {
      query.category = { $regex: new RegExp(`^${category.replace(/[^a-zA-Z0-9\s-]/g, "")}$`, "i") };
    }

    if (search) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { collection: { $regex: q, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOptions = { createdAt: -1 };
    if (sort === "price-asc") sortOptions = { price: 1 };
    if (sort === "price-desc") sortOptions = { price: -1 };
    if (sort === "rating") sortOptions = { rating: -1 };
    if (sort === "popular") sortOptions = { reviewsCount: -1 };
    if (sort === "featured") sortOptions = { featured: -1, createdAt: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [products, total, categories] = await Promise.all([
      Product.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query),
      Category.find({ status: "Active" }).lean(),
    ]);

    const formattedProducts = products.map((p) => ({
      ...p,
      id: p.id || p._id.toString(),
    }));

    res.json({
      success: true,
      data: formattedProducts,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch products from MongoDB: " + error.message });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let query = { $or: [{ slug: id }, { sku: id }, { id: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const product = await Product.findOne(query).lean();

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const formattedProduct = {
      ...product,
      id: product.id || product._id.toString(),
    };

    const related = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: { $ne: "Archived" },
    })
      .limit(4)
      .lean();

    const formattedRelated = related.map((r) => ({
      ...r,
      id: r.id || r._id.toString(),
    }));

    res.json({
      success: true,
      product: formattedProduct,
      related: formattedRelated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch product detail from MongoDB: " + error.message });
  }
});

// POST /api/products — Create Product
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description = "",
      images = [],
      imageUrl = "",
      price,
      compareAtPrice = null,
      costPrice = 0,
      categoryId = null,
      category = "",
      collectionId = null,
      collection = "",
      tags = [],
      stock = 0,
      minStockThreshold = 5,
      sku,
      status = "Draft",
      visibility = "Hidden",
      brand = "GOR Atelier",
      featured = false,
      newArrival = false,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "Product name is required" });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ success: false, error: "Valid product price is required" });
    }

    // Generate collision-safe slug
    const slug = await generateUniqueSlug(name.trim());

    // Generate unique SKU if not provided
    let finalSku = sku && typeof sku === "string" ? sku.trim() : "";
    if (!finalSku) {
      finalSku = `GOR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    }
    const existingSku = await Product.findOne({ sku: finalSku }).lean();
    if (existingSku) {
      finalSku = `GOR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Process images and fallbacks
    const { images: finalImages, imageUrl: finalImageUrl } = processImageUploads(images, imageUrl);

    // Sanitize Category & Collection ObjectIds
    let validCatId = null;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      validCatId = categoryId;
    }
    let validColId = null;
    if (collectionId && mongoose.Types.ObjectId.isValid(collectionId)) {
      validColId = collectionId;
    }

    const newProduct = new Product({
      name: name.trim(),
      slug,
      sku: finalSku,
      description: description.trim(),
      imageUrl: finalImageUrl,
      images: finalImages,
      price: parsedPrice,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      costPrice: parseFloat(costPrice || 0),
      categoryId: validCatId,
      category: category.trim(),
      collectionId: validColId,
      collection: collection.trim(),
      tags: Array.isArray(tags) ? tags : [],
      stock: parseInt(stock || 0, 10),
      minStockThreshold: parseInt(minStockThreshold || 5, 10),
      status: ["Draft", "Active", "Archived"].includes(status) ? status : "Draft",
      visibility: ["Published", "Hidden"].includes(visibility) ? visibility : "Hidden",
      brand: brand || "GOR Atelier",
      featured: Boolean(featured),
      newArrival: Boolean(newArrival),
    });

    const saved = await newProduct.save();

    const formattedProduct = {
      ...saved.toObject(),
      id: saved.id || saved._id.toString(),
    };

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: formattedProduct,
    });
  } catch (error) {
    console.error("Error creating product in Express/MongoDB:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create product: " + error.message,
    });
  }
});

// PUT /api/products/:id — Update Product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let query = { $or: [{ id: id }, { sku: id }] };
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const existing = await Product.findOne(query);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const updates = { ...req.body };

    if (updates.name && updates.name.trim() !== existing.name) {
      updates.slug = await generateUniqueSlug(updates.name.trim(), existing._id);
    }

    if (updates.images || updates.imageUrl) {
      const { images: finalImages, imageUrl: finalImageUrl } = processImageUploads(
        updates.images || existing.images,
        updates.imageUrl || existing.imageUrl
      );
      updates.images = finalImages;
      updates.imageUrl = finalImageUrl;
    }

    if (updates.categoryId && !mongoose.Types.ObjectId.isValid(updates.categoryId)) {
      delete updates.categoryId;
    }
    if (updates.collectionId && !mongoose.Types.ObjectId.isValid(updates.collectionId)) {
      delete updates.collectionId;
    }

    Object.assign(existing, updates);
    const updated = await existing.save();

    res.json({
      success: true,
      product: {
        ...updated.toObject(),
        id: updated.id || updated._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update product: " + error.message });
  }
});

// DELETE /api/products/:id — Soft Delete (status = 'Archived', deletedAt = Date)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let query = { $or: [{ id: id }, { sku: id }] };
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const product = await Product.findOneAndUpdate(
      query,
      { status: "Archived", deletedAt: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product soft deleted",
      product: {
        ...product.toObject(),
        id: product.id || product._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to soft delete product: " + error.message });
  }
});

// POST /api/products/:id/duplicate — Duplicate Product
router.post("/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;
    let query = { $or: [{ id: id }, { sku: id }] };
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const original = await Product.findOne(query).lean();
    if (!original) {
      return res.status(404).json({ success: false, error: "Original product not found" });
    }

    const newName = `${original.name} (Copy)`;
    const newSlug = await generateUniqueSlug(newName);
    const newSku = `GOR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const copyData = {
      ...original,
      _id: new mongoose.Types.ObjectId(),
      name: newName,
      slug: newSlug,
      sku: newSku,
      status: "Draft",
      visibility: "Hidden",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    delete copyData.id;

    const dupProduct = new Product(copyData);
    const saved = await dupProduct.save();

    res.status(201).json({
      success: true,
      product: {
        ...saved.toObject(),
        id: saved.id || saved._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to duplicate product: " + error.message });
  }
});

// POST /api/products/:id/restore — Restore Soft-Deleted Product
router.post("/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    let query = { $or: [{ id: id }, { sku: id }] };
    if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: id });
    }

    const product = await Product.findOneAndUpdate(
      query,
      { status: "Draft", deletedAt: null },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product restored",
      product: {
        ...product.toObject(),
        id: product.id || product._id.toString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to restore product: " + error.message });
  }
});

module.exports = router;
