export function lambdaToExpress(handler) {
    return async (req, res, next) => {
        try {
            // Map req thành event giống Lambda
            const event = {
                httpMethod: req.method,
                path: req.path,
                headers: req.headers,
                queryStringParameters: req.query,
                pathParameters: req.params,
                body: req.body ? JSON.stringify(req.body) : null,
                isBase64Encoded: false,
            };

            // Nếu req.file (upload multer) thì thêm vào event
            if (req.file) {
                event.body = JSON.stringify({
                    name: req.body.name,
                    fileBase64: req.file.buffer.toString("base64"),
                    fileName: req.file.originalname,
                    fileType: req.file.mimetype,
                });
                event.isBase64Encoded = false; // vì body bây giờ là JSON
            }

            // Gọi Lambda handler
            const response = await handler(event, {});

            // Map response về Express res
            if (response?.statusCode) {
                res.status(response.statusCode);
            } else {
                res.status(200);
            }
            if (response?.headers) {
                for (const [key, value] of Object.entries(response.headers)) {
                    res.setHeader(key, value);
                }
            }

            console.log(response);

            if (response?.isBase64Encoded) {
                const buffer = Buffer.from(response.body, "base64");
                res.send(buffer);
            } else {
                // body có thể đã là JSON string hoặc text
                try {
                    res.send(JSON.parse(response.body));
                } catch {
                    res.send(response?.body);
                }
            }
        } catch (error) {
            next(error);
        }
    };
}
