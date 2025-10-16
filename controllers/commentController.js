// controllers/commentController.js
const Comment = require("../models/Comment");
const Post = require("../models/Post");

/**
 * POST /posts/:id/comments  -> Yorum ekle (auth gerekli)
 * Body: { text }
 */
exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body || {};

    if (!postId) return res.status(400).json({ message: "postId bulunamadı" });
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "text zorunlu" });
    }

    const post = await Post.findById(postId).select("_id");
    if (!post) return res.status(404).json({ message: "Post bulunamadı" });

    const comment = await Comment.create({
      post: post._id,
      author: req.userId,
      text: String(text).trim(),
    });

    const populated = await comment.populate("author", "username email");
    await Post.updateOne({ _id: post._id }, { $push: { comments: comment._id } });

    return res.status(201).json(populated);
  } catch (err) {
    console.error("createComment hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

/**
 * GET /posts/:id/comments  -> Yorumları listele
 */
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) return res.status(400).json({ message: "postId bulunamadı" });

    const exists = await Post.exists({ _id: postId });
    if (!exists) return res.status(404).json({ message: "Post bulunamadı" });

    const comments = await Comment.find({ post: postId })
      .sort("-createdAt")
      .populate("author", "username email");

    return res.json(comments);
  } catch (err) {
    console.error("getComments hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

/**
 * PUT /posts/:postId/comments/:commentId  -> Yorum güncelle (sadece sahibi)
 * Body: { text }
 */
exports.updateComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
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
    console.error("updateComment hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

/**
 * DELETE /posts/:postId/comments/:commentId  -> Yorum sil (sadece sahibi)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

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
    console.error("deleteComment hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

/**
 * POST /posts/:postId/comments/:commentId/replies  -> Bir yoruma yanıt
 * Body: { text }
 */
exports.createReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "text zorunlu" });
    }

    const parent = await Comment.findOne({ _id: commentId, post: postId }).select("_id post");
    if (!parent) return res.status(404).json({ message: "Üst yorum bulunamadı" });

    const reply = await Comment.create({
      post: postId,
      author: req.userId,
      text: String(text).trim(),
      parentComment: parent._id,
    });

    const populated = await reply.populate("author", "username email");
    return res.status(201).json(populated);
  } catch (err) {
    console.error("createReply hata:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};