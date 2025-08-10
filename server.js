// server.js
import app from "./src/app.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Validate critical environment variables at startup
const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "REKOGNITION_COLLECTION",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error(
    "\nPlease check your .env file and ensure all variables are set."
  );
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Logging enabled for image capture and face recognition`);
  console.log(`🔍 Use ?preview=true to get image previews`);
  console.log(`📁 S3 Bucket: ${process.env.S3_BUCKET}`);
  console.log(
    `👁️  Rekognition Collection: ${process.env.REKOGNITION_COLLECTION}`
  );
  console.log(`🌍 AWS Region: ${process.env.AWS_REGION}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received, shutting down gracefully");
  process.exit(0);
});
