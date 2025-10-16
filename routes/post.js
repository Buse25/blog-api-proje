const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

/* ===================== POSTS ===================== */

/**
 * POST /posts  -> Yeni post oluştur (auth gerekli)
 * Body: { title, content, tags? }
 */
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body || {};
    
    // ✅ DÜZELTME #3: Güçlendirilmiş input validasyonu
    const trimmedTitle = String(title || "").trim();
    const trimmedContent = String(content || "").trim();
    
    if (!trimmedTitle || trimmedTitle.length < 5) {
      return res.status(400).json({ message: "title en az 5 karakter olmalı" });
    }
    if (!trimmedContent || trimmedContent.length < 10) {
      return res.status(400).json({ message: "content en az 10 karakter olmalı" });
    }

    const post = await Post.create({
      title: trimmedTitle,
      content: trimmedContent,
      tags: Array.isArray(tags) ? tags : [],
      author: req.userId,
    });

    return res.status(201).json(post);
  } catch (err) {
    console.error("POST /posts hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * GET /posts  -> Listeleme + Arama/Filtre/Sıralama/Sayfalama
 * Query:
 *  - search (title/content'te)
 *  - author (yazar id)
 *  - tags (virgülü: tag1,tag2)
 *  - sort (default: -createdAt, accepts: -likes)
 *  - page, limit (default: 1, 10)
 */
// ✅ DÜZELTME #2: Tekrarlanan GET endpoint'i AYNI FONKSİYON İÇİNDE BİRLEŞTİRİLDİ
router.get("/", async (req, res) => {
  try {
    const {
      search = "",
      author,
      tags,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    // ---- Sorgu objesi oluştur
    const q = {};
    if (search) {
      const searchRegex = String(search).trim();
      q.$or = [
        { title: { $regex: searchRegex, $options: "i" } },
        { content: { $regex: searchRegex, $options: "i" } },
      ];
    }
    if (author) q.author = author;
    if (tags) {
      const arr = String(tags).split(",").map(s => s.trim()).filter(Boolean);
      if (arr.length) q.tags = { $in: arr };
    }

    const _limit = Math.max(parseInt(limit, 10) || 10, 1);
    const _page = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (_page - 1) * _limit;

    const total = await Post.countDocuments(q);

    // ---- Likes'a göre sıralama isteniyor mu?
    const wantsLikeSort = /(^|,)\s*-?likes(count)?\s*(,|$)/i.test(sort);

    if (!wantsLikeSort) {
      // Normal sıralama (populate ile)
      const items = await Post.find(q)
        .sort(sort)
        .skip(skip)
        .limit(_limit)
        .populate("author", "username email");

      return res.json({
        items,
        total,
        page: _page,
        limit: _limit,
        pages: Math.ceil(total / _limit),
      });
    }

    // ---- Likes'a göre sıralama (aggregation pipeline)
    const sortObj = {};
    String(sort)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(key => {
        const dir = key.startsWith("-") ? -1 : 1;
        const k = key.replace(/^-/, "");
        if (/^likes(count)?$/i.test(k)) {
          sortObj["likesCount"] = dir;
        } else {
          sortObj[k] = dir;
        }
      });

    const items = await Post.aggregate([
      { $match: q },
      { $addFields: { likesCount: { $size: { $ifNull: ["$likes", []] } } } },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },
      {
        $project: {
          title: 1,
          content: 1,
          tags: 1,
          comments: 1,
          likes: 1,
          likesCount: 1,
          createdAt: 1,
          updatedAt: 1,
          author: {
            _id: "$author._id",
            username: "$author.username",
            email: "$author.email",
          },
        },
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: _limit },
    ]);

    return res.json({
      items,
      total,
      page: _page,
      limit: _limit,
      pages: Math.ceil(total / _limit),
    });
  } catch (err) {
    console.error("GET /posts hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * GET /posts/:id  -> Tek post
 */
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username email")
      .populate({
        path: "comments",
        populate: { path: "author", select: "username email" },
      });

    if (!post) return res.status(404).json({ message: "Post bulunamadı" });
    return res.json(post);
  } catch (err) {
    console.error("GET /posts/:id hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * PATCH /posts/:id  -> Güncelle (sadece sahibi)
 * Body: { title?, content?, tags? }
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.userId });
    if (!post) {
      return res.status(403).json({ message: "Bu postu güncelleme yetkiniz yok" });
    }

    const { title, content, tags } = req.body || {};
    
    // ✅ Güncelleme sırasında da validasyon
    if (title !== undefined) {
      const trimmedTitle = String(title).trim();
      if (trimmedTitle.length < 5) {
        return res.status(400).json({ message: "title en az 5 karakter olmalı" });
      }
      post.title = trimmedTitle;
    }
    
    if (content !== undefined) {
      const trimmedContent = String(content).trim();
      if (trimmedContent.length < 10) {
        return res.status(400).json({ message: "content en az 10 karakter olmalı" });
      }
      post.content = trimmedContent;
    }
    
    if (tags !== undefined) {
      post.tags = Array.isArray(tags) ? tags : post.tags;
    }

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error("PATCH /posts/:id hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * DELETE /posts/:id  -> Sil (sadece sahibi)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      author: req.userId,
    });
    if (!post) {
      return res.status(403).json({ message: "Bu postu silme yetkiniz yok" });
    }

    // Post silinirken bağlı yorumları da sil (Cascade delete)
    await Comment.deleteMany({ post: post._id });

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("DELETE /posts/:id hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * POST /posts/:id/like  -> Like/Unlike toggle (auth gerekli)
 */
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post bulunamadı" });

    const idx = post.likes.findIndex(u => String(u) === String(req.userId));
    if (idx === -1) {
      post.likes.push(req.userId);
    } else {
      post.likes.splice(idx, 1);
    }

    await post.save();
    return res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error("POST /posts/:id/like hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;