import React, { useState } from 'react'
import { FiX, FiCalendar, FiClock, FiUser } from 'react-icons/fi'
import {
  DOCTORS as STATIC_DOCTORS,
  createAppointment,
  addAppointment,
  APPOINTMENT_STATUS
} from '../utils/appointmentUtils'
import { fetchData } from '../firebase'

export default function AppointmentBooking({ patientName, patientId, onBookingSuccess }) {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    doctor: '',
    date: '',
    timeHour: '09',
    timeMinute: '00',
    timePeriod: 'AM'
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [availableDoctors, setAvailableDoctors] = useState([])

  // Fetch registered doctors
  React.useEffect(() => {
    fetchData('doctors').then(result => {
      if (result.success && result.data) {
        // Use a Map to deduplicate by Name + Specialization
        const uniqueDocs = new Map()
        
        Object.entries(result.data).forEach(([dbId, doc]) => {
          const key = `${doc.name}_${doc.specialization || ''}`
          if (!uniqueDocs.has(key)) {
            uniqueDocs.set(key, {
              id: dbId, // Use the actual Firebase ID (key)
              name: doc.name,
              specialization: doc.specialization
            })
          }
        })
        
        setAvailableDoctors(Array.from(uniqueDocs.values()))
      } else {
        // Fallback to static list if none registered (names only)
        setAvailableDoctors(STATIC_DOCTORS.map(name => ({ id: null, name })))
      }
    })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const validateForm = () => {
    if (!formData.doctor.trim()) {
      setError('Please select a doctor')
      return false
    }
    if (!formData.date) {
      setError('Please select a date')
      return false
    }
    if (!formData.timeHour || !formData.timeMinute || !formData.timePeriod) {
      setError('Please select a complete time')
      return false
    }

    // Check if date is not in the past
    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      setError('Please select a future date')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Convert 12-hour format to 24-hour for storage (e.g., 02:30 PM -> 14:30)
      let hour = parseInt(formData.timeHour)
      if (formData.timePeriod === 'PM' && hour !== 12) {
        hour += 12
      } else if (formData.timePeriod === 'AM' && hour === 12) {
        hour = 0
      }
      const timeString = `${String(hour).padStart(2, '0')}:${formData.timeMinute}`

      const selectedDoctor = availableDoctors.find(d => d.name === formData.doctor)

      const appointment = createAppointment(
        patientName,
        formData.doctor,
        formData.date,
        timeString,
        APPOINTMENT_STATUS.BOOKED,
        'Patient',
        patientId,
        selectedDoctor?.id || null
      )

      const result = await addAppointment(appointment)

      if (result.success) {
        // Reset form
        setFormData({
          doctor: '',
          date: '',
          timeHour: '09',
          timeMinute: '00',
          timePeriod: 'AM'
        })
        setError(null)
        setShowModal(false)

        // Call callback
        if (onBookingSuccess) {
          onBookingSuccess({ ...appointment, id: result.id })
        }
      } else {
        setError('Failed to book appointment. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Booking error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      doctor: '',
      date: '',
      timeHour: '09',
      timeMinute: '00',
      timePeriod: 'AM'
    })
    setError(null)
  }

  return (
    <>
      {/* Book Appointment Button */}
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 inline-flex items-center space-x-2"
      >
        <span>📅</span>
        <span>Book an Appointment</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Book Appointment</h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  handleReset()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Doctor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Doctor
                </label>
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a doctor...</option>
                  {availableDoctors.map(doctor => (
                    <option key={doctor.id || doctor.name} value={doctor.name}>
                      {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Hour */}
                  <select
                    name="timeHour"
                    value={formData.timeHour}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>

                  {/* Minute */}
                  <select
                    name="timeMinute"
                    value={formData.timeMinute}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['00', '15', '30', '45'].map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>

                  {/* AM/PM */}
                  <select
                    name="timePeriod"
                    value={formData.timePeriod}
                    onChange={handleChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    handleReset()
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <span>Booking...</span>
                    </>
                  ) : (
                    <>
                      <span>Book</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
