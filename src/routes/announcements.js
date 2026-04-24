import { Router } from "express";
import { body } from "express-validator";
import { Announcement } from "../models/Announcement.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { handleValidation } from "../middleware/validate.js";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  const list = await Announcement.find()
    .sort({ createdAt: -1 })
    .populate("createdBy", "name username")
    .lean();
  res.json({
    announcements: list.map((a) => ({
      id: a._id,
      message: a.message,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
    })),
  });
});

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  [body("message").trim().notEmpty().withMessage("Message is required")],
  handleValidation,
  async (req, res) => {
    const a = await Announcement.create({
      message: req.body.message,
      createdBy: req.user._id,
    });
    const populated = await a.populate("createdBy", "name username");
    res.status(201).json({
      announcement: {
        id: populated._id,
        message: populated.message,
        createdBy: populated.createdBy,
        createdAt: populated.createdAt,
      },
    });
  }
);

router.delete("/:id", authenticate, requireRole("admin"), async (req, res) => {
  const a = await Announcement.findByIdAndDelete(req.params.id);
  if (!a) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
});

export default router;
