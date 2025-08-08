// src/controllers/livenessController.js
import { RekognitionService } from "../services/rekognitionService.js";
import { S3Service } from "../services/s3Service.js";
import { ImageService } from "../services/imageService.js";
import { CONSTANTS } from "../utils/constants.js";

const checkedInUsers = new Set();

export class LivenessController {
  static async createSession(req, res) {
    try {
      console.log("Creating new liveness session...");
      console.log(`S3 Bucket: ${process.env.S3_BUCKET}`);
      console.log(`S3 Prefix: /`);

      const response = await RekognitionService.createLivenessSession(
        process.env.S3_BUCKET
      );

      console.log(`Liveness session created: ${response.SessionId}`);
      console.log(
        `📁 Output will be stored in: s3://${process.env.S3_BUCKET}/`
      );

      res.json({
        sessionId: response.SessionId,
        success: true,
      });
    } catch (err) {
      console.error("Error creating liveness session:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  static async getSessionResults(req, res) {
    const { sessionId } = req.params;
    const { preview = "false", compareFaceId = null } = req.query;

    console.log("\n" + "=".repeat(20));
    console.log(`Processing liveness result for session: ${sessionId}`);
    console.log(`Preview requested: ${preview === "true" ? "YES" : "NO"}`);
    console.log(`Compare Face ID: ${compareFaceId || "None"}`);
    console.log("=".repeat(20) + "\n");

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Missing session ID",
      });
    }

