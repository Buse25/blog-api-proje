// controllers/postController.js
const Post = require("../models/Post");

/** POST /posts  (auth zorunlu) */
exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "title ve content zorunlu." });
    }
    const post = await Post.create({
      title,
      content,
      author: req.userId, // authMiddleware set eder
    });
    res.status(201).json(post);
  } catch (err) {
    console.error("createPost:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/** GET /posts?search=&sort=&page=&limit=  (public) */
exports.listPosts = async (req, res) => {
  try {
    const { search = "", sort = "-createdAt", page = 1, limit = 10 } = req.query;
    const q = search ? { title: { $regex: search, $options: "i" } } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Post.find(q)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("author", "username email"),
      Post.countDocuments(q),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), items });
  } catch (err) {
    console.error("listPosts:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/** GET /posts/:id  (public) */
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username email");
    if (!post) return res.status(404).json({ message: "Post bulunamadı." });
    res.json(post);
  } catch (err) {
    console.error("getPost:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/** PATCH /posts/:id  (sadece sahibi) */
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, author: req.userId },
      req.body,
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Bulunamadı veya yetki yok." });
    res.json(post);
  } catch (err) {
    console.error("updatePost:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/** DELETE /posts/:id  (sadece sahibi) */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      author: req.userId,
    });
    if (!post) return res.status(404).json({ message: "Bulunamadı veya yetki yok." });
    res.json({ message: "Silindi" });
  } catch (err) {
    console.error("deletePost:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/** POST /posts/:id/like  (auth) */
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post yok." });

    const u = req.userId.toString();
    if (!post.likes.map(String).includes(u)) post.likes.push(req.userId);
    await post.save();

    res.json({ likes: post.likes.length });
  } catch (err) {
    console.error("likePost:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

/** POST /posts/:id/unlike  (auth) */
exports.unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post yok." });

    const u = req.userId.toString();
    post.likes = post.likes.filter(id => id.toString() !== u);
    await post.save();

    res.json({ likes: post.likes.length });
  } catch (err) {
    console.error("unlikePost:", err.message);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};
