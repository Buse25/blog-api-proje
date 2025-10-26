// routes/post.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

/* MODELLER */
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Category = require("../models/Category");
const Tag = require("../models/Tag");

/* MIDDLEWARE */
const auth = require("../middleware/authMiddleware");

/* =============== HELPERS =============== */
function toArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string" && v.includes(",")) return v.split(",").map(s => s.trim()).filter(Boolean);
  return [v].filter(Boolean);
}

async function resolveIds(Model, incoming) {
  const arr = toArray(incoming);
  const ids = [];
  const names = [];
  arr.forEach(x => {
    if (mongoose.Types.ObjectId.isValid(String(x))) ids.push(String(x));
    else if (typeof x === "string") names.push(x.trim());
  });
  let found = [];
  if (names.length) {
    found = await Model.find({
      $or: [{ name: { $in: names } }, { slug: { $in: names.map(n => n.toLowerCase()) } }],
    }).select("_id name slug");
    const foundNames = new Set(found.map(f => f.name).concat(found.map(f => f.slug)));
    const missing = names.filter(n => !foundNames.has(n) && !foundNames.has(n.toLowerCase()));
    if (missing.length) {
      const created = await Model.insertMany(
        missing.map(n => ({ name: n, slug: n.toLowerCase().replace(/\s+/g, "-") })),
        { ordered: false }
      );
      found = found.concat(created);
    }
  }
  return ids.concat(found.map(f => String(f._id)));
}

/* =============== UPLOAD =============== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "posts");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage });

/* =============== CREATE =============== */
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;
    const categoryIds = await resolveIds(Category, req.body["categories[]"] ?? req.body.categories);
    const tagIds = await resolveIds(Tag, req.body["tags[]"] ?? req.body.tags);
    const base = `${req.protocol}://${req.get("host")}`;
    const imageUrl = req.file ? `${base}/uploads/posts/${req.file.filename}` : null;

    const post = await Post.create({
      title,
      content,
      tags: tagIds,
      categories: categoryIds,
      imageUrl,
      author: req.userId,
    });

    res.status(201).json(post);
  } catch (e) {
    console.error("POST /posts hata:", e);
    res.status(400).json({ message: "Kaydedilemedi", detail: e.message });
  }
});

/* =============== UPDATE =============== */
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;
    const data = { title, content };

    if ("tags" in req.body || "tags[]" in req.body)
      data.tags = await resolveIds(Tag, req.body["tags[]"] ?? req.body.tags);
    if ("categories" in req.body || "categories[]" in req.body)
      data.categories = await resolveIds(Category, req.body["categories[]"] ?? req.body.categories);

    if (req.file) {
      const base = `${req.protocol}://${req.get("host")}`;
      data.imageUrl = `${base}/uploads/posts/${req.file.filename}`;
    }

    const post = await Post.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(post);
  } catch (e) {
    console.error("PUT /posts/:id hata:", e);
    res.status(400).json({ message: "Güncellenemedi", detail: e.message });
  }
});

/* =============== LISTE / FILTRE =============== */
async function toObjectIdsOrNames(Model, incoming) {
  const arr = toArray(incoming);
  if (!arr.length) return [];
  const ids = arr.filter(x => mongoose.Types.ObjectId.isValid(String(x)));
  const names = arr.filter(x => !mongoose.Types.ObjectId.isValid(String(x)));
  if (!names.length) return ids;
  const docs = await Model.find({
    $or: [{ name: { $in: names } }, { slug: { $in: names.map(n => n.toLowerCase()) } }],
  }).select("_id");
  return ids.concat(docs.map(d => String(d._id)));
}

router.get("/", async (req, res) => {
  try {
    const { search = "", author, tags, categories, sort: rawSort, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      const regex = new RegExp(String(search).trim(), "i");
      filter.$or = [{ title: regex }, { content: regex }];
    }
    if (author) filter.author = author;

    const catIds = await toObjectIdsOrNames(Category, categories);
    if (catIds.length) filter.categories = { $in: catIds };
    const tagIds = await toObjectIdsOrNames(Tag, tags);
    if (tagIds.length) filter.tags = { $in: tagIds };

    const sortObj =
      rawSort === "popular"
        ? { views: -1 }
        : rawSort
        ? { [rawSort.replace("-", "")]: rawSort.startsWith("-") ? -1 : 1 }
        : { createdAt: -1 };

    const _limit = Math.max(parseInt(limit) || 10, 1);
    const _page = Math.max(parseInt(page) || 1, 1);
    const skip = (_page - 1) * _limit;

    const total = await Post.countDocuments(filter);
    const items = await Post.find(filter)
      .populate("author categories tags")
      .sort(sortObj)
      .skip(skip)
      .limit(_limit);

    res.json({ items, total, page: _page, limit: _limit, pages: Math.ceil(total / _limit) });
  } catch (err) {
    console.error("GET /posts hata:", err);
    res.status(500).json({ message: "Sunucu hatası", detail: err.message });
  }
});

/* =============== TEK KAYIT =============== */
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("author categories tags");
    if (!post) return res.status(404).json({ message: "Post bulunamadı" });
    res.json(post);
  } catch (err) {
    console.error("GET /posts/:id hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

/* =============== DELETE / LIKE / SIMILAR =============== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.userId });
    if (!post) return res.status(403).json({ message: "Bu postu silme yetkiniz yok" });
    await Comment.deleteMany({ post: post._id });
    res.json({ status: "ok" });
  } catch (err) {
    console.error("DELETE /posts/:id hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post bulunamadı" });
    const idx = post.likes.findIndex(u => String(u) === String(req.userId));
    if (idx === -1) post.likes.push(req.userId);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error("POST /posts/:id/like hata:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.get("/:id/similar", async (req, res) => {
  try {
    const base = await Post.findById(req.params.id).select("categories tags");
    if (!base) return res.status(404).json({ message: "Post bulunamadı" });
    const items = await Post.find({
      _id: { $ne: base._id },
      $or: [{ categories: { $in: base.categories } }, { tags: { $in: base.tags } }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title author createdAt")
      .populate("author", "username");
    res.json(items);
  } catch (e) {
    console.error("GET /posts/:id/similar hata:", e);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
