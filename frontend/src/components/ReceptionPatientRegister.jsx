import React, { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { FiX, FiCamera, FiCheck, FiUser } from 'react-icons/fi'
import { saveData, updateData } from '../firebase'
import { sendFaceToBackend, dataUrlToBlob, isValidEmbedding } from '../utils/faceRecognitionUtils'
import { normalizeEmbedding } from '../utils/faceRecognition'

export default function ReceptionPatientRegister({ onClose, onRegisterSuccess }) {
  const webcamRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    gender: ''
  })
  const [step, setStep] = useState(1) // 1: Form, 2: Face Capture
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')
  const [newPatientId, setNewPatientId] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!formData.phone.trim()) return 'Phone is required'
    return ''
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      setError(err)
      return
    }

    setLoading(true)
    try {
      // Create a unique ID
      const patientId = `PAT_${Math.floor(100000 + Math.random() * 900000)}`
      setNewPatientId(patientId)
      
      // Save data (no password)
      const result = await saveData(`patients/${patientId}`, {
        ...formData,
        patientId,
        registeredAt: new Date().toISOString(),
        registeredBy: 'Reception',
        hasSetPassword: false
      })

      if (result.success) {
        setStep(2) // Move to Face Capture
      } else {
        setError(result.error || 'Failed to save patient data.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setCapturedImage(imageSrc)
        setError('')
      }
    }
  }, [])

  const handleSaveFace = async () => {
    if (!capturedImage || !newPatientId) return

    setIsProcessing(true)
    setProcessingMessage('Extracting face embedding...')

    try {
      const imageBlob = dataUrlToBlob(capturedImage)
      const result = await sendFaceToBackend(imageBlob)

      if (!result.success) {
        setError(`AI Error: ${result.error}`)
        setIsProcessing(false)
        return
      }

      if (!isValidEmbedding(result.embedding)) {
        setError('Invalid face capture. Please try again.')
        setIsProcessing(false)
        return
      }

      const normalizedEmbedding = normalizeEmbedding(result.embedding)
      
      setProcessingMessage('Saving biometric data...')
      await updateData(`patients/${newPatientId}`, {
        faceEmbedding: normalizedEmbedding,
        patientFace: capturedImage,
        faceCaptureDate: new Date().toISOString()
      })

      // Success!
      onRegisterSuccess({
        ...formData,
        patientId: newPatientId
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkipFace = () => {
    onRegisterSuccess({
      ...formData,
      patientId: newPatientId
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {step === 1 ? 'New Patient Registration' : 'Biometric Enrollment'}
            </h3>
            <p className="text-xs text-gray-500">
              {step === 1 ? 'Step 1: Patient Details' : 'Step 2: Face Capture'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter patient full name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                       <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
                       Saving...
                    </span>
                  ) : 'Continue to Face Capture'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {!capturedImage ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] shadow-inner">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ facingMode: 'user' }}
                    />
                    <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-2xl"></div>
                  </div>
                  <button
                    onClick={handleCapture}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <FiCamera size={20} /> Capture Face
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border-4 border-emerald-500 shadow-lg aspect-[4/3]">
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                      <FiCheck size={16} />
                    </div>
                  </div>
                  
                  {isProcessing ? (
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                      <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm font-bold text-blue-700">{processingMessage}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCapturedImage(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
                      >
                        Retake
                      </button>
                      <button
                        onClick={handleSaveFace}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition"
                      >
                        Confirm & Save
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-100 text-center">
                <button
                  onClick={handleSkipFace}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600 text-sm font-medium transition"
                >
                  Skip face enrollment for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
