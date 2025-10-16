// middleware/commentValidators.js
exports.createComment = (req) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return "text zorunlu";
  if (String(text).trim().length < 1) return "text çok kısa";
  return true;
};

exports.updateComment = (req) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return "text zorunlu";
  if (String(text).trim().length < 1) return "text çok kısa";
  return true;
};
