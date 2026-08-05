const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Draft"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Collection || mongoose.model("Collection", collectionSchema);
