// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const header = req.headers.authorization || req.headers.Authorization || "";
    const [schema, token] = header.split(" ");
    if (!/^Bearer$/i.test(schema) || !token) {
      return res.status(401).json({ message: "Yetkilendirme gerekli (Bearer token)." });
    }

    // SECRET fallback: JWT_SECRET varsa onu kullan, yoksa SECRET_TOKEN
    const secret = process.env.JWT_SECRET || process.env.SECRET_TOKEN;
    if (!secret) {
      console.error("JWT secret tanımlı değil (JWT_SECRET / SECRET_TOKEN).");
      return res.status(500).json({ message: "Sunucu yapılandırma hatası" });
    }

    const decoded = jwt.verify(token, secret);

    // payload'daki muhtemel anahtarların hepsini dene:
    req.userId = decoded.id || decoded._id || decoded.userId || (decoded.user && (decoded.user.id || decoded.user._id));

    if (!req.userId) {
      return res.status(401).json({ message: "Geçersiz token payload (id bulunamadı)" });
    }

    next();
  } catch (err) {
    console.error("authMiddleware:", err.message);
    return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token." });
  }
};
