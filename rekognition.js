import AWS from "aws-sdk";

const rekognition = new AWS.Rekognition();
const S3_BUCKET = process.env.S3_BUCKET;
const COLLECTION_ID = process.env.REKOGNITION_COLLECTION;

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function searchFace(imageKey) {
  const params = {
    CollectionId: COLLECTION_ID,
    Image: {
      S3Object: {
        Bucket: S3_BUCKET,
        Name: imageKey,
      },
    },
    FaceMatchThreshold: 90,
    MaxFaces: 1,
  };

  const result = await rekognition.searchFacesByImage(params).promise();
  const matches = result.FaceMatches;
  if (matches.length === 0) return null;
  return matches[0].Face.ExternalImageId;
}

export { searchFace };
