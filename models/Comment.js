const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema({
  post:   { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text:   { type: String, required: true, trim: true },
  parentComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true } // <-- yeni
}, { timestamps: true });

module.exports = mongoose.model("Comment", CommentSchema);
