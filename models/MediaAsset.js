const mongoose = require("mongoose");

const mediaAssetSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["image", "video", "document", "svg", "lottie"],
      default: "image",
    },
    mimeType: { type: String, default: "image/webp" },
    size: { type: Number, default: 245000 }, // in bytes
    dimensions: {
      width: { type: Number, default: 1920 },
      height: { type: Number, default: 1080 },
    },
    folder: { type: String, default: "Uncategorized" },
    tags: [{ type: String }],
    title: { type: String, default: "" },
    altText: { type: String, default: "" },
    caption: { type: String, default: "" },
    description: { type: String, default: "" },
    copyright: { type: String, default: "© 2026 GOR MENSWEAR MAYFAIR" },
    photographer: { type: String, default: "GOR Atelier Studio" },
    dominantColor: { type: String, default: "#111111" },
    aspectRatio: { type: String, default: "16:9" },
    uploadedBy: { type: String, default: "Super Admin" },
    isFavorite: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    usedIn: [
      {
        label: { type: String, required: true },
        href: { type: String, required: true },
      },
    ],
    lastUsed: { type: Date, default: Date.now },
    variants: {
      thumbnail: { type: String, default: "" },
      small: { type: String, default: "" },
      medium: { type: String, default: "" },
      large: { type: String, default: "" },
    },
    cloudinaryPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ filename: "text", altText: "text", tags: "text" });
mediaAssetSchema.index({ folder: 1 });
mediaAssetSchema.index({ fileType: 1 });
mediaAssetSchema.index({ isFavorite: 1 });

module.exports = mongoose.model("MediaAsset", mediaAssetSchema);
