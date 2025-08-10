import { ListFacesCommand, RekognitionClient } from "@aws-sdk/client-rekognition";

const clientConfig = {
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

const rekognitionClient = new RekognitionClient(clientConfig);

class RekognitionService {
    static async listFaces(collectionId, maxResults = 100, nextToken = null) {
        const command = new ListFacesCommand({
            CollectionId: collectionId,
            MaxResults: maxResults,
            ...(nextToken && { NextToken: nextToken }),
        });

        return await rekognitionClient.send(command);
    }
}

export const handler = async (event) => {
    try {
        const faces = [];
        let result = await RekognitionService.listFaces(process.env.REKOGNITION_COLLECTION, 100);

        faces.push(...result.Faces);

        while (result.NextToken) {
            result = await RekognitionService.listFaces(process.env.REKOGNITION_COLLECTION, 100, result.NextToken);
            faces.push(...result.Faces);
        }

        console.log(faces);

        const processed = faces.map((face) => ({
            FaceId: face.FaceId,
            ExternalImageId: face.ExternalImageId,
            s3Key: `faces/${face.ExternalImageId}.jpg`,
        }));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // nếu cần CORS
            },
            body: JSON.stringify({ success: true, faces: processed }),
        };
    } catch (err) {
        console.error("Error listing collections:", err);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ success: false, error: err.message }),
        };
    }
};
