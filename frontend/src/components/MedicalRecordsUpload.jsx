import React, { useState, useRef, useEffect } from 'react'
import Webcam from 'react-webcam'
import { FiUpload, FiImage, FiCamera, FiX, FiDownload, FiTrash2, FiCloud, FiEye } from 'react-icons/fi'
import { uploadFile, deleteFileFromS3 } from '../utils/fileUploadUtils'
import { subscribeToData, deleteData, addData } from '../firebase'
import PrescriptionViewer from '../components/PrescriptionViewer'

const GOOGLE_CLIENT_ID = '641751633879-top3ashcmnje3mu0fn9i5cet4lm3946k.apps.googleusercontent.com'

const UPLOAD_OPTIONS = [
  {
    id: 'file-explorer',
    label: 'File Explorer',
    icon: FiUpload,
    description: 'Upload from your computer'
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: FiImage,
    description: 'Select from photos'
  },
  {
    id: 'camera',
    label: 'Camera',
    icon: FiCamera,
    description: 'Capture new photo'
  },
  {
    id: 'google-drive',
    label: 'Google Drive',
    icon: FiCloud,
    description: 'Select from Drive'
  }
]

export default function MedicalRecordsUpload() {
  const [medicalRecords, setMedicalRecords] = useState([])
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [previewPrescriptionId, setPreviewPrescriptionId] = useState(null)
  const [viewingRecordId, setViewingRecordId] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [patientId, setPatientId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [deleting, setDeleting] = useState(null)
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  // Get patient ID from localStorage
  useEffect(() => {
    const id = localStorage.getItem('patientId')
    setPatientId(id)
  }, [])

  // Subscribe to Firebase records when patient ID changes
  useEffect(() => {
    if (!patientId) return

    console.log(`📋 Subscribing to records for patient ${patientId}`)
    const unsubscribe = subscribeToData(
      `patients/${patientId}/records`,
      (result) => {
        if (result.success && result.data) {
          // Convert Firebase object to array of records
          const recordsArray = Object.entries(result.data).map(([id, record]) => ({
            id,
            ...record
          }))
          console.log(`✅ Loaded ${recordsArray.length} records from Firebase`)
          setMedicalRecords(recordsArray)
        } else if (result.success && !result.data) {
          // No records found
          console.log('📁 No records found for patient')
          setMedicalRecords([])
        } else {
          console.error('❌ Error loading records:', result.error)
          setMedicalRecords([])
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [patientId])

  // File Handler - Calls backend and Firebase integration
  const handleFileUpload = async (file) => {
    if (!patientId) {
      setError('Patient ID not found. Please login again.')
      return
    }

    setUploading(true)
    setUploadProgress('🔄 Validating file...')
    setError(null)
    setSuccessMessage(null)

    try {
      setUploadProgress('📤 Uploading to S3...')
      console.log(`📤 Starting upload for file: ${file.name}`)
      
      const result = await uploadFile(file, patientId)
      
      if (result.success) {
        setUploadProgress('💾 Saving metadata to Firebase...')
        setSuccessMessage(`✅ File "${file.name}" uploaded successfully!`)
        console.log(`✅ Upload complete for ${file.name}`)
        // No need to manually update state - Firebase subscription will handle it
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setError(`❌ Upload failed: ${result.error}`)
        console.error('Upload error:', result.error)
      }
    } catch (err) {
      setError(`❌ Unexpected error: ${err.message}`)
      console.error('Upload exception:', err)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  // File Explorer Handler
  const handleFileExplorer = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    e.target.value = '' // Reset input
  }

  // Gallery Handler
  const handleGallery = () => {
    galleryInputRef.current?.click()
  }

  const handleGallerySelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    e.target.value = '' // Reset input
  }

  // Camera Handler
  const handleCameraCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setUploadProgress('📸 Processing camera image...')
        // Convert base64 to blob
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `camera-${Date.now()}.jpeg`, {
              type: 'image/jpeg'
            })
            setShowCameraModal(false)
            handleFileUpload(file)
          })
          .catch(err => {
            setError('❌ Failed to process camera image')
            console.error('Camera error:', err)
            setUploadProgress('')
          })
      }
    }
  }

  // Google Drive Handler
  const handleGoogleDrive = () => {
    if (!window.google?.accounts?.oauth2) {
      setError('❌ Google APIs not fully loaded. Please refresh and try again.')
      return
    }

    try {
      console.log('🔐 Initializing Google Drive access...')
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: handleGoogleAuthSuccess
      })
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } catch (err) {
      setError(`❌ Failed to initialize Google Drive: ${err.message}`)
      console.error('Google Drive init error:', err)
    }
  }

  const handleGoogleAuthSuccess = (response) => {
    if (response.access_token) {
      console.log('✅ Google authentication successful')
      openGooglePicker(response.access_token)
    } else {
      setError('❌ Failed to authenticate with Google Drive')
    }
  }

  const openGooglePicker = (accessToken) => {
    if (!window.google?.picker) {
      // Load picker library
      console.log('📦 Loading Google Picker library...')
      window.gapi?.load('picker', { callback: () => {
        createAndOpenPicker(accessToken)
      }})
    } else {
      createAndOpenPicker(accessToken)
    }
  }

  const createAndOpenPicker = (accessToken) => {
    try {
      console.log('🔍 Opening Google Picker...')
      const docsView = new window.google.picker.DocsView(
        window.google.picker.ViewId.DOCS
      )
      docsView.setMimeTypes('image/png,image/jpeg,application/pdf')

      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
        .setAppId(GOOGLE_CLIENT_ID)
        .setOAuthToken(accessToken)
        .addView(docsView)
        .setCallback(handlePickerCallback)
        .build()

      picker.setVisible(true)
    } catch (err) {
      setError(`❌ Failed to open Google Picker: ${err.message}`)
      console.error('Picker error:', err)
    }
  }

  const handlePickerCallback = async (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      console.log('📄 File selected from Google Drive')
      const doc = data.docs[0]
      
      const googleFile = {
        name: doc.getName?.() || doc.name,
        mimeType: doc.mimeType || 'application/octet-stream',
        size: doc.sizeBytes || 0,
        id: doc.id,
        source: 'Google Drive'
      }

      console.log('📤 Processing Google Drive file:', googleFile.name)
      
      try {
        setUploadProgress('💾 Saving Google Drive file metadata to Firebase...')
        
        // For Google Drive files, we store the file link instead of uploading to S3
        const googleDriveUrl = `https://drive.google.com/file/d/${googleFile.id}/view`
        
        const recordData = {
          fileName: googleFile.name,
          fileType: googleFile.mimeType,
          fileSize: googleFile.size,
          fileUrl: googleDriveUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: localStorage.getItem('patientEmail') || 'unknown',
          source: 'Google Drive',
          googleDriveId: googleFile.id
        }

        // Save to Firebase
        const result = await addData(`patients/${patientId}/records`, recordData)
        
        if (result.success) {
          setSuccessMessage(`✅ Google Drive file "${googleFile.name}" added successfully!`)
          console.log(`✅ Google Drive file saved: ${googleFile.name}`)
          setTimeout(() => setSuccessMessage(null), 4000)
        } else {
          setError(`❌ Failed to save Google Drive file: ${result.error}`)
        }
      } catch (err) {
        setError(`❌ Error processing Google Drive file: ${err.message}`)
        console.error('Google Drive processing error:', err)
      } finally {
        setUploadProgress('')
      }
    } else if (data.action === window.google.picker.Action.CANCEL) {
      console.log('ℹ️ Google Picker cancelled by user')
      setError(null)
    }
  }

  // Delete File Handler
  const handleDeleteFile = async (recordId, fileName) => {
    if (!patientId) {
      setError('Patient ID not found.')
      return
    }

    setDeleting(recordId)
    setError(null)

    try {
      console.log(`🗑️ Deleting file ${fileName} from S3...`)
      
      // Delete from S3 via backend
      const s3Result = await deleteFileFromS3(patientId, fileName)
      
      if (s3Result.success) {
        // Delete from Firebase
        const firebaseResult = await deleteData(`patients/${patientId}/records/${recordId}`)
        
        if (firebaseResult.success) {
          setSuccessMessage(`✅ File "${fileName}" deleted successfully`)
          console.log(`✅ Deleted ${fileName}`)
          setTimeout(() => setSuccessMessage(null), 3000)
        } else {
          setError('❌ File deleted from S3 but failed to update database')
          console.error('Firebase delete error:', firebaseResult.error)
        }
      } else {
        setError(`❌ Failed to delete file: ${s3Result.error}`)
        console.error('S3 delete error:', s3Result.error)
      }
    } catch (err) {
      setError(`❌ Delete error: ${err.message}`)
      console.error('Delete exception:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handleViewS3Record = async (record) => {
    try {
      setViewingRecordId(record.id)
      const s3Key = record.s3Key || record.key;
      if (!s3Key) {
         alert("Unable to load file. This record was uploaded before secure S3 tracking. Please re-upload it.");
         return;
      }
      
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'
      const response = await fetch(`${BACKEND_URL}/get-view-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key })
      })

      if (!response.ok) throw new Error('Failed to get view URL')

      const data = await response.json()
      if (data.success) {
        window.open(data.viewUrl, '_blank')
      } else {
        throw new Error(data.error || 'Server error')
      }
    } catch (err) {
      console.error('Error viewing S3 record:', err)
      alert("Unable to securely load file. Please try again.")
    } finally {
      setViewingRecordId(null)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType) => {
    if (!fileType) return '📄'
    if (fileType === 'prescription') return '💊'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    return '📄'
  }

  const uploadOptions = [
    {
      ...UPLOAD_OPTIONS[0],
      onClick: handleFileExplorer
    },
    {
      ...UPLOAD_OPTIONS[1],
      onClick: handleGallery
    },
    {
      ...UPLOAD_OPTIONS[2],
      onClick: () => setShowCameraModal(true)
    },
    {
      ...UPLOAD_OPTIONS[3],
      onClick: handleGoogleDrive
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-textDark">
        Medical Records Upload
      </h2>

      {/* File Rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Upload Guidelines</h3>
        <p className="text-sm text-blue-800">
          • Supported formats: PNG, JPEG, PDF
        </p>
        <p className="text-sm text-blue-800">
          • Maximum file size: 5MB
        </p>
        <p className="text-sm text-blue-800 mt-2">
          💡 Files are securely stored on AWS S3 and indexed in Firebase
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4">
          <div className="flex items-start">
            <span className="text-red-600 mr-3">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && uploadProgress && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <div className="flex items-center">
            <div className="animate-spin mr-3">⏳</div>
            <p className="text-sm text-yellow-800 font-medium">{uploadProgress}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4">
          <div className="flex items-start">
            <span className="text-green-600 mr-3">✓</span>
            <div className="flex-1">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Options */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploadOptions.map(option => {
          const IconComponent = option.icon
          return (
            <button
              key={option.id}
              onClick={option.onClick}
              disabled={uploading}
              className={`bg-surface border-2 border-slate-200 rounded-xl p-6 transition duration-200 group ${
                uploading ? 'cursor-not-allowed' : 'hover:border-blue-500 hover:shadow-md hover:shadow-lg transition-all duration-300-lg'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className={`text-4xl transition ${uploading ? 'text-gray-300' : 'text-slate-400 group-hover:text-blue-600'}`}>
                  <IconComponent size={40} />
                </div>
                <h3 className="font-semibold text-textDark text-center text-sm">
                  {option.label}
                </h3>
                <p className="text-xs text-textLight text-center hidden md:block">
                  {option.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpeg,.jpg,.pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleGallerySelect}
        style={{ display: 'none' }}
      />

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-md hover:shadow-lg transition-all duration-300-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-textDark">Capture Photo</h3>
              <button
                onClick={() => setShowCameraModal(false)}
                className="text-textLight hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="bg-black rounded-xl overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: 'user',
                  width: { ideal: 400 },
                  height: { ideal: 400 }
                }}
                className="w-full"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCameraModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-textDark font-semibold py-2 px-4 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCameraCapture}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Records List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-textDark">
          Uploaded Records ({medicalRecords.length})
        </h3>

        {medicalRecords.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-8 text-center">
            <p className="text-4xl mb-2">📁</p>
            <p className="text-slate-600 font-medium">No records uploaded yet</p>
            <p className="text-textLight text-sm mt-2">
              Use any of the upload options above to add medical records to your secure cloud storage
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {medicalRecords.map(record => (
              <div
                key={record.id}
                className="bg-surface rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-4 flex items-center justify-between hover:shadow-md hover:shadow-lg transition-all duration-300-lg transition"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <span className="text-3xl flex-shrink-0">
                    {getFileIcon(record.fileType || record.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-textDark truncate">
                      {record.fileName || record.name}
                    </h4>
                    <div className="flex flex-wrap items-center space-x-4 text-xs text-textLight mt-1">
                      {record.type !== 'prescription' && (
                        <span>{formatFileSize(record.fileSize || record.size)}</span>
                      )}
                      {record.type !== 'prescription' ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                          📤 S3 Cloud
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200 font-bold">
                          Digital Prescription
                        </span>
                      )}
                      <span>
                        {new Date(record.uploadedAt || record.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                  {/* View Button */}
                  {record.type === 'prescription' ? (
                    <button
                      onClick={() => setPreviewPrescriptionId(record.prescriptionId)}
                      title="View Prescription"
                      className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 p-2 rounded transition flex items-center justify-center"
                    >
                      <FiEye size={20} />
                    </button>
                  ) : record.fileUrl && (
                    <button
                      onClick={() => handleViewS3Record(record)}
                      disabled={viewingRecordId === record.id}
                      title="View file"
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition"
                    >
                      {viewingRecordId === record.id ? (
                        <div className="animate-spin text-sm">⏳</div>
                      ) : (
                        <FiEye size={20} />
                      )}
                    </button>
                  )}
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteFile(record.id, record.fileName || record.name)}
                    disabled={deleting === record.id}
                    title="Delete record"
                    className={`p-2 rounded transition ${
                      deleting === record.id
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {deleting === record.id ? (
                      <div className="animate-spin">⏳</div>
                    ) : (
                      <FiTrash2 size={20} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Prescription Viewer Modal */}
      {previewPrescriptionId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl h-[85vh] bg-slate-50 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-800 text-white rounded-t-2xl">
              <h3 className="font-bold">Digital Prescription Viewer</h3>
              <button 
                onClick={() => setPreviewPrescriptionId(null)}
                className="p-2 hover:bg-surface/20 rounded-full transition"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <PrescriptionViewer 
                patientId={patientId} 
                prescriptionId={previewPrescriptionId} 
              />
            </div>
            
            <div className="p-4 bg-surface border-t border-slate-200 text-center flex justify-between">
              <p className="text-xs text-slate-500 text-left">
                Secured by MediAccess Cloud.<br/>
                Prescriptions are encrypted and access-controlled.
              </p>
              <button 
                onClick={() => setPreviewPrescriptionId(null)}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
