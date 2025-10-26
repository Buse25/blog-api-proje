const router = require("express").Router();
const Tag = require("../models/Tag");


const { requireAuth, requireAdmin } = require("../middlewares/auth");

router.get("/", async (_req, res) => {
  const items = await Tag.find().sort("name");
  res.json(items);
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, slug } = req.body;
  const item = await Tag.create({ name, slug });
  res.status(201).json(item);
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const item = await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await Tag.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

module.exports = router;
