import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import dotenv from "dotenv";
import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
  SearchFacesByImageCommand,
  ListFacesCommand,
  IndexFacesCommand,
  DetectFacesCommand,
  CompareFacesCommand,
} from "@aws-sdk/client-rekognition";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging to file
const logStream = createWriteStream(path.join(__dirname, "server.log"), {
  flags: "a",
});
const originalConsoleLog = console.log;
console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  logStream.write(args.join(" ") + "\n");
};
const originalConsoleError = console.error;
console.error = function (...args) {
  originalConsoleError.apply(console, args);
  logStream.write(args.join(" ") + "\n");
};

const app = express();
const PORT = 3001;

const checkedInUsers = new Set();

// AWS Configuration
const clientConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const s3Client = new S3Client(clientConfig);
const rekognitionClient = new RekognitionClient(clientConfig);

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend/dist")));

// Serve temporary preview images
app.use("/temp-preview", express.static(path.join(__dirname, "temp-previews")));

// Helper function to log image details
function logImageDetails(imageBuffer, sessionId, source = "unknown") {
  const sizeInKB = (imageBuffer.length / 1024).toFixed(2);
  const sizeInMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);

  console.log("\n" + "=".repeat(60));
  console.log("🖼️  IMAGE CAPTURE LOG");
  console.log("=".repeat(60));
  console.log(`📋 Session ID: ${sessionId}`);
  console.log(`📁 Source: ${source}`);
  console.log(`📏 Image Size: ${sizeInKB} KB (${sizeInMB} MB)`);
  console.log(`🔢 Buffer Length: ${imageBuffer.length} bytes`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  const isJPEG = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
  const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;

  console.log(
    `✅ Format Valid: ${isJPEG ? "JPEG" : isPNG ? "PNG" : "Unknown/Invalid"}`
  );
  console.log(
    `📊 First 10 bytes: [${Array.from(imageBuffer.slice(0, 10))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(", ")}]`
  );
  console.log("=".repeat(60) + "\n");

  return {
    sizeKB: parseFloat(sizeInKB),
    sizeMB: parseFloat(sizeInMB),
    isValid: isJPEG || isPNG,
    format: isJPEG ? "JPEG" : isPNG ? "PNG" : "Unknown",
  };
}

// Helper function to create temporary file for preview, this can be used for testing
async function saveImageForPreview(imageBuffer, sessionId) {
  try {
    const previewDir = path.join(__dirname, "temp-previews");

    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const filename = `preview_${sessionId}_${Date.now()}.jpg`;
    const filepath = path.join(previewDir, filename);

    fs.writeFileSync(filepath, imageBuffer);

    console.log(`💾 Preview image saved: ${filepath}`);

    setTimeout(
      () => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log(`🗑️  Preview image cleaned up: ${filename}`);
        }
      },
      5 * 60 * 1000
    );

    return `/temp-preview/${filename}`;
  } catch (error) {
    console.error("Error saving preview image:", error);
    return null;
  }
}

// Helper function to get S3 object with logging
async function getS3Object(bucket, key) {
  try {
    console.log(`🔍 Fetching S3 object: s3://${bucket}/${key}`);

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const result = await s3Client.send(command);

    console.log(`✅ S3 fetch successful:`);
    console.log(`   Content-Type: ${result.ContentType}`);
    console.log(`   Content-Length: ${result.ContentLength} bytes`);
    console.log(`   Last-Modified: ${result.LastModified}`);

    const streamToBuffer = async (stream) => {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    };

    return await streamToBuffer(result.Body);
  } catch (error) {
    console.error(`❌ Error getting S3 object ${key}:`, error.message);
    throw error;
  }
}

// Helper function to list S3 objects with logging
async function listS3Objects(bucket, prefix) {
  try {
    console.log(`📂 Listing S3 objects with prefix: s3://${bucket}/${prefix}`);
    let allObjects = [];
    const prefixes = [prefix, "rekognition-output/", "faces/"]; // Include possible prefixes
    for (const p of prefixes) {
      const params = { Bucket: bucket, Prefix: p, MaxKeys: 100 };
      const result = await s3Client.send(new ListObjectsV2Command(params));
      allObjects = allObjects.concat(result.Contents || []);
      console.log(
        `📋 Found ${result.Contents?.length || 0} objects for prefix ${p}:`
      );
      console.log("Objects:", JSON.stringify(result.Contents || [], null, 2));
    }
    // Log all bucket contents
    const fullList = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket })
    );
    console.log(
      "All bucket objects:",
      JSON.stringify(fullList.Contents || [], null, 2)
    );
    allObjects.forEach((obj, index) => {
      console.log(
        `   ${index + 1}. ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`
      );
    });
    return allObjects;
  } catch (error) {
    console.error(
      `❌ Error listing S3 objects with prefix ${prefix}:`,
      error.message
    );
    throw error;
  }
}

