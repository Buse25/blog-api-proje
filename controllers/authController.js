// controllers/authController.js - E-posta Doğrulama: ENV ile aç/kapa
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// ============ FEATURE FLAG ============
// .env -> EMAIL_VERIFICATION_ENABLED=false   (dev'de kapat)
// .env -> EMAIL_VERIFICATION_ENABLED=true    (prod'da aç)
const EMAIL_VERIFICATION_ENABLED =
  (process.env.EMAIL_VERIFICATION_ENABLED || "true").toLowerCase() === "true";

// ============ EMAIL TRANSPORTER SETUP ============
// E-posta doğrulaması kapalıysa transporter kurmaya gerek yok.
let transporter = null;
if (EMAIL_VERIFICATION_ENABLED) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Gmail için App Password olmalı
    },
  });
}

// ============ HELPER: TOKEN ÜRETİCİ ============
const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.SECRET_TOKEN, { expiresIn: "7d" });
};

// ============ HELPER: VERIFICATION TOKEN ÜRETİCİ ============
const generateVerificationToken = () => crypto.randomBytes(32).toString("hex");

// ============ HELPER: E-POSTA GÖNDERİCİ ============
// Flag kapalıysa no-op (her zaman "başarılı" dön)
const sendVerificationEmail = async (email, verificationToken) => {
  if (!EMAIL_VERIFICATION_ENABLED) return true;

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "E-posta Doğrulama - Blog Platform",
      html: `
        <h2>E-posta Doğrulaması</h2>
        <p>Merhaba!</p>
        <p>Blog platformumuza hoş geldiniz. E-postanızı doğrulamak için aşağıdaki linke tıklayın:</p>
        <a href="${verificationUrl}" style="background-color:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
          E-postamı Doğrula
        </a>
        <p>Veya bu linki tarayıcınıza yapıştırın: ${verificationUrl}</p>
        <p>Bu link 24 saat geçerlidir.</p>
        <p>Eğer bu kaydı siz yapmadıysanız bu e-postayı görmezden gelin.</p>
      `,
    });
    return true;
  } catch (err) {
    console.error("E-posta gönderme hatası:", err);
    return false;
  }
};

// ============ POST /auth/register ============
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1) Basit doğrulamalar
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tüm alanlar zorunludur." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Geçerli bir e-posta adresi girin." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Şifre en az 8 karakter olmalı." });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message: "Username 3-20 karakter olmalı, sadece alfanumerik ve _ içerebilir.",
      });
    }

    // 2) Email / username benzersiz mi?
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "Bu e-posta zaten kayıtlı." });
    }
    if (await User.findOne({ username })) {
      return res.status(409).json({ message: "Bu kullanıcı adı zaten alınmış." });
    }

    // 3) Şifreyi hashle
    const hashed = await bcrypt.hash(password, 12);

    // 4) Flag'e göre verification alanlarını hazırla
    let verificationToken = null;
    let verificationTokenExpiry = null;
    const isEmailVerifiedDefault = !EMAIL_VERIFICATION_ENABLED; // kapalıysa direkt verified

    if (EMAIL_VERIFICATION_ENABLED) {
      verificationToken = generateVerificationToken();
      verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
    }

    // 5) Kullanıcıyı oluştur
    const user = await User.create({
      username,
      email,
      password: hashed,
      isEmailVerified: isEmailVerifiedDefault,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
    });

    // 6) E-posta gönder (yalnızca flag açıksa gerçek gönderim yapılır)
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (EMAIL_VERIFICATION_ENABLED && !emailSent) {
      // Eski davranış: kullanıcıyı silip 500 dönmek yerine, 201 dönüp bilgi verebilirsin.
      // İstersen aşağıdaki 2 satırı yeniden aç.
      // await User.findByIdAndDelete(user._id);
      // return res.status(500).json({ message: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." });

      return res.status(201).json({
        status: "ok",
        message:
          "Kayıt başarılı ancak doğrulama e-postası şu an gönderilemedi. Daha sonra 'Yeniden gönder' deneyin.",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
      });
    }

    return res.status(201).json({
      status: "ok",
      message: EMAIL_VERIFICATION_ENABLED
        ? "Kayıt başarılı! Lütfen e-postanızı doğrulamak için gönderilen linke tıklayın."
        : "Kayıt başarılı! (Dev mod) E-posta doğrulaması devre dışı.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// ============ POST /auth/verify-email ============
exports.verifyEmail = async (req, res) => {
  try {
    if (!EMAIL_VERIFICATION_ENABLED) {
      return res.status(200).json({
        status: "ok",
        message: "E-posta doğrulaması devre dışı (dev).",
      });
    }

    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Verification token gerekli." });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { $gt: new Date() },
      isEmailVerified: false,
    });

    if (!user) {
      return res.status(400).json({ message: "Geçersiz veya süresi dolmuş token." });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiry = null;
    await user.save();

    return res.status(200).json({
      status: "ok",
      message: "E-posta başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.",
    });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// ============ POST /auth/resend-verification ============
exports.resendVerificationEmail = async (req, res) => {
  try {
    if (!EMAIL_VERIFICATION_ENABLED) {
      return res.status(200).json({
        status: "ok",
        message: "Doğrulama e-postası devre dışı (dev).",
      });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-posta adresi gerekli." });

    const user = await User.findOne({ email, isEmailVerified: false });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı veya zaten doğrulanmış." });
    }

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpiry = verificationTokenExpiry;
    await user.save();

    const emailSent = await sendVerificationEmail(email, verificationToken);
    if (!emailSent) {
      return res.status(500).json({ message: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." });
    }

    return res.status(200).json({ status: "ok", message: "Doğrulama e-postası yeniden gönderildi." });
  } catch (err) {
    console.error("RESEND VERIFICATION ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// ============ POST /auth/login ============
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // JSON body düzgün gelmemişse
    if (typeof req.body === "string") {
      return res.status(400).json({ message: "JSON body geçersiz." });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "E-posta ve şifre zorunlu." });
    }

    email = String(email).trim().toLowerCase();

    // şema: password select:false ise burası şart!
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    if (!user.password) {
      // Eski kayıtlar veya projection problemi için koruma
      console.error("Login: password hash bulunamadı (projection?)");
      return res.status(500).json({ message: "Kullanıcı verisi eksik (password)." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Şifre hatalı." });
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_TOKEN, { expiresIn: "7d" });

    // şifreyi response’tan çıkar
    return res.status(200).json({
      status: "ok",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

