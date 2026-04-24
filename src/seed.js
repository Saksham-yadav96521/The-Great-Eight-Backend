import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "./models/User.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI in .env");
  process.exit(1);
}

const adminUser = process.env.SEED_ADMIN_USERNAME || "admin";
const adminPass = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const adminName = process.env.SEED_ADMIN_NAME || "Unit Administrator";

await mongoose.connect(uri);

const existing = await User.findOne({ username: adminUser.toLowerCase() });
if (existing) {
  console.log(`User "${adminUser}" already exists. Skipping seed.`);
  await mongoose.disconnect();
  process.exit(0);
}

const hashed = await bcrypt.hash(adminPass, 12);
await User.create({
  name: adminName,
  username: adminUser.toLowerCase(),
  password: hashed,
  role: "admin",
});

console.log(`Created admin user:
  username: ${adminUser}
  password: ${adminPass}
Change the password after first login.`);

await mongoose.disconnect();
