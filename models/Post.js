// models/Post.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const PostSchema = new Schema(
  {
    title:     { type: String, required: true, trim: true, index: true },
    content:   { type: String, required: true },
    author:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // KATEGORİ & TAG -> referans
    categories:{ type: [Schema.Types.ObjectId], ref: "Category", default: [], index: true },
    tags:      { type: [Schema.Types.ObjectId], ref: "Tag",       default: [], index: true },

    // BEĞENİ -> kullanıcı id listesi; sayı = likes.length
    likes:     [{ type: Schema.Types.ObjectId, ref: "User" }],

    comments:  [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    views:     { type: Number, default: 0 },

    imageUrl:  { type: String, default: null },
  },
  { timestamps: true }
);

// Arama için
PostSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("Post", PostSchema);
