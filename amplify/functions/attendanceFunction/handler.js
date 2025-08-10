import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
    try {
        const { externalImageId } = event.queryStringParameters || {};

        if (!externalImageId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, error: "Missing externalImageId" }),
            };
        }

        const today = new Date().toISOString().split("T")[0];

        const params = {
            TableName: process.env.DYNAMO_TABLE,
            KeyConditionExpression: "externalImageId = :pk AND checkinDay = :today",
            ExpressionAttributeValues: {
                ":pk": externalImageId,
                ":today": today,
            },
        };

        const result = await ddbDocClient.send(new QueryCommand(params));

        const items = result.Items || [];

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                count: items.length,
                items,
            }),
        };
    } catch (err) {
        console.error("Error fetching today's check-ins:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: err.message }),
        };
    }
};
