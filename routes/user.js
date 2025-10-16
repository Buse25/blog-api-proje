const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const { uploadAvatar } = require("../middleware/upload");
const fs = require("fs");
const path = require("path");


// Tüm kullanıcılar (istersen)
router.get("/", auth, async (req, res) => {
  const users = await User.find().select("_id username email avatarUrl bio socials createdAt updatedAt");
  res.json(users);
});

// ID ile kullanıcı
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı ID" });
    }
    const user = await User.findById(id).select("_id username email avatarUrl bio socials createdAt updatedAt");
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    res.json(user);
  } catch (err) {
    console.error("GET /user/:id", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});
/**
 * GET /user/me  -> Aktif kullanıcı bilgisi
 * Auth: Bearer token
 */
router.get("/me", auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .select("_id username email avatarUrl bio socials createdAt updatedAt");
    if (!me) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    res.json(me);
  } catch (err) {
    console.error("GET /user/me hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * PATCH /user/me  -> Profil güncelle
 * Body (örnek): { "username":"kartanesi", "bio":"Merhaba!", "avatarUrl":"...", "socials": { "x":"...", "github":"..." } }
 * Not: E-posta ve şifre güncellemesini burada kapattık. İstersen ayrı akış açarız.
 */
router.patch("/me", auth, async (req, res) => {
  try {
    const allowed = ["username", "bio", "avatarUrl", "socials"]; // izin verilen alanlar
    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    // username boş veya çok kısa ise engelle (örnek bir validasyon)
    if (update.username !== undefined) {
      const u = String(update.username).trim();
      if (u.length < 3) {
        return res.status(422).json({ message: "username en az 3 karakter olmalı" });
      }
      update.username = u;
    }

    const me = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("_id username email avatarUrl bio socials createdAt updatedAt");

    if (!me) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    res.json(me);
  } catch (err) {
    console.error("PATCH /user/me hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});
/**
 * PATCH /user/me/avatar  -> Avatar yükle (multipart/form-data)
 * Form-Data Key: avatar (File)
 */
// en üstlerde:
// const express = require("express");
// const router = express.Router();
// const auth = require("../middleware/authMiddleware");
// const User = require("../models/User");

router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find()
      .select("_id username email avatarUrl bio socials createdAt updatedAt");
    res.json(users);
  } catch (err) {
    console.error("GET /user hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});


router.patch("/me/avatar", auth, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "avatar dosyası gerekli" });

    const url = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;

    // eski avatar’ı silmek istersen (opsiyonel, basename kıyasla)
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const oldUrl = me.avatarUrl;
    me.avatarUrl = url;
    await me.save();

    // Güvenli silme (aynı uploads/avatars içindeyse)
    if (oldUrl && oldUrl.includes("/uploads/avatars/")) {
      const oldFile = path.join(process.cwd(), oldUrl.split("/uploads/")[1]);
      fs.promises.unlink(oldFile).catch(() => {}); // hata verse de yut
    }

    res.json({ avatarUrl: url });
  } catch (err) {
    console.error("PATCH /user/me/avatar hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});


module.exports = router;