    try {
      // Step 1: Get liveness results
      console.log("Step 1: Calling AWS Rekognition for liveness results...");
      const livenessResult =
        await RekognitionService.getLivenessSessionResults(sessionId);

      console.log("Liveness Analysis Results:");
      console.log(`Status: ${livenessResult.Status}`);
      console.log(`Confidence: ${livenessResult.Confidence}%`);
      console.log(`Session ID: ${livenessResult.SessionId}`);

      const isLive =
        livenessResult.Status === "SUCCEEDED" &&
        livenessResult.Confidence > CONSTANTS.LIVENESS_CONFIDENCE_THRESHOLD;

      if (!isLive) {
        console.log(
          `Liveness check failed - Status: ${livenessResult.Status}, Confidence: ${livenessResult.Confidence}%`
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

      // Step 2: Process face matching
      const faceMatchResult = await LivenessController.processFaceMatching(
        sessionId,
        preview,
        compareFaceId
      );

      const response = {
        success: true,
        isLive: true,
        confidence: livenessResult.Confidence / 100,
        faceMatch: faceMatchResult.faceMatch,
        sessionId: sessionId,
        capturedImage: faceMatchResult.capturedImage,
        timestamp: new Date().toISOString(),
      };

      // Set appropriate message
      if (faceMatchResult.faceMatch.found) {
        response.message = `Welcome ${faceMatchResult.faceMatch.name}! Face verified with ${faceMatchResult.faceMatch.similarity.toFixed(1)}% similarity.`;
      } else if (faceMatchResult.faceMatch.error) {
        response.message =
          "Liveness verified but face matching encountered an error.";
      } else {
        response.message =
          "You are verified as a live person, but your face is not in our system.";
      }

      console.log("\n🎊 Final Response Summary:");
      console.log(`   Liveness: ${response.isLive ? "✅ PASS" : "❌ FAIL"}`);
      console.log(
        `   Face Match: ${faceMatchResult.faceMatch.found ? "✅ FOUND" : "❌ NOT FOUND"}`
      );
      console.log(
        `   Image Captured: ${response.capturedImage.found ? "YES" : "NO"}`
      );
      console.log("🎊".repeat(20) + "\n");

      res.json(response);
    } catch (error) {
      console.error("\nERROR in liveness-result endpoint:", error);
      console.error("Stack trace:", error.stack);

      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to process liveness results. Please try again.",
        timestamp: new Date().toISOString(),
      });
    }
  }

  static async processFaceMatching(sessionId, preview, compareFaceId) {
    console.log("\nStep 2: Looking for reference image in S3...");

    let faceMatch = { found: false };
    let capturedImageInfo = null;
    let previewUrl = null;

    try {
      const s3Prefix = `${sessionId}/`;
      const s3Objects = await S3Service.listObjects(
        process.env.S3_BUCKET,
        s3Prefix
      );

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
        console.log(`✅ Found reference image: ${referenceImageObj.Key}`);

        const imageBuffer = await S3Service.getObject(
          process.env.S3_BUCKET,
          referenceImageObj.Key
        );

        capturedImageInfo = ImageService.logImageDetails(
          imageBuffer,
          sessionId,
          "AWS Liveness Session"
        );

        if (preview === "true") {
          previewUrl = await ImageService.saveImageForPreview(
            imageBuffer,
            sessionId
          );
        }

        console.log("\nStep 3: Searching for face match in collection...");

        const detectFaces = await RekognitionService.detectFaces(imageBuffer);
        console.log(
          "DetectFaces response:",
          JSON.stringify(detectFaces, null, 2)
        );

        if (!detectFaces.FaceDetails || detectFaces.FaceDetails.length === 0) {
          console.log("❌ No faces detected in the image");
          faceMatch = { found: false, error: "No faces detected in the image" };
        } else {
          faceMatch = await LivenessController.performFaceMatching(
            imageBuffer,
            compareFaceId
          );
        }
      } else {
        console.log("❌ No reference image found in S3");
      }
    } catch (error) {
      console.error("❌ Face matching error:", error);
      faceMatch = {
        found: false,
        error: error.message,
      };
    }

    return {
      faceMatch,
      capturedImage: {
        found: !!capturedImageInfo,
        details: capturedImageInfo,
        previewUrl: previewUrl,
      },
    };
  }

  static async performFaceMatching(imageBuffer, compareFaceId) {
    if (compareFaceId) {
      console.log(`🔍 Comparing with specific face ID: ${compareFaceId}`);

      try {
        const referenceImageBuffer = await S3Service.getObject(
          process.env.S3_BUCKET,
          `faces/${compareFaceId}.jpg`
        );

        const compareResult = await RekognitionService.compareFaces(
          imageBuffer,
          referenceImageBuffer
        );

        console.log(
          "CompareFaces response:",
          JSON.stringify(compareResult, null, 2)
        );

        if (compareResult.FaceMatches && compareResult.FaceMatches.length > 0) {
          const bestMatch = compareResult.FaceMatches[0];
          console.log(
            `🎉 Face match with ${compareFaceId}: ${bestMatch.Similarity.toFixed(1)}%`
          );

          return {
            found: true,
            name: compareFaceId,
            similarity: bestMatch.Similarity,
            details: bestMatch,
          };
        } else {
          console.log(`❌ No match found for face ID: ${compareFaceId}`);
          return { found: false };
        }
      } catch (error) {
        console.error(
          `❌ Error comparing with face ID ${compareFaceId}:`,
          error
        );
        return { found: false, error: error.message };
      }
    } else {
      // Use SearchFacesByImage (existing logic)
      const searchResult = await RekognitionService.searchFacesByImage(
        process.env.REKOGNITION_COLLECTION,
        imageBuffer
      );

      console.log(
        `🔍 Face search results: ${searchResult.FaceMatches?.length || 0} matches found`
      );
      console.log(
        "Raw searchFacesByImage response:",
        JSON.stringify(searchResult, null, 2)
      );

      if (searchResult.FaceMatches && searchResult.FaceMatches.length > 0) {
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

        console.log(
          `🎉 Best face match: ${name} with ${similarity.toFixed(1)}% similarity`
        );

        return {
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
      } else {
        console.log("❌ No face matches found in collection");
        return { found: false };
      }
    }
  }
}

export { checkedInUsers };
