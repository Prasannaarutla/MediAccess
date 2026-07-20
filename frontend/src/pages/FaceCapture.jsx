import React, { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { sendFaceToBackend, dataUrlToBlob, isValidEmbedding } from '../utils/faceRecognitionUtils'
import { normalizeEmbedding } from '../utils/faceRecognition'
import { updateData } from '../firebase'

export default function FaceCapture() {
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isCameraReady, setIsCameraReady] = useState(true)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')

  const handleCapture = useCallback(() => {
    try {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot()
        if (imageSrc) {
          setCapturedImage(imageSrc)
          setError(null)
        } else {
          setError('Failed to capture image. Please try again.')
        }
      }
    } catch (err) {
      setError('Failed to capture image. Please try again.')
      console.error('Capture error:', err)
    }
  }, [])

  const handleRetake = () => {
    setCapturedImage(null)
    setError(null)
  }

  const handleContinue = async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    setProcessingMessage('Extracting face embedding...')

    try {
      // Get patient ID from registration data
      const patientRegisterData = localStorage.getItem('patientRegisterData')
      const patientData = patientRegisterData ? JSON.parse(patientRegisterData) : {}
      const patientId = patientData.patientId || `PAT_${Math.floor(1000 + Math.random() * 9000).toString()}`

      // Convert captured image (data URL) to blob
      const imageBlob = dataUrlToBlob(capturedImage)

      // Send face to backend for embedding extraction
      setProcessingMessage('Sending face to backend...')
      const result = await sendFaceToBackend(imageBlob)

      if (!result.success) {
        setError(`Failed to extract face embedding: ${result.error}`)
        setIsProcessing(false)
        return
      }

      // Validate and normalize embedding
      if (!isValidEmbedding(result.embedding)) {
        setError('Invalid face embedding received from backend')
        setIsProcessing(false)
        return
      }

      // Normalize embedding for better consistency
      const normalizedEmbedding = normalizeEmbedding(result.embedding)
      if (!normalizedEmbedding) {
        setError('Failed to normalize face embedding')
        setIsProcessing(false)
        return
      }

      // Store normalized embedding in patient record in Firebase
      setProcessingMessage('Saving face embedding to database...')
      const updateResult = await updateData(`patients/${patientId}`, {
        faceEmbedding: normalizedEmbedding,
        faceCaptureDate: new Date().toISOString(),
        lastFaceUpdate: new Date().toISOString(),
        faceEmbeddingModel: result.model || 'unknown',
        embeddingNormalized: true,
        patientFace: capturedImage
      })

      if (!updateResult.success) {
        setError(`Failed to save face embedding: ${updateResult.error}`)
        setIsProcessing(false)
        return
      }

      // Success - store in localStorage and navigate
      localStorage.setItem('patientFace', capturedImage)
      localStorage.setItem('patientId', patientId)
      localStorage.setItem('patientLoggedIn', 'true')
      localStorage.setItem('patientFaceEmbedding', JSON.stringify(normalizedEmbedding))

      setProcessingMessage('Registration complete! Redirecting...')
      setTimeout(() => {
        navigate('/patient/dashboard')
      }, 1500)
    } catch (err) {
      console.error('Error in face capture:', err)
      setError(`An error occurred: ${err.message}`)
      setIsProcessing(false)
    }
  }

  const handleUserMedia = () => {
    setIsCameraReady(true)
  }

  const handleUserMediaError = (err) => {
    setError('Unable to access camera. Please check permissions and try again.')
    setIsCameraReady(false)
    console.error('Camera error:', err)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Face Capture</h1>
        <p className="text-center text-gray-500 mb-8">Please capture your face for identification</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {!capturedImage ? (
          <div className="space-y-4">
            {/* Webcam Feed */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                videoConstraints={{
                  facingMode: 'user',
                  width: { ideal: 400 },
                  height: { ideal: 400 }
                }}
                className="w-full"
              />
            </div>

            {/* Capture Instructions */}
            <div className="bg-teal-50 p-4 rounded-lg">
              <p className="text-sm text-teal-800">
                <strong>Instructions:</strong> Look directly at the camera and ensure your face is clearly visible. Good lighting helps improve capture quality.
              </p>
            </div>

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={!isCameraReady}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 text-lg ${
                isCameraReady
                  ? 'bg-primary hover:bg-teal-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              {isCameraReady ? 'Capture Face' : 'Initializing Camera...'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Captured Image Preview */}
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full h-auto"
              />
            </div>

            {/* Success Message */}
            {!isProcessing && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm">
                <p className="text-emerald-800 text-sm leading-relaxed">
                  <strong className="block mb-1">Face captured successfully!</strong> 
                  For better accuracy, please update your facial data periodically (every few months) due to natural changes.
                </p>
              </div>
            )}

            {/* Processing Message */}
            {isProcessing && (
              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-teal-800 text-sm">
                    <strong>{processingMessage}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className={`w-full py-4 px-4 rounded-xl font-bold transition duration-200 shadow-md ${
                  isProcessing
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Continue'}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className={`py-2 px-4 rounded-xl font-bold transition duration-200 ${
                    isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer border border-gray-200'
                  }`}
                >
                  Retake Photo
                </button>
                <button
                  onClick={() => navigate('/patient/dashboard')}
                  disabled={isProcessing}
                  className={`py-2 px-4 rounded-xl font-bold transition duration-200 ${
                    isProcessing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer border border-amber-200'
                  }`}
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
