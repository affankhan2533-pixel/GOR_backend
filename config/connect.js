const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || "mongodb://localhost:27017/gormenswear";
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });
    return conn;
  } catch (error) {
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    return null;
  }
};

module.exports = connectDB;
