import { DeleteFacesCommand } from "@aws-sdk/client-rekognition";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { S3Client } from "@aws-sdk/client-s3";

export const CONSTANTS = {
    LIVENESS_CONFIDENCE_THRESHOLD: 85,
    FACE_MATCH_THRESHOLD: 70,
    MANUAL_CHECKIN_THRESHOLD: 90,
    PREVIEW_CLEANUP_DELAY: 5 * 60 * 1000, // 5 minutes
};

const clientConfig = {
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

export const s3Client = new S3Client(clientConfig);
export const rekognitionClient = new RekognitionClient(clientConfig);

class RekognitionService {
    static async deleteFaces(collectionId, faceIds) {
        const command = new DeleteFacesCommand({
            CollectionId: collectionId,
            FaceIds: faceIds,
        });

        return await rekognitionClient.send(command);
    }
}

class S3Service {
    static async deleteObject(bucket, key) {
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        return await s3Client.send(command);
    }
}

export const handler = async (event) => {
    try {
        let body = event.body;

        // Nếu body là JSON string -> parse
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Invalid JSON body" }),
                };
            }
        }

        const { faceId, s3Key } = body || {};

        if (!faceId || !s3Key) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, error: "Missing faceId or s3Key" }),
            };
        }

        // 1. Delete from Rekognition
        await RekognitionService.deleteFaces(process.env.REKOGNITION_COLLECTION, [faceId]);

        // 2. Delete from S3
        await S3Service.deleteObject(process.env.S3_BUCKET, s3Key);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Face and image deleted successfully",
            }),
        };
    } catch (err) {
        console.error("Error deleting face:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: err.message }),
        };
    }
};