// Main endpoint with liveness and face matching
app.get("/liveness-result/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { preview = "false", compareFaceId = null } = req.query;

  console.log("\n" + "🚀".repeat(20));
  console.log(`🎯 Processing liveness result for session: ${sessionId}`);
  console.log(`🖼️  Preview requested: ${preview === "true" ? "YES" : "NO"}`);
  console.log(`🔍 Compare Face ID: ${compareFaceId || "None"}`);
  console.log("🚀".repeat(20) + "\n");

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: "Missing session ID",
    });
  }

  try {
    console.log("📞 Step 1: Calling AWS Rekognition for liveness results...");
    const command = new GetFaceLivenessSessionResultsCommand({
      SessionId: sessionId,
    });

    const livenessResult = await rekognitionClient.send(command);

    console.log("📊 Liveness Analysis Results:");
    console.log(`   Status: ${livenessResult.Status}`);
    console.log(`   Confidence: ${livenessResult.Confidence}%`);
    console.log(`   Session ID: ${livenessResult.SessionId}`);

    const isLive =
      livenessResult.Status === "SUCCEEDED" && livenessResult.Confidence > 85;

    if (!isLive) {
      console.log(
        `❌ Liveness check failed - Status: ${livenessResult.Status}, Confidence: ${livenessResult.Confidence}%`
      );
      return res.json({
        success: true,
        isLive: false,
        confidence: livenessResult.Confidence / 100,
        reason:
          livenessResult.Status === "FAILED"
            ? "Liveness check failed"
            : `Low confidence score: ${livenessResult.Confidence}%`,
        message: "Liveness verification failed. Please try again.",
      });
    }

    console.log("✅ Liveness verification passed!");

    console.log("\n📂 Step 2: Looking for reference image in S3...");

    let faceMatch = { found: false };
    let capturedImageInfo = null;
    let previewUrl = null;

    try {
      const s3Prefix = `rekognition-output/${sessionId}/`;
      const s3Objects = await listS3Objects(process.env.S3_BUCKET, s3Prefix);

      const referenceImageObj = s3Objects.find((obj) => {
        const key = obj.Key.toLowerCase();
        return (
          key.includes("reference") ||
          key.includes("image") ||
          key.includes("face") ||
          key.includes("frame") ||
          key.endsWith(".jpg") ||
          key.endsWith(".jpeg") ||
          key.endsWith(".png")
        );
      });

      if (referenceImageObj) {
        console.log(`🎯 Found reference image: ${referenceImageObj.Key}`);

        const imageBuffer = await getS3Object(
          process.env.S3_BUCKET,
          referenceImageObj.Key
        );

        capturedImageInfo = logImageDetails(
          imageBuffer,
          sessionId,
          "AWS Liveness Session"
        );

        if (preview === "true") {
          // console.log("🖼️  Creating preview image...");
          // previewUrl = await saveImageForPreview(imageBuffer, sessionId);
        }

        console.log("\n🔍 Step 3: Searching for face match in collection...");

        const detectFaces = await rekognitionClient.send(
          new DetectFacesCommand({ Image: { Bytes: imageBuffer } })
        );
        console.log(
          "DetectFaces response:",
          JSON.stringify(detectFaces, null, 2)
        );

        if (!detectFaces.FaceDetails || detectFaces.FaceDetails.length === 0) {
          console.log("❌ No faces detected in the image");
          faceMatch = { found: false, error: "No faces detected in the image" };
        } else {
          // Use CompareFaces if compareFaceId is provided
          if (compareFaceId) {
            console.log(`🔍 Comparing with specific face ID: ${compareFaceId}`);
            // Assume compareFaceId is an S3 key for the reference image
            const referenceImageBuffer = await getS3Object(
              process.env.S3_BUCKET,
              `faces/${compareFaceId}.jpg` // Adjust path as needed
            );

            const compareResult = await rekognitionClient.send(
              new CompareFacesCommand({
                SourceImage: { Bytes: imageBuffer },
                TargetImage: { Bytes: referenceImageBuffer },
                SimilarityThreshold: 70,
              })
            );

            console.log(
              "CompareFaces response:",
              JSON.stringify(compareResult, null, 2)
            );

            if (
              compareResult.FaceMatches &&
              compareResult.FaceMatches.length > 0
            ) {
              const bestMatch = compareResult.FaceMatches[0];
              faceMatch = {
                found: true,
                name: compareFaceId,
                similarity: bestMatch.Similarity,
                details: bestMatch,
              };
              console.log(
                `🎉 Face match with ${compareFaceId}: ${bestMatch.Similarity.toFixed(1)}%`
              );
            } else {
              console.log(`❌ No match found for face ID: ${compareFaceId}`);
              faceMatch = { found: false };
            }
          } else {
            // Use SearchFacesByImage (existing logic)
            const searchResult = await rekognitionClient.send(
              new SearchFacesByImageCommand({
                CollectionId: process.env.REKOGNITION_COLLECTION,
                Image: { Bytes: imageBuffer },
                FaceMatchThreshold: 70,
                MaxFaces: 5,
              })
            );

            console.log(
              `📊 Face search results: ${searchResult.FaceMatches?.length || 0} matches found`
            );
            console.log(
              "Raw searchFacesByImage response:",
              JSON.stringify(searchResult, null, 2)
            );

            if (
              searchResult.FaceMatches &&
              searchResult.FaceMatches.length > 0
            ) {
              searchResult.FaceMatches.forEach((match, index) => {
                console.log(`   Match ${index + 1}:`);
                console.log(`     Name: ${match.Face.ExternalImageId}`);
                console.log(`     Similarity: ${match.Similarity.toFixed(2)}%`);
                console.log(`     Face ID: ${match.Face.FaceId}`);
              });

              const bestMatch = searchResult.FaceMatches[0];
              const name = bestMatch.Face.ExternalImageId;
              const similarity = bestMatch.Similarity;

              checkedInUsers.add(name);

              faceMatch = {
                found: true,
                name: name,
                similarity: similarity,
                faceId: bestMatch.Face.FaceId,
                allMatches: searchResult.FaceMatches.map((match) => ({
                  name: match.Face.ExternalImageId,
                  similarity: match.Similarity,
                  faceId: match.Face.FaceId,
                })),
              };

              console.log(
                `🎉 Best face match: ${name} with ${similarity.toFixed(1)}% similarity`
              );
            } else {
              console.log("❓ No face matches found in collection");
            }
          }
        }
      } else {
        console.log("❌ No reference image found in S3");
      }
    } catch (faceMatchError) {
      console.error("🚨 Face matching error:", faceMatchError);
      faceMatch = {
        found: false,
        error: faceMatchError.message,
      };
    }

    const response = {
      success: true,
      isLive: true,
      confidence: livenessResult.Confidence / 100,
      faceMatch: faceMatch,
      sessionId: sessionId,
      capturedImage: {
        found: !!capturedImageInfo,
        details: capturedImageInfo,
        previewUrl: previewUrl,
      },
      timestamp: new Date().toISOString(),
    };

    if (faceMatch.found) {
      response.message = `Welcome ${faceMatch.name}! Face verified with ${faceMatch.similarity.toFixed(1)}% similarity.`;
    } else if (faceMatch.error) {
      response.message =
        "Liveness verified but face matching encountered an error.";
    } else {
      response.message =
        "You are verified as a live person, but your face is not in our system.";
    }

    console.log("\n🎊 Final Response Summary:");
    console.log(`   Liveness: ${response.isLive ? "✅ PASS" : "❌ FAIL"}`);
    console.log(
      `   Face Match: ${faceMatch.found ? "✅ FOUND" : "❓ NOT FOUND"}`
    );
    console.log(
      `   Image Captured: ${response.capturedImage.found ? "✅ YES" : "❌ NO"}`
    );
    if (previewUrl) console.log(`   Preview URL: ${previewUrl}`);
    console.log("🎊".repeat(20) + "\n");

    res.json(response);
  } catch (error) {
    console.error("\n🚨 ERROR in liveness-result endpoint:", error);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to process liveness results. Please try again.",
      timestamp: new Date().toISOString(),
    });
  }
});

