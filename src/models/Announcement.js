import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model("Announcement", announcementSchema);
