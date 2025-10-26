// models/User.js
const mongoose = require("mongoose");



const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
 role: { type: String, enum: ["user", "admin"], default: "user" },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, required: true, select: false },
    avatarUrl: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    socials: {
      twitter: { type: String, default: "" },
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    
    // ============ E-POSTA DOĞRULAMA ALANLARI ============
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

// İndexler
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model("User", userSchema);