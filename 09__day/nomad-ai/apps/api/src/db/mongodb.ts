import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/nomad_ai";

export async function connectDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(DATABASE_URL);
    console.log("🟢 Connected to MongoDB database successfully.");
  } catch (error) {
    console.error("🔴 Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

export default mongoose;
