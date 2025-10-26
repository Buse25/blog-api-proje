// controllers/userController.js
const User = require("../User");        // senin proje yapına göre yol: "../User" (model dosyan)
const Post = require("../Post");        // "../Post"
const Comment = require("../Comment");  // "../Comment"

exports.getMe = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).select("-password"); // şifreyi dışla

    if (!me) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    // 1) Benim yazılarım
    const myPosts = await Post.find({ author: me._id }).sort({ createdAt: -1 });

    // 2) Beğendiklerim (Post.likes dizisinde benim id'm var)
    const likedPosts = await Post.find({ likes: me._id }).sort({ createdAt: -1 });

    // 3) Yorum yaptıklarım (önce benim yazdığım yorumların post id'lerini topla)
    const commentedPostIds = await Comment.distinct("post", { author: me._id });
    const commentedPosts = await Post.find({ _id: { $in: commentedPostIds } })
      .sort({ createdAt: -1 });

    res.json({
      user: me,
      myPosts,
      likedPosts,
      commentedPosts,
    });
  } catch (err) {
    next(err);
  }
};
