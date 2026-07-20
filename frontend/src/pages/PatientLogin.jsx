import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchData, searchData, saveData } from '../firebase'

export default function PatientLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)

  // Seed demo account on component mount
  useEffect(() => {
    const seedDemoAccount = async () => {
      try {
        const demoAccount = {
          name: 'Demo Patient',
          dob: '1990-01-15',
          gender: 'Male',
          phone: '9876543210',
          email: 'test@example.com',
          password: 'password123',
          patientId: 'PAT_0001'
        }
        
        // Only create demo account if it doesn't exist
        const existingDemos = await searchData('patients', 'email', 'test@example.com')
        if (!existingDemos.success || !existingDemos.data || existingDemos.data.length === 0) {
          const patientId = 'PAT_0001'
          await saveData(`patients/${patientId}`, {
            ...demoAccount,
            registeredAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error seeding demo account:', error)
      }
    }
    
    seedDemoAccount()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
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
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
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
      // Search for patient by email across all patients
      const patientResults = await searchData('patients', 'email', formData.email)

      if (!patientResults.success || !patientResults.data || patientResults.data.length === 0) {
        setGeneralError('No patient account found. Please register first.')
        setLoading(false)
        return
      }

      // Get the first matching patient
      const patientData = patientResults.data[0]

      // Verify password
      if (patientData.password === formData.password) {
        // Store login session with the unique patient ID
        localStorage.setItem('patientId', patientData.patientId)
        localStorage.setItem('patientEmail', formData.email)
        localStorage.setItem('patientLoggedIn', 'true')
        localStorage.setItem('patientRegisterData', JSON.stringify(patientData))
        
        // Sync correct face data strictly to this patient's profile
        if (patientData.patientFace) {
          localStorage.setItem('patientFace', patientData.patientFace)
        } else {
          localStorage.removeItem('patientFace')
        }

        setLoading(false)
        navigate('/patient/dashboard')
      } else {
        setGeneralError('Invalid email or password')
        setLoading(false)
      }
    } catch (error) {
      setGeneralError('An error occurred. Please try again.')
      console.error('Login error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Login</h1>
          <p className="text-gray-500">Access your patient portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Message */}
          {generalError && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-800">{generalError}</p>
            </div>
          )}

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
              placeholder="e.g., john@example.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
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
              placeholder="Enter your password"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 mt-6"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Registration Link */}
        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 text-sm mb-3">Don't have an account?</p>
          <Link
            to="/patient/register"
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Register Now
          </Link>
        </div>

        {/* Demo Credentials Info */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-900 font-semibold mb-2">✓ Demo Account Ready:</p>
          <p className="text-xs text-green-800">Email: <code className="font-mono">test@example.com</code></p>
          <p className="text-xs text-green-800">Password: <code className="font-mono">password123</code></p>
          <p className="text-xs text-green-800 mt-2">Use these credentials to test the system immediately.</p>
        </div>
      </div>
    </div>
  )
}
