// routes/category.js
const router = require("express").Router();
const Category = require("../models/Category");

// DOĞRU importlar
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// Liste (herkese açık)
router.get("/", async (_req, res) => {
  const items = await Category.find().sort("name");
  res.json(items);
});

// Ekle/Güncelle/Sil (sadece admin)
router.post("/", auth, requireAdmin, async (req, res) => {
  const { name, slug } = req.body;
  const item = await Category.create({ name, slug });
  res.status(201).json(item);
});

router.put("/:id", auth, requireAdmin, async (req, res) => {
  const item = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

router.delete("/:id", auth, requireAdmin, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

module.exports = router;
