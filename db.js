// GOR MENSWEAR Express Database Module (Balanced Catalog & Unique Category Descriptions)

const CATEGORIES = [
  {
    id: "all",
    name: "All Collections",
    eyebrow: "COMPLETE GOR CATALOG",
    description: "Explore handcrafted silhouettes, co-ord sets, designer shirting, and statement outerwear.",
  },
  {
    id: "codset",
    name: "Co-Ord Sets & Streetwear",
    eyebrow: "CO-ORD SETS COLLECTION",
    description: "Matching separates designed to be worn together or styled apart for elevated urban luxury.",
  },
  {
    id: "shirts",
    name: "Designer Shirts",
    eyebrow: "ITALIAN SHIRTING COLLECTION",
    description: "Everyday and statement shirting crafted in considered fabrics, textures, and modern cuts.",
  },
  {
    id: "outerwear",
    name: "Vests & Jackets",
    eyebrow: "OUTERWEAR & LAYERS COLLECTION",
    description: "Structured jackets, athletic vests, and layered statement pieces built for year-round style.",
  },
  {
    id: "trousers",
    name: "Tailored Shorts & Trousers",
    eyebrow: "TROUSERS & BOTTOMS COLLECTION",
    description: "Tailored, relaxed, and custom distressed fits engineered for movement and silhouette.",
  },
  {
    id: "accessories",
    name: "Bespoke Accessories",
    eyebrow: "ACCENTS & ACCESSORIES COLLECTION",
    description: "Finishing pieces — handcrafted leather belts, statement monograms, and small luxury goods.",
  },
];

