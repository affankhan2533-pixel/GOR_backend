const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    barcode: { type: String, default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    category: { type: String, default: "" },
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Collection", default: null, index: true },
    collection: { type: String, default: "" },
    brand: { type: String, default: "GOR Atelier" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    costPrice: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    minStockThreshold: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Draft",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["Published", "Hidden"],
      default: "Hidden",
      index: true,
    },
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    colors: [{ name: String, hex: String }],
    sizes: [{ type: String }],
    tags: [{ type: String }],
    images: [{ type: String }],
    imageUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    fabric: { type: String, default: "" },
    care: { type: String, default: "" },
    origin: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, stock: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
