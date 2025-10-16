const express = require("express");
// mergeParams: true => üst router (/posts/:id/comments) paramlarını alabilmek için şart
const router = express.Router({ mergeParams: true });
const auth = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const validate = require("../middleware/validate");
const { createComment, updateComment } = require("../middleware/commentValidators");


/* ===================== COMMENTS ===================== */
/**
 * Yardımcı: parametre adını esnek al (/:id veya /:postId olabilir)
 */
function getPostIdFromParams(params) {
  return params.id || params.postId;
}

/**
 * POST /posts/:id/comments  -> Yorum ekle (auth gerekli)
 * Body: { text }
 */
router.post("/", auth, async (req, res) => {
  try {
    const postId = getPostIdFromParams(req.params);
    const { text } = req.body || {};

    if (!postId) return res.status(400).json({ message: "postId bulunamadı" });
    if (!text || !String(text).trim()) return res.status(400).json({ message: "text zorunlu" });

    const post = await Post.findById(postId).select("_id");
    if (!post) return res.status(404).json({ message: "Post bulunamadı" });

    const comment = await Comment.create({
      post: post._id,
      author: req.userId,
      text: String(text).trim(),
    });

    // Post.comments listesine ekleyelim (opsiyonel ama güzel olur)
    await Post.updateOne({ _id: post._id }, { $push: { comments: comment._id } });

    const populated = await comment.populate("author", "username email");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("POST /posts/:id/comments hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * GET /posts/:id/comments  -> Yorumları listele
 */
router.get("/", async (req, res) => {
  try {
    const postId = getPostIdFromParams(req.params);
    if (!postId) return res.status(400).json({ message: "postId bulunamadı" });

    const exists = await Post.exists({ _id: postId });
    if (!exists) return res.status(404).json({ message: "Post bulunamadı" });

    const comments = await Comment.find({ post: postId })
      .sort("-createdAt")
      .populate("author", "username email");

    return res.json(comments);
  } catch (err) {
    console.error("GET /posts/:id/comments hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * PUT /posts/:postId/comments/:commentId  -> Yorum güncelle (sadece sahibi)
 * Body: { text }
 */
router.put("/:commentId", auth, async (req, res) => {
  try {
    const postId = getPostIdFromParams(req.params);
    const { commentId } = req.params;
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "text zorunlu" });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      post: postId,
      author: req.userId,
    });
    if (!comment) {
      return res.status(403).json({ message: "Bu yorumu güncelleme yetkiniz yok" });
    }

    comment.text = String(text).trim();
    await comment.save();
    return res.json(comment);
  } catch (err) {
    console.error("PUT /posts/:id/comments/:commentId hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /posts/:id/comments/:commentId/replies  -> Bir yoruma yanıt
router.post("/:commentId/replies", auth, validate(createComment), async (req, res) => {
  try {
    const postId = getPostIdFromParams(req.params);
    const parentId = req.params.commentId;

    // parent var mı ve aynı post'a mı ait?
    const parent = await Comment.findOne({ _id: parentId, post: postId }).select("_id post");
    if (!parent) return res.status(404).json({ message: "Üst yorum bulunamadı" });

    const reply = await Comment.create({
      post: postId,
      author: req.userId,
      text: req.body.text.trim(),
      parentComment: parent._id
    });

    const populated = await reply.populate("author", "username email");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("POST reply hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

/**
 * DELETE /posts/:postId/comments/:commentId  -> Yorum sil (sadece sahibi)
 */
router.delete("/:commentId", auth, async (req, res) => {
  try {
    const postId = getPostIdFromParams(req.params);
    const { commentId } = req.params;

    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      post: postId,
      author: req.userId,
    });
    if (!comment) {
      return res.status(403).json({ message: "Bu yorumu silme yetkiniz yok" });
    }

    await Post.updateOne({ _id: postId }, { $pull: { comments: comment._id } });

    return res.json({ status: "ok" });
  } catch (err) {
    console.error("DELETE /posts/:id/comments/:commentId hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
