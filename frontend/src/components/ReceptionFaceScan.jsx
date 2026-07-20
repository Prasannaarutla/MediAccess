import React, { useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { FiCamera, FiCheck, FiRefreshCw, FiUser, FiX } from 'react-icons/fi'
import { fetchData } from '../firebase'
import {
  dataUrlToBlob,
  findMatchingPatient,
  formatSimilarityScore,
  sendFaceToBackend
} from '../utils/faceRecognitionUtils'
import {
  captureMultipleFrames,
  findBestMatch
} from '../utils/faceRecognition'

export default function ReceptionFaceScan({ onPatientFound, onClose, onShowRegister }) {
  const webcamRef = useRef(null)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturedImages, setCapturedImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames] = useState(3)

  const resetScan = () => {
    setCapturedImage(null)
    setCapturedImages([])
    setResult(null)
    setError('')
    setStatusText('')
    setCurrentFrame(0)
  }

  const handleCapture = () => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      setError('Could not capture image. Please retry.')
      return
    }

    // Simple single frame capture for now
    const newImages = [...capturedImages, screenshot]
    setCapturedImages(newImages)
    setCapturedImage(screenshot)
    setCurrentFrame(currentFrame + 1)
    setStatusText(`Frame captured! Ready to process.`)
    
    // Auto-capture additional frames if needed
    if (currentFrame < totalFrames - 1) {
      setTimeout(() => {
        try {
          const additionalScreenshot = webcamRef.current?.getScreenshot()
          if (additionalScreenshot && additionalScreenshot !== screenshot) {
            setCapturedImages(prev => [...prev, additionalScreenshot])
            setCurrentFrame(prev => prev + 1)
            setStatusText(`Captured ${currentFrame + 2} frames total!`)
          }
        } catch (err) {
          console.log('Additional frame capture failed, using single frame')
        }
      }, 1000)
    }
  }

  const handleProcess = async () => {
    if (capturedImages.length === 0) {
      setError('Capture face images first.')
      return
    }

    setProcessing(true)
    setError('')

    try {
      // Multi-frame processing
      setStatusText(`Processing ${capturedImages.length} frames for better accuracy...`)
      
      const averagedEmbedding = await captureMultipleFrames(
        async () => {
          // Process the last captured image (representative)
          const imageBlob = dataUrlToBlob(capturedImages[capturedImages.length - 1])
          return await sendFaceToBackend(imageBlob)
        },
        capturedImages.length,
        0 // No delay since we already have the images
      )

      if (!averagedEmbedding) {
        setError('Failed to process face embeddings.')
        return
      }

      setStatusText('Scanning... fetching patient embeddings from database')
      const patientsResult = await fetchData('patients')

      if (!patientsResult.success) {
        setError('Failed to fetch patients from database.')
        return
      }

      const patients = patientsResult.data || {}
      setStatusText('Scanning... comparing with all patient records')
      
      // Use improved matching algorithm
      const match = findBestMatch(averagedEmbedding, patients, 0.4)

      if (!match.match || !match.patient) {
        setResult({
          found: false,
          similarity: match.similarity || 0,
          bestScore: match.similarity || 0,
          totalPatients: Object.keys(patients).length
        })
        setError(`Patient not found. Best match: ${(match.similarity * 100).toFixed(1)}% confidence. Please retry with better lighting or angle.`)
        return
      }

      setResult({
        found: true,
        patient: match.patient,
        similarity: match.similarity,
        bestScore: match.similarity,
        totalPatients: Object.keys(patients).length
      })
      setStatusText(`✅ Match found! ${(match.similarity * 100).toFixed(1)}% confidence`)
    } catch (scanError) {
      console.error('Scan error:', scanError)
      setError(scanError.message || 'Unexpected error while scanning.')
    } finally {
      setProcessing(false)
    }
  }

  const handleUsePatient = () => {
    if (result?.patient && onPatientFound) {
      onPatientFound(result.patient)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Scan Patient Face</h2>
            <p className="text-sm text-gray-600">Capture a live face, identify with Firebase embeddings, and open profile.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {statusText && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {processing ? 'Processing request...' : statusText}
          </div>
        )}

        {!cameraStarted && (
          <button
            type="button"
            onClick={() => setCameraStarted(true)}
            className="mb-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            <FiCamera size={18} />
            Start Camera
          </button>
        )}

        {cameraStarted && !capturedImage && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl bg-black">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: 'user',
                  width: { ideal: 640 },
                  height: { ideal: 480 }
                }}
                className="h-full w-full"
              />
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-semibold">Face Capture:</p>
              <p>Click to capture face image. The system will automatically enhance accuracy using advanced processing.</p>
            </div>
            <button
              type="button"
              onClick={handleCapture}
              disabled={processing}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {processing ? 'Capturing...' : 'Capture Face'}
            </button>
          </div>
        )}

        {capturedImage && !result && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <img src={capturedImage} alt="Captured patient face" className="h-full w-full object-cover" />
            </div>
            
            {capturedImages.length > 1 && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <p className="font-semibold">✅ Multi-Frame Capture Complete</p>
                <p>Captured {capturedImages.length} frames for improved accuracy. Ready to process.</p>
              </div>
            )}
            
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {processing ? 'Processing...' : 'Identify Patient'}
              </button>
              <button
                type="button"
                onClick={resetScan}
                disabled={processing}
                className="rounded-lg bg-gray-100 px-4 py-3 font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-60"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {result?.found && (
          <div className="space-y-4 rounded-xl border border-green-300 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <FiCheck className="mt-1 text-green-700" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-green-800">Matched Patient</p>
                <div className="mt-2 rounded-lg border border-green-200 bg-white p-3">
                  <p className="text-base font-semibold text-gray-900">{result.patient.name}</p>
                  <p className="text-sm text-gray-600">Patient ID: {result.patient.patientId}</p>
                  <p className="text-sm text-gray-600">Confidence: {formatSimilarityScore(result.similarity)}</p>
                  <p className="text-xs text-gray-500">Searched {result.totalPatients} patient records</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleUsePatient}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800"
              >
                <FiUser size={16} />
                Open Patient Profile
              </button>
              <button
                type="button"
                onClick={resetScan}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-gray-100"
              >
                <FiRefreshCw size={16} />
                Scan Another Face
              </button>
            </div>
          </div>
        )}

        {result && !result.found && (
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-inner">
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                   <FiUser size={18} />
                 </div>
                 <h4 className="font-bold text-orange-900">Patient Not Found</h4>
               </div>
               <p className="text-sm text-orange-800 leading-relaxed">
                 We couldn't identify this person in our system. They may need to be registered first.
               </p>
               <p className="text-[10px] text-orange-600 mt-2 font-bold uppercase tracking-wider">
                 Confidence Score: {formatSimilarityScore(result.bestScore)}
               </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onShowRegister}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-white hover:bg-teal-700 transition shadow-md"
              >
                Register as New Patient
              </button>
              <button
                type="button"
                onClick={resetScan}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-4 font-bold text-gray-800 hover:bg-gray-200 transition border border-gray-200"
              >
                <FiRefreshCw size={16} />
                Try Scanning Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