const PRODUCTS = [
  // ORIGINAL PRODUCTS (Screenshot items)
  {
    id: "p1",
    name: "GOR Raw Denim Distressed Neon Shirt",
    category: "shirts",
    price: 420,
    rating: 5.0,
    reviewsCount: 48,
    badge: "TRENDING #1",
    colors: [
      { name: "Raw Wash Denim", hex: "#758eb0" },
      { name: "Neon Green Trim", hex: "#22c55e" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "Light-wash distressed denim shirt featuring neon contrast line accent, destroyed fraying, and relaxed streetwear fit.",
    fabric: "100% Premium Cotton Denim",
    care: "Hand Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-1.webp",
      "/images/lookbook/gor-lookbook-5.webp",
    ],
  },
  {
    id: "p2",
    name: "GOR Tribal Embroidered Heavyweight Tee",
    category: "shirts",
    price: 380,
    rating: 4.9,
    reviewsCount: 36,
    badge: "HOT ITEM",
    colors: [
      { name: "Onyx Black", hex: "#111111" },
      { name: "Silver Embroidery", hex: "#e2e8f0" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Heavyweight black cotton tee featuring high-density tribal chest embroidery and metallic thread detailing.",
    fabric: "100% Heavyweight Cotton",
    care: "Machine Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-2.webp",
      "/images/lookbook/gor-lookbook-7.webp",
    ],
  },
  {
    id: "p3",
    name: "GOR Vintage Wash 11 Knit Vest",
    category: "outerwear",
    price: 450,
    originalPrice: 520,
    rating: 5.0,
    reviewsCount: 29,
    badge: "LIMITED",
    colors: [
      { name: "Vintage Charcoal", hex: "#2b2b2b" },
    ],
    sizes: ["M", "L", "XL"],
    description:
      "Distressed vintage wash charcoal sleeveless knit vest with appliqué #11 chest graphic and raw edge hems.",
    fabric: "100% Washed Heavy Cotton Knit",
    care: "Hand Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-3.webp",
      "/images/lookbook/gor-lookbook-6.webp",
    ],
  },
  {
    id: "p4",
    name: "GOR Conviction 23 Green Mesh Jersey",
    category: "shirts",
    price: 390,
    rating: 4.8,
    reviewsCount: 42,
    badge: "POPULAR",
    colors: [
      { name: "Emerald Green", hex: "#15803d" },
      { name: "Gold Graphic", hex: "#c9a24b" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Vibrant emerald green breathable mesh streetwear jersey with gold Conviction #23 collegiate print.",
    fabric: "100% Breathable Tech Mesh",
    care: "Machine Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-4.webp",
      "/images/lookbook/gor-lookbook-8.webp",
    ],
  },

  // SHIRTS (4 items)
  {
    id: "gor-shirt-1",
    name: "GOR Textured Seersucker Resort Shirt",
    category: "shirts",
    price: 360,
    originalPrice: 420,
    rating: 5.0,
    reviewsCount: 22,
    badge: "Exclusive",
    colors: [
      { name: "Crisp White", hex: "#ffffff" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Relaxed resort shirt woven from textured seersucker cotton with open camp collar and embroidered chest insignia.",
    fabric: "100% Textured Seersucker Cotton",
    care: "Cool Iron | Machine Wash Gentle",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/categories/gor-model-streetwear.webp",
      "/images/lookbook/gor-lookbook-5.webp",
    ],
  },
  {
    id: "gor-shirt-2",
    name: "GOR Atelier Monogram Silk Camp Shirt",
    category: "shirts",
    price: 410,
    originalPrice: 470,
    rating: 4.9,
    reviewsCount: 19,
    badge: "Atelier Drop",
    colors: [
      { name: "Cream Monogram", hex: "#e6dec8" },
    ],
    sizes: ["M", "L", "XL"],
    description:
      "Fluid silk-blend camp collar shirt featuring custom tone-on-tone GOR monogram jacquard weave.",
    fabric: "70% Silk | 30% Fine Cotton",
    care: "Dry Clean Only",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-5.webp",
      "/images/products/gor-codset-beige-prada.webp",
    ],
  },
  {
    id: "gor-shirt-3",
    name: "GOR Patterned Short-Sleeve Cuban Shirt",
    category: "shirts",
    price: 340,
    rating: 4.8,
    reviewsCount: 16,
    badge: "Summer Essential",
    colors: [
      { name: "Sage Print", hex: "#8a9a86" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Lightweight Cuban collar shirt with subtle botanical pattern print and mother-of-pearl buttons.",
    fabric: "100% Breathable Linen Cotton",
    care: "Hand Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-4.webp",
      "/images/lookbook/gor-lookbook-2.webp",
    ],
  },
  {
    id: "gor-shirt-4",
    name: "GOR Structured Utility Pocket Overshirt",
    category: "shirts",
    price: 450,
    originalPrice: 500,
    rating: 4.9,
    reviewsCount: 28,
    badge: "Bestseller",
    colors: [
      { name: "Khaki Green", hex: "#4b5320" },
    ],
    sizes: ["M", "L", "XL", "XXL"],
    description:
      "Heavyweight twill overshirt with dual flap chest pockets and reinforced metallic press studs.",
    fabric: "100% Heavy Cotton Twill",
    care: "Machine Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-3.webp",
      "/images/lookbook/gor-lookbook-6.webp",
    ],
  },

  // OUTERWEAR (4 items)
  {
    id: "gor-vest-1",
    name: "Off-White Royal Blue Athletic Zip Vest",
    category: "outerwear",
    price: 490,
    originalPrice: 540,
    rating: 4.9,
    reviewsCount: 39,
    badge: "Bestseller",
    colors: [
      { name: "Royal Blue", hex: "#1a4ba0" },
    ],
    sizes: ["M", "L", "XL", "XXL"],
    description:
      "Pinstriped athletic zip-up vest in royal blue with bold Off-White red typography and yellow contrast collar accent.",
    fabric: "Structured Tech Knit | Contrast Ribbed Trims",
    care: "Hand Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-1.webp",
      "/images/lookbook/gor-lookbook-4.webp",
    ],
  },
  {
    id: "gor-outerwear-2",
    name: "GOR Bespoke Atelier Display Jacket",
    category: "outerwear",
    price: 590,
    originalPrice: 660,
    rating: 4.8,
    reviewsCount: 27,
    badge: "Store Display",
    colors: [
      { name: "Gold / Navy", hex: "#1c2e4a" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Premium outerwear edition displayed at the GOR Menswear flagship store.",
    fabric: "Cotton Tech Blend",
    care: "Dry Clean",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/brand/gor-store-interior-1.webp",
      "/images/brand/gor-store-interior-2.webp",
    ],
  },
  {
    id: "gor-outerwear-3",
    name: "GOR Lightweight Tech Puffer Vest",
    category: "outerwear",
    price: 430,
    rating: 4.7,
    reviewsCount: 15,
    badge: "New",
    colors: [
      { name: "Matte Black", hex: "#0d0d0d" },
    ],
    sizes: ["M", "L", "XL"],
    description:
      "Water-resistant quilted tech vest with concealed zip pockets and high-neck thermal collar.",
    fabric: "100% Recycled Nylon Shell | Goose Down Fill",
    care: "Dry Clean Only",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-2.webp",
      "/images/products/gor-codset-black-burberry.webp",
    ],
  },
  {
    id: "gor-outerwear-4",
    name: "GOR Savile Wool Double-Breasted Jacket",
    category: "outerwear",
    price: 890,
    originalPrice: 980,
    rating: 5.0,
    reviewsCount: 31,
    badge: "Heritage",
    colors: [
      { name: "Midnight Navy", hex: "#0f1c2e" },
    ],
    sizes: ["M", "L", "XL"],
    description:
      "Unstructured double-breasted jacket crafted from Italian virgin wool with natural horn buttons.",
    fabric: "100% Italian Virgin Wool",
    care: "Dry Clean Only",
    origin: "GOR Atelier Collection",
    inStock: true,
    images: [
      "/images/brand/gor-store-interior-3.webp",
      "/images/brand/gor-store-interior-4.webp",
    ],
  },

  // TROUSERS (4 items)
  {
    id: "gor-trousers-1",
    name: "GOR Custom Distressed Patchwork Denim",
    category: "trousers",
    price: 480,
    originalPrice: 530,
    rating: 4.9,
    reviewsCount: 51,
    badge: "Statement Piece",
    colors: [
      { name: "Washed Blue Denim", hex: "#758eb0" },
    ],
    sizes: ["30", "32", "34", "36"],
    description:
      "Wide-leg distressed denim jeans featuring hand-stitched red bandana and black graphic fabric side patches with frayed hems.",
    fabric: "14oz Heavy Cotton Denim",
    care: "Wash Inside Out Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/categories/gor-model-streetwear.webp",
      "/images/lookbook/gor-lookbook-6.webp",
    ],
  },
  {
    id: "gor-trousers-2",
    name: "GOR Florence Double-Pleated Trousers",
    category: "trousers",
    price: 390,
    rating: 4.8,
    reviewsCount: 24,
    badge: "Classic Fit",
    colors: [
      { name: "Camel Tan", hex: "#c9a24b" },
    ],
    sizes: ["30", "32", "34", "36"],
    description:
      "High-rise trousers with double front pleats and side waist adjusters. Tailored taper through leg.",
    fabric: "Tropical Stretch Wool Blend",
    care: "Dry Clean Only",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-8.webp",
      "/images/lookbook/gor-lookbook-3.webp",
    ],
  },
  {
    id: "gor-trousers-3",
    name: "GOR Alo Fleece Drawstring Shorts",
    category: "trousers",
    price: 240,
    rating: 5.0,
    reviewsCount: 42,
    badge: "Essential",
    colors: [
      { name: "Burgundy Alo", hex: "#5c2438" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description:
      "Heavyweight cotton fleece shorts with gold metallic eyelets and deep side zipper pockets.",
    fabric: "100% Heavy Cotton Fleece",
    care: "Machine Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/products/gor-codset-burgundy-alo.webp",
      "/images/lookbook/gor-lookbook-1.webp",
    ],
  },
  {
    id: "gor-trousers-4",
    name: "GOR Relaxed Cargo Trousers",
    category: "trousers",
    price: 370,
    originalPrice: 420,
    rating: 4.7,
    reviewsCount: 18,
    badge: "Streetwear",
    colors: [
      { name: "Onyx Black", hex: "#111111" },
    ],
    sizes: ["30", "32", "34", "36"],
    description:
      "Relaxed cargo trousers with multi-pocket detailing and adjustable ankle drawstrings.",
    fabric: "Heavyweight Cotton Ripstop",
    care: "Machine Wash Cold",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/products/gor-codset-black-burberry.webp",
      "/images/lookbook/gor-lookbook-7.webp",
    ],
  },

  // ACCESSORIES (4 items)
  {
    id: "gor-access-1",
    name: "GOR Signature Gold Monogram Leather Belt",
    category: "accessories",
    price: 260,
    originalPrice: 300,
    rating: 4.9,
    reviewsCount: 37,
    badge: "Best Accent",
    colors: [
      { name: "Black / Gold", hex: "#0d0d0d" },
    ],
    sizes: ["One Size"],
    description:
      "Full-grain calfskin leather belt with 3D antique gold GOR monogram buckle hardware.",
    fabric: "100% Italian Grain Calfskin Leather",
    care: "Wipe Clean with Leather Conditioner",
    origin: "GOR Atelier Collection",
    inStock: true,
    images: [
      "/images/brand/gor-store-interior-5.webp",
      "/images/lookbook/gor-lookbook-1.webp",
    ],
  },
  {
    id: "gor-access-2",
    name: "GOR Atelier Monogram Leather Cardholder",
    category: "accessories",
    price: 180,
    rating: 5.0,
    reviewsCount: 29,
    badge: "Gift Choice",
    colors: [
      { name: "Matte Black", hex: "#0d0d0d" },
    ],
    sizes: ["One Size"],
    description:
      "Compact leather cardholder featuring 4 card slots and central notes compartment with foil-stamped GOR emblem.",
    fabric: "100% Embossed Calfskin",
    care: "Store in Included Dust Bag",
    origin: "GOR Atelier Collection",
    inStock: true,
    images: [
      "/images/brand/gor-store-interior-4.webp",
      "/images/lookbook/gor-lookbook-2.webp",
    ],
  },
  {
    id: "gor-access-3",
    name: "GOR Bandana Silk Headwrap Accent",
    category: "accessories",
    price: 150,
    rating: 4.8,
    reviewsCount: 21,
    badge: "Styling Essential",
    colors: [
      { name: "Red / Black Pattern", hex: "#b5541f" },
    ],
    sizes: ["One Size"],
    description:
      "Hand-printed silk bandana scarf featured in the GOR store lookbook styling.",
    fabric: "100% Mulberry Silk",
    care: "Dry Clean Only",
    origin: "GOR Menswear Store Collection",
    inStock: true,
    images: [
      "/images/lookbook/gor-lookbook-7.webp",
      "/images/categories/gor-model-streetwear.webp",
    ],
  },
  {
    id: "gor-access-4",
    name: "GOR Crossbody Mini Leather Tech Pouch",
    category: "accessories",
    price: 320,
    originalPrice: 380,
    rating: 4.9,
    reviewsCount: 14,
    badge: "New Release",
    colors: [
      { name: "Midnight Navy", hex: "#1c2e4a" },
    ],
    sizes: ["One Size"],
    description:
      "Structured leather pouch with detachable crossbody strap and custom magnetic closure.",
    fabric: "Grain Calfskin & Gold Hardware",
    care: "Specialized Leather Care",
    origin: "GOR Atelier Collection",
    inStock: true,
    images: [
      "/images/brand/gor-store-interior-1.webp",
      "/images/lookbook/gor-lookbook-3.webp",
    ],
  },
];

function queryProducts({ category, search, minPrice, maxPrice, sort, page = 1, limit = 12 }) {
  let filtered = [...PRODUCTS];

  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  if (minPrice) {
    filtered = filtered.filter((p) => p.price >= Number(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter((p) => p.price <= Number(maxPrice));
  }

  if (sort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    products: paginated,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

function getRelatedProducts(id, limit = 4) {
  const current = getProductById(id);
  if (!current) return PRODUCTS.slice(0, limit);
  return PRODUCTS.filter((p) => p.id !== id && p.category === current.category).concat(
    PRODUCTS.filter((p) => p.id !== id && p.category !== current.category)
  ).slice(0, limit);
}

module.exports = {
  CATEGORIES,
  PRODUCTS,
  queryProducts,
  getProductById,
  getRelatedProducts,
};
