// src/middleware/validation.js
export const validateSessionId = (req, res, next) => {
  const { sessionId } = req.params;

  if (!sessionId || sessionId.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Session ID is required",
    });
  }

  // Basic sessionId format validation (AWS session IDs are typically UUIDs)
  const sessionIdPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!sessionIdPattern.test(sessionId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid session ID format",
    });
  }

  next();
};

export const validateRequiredEnvVars = (req, res, next) => {
  const requiredVars = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET",
    "REKOGNITION_COLLECTION",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    return res.status(500).json({
      success: false,
      error: `Missing required environment variables: ${missingVars.join(", ")}`,
    });
  }

  next();
};
