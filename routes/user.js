const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Middleware’ler
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");
const { uploadAvatar } = require("../middleware/upload");

// Modeller
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

/* ===================== LISTELEME ===================== */

// 🔹 TÜM KULLANICILAR (SADECE ADMIN)
router.get("/", auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("_id username email role createdAt");
    res.json(users);
  } catch (err) {
    console.error("GET /users hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// 🔹 Aktif kullanıcı + aktivitelerim
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select("_id username email role avatarUrl")
      .lean();
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    // Yazılarım
    const myPosts = await Post.find({ author: req.userId })
      .sort("-createdAt")
      .select("_id title createdAt")
      .lean();

    // Beğendiklerim
    const likedPosts = await Post.find({ likes: req.userId })
      .sort("-createdAt")
      .select("_id title createdAt")
      .lean();

    // Yorum yaptıklarım
    const commentedIds = await Comment.distinct("post", { author: req.userId });
    const commentedPosts = await Post.find({ _id: { $in: commentedIds } })
      .sort("-createdAt")
      .select("_id title createdAt")
      .lean();

    return res.json({ user, myPosts, likedPosts, commentedPosts });
  } catch (e) {
    next(e);
  }
});

// 🔹 ID ile kullanıcı (herkese açık)
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı ID" });
    }
    const user = await User.findById(id).select(
      "_id username email avatarUrl bio socials createdAt updatedAt"
    );
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    res.json(user);
  } catch (err) {
    console.error("GET /users/:id hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/* ===================== PROFİL ===================== */

// 🔹 Profil güncelle
router.patch("/me", auth, async (req, res) => {
  try {
    const allowed = ["username", "bio", "avatarUrl", "socials"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.username !== undefined) {
      const u = String(update.username).trim();
      if (u.length < 3) {
        return res
          .status(422)
          .json({ message: "username en az 3 karakter olmalı" });
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
    console.error("PATCH /users/me hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// 🔹 Avatar yükle
router.patch("/me/avatar", auth, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "avatar dosyası gerekli" });

    const url = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const oldUrl = me.avatarUrl;
    me.avatarUrl = url;
    await me.save();

    // Eski avatarı güvenli sil (opsiyonel)
    if (oldUrl && oldUrl.includes("/uploads/avatars/")) {
      const oldName = path.basename(oldUrl);
      const oldFile = path.join(process.cwd(), "uploads", "avatars", oldName);
      fs.promises.unlink(oldFile).catch(() => {});
    }

    res.json({ avatarUrl: url });
  } catch (err) {
    console.error("PATCH /users/me/avatar hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
