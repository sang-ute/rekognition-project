// src/services/imageService.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ImageService {
  static logImageDetails(imageBuffer, sessionId, source = "unknown") {
    const sizeInKB = (imageBuffer.length / 1024).toFixed(2);
    const sizeInMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("  IMAGE CAPTURE LOG");
    console.log("=".repeat(60));
    console.log(` Session ID: ${sessionId}`);
    console.log(` Source: ${source}`);
    console.log(` Image Size: ${sizeInKB} KB (${sizeInMB} MB)`);
    console.log(` Buffer Length: ${imageBuffer.length} bytes`);
    console.log(` Timestamp: ${new Date().toISOString()}`);

    const isJPEG = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8;
    const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;

    console.log(
      `Format Valid: ${isJPEG ? "JPEG" : isPNG ? "PNG" : "Unknown/Invalid"}`
    );
    console.log(
      `First 10 bytes: [${Array.from(imageBuffer.slice(0, 10))
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

  static async saveImageForPreview(imageBuffer, sessionId) {
    try {
      const previewDir = path.join(__dirname, "../../temp-previews");

      if (!fs.existsSync(previewDir)) {
        fs.mkdirSync(previewDir, { recursive: true });
      }

      const filename = `preview_${sessionId}_${Date.now()}.jpg`;
      const filepath = path.join(previewDir, filename);

      fs.writeFileSync(filepath, imageBuffer);
      console.log(`Preview image saved: ${filepath}`);

      // Cleanup after 5 minutes
      setTimeout(
        () => {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`🗑️ Preview image cleaned up: ${filename}`);
          }
        },
        5 * 60 * 1000
      );

      return filename;
    } catch (error) {
      console.error("Error saving preview image:", error);
      return null;
    }
  }
}
