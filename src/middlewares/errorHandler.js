// src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "File size too large",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      error: "Unexpected field in form data",
    });
  }

  // AWS SDK errors
  if (err.name === "ResourceNotFoundException") {
    return res.status(404).json({
      success: false,
      error: "AWS resource not found",
    });
  }

  if (err.name === "AccessDenied") {
    return res.status(403).json({
      success: false,
      error: "Access denied to AWS resource",
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
};
