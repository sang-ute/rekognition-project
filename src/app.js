// src/app.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import "./utils/logger.js"; // Initialize logging

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// API routes
app.use("/", routes);

// // Serve frontend for any non-API routes (SPA support)
// app.get("*", (req, res) => {
//   // Only serve index.html for non-API routes
//   if (!req.path.startsWith("/api")) {
//     res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
//   } else {
//     res.status(404).json({ success: false, error: "API endpoint not found" });
//   }
// });

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
