import { lambdaToExpress } from "../utils/lambdaToExpress.js";
// src/routes/index.js
import express from "express";
// import { LivenessController } from "../controllers/livenessController.js";
// import { CheckinController } from "../controllers/checkinController.js";
// import { FaceController } from "../controllers/faceController.js";
// import { AttendanceController } from "../controllers/attendanceController.js";
import { upload } from "../config/multer.js";
import {
  validateSessionId,
  validateRequiredEnvVars,
} from "../middlewares/validation.js";

const router = express.Router();

// Apply environment validation to all routes
router.use(validateRequiredEnvVars);

// Liveness routes
import { handler as createSessionHandler } from "../../amplify/functions/sessionFunction/handler.js";
router.get("/session", lambdaToExpress(createSessionHandler));

import { handler as getSessionResultsHandler } from "../../amplify/functions/livenessResultFunction/handler.js";
router.get(
  "/livetness-result/:sessionId",
  validateSessionId,
  lambdaToExpress(getSessionResultsHandler)
);

// Face management routes
import { handler as indexFaceHandler } from "../../amplify/functions/indexFaceFunction/handler.js";
router.post(
  "/index-face",
  upload.single("photo"),
  lambdaToExpress(indexFaceHandler)
);

import { handler as listCollectionHandler } from "../../amplify/functions/listCollectionFunction/handler.js";
router.get("/list-collections", lambdaToExpress(listCollectionHandler));

import { handler as deleteFaceHandler } from "../../amplify/functions/deleteFaceFunction/handler.js";
router.delete(
  "/delete-face",
  express.json(),
  lambdaToExpress(deleteFaceHandler)
);

// Attendance routes
import { handler as getAttendanceHandler } from "../../amplify/functions/attendanceFunction/handler.js";
router.get("/attendance", lambdaToExpress(getAttendanceHandler));

// Health check
// router.get("/health", (req, res) => {
//     res.json({
//         success: true,
//         status: "healthy",
//         timestamp: new Date().toISOString(),
//         environment: {
//             nodeVersion: process.version,
//             platform: process.platform,
//             uptime: process.uptime(),
//         },
//     });
// });

export default router;
