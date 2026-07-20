import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { saveData } from '../firebase'

export default function DoctorRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialization: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)

  const specializations = [
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Neurology',
    'Psychiatry',
    'Surgery'
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    setGeneralError('')
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) newErrors.name = 'Full name is required'
    
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.specialization) newErrors.specialization = 'Specialization is required'
    
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setGeneralError('')

    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {
      // Save doctor data to Firebase
      const doctorId = formData.email.replace(/[.#$[\]]/g, '_')
      console.log('Saving doctor with id:', doctorId)
      
      const result = await saveData(`doctors/${doctorId}`, {
        ...formData,
        registeredAt: new Date().toISOString(),
        doctorId
      })

      if (result.success) {
        // Store login session and full doctor data
        localStorage.setItem('doctorId', doctorId)
        localStorage.setItem('doctorLoggedIn', 'true')
        localStorage.setItem('doctorEmail', formData.email)
        localStorage.setItem('doctorData', JSON.stringify(formData))
        setLoading(false)
        navigate('/doctor/dashboard')
      } else {
        setGeneralError(result.error || 'Registration failed. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      setGeneralError('An error occurred: ' + error.message)
      console.error('Registration error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Doctor Registration</h1>
          <p className="text-gray-500">Create your doctor account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Message */}
          {generalError && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-800">{generalError}</p>
            </div>
          )}
          {/* Full Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Dr. Sarah Johnson"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g., doctor@hospital.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Specialization Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <select
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.specialization ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Specialization</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            {errors.specialization && <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 mt-6"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {/* Back to Home Link */}
        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 text-sm mb-3">Back to Home</p>
          <Link
            to="/"
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Home
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-900 font-semibold mb-2">Registration Info:</p>
          <p className="text-xs text-green-800">Register with any email and password to access your doctor dashboard.</p>
        </div>
      </div>
    </div>
  )
}
