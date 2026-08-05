const mongoose = require("mongoose");

const cmsPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    template: {
      type: String,
      enum: ["standard", "legal", "contact", "faq", "landing"],
      default: "standard",
    },
    content: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Published", "Scheduled"],
      default: "Draft",
      index: true,
    },
    scheduledAt: { type: Date, default: null },
    author: { type: String, default: "Admin" },
    viewsCount: { type: Number, default: 0 },
    revisions: [
      {
        revisionId: { type: String, required: true },
        title: { type: String },
        content: { type: String },
        metaTitle: { type: String },
        metaDescription: { type: String },
        savedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

cmsPageSchema.index({ createdAt: -1 });

module.exports = mongoose.models.CMSPage || mongoose.model("CMSPage", cmsPageSchema);
