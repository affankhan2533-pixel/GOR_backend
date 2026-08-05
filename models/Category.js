const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Draft"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Category || mongoose.model("Category", categorySchema);
