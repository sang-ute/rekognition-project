// src/controllers/checkinController.js
import fs from "fs";
import { RekognitionService } from "../services/rekognitionService.js";
import { ImageService } from "../services/imageService.js";
import { checkedInUsers } from "./livenessController.js";
import { CONSTANTS } from "../utils/constants.js";

export class CheckinController {
  static async manualCheckin(req, res) {
    try {
      console.log("\n📱 Manual check-in initiated");

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No photo uploaded",
        });
      }

      const photo = fs.readFileSync(req.file.path);

      const imageDetails = ImageService.logImageDetails(
        photo,
        "manual-checkin",
        "Manual Upload"
      );

      const detectFaces = await RekognitionService.detectFaces(photo);
      console.log(
        "DetectFaces response:",
        JSON.stringify(detectFaces, null, 2)
      );

      if (!detectFaces.FaceDetails || detectFaces.FaceDetails.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.json({
          success: false,
          message: "No faces detected in the uploaded image",
          capturedImage: {
            found: true,
            details: imageDetails,
          },
        });
      }

      const searchResult = await RekognitionService.searchFacesByImage(
        process.env.REKOGNITION_COLLECTION,
        photo,
        CONSTANTS.MANUAL_CHECKIN_THRESHOLD,
        1
      );

      console.log(
        "Raw searchFacesByImage response:",
        JSON.stringify(searchResult, null, 2)
      );

      // Clean up uploaded file
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
          },
        });
      }
    } catch (err) {
      console.error("❌ Manual check-in error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
