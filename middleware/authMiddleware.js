// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const header = req.headers["authorization"] || "";
    const [schema, token] = header.split(" ");
    if (schema !== "Bearer" || !token) {
      return res.status(401).json({ message: "Yetkilendirme gerekli (Bearer token)." });
    }
    const decoded = jwt.verify(token, process.env.SECRET_TOKEN);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("authMiddleware:", err.message);
    return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token." });
  }
};
