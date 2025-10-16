// middleware/upload.js
const multer = require("multer");
const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const avatarDir = path.join(process.cwd(), "uploads", "avatars");
ensureDir(avatarDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".png";
    const safe = (file.originalname || "avatar").replace(/\s+/g, "_").replace(/[^\w.\-]/g, "");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + safe);
  }
});

function fileFilter(req, file, cb) {
  if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Sadece resim dosyaları yüklenebilir."));
  }
}

exports.uploadAvatar = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
