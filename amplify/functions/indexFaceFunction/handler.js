import { IndexFacesCommand, RekognitionClient } from "@aws-sdk/client-rekognition";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const clientConfig = {
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

const s3Client = new S3Client(clientConfig);
const rekognitionClient = new RekognitionClient(clientConfig);

class RekognitionService {
    static async indexFaces(collectionId, bucket, s3Key, externalImageId) {
        const command = new IndexFacesCommand({
            CollectionId: collectionId,
            Image: {
                S3Object: {
                    Bucket: bucket,
                    Name: s3Key,
                },
            },
            DetectionAttributes: ["DEFAULT"],
            ExternalImageId: externalImageId,
        });

        return await rekognitionClient.send(command);
    }
}

class S3Service {
    static async uploadObject(bucket, key, body, contentType) {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        return await s3Client.send(command);
    }
}

export const handler = async (event) => {
    try {
        const { name, fileBase64, fileName, fileType } = JSON.parse(event.body);

        if (!name || !fileBase64 || !fileName || !fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, error: "Missing required fields" }),
            };
        }

        const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9_.\-:]/g, "_")}`;
        const s3Key = `faces/${safeName}.jpg`;

        const buffer = Buffer.from(fileBase64, "base64");

        // Upload to S3
        await S3Service.uploadObject(process.env.S3_BUCKET, s3Key, buffer, fileType);

        // Index face in Rekognition
        const rekogResult = await RekognitionService.indexFaces(process.env.REKOGNITION_COLLECTION, process.env.S3_BUCKET, s3Key, safeName);

        const faceRecord = rekogResult.FaceRecords?.[0];
        if (!faceRecord) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: false, message: "No face detected in image" }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, name }),
        };
    } catch (err) {
        console.error("Error during face indexing:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: err.message }),
        };
    }
};
