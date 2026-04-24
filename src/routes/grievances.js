import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { body, param } from "express-validator";
import { Grievance } from "../models/Grievance.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { handleValidation } from "../middleware/validate.js";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-grievance-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10mb limit for grievance proofs
});

router.post(
  "/",
  authenticate,
  upload.single("photo"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
  ],
  handleValidation,
  async (req, res) => {
    let photoUrl = null;
    if (req.file) {
      const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
      photoUrl = base ? `${base}/uploads/${req.file.filename}` : `/uploads/${req.file.filename}`;
    }

    const g = await Grievance.create({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      photoUrl,
    });
    res.status(201).json({
      grievance: {
        id: g._id,
        userId: g.userId,
        title: g.title,
        description: g.description,
        photoUrl: g.photoUrl,
        status: g.status,
        createdAt: g.createdAt,
      },
    });
  }
);

router.get("/", authenticate, async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { userId: req.user._id };
  const list = await Grievance.find(filter)
    .sort({ createdAt: -1 })
    .populate("userId", "name username")
    .lean();
  res.json({
    grievances: list.map((g) => ({
      id: g._id,
      userId: g.userId,
      title: g.title,
      description: g.description,
      photoUrl: g.photoUrl,
      status: g.status,
      createdAt: g.createdAt,
    })),
  });
});

router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin"),
  [
    param("id").isMongoId().withMessage("Invalid id"),
    body("status").isIn(["pending", "resolved"]).withMessage("Invalid status"),
  ],
  handleValidation,
  async (req, res) => {
    const g = await Grievance.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate("userId", "name username");
    if (!g) return res.status(404).json({ message: "Not found" });
    res.json({
      grievance: {
        id: g._id,
        userId: g.userId,
        title: g.title,
        description: g.description,
        photoUrl: g.photoUrl,
        status: g.status,
        createdAt: g.createdAt,
      },
    });
  }
);

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const grievanceId = req.params.id;
    // Users can only delete their own grievances, admins can delete any
    const filter = req.user.role === "admin" ? { _id: grievanceId } : { _id: grievanceId, userId: req.user._id };
    
    const g = await Grievance.findOneAndDelete(filter);
    if (!g) return res.status(404).json({ message: "Grievance not found or unauthorized" });
    
    res.json({ message: "Grievance removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error removing grievance", error: error.message });
  }
});

export default router;
