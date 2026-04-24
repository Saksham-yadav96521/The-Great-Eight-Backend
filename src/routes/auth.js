import { Router } from "express";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { User } from "../models/User.js";
import { authenticate, requireRole, signToken } from "../middleware/auth.js";
import { handleValidation } from "../middleware/validate.js";

const router = Router();

router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  handleValidation,
  async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  }
);

router.post(
  "/register",
  authenticate,
  requireRole("admin"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role").optional().isIn(["admin", "user"]).withMessage("Invalid role"),
  ],
  handleValidation,
  async (req, res) => {
    const { name, username, password, role } = req.body;
    const exists = await User.findOne({ username: username.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: "Username already registered" });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      password: hashed,
      role: role === "admin" ? "admin" : "user",
    });
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  }
);

router.get("/me", authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

export default router;
