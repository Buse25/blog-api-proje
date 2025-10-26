// config/db.js
const mongoose = require("mongoose");

module.exports = async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI .env içinde tanımlı değil.");
    process.exit(1);
  }
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, { dbName: process.env.MONGO_DBNAME || undefined });
    console.log("MongoDB bağlantısı başarılı****");
  } catch (err) {
    console.error("❌ MongoDB bağlantı hatası:", err.message);
    process.exit(1);
  }
};
