const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Yardımcı: Token üret
const createToken = (userId) => {
  return jwt.sign(
    { id: userId },                 // payload (çok minimal tutuyoruz)
    process.env.SECRET_TOKEN,       // gizli anahtar
    { expiresIn: "7d" }             // token 7 gün geçerli
  );
};

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1) Basit doğrulamalar
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tüm alanlar zorunludur." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı." });
    }

    // 2) Email zaten var mı?
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Bu e-posta zaten kayıtlı." });
    }

    // 3) Şifreyi hashle
    const hashed = await bcrypt.hash(password, 12);

    // 4) Kullanıcıyı oluştur
    const user = await User.create({
      username,
      email,
      password: hashed,
    });

    // 5) Token üret ve döndür
    const token = createToken(user._id);
    return res.status(201).json({
      status: "ok",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err.message);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Zorunlu alanlar
    if (!email || !password) {
      return res.status(400).json({ message: "E-posta ve şifre zorunlu." });
    }

    // 2) Kullanıcı var mı?
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    // 3) Şifre doğru mu?
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı." });
    }

    // 4) Token üret
    const token = createToken(user._id);

    return res.status(200).json({
      status: "ok",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};
