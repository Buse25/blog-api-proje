// middleware/validate.js
module.exports = (validator) => {
  return (req, res, next) => {
    try {
      const result = validator(req);
      if (result !== true) {
        return res.status(400).json({ message: result || "Geçersiz istek" });
      }
      next();
    } catch (err) {
      console.error("validate middleware:", err.message);
      return res.status(400).json({ message: "Geçersiz istek" });
    }
  };
};
