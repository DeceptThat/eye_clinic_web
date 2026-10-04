import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
await mongoose.connect(process.env.MONGODB_URI);

const users = mongoose.connection.collection("users");
const now = new Date();
await users.updateOne(
  { username: "admin" },
  {
    $set: { name: "Clinic Admin", role: "Admin", isActive: true,
            passwordHash: await bcrypt.hash("admin123", 10), updatedAt: now },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true }
);
console.log("Admin ready: username admin / password admin123");
await mongoose.disconnect();