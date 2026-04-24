import { Router } from "express";
import { User } from "../models/User.js";
import { Media } from "../models/Media.js";
import { Grievance } from "../models/Grievance.js";
import { Announcement } from "../models/Announcement.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireRole("admin"));

router.get("/stats", async (_req, res) => {
  const [userCount, mediaCount, grievancePending, announcementCount] = await Promise.all([
    User.countDocuments(),
    Media.countDocuments(),
    Grievance.countDocuments({ status: "pending" }),
    Announcement.countDocuments(),
  ]);
  res.json({
    stats: {
      users: userCount,
      media: mediaCount,
      grievancesPending: grievancePending,
      announcements: announcementCount,
    },
  });
});

router.get("/users", async (_req, res) => {
  const users = await User.find().select("name username role createdAt").sort({ createdAt: -1 }).lean();
  res.json({
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Optionally, could also delete their grievances or media here if needed
    // await Grievance.deleteMany({ userId: req.params.id });
    
    res.json({ message: "User removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error removing user", error: error.message });
  }
});

export default router;
