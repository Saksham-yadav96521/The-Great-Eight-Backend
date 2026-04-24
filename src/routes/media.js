import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from "express-validator";
import { Media } from "../models/Media.js";
import { authenticate } from "../middleware/auth.js";
import { handleValidation } from "../middleware/validate.js";

const router = Router();

const uploadDir = process.env.NODE_ENV === "production" ? "/tmp/uploads" : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype) ||
      /^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
    if (!ok) {
      return cb(new Error("Only images (jpeg, png, gif, webp) or videos (mp4, webm, mov) are allowed"));
    }
    cb(null, true);
  },
});

router.get(
  "/",
  authenticate,
  [
    query("q").optional().trim(),
    query("type").optional().isIn(["photo", "video", "all"]),
  ],
  handleValidation,
  async (req, res) => {
    const filter = {};
    const t = req.query.type;
    if (t && t !== "all") filter.type = t;
    const q = req.query.q;
    if (q) filter.title = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const items = await Media.find(filter)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name username")
      .lean();

    res.json({
      media: items.map((m) => ({
        id: m._id,
        title: m.title,
        type: m.type,
        fileUrl: m.fileUrl,
        uploadedBy: m.uploadedBy,
        createdAt: m.createdAt,
      })),
    });
  }
);

router.post(
  "/",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const title = (req.body.title || "").trim();
      if (!title) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Title is required" });
      }
      let type = req.body.type;
      if (!["photo", "video"].includes(type)) {
        type = req.file.mimetype.startsWith("video/") ? "video" : "photo";
      }
      const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
      const fileUrl = base ? `${base}/uploads/${req.file.filename}` : `/uploads/${req.file.filename}`;

      const doc = await Media.create({
        title,
        type,
        fileUrl,
        uploadedBy: req.user._id,
      });
      const populated = await doc.populate("uploadedBy", "name username");
      res.status(201).json({
        media: {
          id: populated._id,
          title: populated.title,
          type: populated.type,
          fileUrl: populated.fileUrl,
          uploadedBy: populated.uploadedBy,
          createdAt: populated.createdAt,
        },
      });
    } catch (e) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (e instanceof multer.MulterError) {
        return res.status(400).json({ message: e.message });
      }
      res.status(400).json({ message: e.message || "Upload failed" });
    }
  }
);

router.delete("/:id", authenticate, async (req, res) => {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: "Not found" });
    if (req.user.role !== "admin" && media.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own uploads" });
    }
    const filename = media.fileUrl.split("/uploads/").pop();
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await media.deleteOne();
    res.json({ ok: true });
});

export default router;
