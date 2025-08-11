# AWS Rekognition Face Recognition Project

A full-stack face recognition application built with AWS Rekognition, featuring face registration, liveness detection, and attendance tracking.

## 🚀 Features

- **Face Registration**: Register new faces with AWS Rekognition
- **Liveness Detection**: Verify real person presence using AWS Rekognition Liveness
- **Face Recognition**: Identify registered faces for check-in
- **Attendance Tracking**: Monitor and track attendance records
- **Dashboard**: View attendance statistics and manage faces
- **Real-time Processing**: Fast face detection and recognition

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Amplify Frontend│    |  Express Backend│    │   AWS Services  │
│                 │    │                 │    │                 │
│ • Registration  │◄──►│ • Face API      │◄──►│ • Rekognition   │
│ • Check-in      │    │ • Liveness API  │    │ • S3 Storage    │
│ • Dashboard     │    │ • Attendance    │    │ • DynamoDB      │
│ • Liveness      │    │ • Image Upload  │    │ • Lambda        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js (v18 or higher)
- AWS Account with appropriate permissions
- AWS CLI configured (optional but recommended)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rekognition-project
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## ⚙️ Configuration

### 1. Environment Variables

Copy the example environment file and configure your AWS credentials:

```bash
cp .env.example .env
```

Edit `.env` with your AWS configuration:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET=your-s3-bucket-name
REKOGNITION_COLLECTION=your-rekognition-collection-name
DYNAMO_TABLE=your-dynamodb-table-name
PORT=3001
```

### 2. AWS Services Setup

#### S3 Bucket

Create an S3 bucket for storing face images:

```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

#### Rekognition Collection

Create a Rekognition collection:

```bash
aws rekognition create-collection --collection-id your-collection-name --region us-east-1
```

#### DynamoDB Table

Create a DynamoDB table for attendance records:

```bash
aws dynamodb create-table \
    --table-name your-table-name \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### 3. AWS Amplify Setup (Optional)

If using AWS Amplify for deployment:

```bash
npm install -g @aws-amplify/cli
amplify configure
amplify init
amplify push
```

## 🚀 Running the Application

### Development Mode

1. **Start the Backend Server:**

```bash
npm run dev
```

The backend will run on `http://localhost:3001`

2. **Start the Frontend (in a new terminal):**

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`

### Production Mode

1. **Build the Frontend:**

```bash
cd frontend
npm run build
cd ..
```

2. **Start the Production Server:**

```bash
npm start
```

## 📁 Project Structure

```
rekognition-project/
├── amplify/                 # AWS Amplify configuration
│   ├── functions/          # Lambda functions
│   └── backend/            # Backend resources
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── config/         # Configuration files
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── src/                    # Backend source code
│   ├── config/             # AWS and app configuration
│   ├── controllers/        # Route controllers
│   ├── middlewares/        # Express middlewares
│   ├── routes/             # API routes
│   ├── services/           # Business logic services
│   └── utils/              # Utility functions
├── uploads/                # Temporary file uploads
├── .env                    # Environment variables
├── server.js               # Server entry point
└── package.json            # Dependencies and scripts
```

## 🔌 API Endpoints

### Face Management

- `POST /api/faces/register` - Register a new face
- `DELETE /api/faces/:faceId` - Delete a face
- `GET /api/faces/collections` - List all collections

### Check-in

- `POST /api/checkin` - Face recognition check-in
- `GET /api/checkin/history` - Get check-in history

### Liveness Detection

- `POST /api/liveness/session` - Create liveness session
- `GET /api/liveness/result/:sessionId` - Get liveness result

### Attendance

- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record

## 🔧 Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   - Ensure your AWS credentials are correctly set in `.env`
   - Verify IAM permissions for Rekognition, S3, and DynamoDB

2. **Collection Not Found**
   - Create the Rekognition collection using AWS CLI
   - Verify the collection name in your environment variables

3. **S3 Bucket Access Denied**
   - Check bucket permissions and CORS configuration
   - Ensure the bucket exists in the specified region

4. **Frontend Build Issues**
   - Clear node_modules and reinstall dependencies
   - Check Node.js version compatibility

### Required AWS Permissions

Your AWS user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:*",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "*"
    }
  ]
}
```

## 📝 Usage

1. **Register Faces**: Navigate to the registration page and upload face images
2. **Check-in**: Use the check-in page for face recognition attendance
3. **Liveness Check**: Perform liveness detection to verify real person presence
4. **Dashboard**: View attendance statistics and manage registered faces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section above
- Review AWS Rekognition documentation

## 🔗 Useful Links

- [AWS Rekognition Documentation](https://docs.aws.amazon.com/rekognition/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [React Documentation](https://reactjs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
