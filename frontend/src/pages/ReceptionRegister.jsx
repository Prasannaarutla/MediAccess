import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveData } from '../firebase'

export default function ReceptionRegister() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

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
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {
      // Save receptionist data to Firebase
      const receptionistId = formData.email.replace(/[.#$[\]]/g, '_')
      console.log('Saving receptionist with id:', receptionistId)
      
      const result = await saveData(`receptionists/${receptionistId}`, {
        ...formData,
        registeredAt: new Date().toISOString(),
        receptionistId
      })

      if (result.success) {
        // Auto-login the receptionist with full data
        localStorage.setItem('receptionistId', receptionistId)
        localStorage.setItem('receptionistEmail', formData.email)
        localStorage.setItem('receptionistLoggedIn', 'true')
        localStorage.setItem('receptionistData', JSON.stringify(formData))
        
        setLoading(false)
        navigate('/reception/dashboard')
      } else {
        setErrors({ general: result.error || 'Registration failed. Please try again.' })
        setLoading(false)
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: 'An error occurred: ' + error.message })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Receptionist Registration</h1>
          <p className="text-gray-500">Create your reception account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Message */}
          {errors.general && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sarah Johnson"
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
              placeholder="e.g., sarah@hospital.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
              placeholder="Enter a password (min 6 characters)"
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

        {/* Login Link */}
        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 text-sm mb-3">Already have an account?</p>
          <button
            onClick={() => navigate('/reception/login')}
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Login Here
          </button>
        </div>

        {/* Demo Credentials Info */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs text-green-900 font-semibold mb-2">✓ Demo Account Ready:</p>
          <p className="text-xs text-green-800">Email: <code className="font-mono">reception@hospital.com</code></p>
          <p className="text-xs text-green-800">Password: <code className="font-mono">reception123</code></p>
          <p className="text-xs text-green-800 mt-2">Use these credentials to test the system immediately.</p>
        </div>
      </div>
    </div>
  )
}
