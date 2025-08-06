import express from "express";
import cors from "cors";
import multer from "multer";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  GetFaceLivenessSessionResultsCommand,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
} from "@aws-sdk/client-rekognition";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const checkedInUsers = new Set();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend/dist")));

app.get("/liveness-result/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  console.log("Fetching liveness result for session:", sessionId);

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: "Missing session ID",
    });
  }

  try {
    // Get liveness session results
    const command = new GetFaceLivenessSessionResultsCommand({
      SessionId: sessionId,
    });

    const livenessResult = await client.send(command);
    console.log("Liveness result:", livenessResult);

    // Check if person is live
    const isLive =
      livenessResult.Status === "SUCCEEDED" && livenessResult.Confidence > 90; // Adjust threshold as needed

    if (isLive) {
      // If person is live, extract the face from the liveness session
      // and compare it against your Rekognition collection

      // The liveness session stores the video/images in S3
      // You need to extract a frame and search for matches

      try {
        // Get the reference image from the liveness session
        // This requires downloading from S3 where Rekognition stored the session data
        const s3Key = `rekognition-output/${sessionId}/`; // Based on your session creation

        // List objects in the S3 prefix to find the reference image
        const listParams = {
          Bucket: process.env.S3_BUCKET,
          Prefix: s3Key,
        };

        const listResult = await s3.listObjectsV2(listParams).promise();

        console.log("HELLO ");

        // Find the reference image (usually ends with reference-image.jpg or similar)
        const referenceImageObj = listResult.Contents.find(
          (obj) => obj.Key.includes("reference") || obj.Key.includes("image")
        );

        if (referenceImageObj) {
          // Get the reference image from S3
          const imageParams = {
            Bucket: process.env.S3_BUCKET,
            Key: referenceImageObj.Key,
          };

          const imageResult = await s3.getObject(imageParams).promise();

          // Search for faces in your collection using the reference image
          const searchParams = {
            CollectionId: process.env.REKOGNITION_COLLECTION,
            Image: {
              Bytes: imageResult.Body,
            },
            FaceMatchThreshold: 90,
            MaxFaces: 1,
          };

          const searchResult = await rekognition
            .searchFacesByImage(searchParams)
            .promise();

          if (searchResult.FaceMatches.length > 0) {
            const matchedFace = searchResult.FaceMatches[0];
            const name = matchedFace.Face.ExternalImageId;
            const similarity = matchedFace.Similarity;

            // Add to checked-in users
            checkedInUsers.add(name);

            res.json({
              success: true,
              isLive: true,
              confidence: livenessResult.Confidence / 100,
              faceMatch: {
                found: true,
                name: name,
                similarity: similarity,
              },
              message: `Welcome ${name}! Face verified with ${similarity.toFixed(1)}% similarity.`,
            });
          } else {
            // Person is live but not in the collection
            res.json({
              success: true,
              isLive: true,
              confidence: livenessResult.Confidence / 100,
              faceMatch: {
                found: false,
              },
              message:
                "You are verified as a live person, but your face is not in our system.",
            });
          }
        } else {
          // Could not find reference image
          res.json({
            success: true,
            isLive: true,
            confidence: livenessResult.Confidence / 100,
            faceMatch: {
              found: false,
            },
            message:
              "Liveness verified but could not extract face for matching.",
          });
        }
      } catch (faceMatchError) {
        console.error("Face matching error:", faceMatchError);
        // Still return liveness success even if face matching fails
        res.json({
          success: true,
          isLive: true,
          confidence: livenessResult.Confidence / 100,
          faceMatch: {
            found: false,
            error: faceMatchError.message,
          },
          message: "Liveness verified but face matching failed.",
        });
      }
    } else {
      // Person is not live
      res.json({
        success: true,
        isLive: false,
        confidence: livenessResult.Confidence / 100,
        reason:
          livenessResult.Status === "FAILED"
            ? "Liveness check failed"
            : "Low confidence score",
        message: "Liveness verification failed. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error getting liveness results:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve liveness results",
    });
  }
});
app.post("/index-face", upload.single("photo"), async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "Missing name field" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Missing photo file" });
    }

    const photoBuffer = fs.readFileSync(req.file.path);
    const s3Key = `faces/${Date.now()}_${req.file.originalname}`;

    await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: photoBuffer,
        ContentType: req.file.mimetype,
      })
      .promise();

    const safeName = name.replace(/[^a-zA-Z0-9_.\-:]/g, "_");
    const rekogResult = await rekognition
      .indexFaces({
        CollectionId: process.env.REKOGNITION_COLLECTION,
        Image: {
          S3Object: {
            Bucket: process.env.S3_BUCKET,
            Name: s3Key,
          },
        },
        ExternalImageId: safeName,
        DetectionAttributes: ["DEFAULT"],
      })
      .promise();

    fs.unlinkSync(req.file.path);

    const faceRecord = rekogResult.FaceRecords?.[0];
    if (!faceRecord) {
      return res.json({ success: false, message: "No face detected in image" });
    }

    res.json({ success: true, name });
  } catch (err) {
    console.error("Error during face indexing:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const client = new RekognitionClient({ region: "us-east-1" });

app.get("/session", async (req, res) => {
  const command = new CreateFaceLivenessSessionCommand({
    Settings: {
      OutputConfig: {
        S3Bucket: "face-recognition-sang2025-2",
        S3Prefix: "rekognition-output",
      },
    },
  });
  try {
    const response = await client.send(command);
    res.json({ sessionId: response.SessionId });
  } catch (err) {
    console.error("Error creating liveness session:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/checkin", upload.single("photo"), async (req, res) => {
  try {
    const photo = fs.readFileSync(req.file.path);
    const params = {
      CollectionId: process.env.REKOGNITION_COLLECTION,
      Image: { Bytes: photo },
      FaceMatchThreshold: 90,
      MaxFaces: 1,
    };

    const result = await rekognition.searchFacesByImage(params).promise();
    fs.unlinkSync(req.file.path);

    if (result.FaceMatches.length > 0) {
      const matchedFace = result.FaceMatches[0].Face;
      const name = matchedFace.ExternalImageId;
      checkedInUsers.add(name);
      res.json({ success: true, name });
    } else {
      res.json({ success: false, message: "No match found" });
    }
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/attendance", (req, res) => {
  res.json({ success: true, checkedIn: Array.from(checkedInUsers) });
});

app.get("/list-collections", async (req, res) => {
  let faces = [];
  try {
    const params = {
      CollectionId: process.env.REKOGNITION_COLLECTION,
      MaxResults: 10,
    };
    let data = await rekognition.listFaces(params).promise();
    faces = faces.concat(data.Faces);

    while (data.NextToken) {
      params.NextToken = data.NextToken;
      data = await rekognition.listFaces(params).promise();
      faces = faces.concat(data.Faces);
    }

    // Attach s3Key using ImageId (if you used that for S3 key)
    const processedFaces = faces.map((face) => ({
      FaceId: face.FaceId,
      ExternalImageId: face.ExternalImageId,
      ImageId: face.ImageId, // this matches the Key used when indexing
      s3Key: `faces/${face.ImageId}`, // assuming this structure
    }));

    res.json({ success: true, faces: processedFaces });
  } catch (err) {
    console.error("Error listing faces:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/get-s3-url", async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ success: false, error: "Missing S3 key" });
  }

  try {
    const url = s3.getSignedUrl("getObject", {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Expires: 60, // 1 minute expiry
    });
    res.json({ success: true, url });
  } catch (err) {
    console.error("Error generating signed URL:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/delete-face", express.json(), async (req, res) => {
  const { faceId, s3Key } = req.body;

  if (!faceId || !s3Key) {
    return res
      .status(400)
      .json({ success: false, error: "Missing faceId or s3Key" });
  }

  try {
    // 1. Delete from Rekognition
    await rekognition
      .deleteFaces({
        CollectionId: process.env.REKOGNITION_COLLECTION,
        FaceIds: [faceId],
      })
      .promise();

    // 2. Delete from S3
    await s3
      .deleteObject({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
      })
      .promise();

    res.json({ success: true, message: "Face and image deleted successfully" });
  } catch (err) {
    console.error("Error deleting face:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Alternative simpler endpoint if you just want to check liveness without face matching
app.get("/liveness-result/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Analyze liveness result from AWS SDK
    const livenessResult = await analyzeLiveness(sessionId); // <- Your existing function
    const { isLive, confidence, imageBytes } = livenessResult;

    let faceMatch = null;

    if (imageBytes) {
      const matchParams = {
        CollectionId: process.env.REKOGNITION_COLLECTION,
        Image: { Bytes: imageBytes },
        FaceMatchThreshold: 90,
        MaxFaces: 1,
      };

      const rekognitionResult = await rekognition
        .searchFacesByImage(matchParams)
        .promise();

      if (rekognitionResult.FaceMatches.length > 0) {
        const matchedFace = rekognitionResult.FaceMatches[0].Face;
        faceMatch = {
          found: true,
          name: matchedFace.ExternalImageId,
          confidence: matchedFace.Confidence,
        };
      } else {
        faceMatch = { found: false };
      }
    }

    res.json({
      success: true,
      isLive,
      confidence,
      faceMatch,
      message: isLive ? "Liveness verified" : "Liveness check failed",
    });
  } catch (err) {
    console.error("Liveness + Match error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to manually trigger face matching after liveness (optional)
app.post("/match-after-liveness", upload.single("photo"), async (req, res) => {
  try {
    const { sessionId } = req.body;

    // If sessionId is provided, verify liveness first
    if (sessionId) {
      const command = new GetFaceLivenessSessionResultsCommand({
        SessionId: sessionId,
      });

      const livenessResult = await client.send(command);
      const isLive =
        livenessResult.Status === "SUCCEEDED" && livenessResult.Confidence > 90;

      if (!isLive) {
        return res.json({
          success: false,
          message: "Liveness verification required before face matching",
        });
      }
    }
    // Proceed with face matching using uploaded photo
    const photo = fs.readFileSync(req.file.path);
    const params = {
      CollectionId: process.env.REKOGNITION_COLLECTION,
      Image: { Bytes: photo },
      FaceMatchThreshold: 90,
      MaxFaces: 1,
    };

    const result = await rekognition.searchFacesByImage(params).promise();
    fs.unlinkSync(req.file.path);

    if (result.FaceMatches.length > 0) {
      const matchedFace = result.FaceMatches[0].Face;
      const name = matchedFace.ExternalImageId;
      const similarity = result.FaceMatches[0].Similarity;

      checkedInUsers.add(name);

      res.json({
        success: true,
        name: name,
        similarity: similarity,
        livenessVerified: !!sessionId,
      });
    } else {
      res.json({
        success: false,
        message: "No face match found in collection",
        livenessVerified: !!sessionId,
      });
    }
  } catch (err) {
    console.error("Match after liveness error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post(
  "/check-face",
  express.raw({ type: "application/octet-stream", limit: "5mb" }),
  async (req, res) => {
    try {
      const imageBuffer = req.body;

      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid image data." });
      }

      const params = {
        CollectionId: process.env.REKOGNITION_COLLECTION,
        Image: { Bytes: imageBuffer },
        FaceMatchThreshold: 90,
        MaxFaces: 1,
      };

      const result = await rekognition.searchFacesByImage(params).promise();

      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const matched = result.FaceMatches[0];

        res.json({
          success: true,
          name: matched.Face.ExternalImageId || "Unknown",
          similarity: matched.Similarity,
          faceId: matched.Face.FaceId,
        });
      } else {
        res.json({ success: false, message: "No matching face found." });
      }
    } catch (err) {
      console.error("Error in /check-face:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
