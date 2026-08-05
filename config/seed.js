  // GOR MENSWEAR — Automatic MongoDB Database Seeder
  const Category = require("../models/Category");
  const Collection = require("../models/Collection");
  const Product = require("../models/Product");
  const Customer = require("../models/Customer");
  const Order = require("../models/Order");
  const User = require("../models/User");

  const { CATEGORIES, PRODUCTS } = require("../db");

  const seedDatabase = async () => {
    try {
      console.log("Checking database...");

      // Seed Users if none exist
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log("Seeding default admin users...");
        const seedUsers = [
          { name: "Super Admin", email: "superadmin@gormenswear.com", password: "SuperAdmin123!", role: "Super Admin", status: "Active" },
          { name: "Store Admin", email: "admin@gormenswear.com", password: "Admin123!", role: "Admin", status: "Active" },
          { name: "Floor Staff", email: "staff@gormenswear.com", password: "Staff123!", role: "Staff", status: "Active" },
        ];
        for (const u of seedUsers) {
          const userDoc = new User(u);
          await userDoc.save();
        }
        console.log("Default admin users seeded successfully.");
      }

      const productCount = await Product.countDocuments();
      if (productCount > 0) {
        console.log("Database already seeded");
        return;
      }

      console.log("Seeding database...");

      // 1. Seed Categories
      const categoryDocs = [
        { name: "Shirts & Silks", slug: "shirts-silks", status: "Active" },
        { name: "Trousers", slug: "trousers", status: "Active" },
        { name: "Outerwear", slug: "outerwear", status: "Active" },
        { name: "Co-Ord Sets", slug: "co-ord-sets", status: "Active" },
        { name: "Accessories", slug: "accessories", status: "Active" },
      ];
      await Category.deleteMany({});
      const createdCategories = await Category.insertMany(categoryDocs);

      // 2. Seed Collections
      const collectionDocs = [
        { name: "Streetwear Core", slug: "streetwear-core", description: "Urban elevated menswear", status: "Active" },
        { name: "Atelier Edition", slug: "atelier-edition", description: "Bespoke handcrafted silk & tailoring", status: "Active" },
        { name: "Autumn 2026", slug: "autumn-2026", description: "Fall luxury collection", status: "Active" },
      ];
      await Collection.deleteMany({});
      const createdCollections = await Collection.insertMany(collectionDocs);

      // 3. Category Mapping Helper
      const categoryNameMap = {
        shirts: "Shirts & Silks",
        trousers: "Trousers",
        outerwear: "Outerwear",
        accessories: "Accessories",
        codset: "Co-Ord Sets",
      };

      // 4. Seed Products
      await Product.deleteMany({});
      const productDocs = PRODUCTS.map((p, idx) => {
        const catName = categoryNameMap[p.category] || "Shirts & Silks";
        const catDoc = createdCategories.find((c) => c.name === catName) || createdCategories[0];
        const colDoc = createdCollections[0];

        return {
          name: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          sku: p.sku || `GOR-SKU-00${idx + 1}`,
          barcode: `50609918200${idx + 1}`,
          categoryId: catDoc._id,
          category: catName,
          collectionId: colDoc._id,
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
      });

      const createdProducts = await Product.insertMany(productDocs);

      // 5. Seed Initial Customers
      const customerDocs = [
        { name: "Julian Vance", email: "julian@vance-atelier.com", phone: "+44 7700 900077", ordersCount: 2, totalSpent: 840 },
        { name: "Marcus Vance", email: "marcus@vance.com", phone: "+44 7700 900123", ordersCount: 1, totalSpent: 420 },
        { name: "Devon Kane", email: "devon@kane-studio.io", phone: "+44 7700 900456", ordersCount: 3, totalSpent: 1250 },
        { name: "Siddharth Rao", email: "siddharth@rao-design.co.in", phone: "+91 98200 11223", ordersCount: 1, totalSpent: 380 },
        { name: "Elena Rostova", email: "elena@rostova.fashion", phone: "+33 6 12 34 56 78", ordersCount: 4, totalSpent: 2100 },
      ];
      await Customer.deleteMany({});
      const createdCustomers = await Customer.insertMany(customerDocs);

      // 6. Seed Initial Orders
      const orderDocs = [
        {
          orderNo: "#ORD-2026-8801",
          customerId: createdCustomers[0]._id,
          customerName: createdCustomers[0].name,
          customerEmail: createdCustomers[0].email,
          customerPhone: createdCustomers[0].phone,
          shippingAddress: { address: "14 Mayfair Square", city: "London", state: "Greater London", zip: "W1K 2RH", country: "UK" },
          items: [
            { productId: createdProducts[0]._id, name: createdProducts[0].name, sku: createdProducts[0].sku, price: createdProducts[0].price, quantity: 1, itemTotal: createdProducts[0].price },
          ],
          subtotal: createdProducts[0].price,
          discount: 0,
          shippingFee: 0,
          tax: 0,
          totalAmount: createdProducts[0].price,
          status: "Fulfilled",
          paymentStatus: "Paid",
          paymentMethod: "Credit Card",
        },
        {
          orderNo: "#ORD-2026-8802",
          customerId: createdCustomers[1]._id,
          customerName: createdCustomers[1].name,
          customerEmail: createdCustomers[1].email,
          customerPhone: createdCustomers[1].phone,
          shippingAddress: { address: "42 Bond Street", city: "London", state: "Greater London", zip: "W1S 2YR", country: "UK" },
          items: [
            { productId: createdProducts[1]._id, name: createdProducts[1].name, sku: createdProducts[1].sku, price: createdProducts[1].price, quantity: 1, itemTotal: createdProducts[1].price },
          ],
          subtotal: createdProducts[1].price,
          discount: 0,
          shippingFee: 0,
          tax: 0,
          totalAmount: createdProducts[1].price,
          status: "Processing",
          paymentStatus: "Paid",
          paymentMethod: "Credit Card",
        },
      ];
      await Order.deleteMany({});
      await Order.insertMany(orderDocs);

      console.log("Seed complete");
    } catch (error) {
      console.error("Auto-seed failed:", error.message);
    }
  };

  module.exports = seedDatabase;
