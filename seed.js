const mongoose = require("mongoose");
const connectDB = require("./config/connect");
const Category = require("./models/Category");
const Collection = require("./models/Collection");
const Product = require("./models/Product");
const { CATEGORIES, PRODUCTS } = require("./db");

async function runSeed() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Seed Categories (Prevent duplicates via upsert)
    const rawCategories = CATEGORIES.filter((c) => c.id !== "all");
    let categoriesInsertedCount = 0;
    const categoryDocMap = new Map();

    for (const cat of rawCategories) {
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const categoryDoc = await Category.findOneAndUpdate(
        { slug },
        {
          name: cat.name,
          slug,
          image: "/images/categories/gor-model-streetwear.webp",
          status: "Active",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      categoryDocMap.set(cat.id, categoryDoc);
      categoriesInsertedCount++;
    }

    // 3. Seed Collections (Prevent duplicates via upsert)
    const rawCollections = [
      { name: "Streetwear Core", slug: "streetwear-core", description: "Urban elevated menswear collection" },
      { name: "Atelier Edition", slug: "atelier-edition", description: "Bespoke handcrafted silk & tailoring" },
      { name: "Autumn 2026", slug: "autumn-2026", description: "Fall luxury collection" },
    ];
    let collectionsInsertedCount = 0;
    const collectionDocMap = new Map();

    for (const col of rawCollections) {
      const collectionDoc = await Collection.findOneAndUpdate(
        { slug: col.slug },
        {
          name: col.name,
          slug: col.slug,
          description: col.description,
          image: "/images/lookbook/gor-lookbook-1.webp",
          status: "Active",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      collectionDocMap.set(col.slug, collectionDoc);
      collectionsInsertedCount++;
    }

    // 4. Map Category Keys
    const categoryNameMap = {
      shirts: "Designer Shirts",
      trousers: "Tailored Shorts & Trousers",
      outerwear: "Vests & Jackets",
      accessories: "Bespoke Accessories",
      codset: "Co-Ord Sets & Streetwear",
    };

    // 5. Seed Products (Prevent duplicates via upsert by SKU)
    let productsInsertedCount = 0;

    for (let i = 0; i < PRODUCTS.length; i++) {
      const p = PRODUCTS[i];
      const sku = p.sku || `GOR-SKU-00${i + 1}`;
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const catName = categoryNameMap[p.category] || p.category || "Designer Shirts";
      const catDoc = categoryDocMap.get(p.category) || Array.from(categoryDocMap.values())[0];
      const colDoc = collectionDocMap.get("streetwear-core");

      const productData = {
        name: p.name,
        slug,
        sku,
        barcode: p.barcode || `50609918200${i + 1}`,
        categoryId: catDoc ? catDoc._id : null,
        category: catName,
        collectionId: colDoc ? colDoc._id : null,
        collection: "Streetwear Core",
        brand: p.brand || "GOR Menswear",
        price: Number(p.price) || 380,
        compareAtPrice: p.originalPrice || p.compareAtPrice || null,
        costPrice: p.costPrice || Math.round((Number(p.price) || 380) * 0.4),
        stock: p.stock !== undefined ? Number(p.stock) : 20,
        minStockThreshold: p.minStockThreshold || 5,
        status: "Active",
        visibility: "Published",
        featured: p.featured !== undefined ? p.featured : true,
        newArrival: p.newArrival !== undefined ? p.newArrival : true,
        rating: p.rating || 5.0,
        reviewsCount: p.reviewsCount || 30,
        colors: p.colors || [{ name: "Onyx Black", hex: "#111111" }],
        sizes: p.sizes || ["S", "M", "L", "XL"],
        tags: p.tags || ["Streetwear", "GOR Menswear"],
        description: p.description || "Signature GOR Menswear piece.",
        shortDescription: p.shortDescription || p.description || "",
        fabric: p.fabric || "100% Premium Cotton",
        care: p.care || "Machine Wash Cold",
        origin: p.origin || "GOR Menswear Store Collection",
        images: p.images || ["/images/lookbook/gor-lookbook-1.webp"],
        imageUrl: p.imageUrl || (p.images && p.images[0]) || "/images/lookbook/gor-lookbook-1.webp",
      };

      await Product.findOneAndUpdate(
        { sku },
        productData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      productsInsertedCount++;
    }

    // 6. Verify MongoDB Collections
    const verifiedProducts = await Product.countDocuments();
    const verifiedCategories = await Category.countDocuments();
    const verifiedCollections = await Collection.countDocuments();

    // 7. Output exact verification message
    console.log("Seed completed successfully");
    console.log(`Products inserted: ${verifiedProducts}`);
    console.log(`Categories inserted: ${verifiedCategories}`);
    console.log(`Collections inserted: ${verifiedCollections}`);

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

runSeed();
