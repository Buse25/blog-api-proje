const User = require("../models/User");

module.exports = async function requireAdmin(req, res, next) {
  try {
    // authMiddleware önce çalışmış olmalı: req.userId hazır
    const me = await User.findById(req.userId).select("role");
    if (!me || me.role !== "admin") {
      return res.status(403).json({ message: "Admin yetkisi gerekli" });
    }
    next();
  } catch (e) {
    console.error("requireAdmin:", e.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};
