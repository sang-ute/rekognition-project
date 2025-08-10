// src/controllers/faceController.js
import fs from "fs";
import { RekognitionService } from "../services/rekognitionService.js";
import { S3Service } from "../services/s3Service.js";

export class FaceController {
    static async indexFace(req, res) {
        try {
            const name = req.body.name?.trim();
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: "Missing name field",
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "Missing photo file",
                });
            }

            const photoBuffer = fs.readFileSync(req.file.path);
            const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9_.\-:]/g, "_")}`;

            const s3Key = `faces/${safeName}.jpg`;
            // Upload to S3
            await S3Service.uploadObject(process.env.S3_BUCKET, s3Key, photoBuffer, req.file.mimetype);

            // Index face in Rekognition
            const rekogResult = await RekognitionService.indexFaces(process.env.REKOGNITION_COLLECTION, process.env.S3_BUCKET, s3Key, safeName);

            fs.unlinkSync(req.file.path);

            const faceRecord = rekogResult.FaceRecords?.[0];

            if (!faceRecord) {
                return res.json({
                    success: false,
                    message: "No face detected in image",
                });
            }
            res.json({ success: true, name });
        } catch (err) {
            console.error("Error during face indexing:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async listFaces(req, res) {
        try {
            const faces = [];
            let result = await RekognitionService.listFaces(process.env.REKOGNITION_COLLECTION, 100);

            faces.push(...result.Faces);

            while (result.NextToken) {
                result = await RekognitionService.listFaces(process.env.REKOGNITION_COLLECTION, 100);
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
    }

    static async deleteFace(req, res) {
        const { faceId, s3Key } = req.body;

        if (!faceId || !s3Key) {
            return res.status(400).json({ success: false, error: "Missing faceId or s3Key" });
        }

        try {
            // 1. Delete from Rekognition
            await RekognitionService.deleteFaces(process.env.REKOGNITION_COLLECTION, [faceId]);

            // 2. Delete from S3
            await S3Service.deleteObject(process.env.S3_BUCKET, s3Key);

            res.json({
                success: true,
                message: "Face and image deleted successfully",
            });
        } catch (err) {
            console.error("Error deleting face:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
