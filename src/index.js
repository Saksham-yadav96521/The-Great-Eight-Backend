import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import mediaRoutes from "./routes/media.js";
import grievanceRoutes from "./routes/grievances.js";
import announcementRoutes from "./routes/announcements.js";
import adminRoutes from "./routes/admin.js";
import infoRoutes from "./routes/info.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

app.use("/api/auth", authRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/info", infoRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

try {
  await connectDb();
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  }
} catch (err) {
  console.error("Server startup failed:", err.message || err);
}

export default app;
