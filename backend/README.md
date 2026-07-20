# Healthcare Backend - AWS S3 Upload Server

Secure Node.js backend server for handling AWS S3 file uploads without exposing credentials to the frontend.

## 🚀 Features

- ✅ Generate pre-signed URLs for secure S3 uploads
- ✅ List patient files from S3
- ✅ Delete files from S3
- ✅ CORS enabled for frontend integration
- ✅ Environment variables for security
- ✅ Error handling and validation

## 📋 Prerequisites

- Node.js (v14 or higher)
- AWS Account with S3 bucket
- AWS IAM Access Key and Secret Access Key

## 🔧 Installation

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify `.env` file is configured** with:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_BUCKET_NAME`
   - `AWS_REGION`
   - `PORT`

## ▶️ Running the Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

**Expected Output**:
```
✅ Healthcare Backend Server running on http://localhost:5000
🪣 S3 Bucket: mediaccess-records
📍 Region: ap-south-1
```

## 📡 API Endpoints

### 1. Health Check
**GET** `/`

Returns: `Backend running`

```bash
curl http://localhost:5000
```

### 2. Generate Upload URL
**POST** `/generate-upload-url`

**Request Body**:
```json
{
  "fileName": "medical-report.pdf",
  "fileType": "application/pdf",
  "patientId": "PAT_1234"
}
```

**Response**:
```json
{
  "uploadUrl": "https://mediaccess-records.s3.ap-south-1.amazonaws.com/...",
  "fileUrl": "https://mediaccess-records.s3.ap-south-1.amazonaws.com/PAT_1234/...",
  "key": "PAT_1234/1705312345678-medical-report.pdf",
  "message": "Pre-signed URL generated successfully"
}
```

### 3. Get Patient Files
**GET** `/patient-files/:patientId`

**Example**:
```bash
curl http://localhost:5000/patient-files/PAT_1234
```

**Response**:
```json
{
  "files": [
    {
      "key": "PAT_1234/1705312345678-medical-report.pdf",
      "fileName": "1705312345678-medical-report.pdf",
      "size": 2048576,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "url": "https://mediaccess-records.s3.ap-south-1.amazonaws.com/..."
    }
  ],
  "count": 1
}
```

### 4. Delete File
**DELETE** `/delete-file/:patientId/:fileName`

**Example**:
```bash
curl -X DELETE http://localhost:5000/delete-file/PAT_1234/1705312345678-medical-report.pdf
```

**Response**:
```json
{
  "message": "File deleted successfully",
  "key": "PAT_1234/1705312345678-medical-report.pdf"
}
```

## 🔐 Security Notes

⚠️ **IMPORTANT**:
- `.env` file is in `.gitignore` to prevent credential exposure
- Pre-signed URLs expire in 60 seconds (configurable)
- Never commit `.env` to version control
- AWS credentials should be rotated regularly
- S3 bucket should have appropriate access policies

## 🔗 Frontend Integration

```javascript
// Example: Request pre-signed URL from backend
const response = await fetch('http://localhost:5000/generate-upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'document.pdf',
    fileType: 'application/pdf',
    patientId: 'PAT_1234'
  })
});

const { uploadUrl, fileUrl } = await response.json();

// Upload file directly to S3 using pre-signed URL
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/pdf' },
  body: fileData
});
```

## 📝 Environment Variables

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=ap-south-1
PORT=5000
```

## 🧪 Testing with cURL

```bash
# Health check
curl http://localhost:5000

# Generate upload URL
curl -X POST http://localhost:5000/generate-upload-url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "fileType": "application/pdf",
    "patientId": "PAT_1234"
  }'

# List files
curl http://localhost:5000/patient-files/PAT_1234

# Delete file
curl -X DELETE "http://localhost:5000/delete-file/PAT_1234/filename.pdf"
```

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `ENOENT: no such file or directory, open '.env'` | Create `.env` file with required variables |
| `InvalidUserID.Malformed` | Check AWS Access Key ID format |
| `SignatureDoesNotMatch` | Verify AWS Secret Access Key is correct |
| `NoSuchBucket` | Ensure bucket name is correct and exists |
| `AccessDenied` | Check AWS IAM permissions for S3 |

## 📚 References

- [AWS SDK for JavaScript Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)
- [S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Express.js Documentation](https://expressjs.com/)

## 📄 License

ISC
