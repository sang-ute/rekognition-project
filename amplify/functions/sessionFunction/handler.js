// create session

import { CreateFaceLivenessSessionCommand, RekognitionClient } from "@aws-sdk/client-rekognition";

const clientConfig = {
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

const rekognitionClient = new RekognitionClient(clientConfig);

const createLivenessSession = async (s3Bucket) => {
    const command = new CreateFaceLivenessSessionCommand({
        Settings: {
            OutputConfig: {
                S3Bucket: s3Bucket,
                S3Prefix: "/",
            },
        },
    });

    return await rekognitionClient.send(command);
};
export const handler = async (event) => {
    try {
        console.log("Creating new liveness session...");
        console.log(`S3 Bucket: ${process.env.S3_BUCKET}`);
        console.log(`S3 Prefix: /`);

        const response = await createLivenessSession(process.env.S3_BUCKET);

        console.log(`Liveness session created: ${response.SessionId}`);
        console.log(`📁 Output will be stored in: s3://${process.env.S3_BUCKET}/`);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // nếu cần CORS
            },
            body: JSON.stringify({
                sessionId: response.SessionId,
                success: true,
            }),
        };
    } catch (err) {
        console.error("Error creating liveness session:", err);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                success: false,
                error: err.message,
            }),
        };
    }
};
