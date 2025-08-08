// src/routes/index.js
import express from "express";
import { LivenessController } from "../controllers/livenessController.js";
import { CheckinController } from "../controllers/checkinController.js";
import { FaceController } from "../controllers/faceController.js";
import { AttendanceController } from "../controllers/attendanceController.js";
import { upload } from "../config/multer.js";
import {
  validateSessionId,
  validateRequiredEnvVars,
} from "../middlewares/validation.js";

const router = express.Router();

// Apply environment validation to all routes
router.use(validateRequiredEnvVars);

// Liveness routes
router.get("/session", LivenessController.createSession);
router.get(
  "/liveness-result/:sessionId",
  validateSessionId,
  LivenessController.getSessionResults
);

// Check-in routes
router.post(
  "/checkin",
  upload.single("photo"),
  CheckinController.manualCheckin
);

// Face management routes
router.post("/index-face", upload.single("photo"), FaceController.indexFace);
router.get("/list-collections", FaceController.listFaces);
router.delete("/delete-face", express.json(), FaceController.deleteFace);

// Attendance routes
router.get("/attendance", AttendanceController.getAttendance);
router.post("/attendance/clear", AttendanceController.clearAttendance);

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
    },
  });
});

export default router;
