import express from "express";
import AWS from "aws-sdk";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Backend running");
});

// Generate pre-signed URL for viewing S3 object
app.post("/get-view-url", async (req, res) => {
  try {
    const { s3Key } = req.body;

    if (!s3Key) {
      return res.status(400).json({ error: "Missing required field: s3Key" });
    }

    console.log("Generating view URL for s3Key:", s3Key);

    // Configure S3 parameters for pre-signed GET URL
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Expires: 60, // URL expires in 60 seconds
    };

    // Generate pre-signed URL for viewing
    const viewUrl = await s3.getSignedUrlPromise("getObject", params);

    res.json({
      success: true,
      viewUrl,
      message: "Pre-signed view URL generated successfully",
    });
  } catch (error) {
    console.error("Error generating view URL:", error);
    res.status(500).json({ error: "Failed to generate view URL", details: error.message });
  }
});

// Generate pre-signed URL for S3 upload
app.post("/generate-upload-url", async (req, res) => {
  try {
    const { fileName, fileType, patientId } = req.body;

    // Validate required fields
    if (!fileName || !fileType || !patientId) {
      return res.status(400).json({ error: "Missing required fields: fileName, fileType, patientId" });
    }

    // Create unique key in S3 bucket with records/ folder structure
    const key = `${patientId}/records/${Date.now()}-${fileName}`;

    // Configure S3 parameters for pre-signed URL
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Expires: 60, // URL expires in 60 seconds
      ContentType: fileType,
    };

    // Generate pre-signed URL for upload
    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);

    // Construct the public file URL
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Return URLs to frontend
    res.json({
      uploadUrl,
      fileUrl,
      key,
      message: "Pre-signed URL generated successfully",
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL", details: error.message });
  }
});

// NEW: Upload file directly to S3 via backend (no CORS issues)
app.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: "Missing patientId" });
    }

    // Create unique key in S3 bucket with records/ folder structure
    const key = `${patientId}/records/${Date.now()}-${req.file.originalname}`;

    // Configure S3 upload parameters
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    // Upload to S3
    const s3Response = await s3.upload(params).promise();

    // Construct the public file URL
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log(`✅ File uploaded successfully: ${key}`);

    // Return success with file information
    res.json({
      success: true,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileUrl: fileUrl,
      key: key,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload file",
      details: error.message,
    });
  }
});

// Get list of uploaded files for a patient
app.get("/patient-files/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: `${patientId}/records/`,
    };

    const data = await s3.listObjectsV2(params).promise();

    const files = (data.Contents || []).map((obj) => ({
      key: obj.Key,
      fileName: obj.Key.split("/").pop(),
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`,
    }));

    res.json({ files, count: files.length });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files", details: error.message });
  }
});

// Delete a file from S3
app.delete("/delete-file/:patientId/:fileName", async (req, res) => {
  try {
    const { patientId, fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    const key = `${patientId}/records/${decodedFileName}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();

    res.json({ message: "File deleted successfully", key });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file", details: error.message });
  }
});

// Mock face recognition endpoint
app.post("/extract-face", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("📸 Received face image for processing");

    // Mock face embedding (512-dimensional vector)
    const mockEmbedding = Array.from({ length: 512 }, () => Math.random() * 2 - 1);

    // Simulate face detection success
    res.json({
      embedding: mockEmbedding,
      face_detected: true,
      confidence: 0.95,
      message: "Face processed successfully (mock implementation)"
    });

  } catch (error) {
    console.error("Error processing face:", error);
    res.status(500).json({ error: "Failed to process face", details: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Healthcare Backend Server running on http://0.0.0.0:${PORT}`);
  console.log(`🪣 S3 Bucket: ${process.env.AWS_BUCKET_NAME}`);
  console.log(`📍 Region: ${process.env.AWS_REGION}`);
});
