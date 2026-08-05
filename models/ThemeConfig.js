const mongoose = require("mongoose");

const defaultSections = [
  {
    id: "announcement_1",
    type: "announcement",
    name: "Announcement Bar",
    enabled: true,
    settings: { text: "COMPLIMENTARY WORLDWIDE EXPRESS DELIVERY ON ORDERS OVER ₹15,000", link: "/shop" },
  },
  {
    id: "hero_1",
    type: "hero",
    name: "Hero Banner Studio",
    enabled: true,
    settings: {
      heading: "SAVILE ROW CRAFTSMANSHIP",
      subheading: "Redefining luxury menswear through precision tailoring and modern streetwear aesthetics",
      ctaText: "EXPLORE ATELIER COLLECTION",
      ctaLink: "/shop",
      bgImage: "/images/lookbook/gor-lookbook-1.webp",
      bgVideo: "",
      overlayOpacity: 40,
      alignment: "center",
    },
  },
  {
    id: "collections_1",
    type: "collections",
    name: "Featured Collections",
    enabled: true,
    settings: { title: "CURATED ATELIER LINE", limit: 3 },
  },
  {
    id: "featured_products_1",
    type: "featured_products",
    name: "Featured Garments",
    enabled: true,
    settings: { title: "SIGNATURE PIECES", limit: 4 },
  },
  {
    id: "brand_story_1",
    type: "brand_story",
    name: "Brand Heritage Story",
    enabled: true,
    settings: { title: "THE MAYFAIR LEGACY", story: "Founded at the intersection of British tailoring heritage and urban street culture." },
  },
  {
    id: "newsletter_1",
    type: "newsletter",
    name: "VIP Newsletter Club",
    enabled: true,
    settings: { title: "JOIN THE PRIVATE ATELIER CLUB", subtitle: "Receive private invitations to private capsule drops." },
  },
];

const defaultTokens = {
  primaryColor: "#090909",
  secondaryColor: "#151515",
  accentColor: "#C8A45D",
  typography: "Editorial Serif & Inter",
  buttonRadius: "Curved (8px)",
  containerWidth: "Luxury Max (1440px)",
  sectionSpacing: "Spacious (96px)",
};

const themeConfigSchema = new mongoose.Schema(
  {
    sections: { type: Array, default: defaultSections },
    themeTokens: { type: Object, default: defaultTokens },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
    versionHistory: [
      {
        versionId: { type: String },
        name: { type: String },
        publishedAt: { type: Date, default: Date.now },
        sections: Array,
        themeTokens: Object,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.models.ThemeConfig || mongoose.model("ThemeConfig", themeConfigSchema);
