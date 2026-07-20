// File Upload Utility Functions
// Integrates Backend API, AWS S3, and Firebase

import { addData, updateData } from '../firebase'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateFile = (file) => {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: PNG, JPEG, PDF. Got: ${file.type}`,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  return { valid: true, error: null }
}

/**
 * Get file type description
 * @param {string} fileType - MIME type
 * @returns {string} Human-readable file type
 */
export const getFileTypeLabel = (fileType) => {
  const types = {
    'image/png': 'PNG Image',
    'image/jpeg': 'JPEG Image',
    'application/pdf': 'PDF Document',
  }
  return types[fileType] || fileType
}

/**
 * Generate pre-signed URL from backend
 * @param {string} fileName - Name of file
 * @param {string} fileType - MIME type of file
 * @param {string} patientId - Patient ID (PAT_XXXX)
 * @returns {Promise} { uploadUrl, fileUrl, key }
 */
export const generateUploadUrl = async (fileName, fileType, patientId) => {
  try {
    console.log('📝 Requesting pre-signed URL from backend...')

    const response = await fetch(`${BACKEND_URL}/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileType,
        patientId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to generate upload URL: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Pre-signed URL generated successfully')
    return data
  } catch (error) {
    console.error('❌ Error generating upload URL:', error)
    throw error
  }
}

/**
 * Upload file to S3 via backend (avoids CORS issues)
 * @param {File} file - File to upload
 * @param {string} patientId - Patient ID (PAT_XXXX)
 * @returns {Promise} { success, fileUrl, fileName, fileType, fileSize, error, s3Key }
 */
export const uploadFileViaBackend = async (file, patientId) => {
  try {
    console.log('📤 Uploading file to S3 via backend...')

    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('patientId', patientId)

    const response = await fetch(`${BACKEND_URL}/upload-file`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header - browser will set it with boundary
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Upload returned error status')
    }

    console.log('✅ File uploaded to S3 successfully')
    return {
      success: true,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      s3Key: data.key,
    }
  } catch (error) {
    console.error('❌ Error uploading to backend:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Upload file to S3 using pre-signed URL (kept for backward compatibility)
 * @deprecated Use uploadFileViaBackend instead
 * @param {File} file - File to upload
 * @param {string} uploadUrl - Pre-signed URL from backend
 * @returns {Promise} Success or error
 */
export const uploadToS3 = async (file, uploadUrl) => {
  try {
    console.log('📤 Uploading file to S3 using pre-signed URL...')

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`)
    }

    console.log('✅ File uploaded to S3 successfully')
    return true
  } catch (error) {
    console.error('❌ Error uploading to S3:', error)
    throw error
  }
}

/**
 * Save file metadata to Firebase
 * @param {string} patientId - Patient ID (PAT_XXXX)
 * @param {File} file - Original file object
 * @param {string} fileUrl - URL of uploaded file in S3
 * @param {string} s3Key - The exact S3 key used for the object
 * @returns {Promise} Result from Firebase
 */
export const saveFileMetadataToFirebase = async (patientId, file, fileUrl, s3Key) => {
  try {
    console.log('💾 Saving file metadata to Firebase...')

    const recordData = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: fileUrl,
      s3Key: s3Key,
      uploadedAt: new Date().toISOString(),
      uploadedBy: localStorage.getItem('patientEmail') || 'unknown',
    }

    // Save to Firebase under patientId/records
    const result = await addData(`patients/${patientId}/records`, recordData)

    if (result.success) {
      console.log('✅ File metadata saved to Firebase')
      return { success: true, id: result.id }
    } else {
      throw new Error(result.error || 'Failed to save metadata')
    }
  } catch (error) {
    console.error('❌ Error saving metadata to Firebase:', error)
    throw error
  }
}

/**
 * Complete file upload workflow
 * 1. Validate file
 * 2. Fix filenames to prevent S3 Key issues
 * 3. Upload to S3 via backend (no CORS issues)
 * 4. Save metadata to Firebase
 * @param {File} file - File to upload
 * @param {string} patientId - Patient ID
 * @returns {Promise} { success, fileUrl, metadata, error }
 */
export const uploadFile = async (file, patientId) => {
  try {
    // Step 1: Validate file
    console.log('🔍 Validating file...')
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Fix file name (remove spaces and brackets) to prevent S3 issues
    const safeFileName = file.name.replace(/\s+/g, '-').replace(/[()]/g, '')
    const safeFile = new File([file], safeFileName, { type: file.type })

    // Step 2: Upload file to S3 via backend (NEW - avoids CORS)
    const uploadResult = await uploadFileViaBackend(safeFile, patientId)
    if (!uploadResult.success) {
      throw new Error(uploadResult.error)
    }

    // Step 3: Save metadata to Firebase using EXACT s3Key provided by backend
    const firebaseResult = await saveFileMetadataToFirebase(patientId, safeFile, uploadResult.fileUrl, uploadResult.s3Key)

    console.log('🎉 File upload complete!')
    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
      recordId: firebaseResult.id,
      metadata: {
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize,
        s3Key: uploadResult.s3Key,
        uploadedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('❌ Upload failed:', error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Fetch all files for a patient from backend
 * @param {string} patientId - Patient ID
 * @returns {Promise} { files, count }
 */
export const fetchPatientFiles = async (patientId) => {
  try {
    console.log('📂 Fetching patient files...')

    const response = await fetch(`${BACKEND_URL}/patient-files/${patientId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Found ${data.count} files`)
    return data
  } catch (error) {
    console.error('❌ Error fetching files:', error)
    return { files: [], count: 0, error: error.message }
  }
}

/**
 * Delete file from S3
 * @param {string} patientId - Patient ID
 * @param {string} fileName - File name to delete
 * @returns {Promise} Success or error
 */
export const deleteFileFromS3 = async (patientId, fileName) => {
  try {
    console.log(`🗑️ Deleting file: ${fileName}`)

    const response = await fetch(
      `${BACKEND_URL}/delete-file/${patientId}/${encodeURIComponent(fileName)}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`)
    }

    console.log('✅ File deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Error deleting file:', error)
    return { success: false, error: error.message }
  }
}
