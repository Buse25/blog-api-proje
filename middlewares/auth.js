// middlewares/auth.js
const baseAuth = require("../middleware/authMiddleware");
const User = require("../models/User");

// 1) Giriş kontrolü: mevcut middleware'i doğrudan kullan
exports.requireAuth = baseAuth;

// 2) Admin kontrolü
exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Giriş gerekli" });
    const me = await User.findById(req.userId).select("role");
    if (me?.role === "admin") return next();
    return res.status(403).json({ message: "Yönetici izni gerekli" });
  } catch {
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// 3) Sahip veya admin
exports.requireOwnerOrAdmin = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id).select("author");
    if (!doc) return res.status(404).json({ message: "Kayıt yok" });

    if (String(doc.author) === String(req.userId)) return next();

    const me = await User.findById(req.userId).select("role");
    if (me?.role === "admin") return next();

    return res.status(403).json({ message: "Yetki yok" });
  } catch {
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};
