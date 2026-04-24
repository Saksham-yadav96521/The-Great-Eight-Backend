import express from "express";
import InfoItem from "../models/InfoItem.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get all info items grouped by category or filtered by category query
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const items = await InfoItem.find(filter).sort({ category: 1, order: 1, createdAt: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new info item (Admin only)
router.post("/", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const item = await InfoItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update info item (Admin only)
router.put("/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const item = await InfoItem.findByIdAndUpdate(req.body.id || req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete info item (Admin only)
router.delete("/:id", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const item = await InfoItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
