const mongoose = require("mongoose");

async function cleanUnsplashFromDB() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/gor-admin");
    console.log("Connected to MongoDB database");

    const db = mongoose.connection.db;

    // 1. Update Products
    const productsCol = db.collection("products");
    const prods = await productsCol.find({}).toArray();
    let prodCount = 0;
    for (const p of prods) {
      if (JSON.stringify(p).includes("unsplash")) {
        const updatedImages = (p.images || []).map((img) =>
          img && img.includes("unsplash") ? "/images/lookbook/gor-lookbook-1.webp" : img
        );
        const updatedImage = p.image && p.image.includes("unsplash") ? "/images/lookbook/gor-lookbook-1.webp" : p.image;
        await productsCol.updateOne({ _id: p._id }, { $set: { images: updatedImages, image: updatedImage } });
        prodCount++;
      }
    }
    console.log(`Cleaned ${prodCount} products containing Unsplash URLs.`);

    // 2. Update ThemeConfigs
    const themeCol = db.collection("themeconfigs");
    const themes = await themeCol.find({}).toArray();
    let themeCount = 0;
    for (const t of themes) {
      if (JSON.stringify(t).includes("unsplash")) {
        const updatedSecs = (t.sections || []).map((sec) => {
          if (sec.settings?.bgImage && sec.settings.bgImage.includes("unsplash")) {
            sec.settings.bgImage = "/images/lookbook/gor-lookbook-1.webp";
          }
          if (sec.settings?.image && sec.settings.image.includes("unsplash")) {
            sec.settings.image = "/images/lookbook/gor-lookbook-1.webp";
          }
          return sec;
        });
        await themeCol.updateOne({ _id: t._id }, { $set: { sections: updatedSecs } });
        themeCount++;
      }
    }
    console.log(`Cleaned ${themeCount} theme configurations.`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Clean DB Error:", err);
  }
}

cleanUnsplashFromDB();
