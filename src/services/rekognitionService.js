// src/services/rekognitionService.js
import {
    CreateFaceLivenessSessionCommand,
    GetFaceLivenessSessionResultsCommand,
    SearchFacesByImageCommand,
    ListFacesCommand,
    IndexFacesCommand,
    DetectFacesCommand,
    CompareFacesCommand,
    DeleteFacesCommand,
} from "@aws-sdk/client-rekognition";
import { rekognitionClient } from "../config/aws.js";
import { CONSTANTS } from "../utils/constants.js";

export class RekognitionService {
    static async createLivenessSession(s3Bucket) {
        const command = new CreateFaceLivenessSessionCommand({
            Settings: {
                OutputConfig: {
                    S3Bucket: s3Bucket,
                    S3Prefix: "/",
                },
            },
        });

        return await rekognitionClient.send(command);
    }

    static async getLivenessSessionResults(sessionId) {
        const command = new GetFaceLivenessSessionResultsCommand({
            SessionId: sessionId,
        });

        return await rekognitionClient.send(command);
    }

    static async detectFaces(imageBuffer) {
        const command = new DetectFacesCommand({
            Image: { Bytes: imageBuffer },
        });

        return await rekognitionClient.send(command);
    }

    static async compareFaces(sourceImage, targetImage, threshold = CONSTANTS.FACE_MATCH_THRESHOLD) {
        const command = new CompareFacesCommand({
            SourceImage: { Bytes: sourceImage },
            TargetImage: { Bytes: targetImage },
            SimilarityThreshold: threshold,
        });

        return await rekognitionClient.send(command);
    }

    static async searchFacesByImage(collectionId, imageBuffer, threshold = CONSTANTS.FACE_MATCH_THRESHOLD, maxFaces = 5) {
        const command = new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: { Bytes: imageBuffer },
            FaceMatchThreshold: threshold,
            MaxFaces: maxFaces,
        });

        return await rekognitionClient.send(command);
    }

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
            ExternalImageId: `${externalImageId}`,
        });

        return await rekognitionClient.send(command);
    }

    static async listFaces(collectionId, maxResults = 100, nextToken = null) {
        const command = new ListFacesCommand({
            CollectionId: collectionId,
            MaxResults: maxResults,
            ...(nextToken && { NextToken: nextToken }),
        });

        return await rekognitionClient.send(command);
    }

    static async deleteFaces(collectionId, faceIds) {
        const command = new DeleteFacesCommand({
            CollectionId: collectionId,
            FaceIds: faceIds,
        });

        return await rekognitionClient.send(command);
    }
}