// Session creation endpoint
app.get("/session", async (req, res) => {
  try {
    console.log("🆕 Creating new liveness session...");
    console.log(`S3 Bucket: ${process.env.S3_BUCKET}`);
    console.log(`S3 Prefix: rekognition-output/`);

    const command = new CreateFaceLivenessSessionCommand({
      Settings: {
        OutputConfig: {
          S3Bucket: process.env.S3_BUCKET,
          S3Prefix: "rekognition-output/",
        },
      },
    });

    const response = await rekognitionClient.send(command);

    console.log(`✅ Liveness session created: ${response.SessionId}`);
    console.log(
      `📁 Output will be stored in: s3://${process.env.S3_BUCKET}/rekognition-output/`
    );

    res.json({
      sessionId: response.SessionId,
      success: true,
    });
  } catch (err) {
    console.error("❌ Error creating liveness session:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Enhanced checkin endpoint with logging and preview
app.post("/checkin", upload.single("photo"), async (req, res) => {
  try {
    console.log("\n📸 Manual check-in initiated");

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No photo uploaded" });
    }

    const photo = fs.readFileSync(req.file.path);

    const imageDetails = logImageDetails(
      photo,
      "manual-checkin",
      "Manual Upload"
    );

    //const previewUrl = await saveImageForPreview(photo, "manual-checkin");

    const detectFaces = await rekognitionClient.send(
      new DetectFacesCommand({ Image: { Bytes: photo } })
    );
    console.log("DetectFaces response:", JSON.stringify(detectFaces, null, 2));

    const searchResult = await rekognitionClient.send(
      new SearchFacesByImageCommand({
        CollectionId: process.env.REKOGNITION_COLLECTION,
        Image: { Bytes: photo },
        FaceMatchThreshold: 70,
        MaxFaces: 1,
      })
    );

    console.log(
      "Raw searchFacesByImage response:",
      JSON.stringify(searchResult, null, 2)
    );

    fs.unlinkSync(req.file.path);

    if (searchResult.FaceMatches && searchResult.FaceMatches.length > 0) {
      const matchedFace = searchResult.FaceMatches[0].Face;
      const name = matchedFace.ExternalImageId;
      const similarity = searchResult.FaceMatches[0].Similarity;

      checkedInUsers.add(name);

      console.log(
        `✅ Manual check-in successful: ${name} (${similarity.toFixed(1)}%)`
      );

      res.json({
        success: true,
        name: name,
        similarity: similarity,
        capturedImage: {
          found: true,
          details: imageDetails,
          previewUrl: previewUrl,
        },
      });
    } else {
      console.log("❌ Manual check-in: No matching face found");
      res.json({
        success: false,
        message: "No matching face found in collection",
        capturedImage: {
          found: true,
          details: imageDetails,
          previewUrl: previewUrl,
        },
      });
    }
  } catch (err) {
    console.error("🚨 Manual check-in error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Index face endpoint with S3 upload
app.post("/index-face", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });
    const photo = fs.readFileSync(req.file.path);
    const externalImageId = `user-${Date.now()}`; // Unique ID

    // Upload to S3
    const s3Key = `faces/${externalImageId}.jpg`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: photo,
        ContentType: "image/jpeg",
      })
    );
    console.log(
      `📤 Image uploaded to S3: s3://${process.env.S3_BUCKET}/${s3Key}`
    );

    // Index face in Rekognition
    const command = new IndexFacesCommand({
      CollectionId: process.env.REKOGNITION_COLLECTION,
      Image: { Bytes: photo },
      ExternalImageId: externalImageId,
    });
    const result = await rekognitionClient.send(command);
    fs.unlinkSync(req.file.path);
    console.log(`Face indexed: ${result.FaceRecords[0].Face.FaceId}`);
    res.json({
      success: true,
      faceId: result.FaceRecords[0].Face.FaceId,
      externalImageId: externalImageId,
    });
  } catch (err) {
    console.error("Error indexing face:", err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Attendance endpoint
app.get("/attendance", (req, res) => {
  res.json({
    success: true,
    checkedIn: Array.from(checkedInUsers),
  });
});
// List all faces from Rekognition collection
// List all faces from Rekognition collection
app.get("/list-collections", async (req, res) => {
  try {
    const faces = [];
    let result = await rekognitionClient.send(
      new ListFacesCommand({
        CollectionId: process.env.REKOGNITION_COLLECTION,
        MaxResults: 100,
      })
    );

    faces.push(...result.Faces);

    while (result.NextToken) {
      result = await rekognitionClient.send(
        new ListFacesCommand({
          CollectionId: process.env.REKOGNITION_COLLECTION,
          NextToken: result.NextToken,
          MaxResults: 100,
        })
      );
      faces.push(...result.Faces);
    }

    const processed = faces.map((face) => ({
      FaceId: face.FaceId,
      ExternalImageId: face.ExternalImageId,
      s3Key: `faces/${face.ExternalImageId}.jpg`,
    }));

    res.json({ success: true, faces: processed });
  } catch (err) {
    console.error("Error listing collections:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Delete face from collection and S3
app.delete("/delete-face", async (req, res) => {
  const { faceId, s3Key } = req.body;
  if (!faceId || !s3Key)
    return res
      .status(400)
      .json({ success: false, error: "Missing faceId or s3Key" });
  try {
    await rekognitionClient.send(
      new DeleteFacesCommand({
        CollectionId: process.env.REKOGNITION_COLLECTION,
        FaceIds: [faceId],
      })
    );

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
      })
    );

    res.json({ success: true, message: "Face and image deleted successfully" });
  } catch (err) {
    console.error("Error deleting face:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Logging enabled for image capture and face recognition`);
  console.log(`🖼️  Use ?preview=true to get image previews`);
});
