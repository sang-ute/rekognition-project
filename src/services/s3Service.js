// src/services/s3Service.js
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "../config/aws.js";

export class S3Service {
  static async getObject(bucket, key) {
    try {
      console.log(`Fetching S3 object: s3://${bucket}/${key}`);

      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const result = await s3Client.send(command);

      console.log(`S3 fetch successful:`);
      console.log(`Content-Type: ${result.ContentType}`);
      console.log(`Content-Length: ${result.ContentLength} bytes`);
      console.log(`Last-Modified: ${result.LastModified}`);

      const streamToBuffer = async (stream) => {
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      };

      return await streamToBuffer(result.Body);
    } catch (error) {
      console.error(`Error getting S3 object ${key}:`, error.message);
      throw error;
    }
  }

  static async listObjects(bucket, prefix) {
    try {
      console.log(`Listing S3 objects with prefix: s3://${bucket}/${prefix}`);
      let allObjects = [];
      const prefixes = [prefix, "/", "faces/"]; // Include possible prefixes

      for (const p of prefixes) {
        const params = { Bucket: bucket, Prefix: p, MaxKeys: 100 };
        const result = await s3Client.send(new ListObjectsV2Command(params));
        allObjects = allObjects.concat(result.Contents || []);
        console.log(
          `Found ${result.Contents?.length || 0} objects for prefix ${p}:`
        );
        console.log("Objects:", JSON.stringify(result.Contents || [], null, 2));
      }

      // Log all bucket contents
      const fullList = await s3Client.send(
        new ListObjectsV2Command({ Bucket: bucket })
      );
      console.log(
        "All bucket objects:",
        JSON.stringify(fullList.Contents || [], null, 2)
      );

      allObjects.forEach((obj, index) => {
        console.log(
          `   ${index + 1}. ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`
        );
      });

      return allObjects;
    } catch (error) {
      console.error(
        `Error listing S3 objects with prefix ${prefix}:`,
        error.message
      );
      throw error;
    }
  }

  static async uploadObject(bucket, key, body, contentType) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    return await s3Client.send(command);
  }

  static async deleteObject(bucket, key) {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await s3Client.send(command);
  }
}
