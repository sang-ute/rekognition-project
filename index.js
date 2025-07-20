import express from "express";
import cors from "cors";
import multer from "multer";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
