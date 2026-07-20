import React, { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import {
  APPOINTMENT_STATUS,
  DOCTORS,
  addAppointment,
  createAppointment,
  getTodayDate
} from '../utils/appointmentUtils'
import { fetchData } from '../firebase'

export default function WalkInAppointment({ onAppointmentAdded, preFilledPatient }) {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    doctor: '',
    date: getTodayDate(),
    timeHour: '09',
    timeMinute: '00',
    timePeriod: 'AM'
  })
  const [loading, setLoading] = useState(false)
  const [availableDoctors, setAvailableDoctors] = useState([])
  const [error, setError] = useState('')

  // Fetch registered doctors
  useEffect(() => {
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
        // Fallback to static list (names only)
        setAvailableDoctors(DOCTORS.map(name => ({ id: null, name })))
      }
    })
  }, [])

  useEffect(() => {
    if (!preFilledPatient) return

    setFormData((prev) => ({
      ...prev,
      patientName: preFilledPatient.name || '',
      patientId: preFilledPatient.patientId || ''
    }))
    setShowModal(true)
    setError('')
  }, [preFilledPatient])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const closeModal = () => {
    setShowModal(false)
    setError('')
  }

  const resetForm = () => {
    setFormData({
      patientName: '',
      patientId: '',
      doctor: '',
      date: getTodayDate(),
      timeHour: '09',
      timeMinute: '00',
      timePeriod: 'AM'
    })
  }

  const validate = () => {
    if (!formData.patientName.trim()) return 'Please enter patient name.'
    if (!formData.doctor) return 'Please select a doctor.'
    if (!formData.date) return 'Please select date.'
    return ''
  }

  const to24Hour = () => {
    let hour = parseInt(formData.timeHour, 10)
    if (formData.timePeriod === 'PM' && hour !== 12) hour += 12
    if (formData.timePeriod === 'AM' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${formData.timeMinute}`
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const selectedDoctor = availableDoctors.find(d => d.name === formData.doctor)

      const appointment = createAppointment(
        formData.patientName.trim(),
        formData.doctor,
        formData.date,
        to24Hour(),
        APPOINTMENT_STATUS.WAITING,
        'Reception',
        formData.patientId || null,
        selectedDoctor?.id || null
      )

      const result = await addAppointment(appointment)

      if (!result.success) {
        setError(result.error || 'Failed to create appointment.')
        return
      }

      if (onAppointmentAdded) {
        onAppointmentAdded({ ...appointment, id: result.id })
      }

      closeModal()
      resetForm()
    } catch (submitError) {
      setError(submitError.message || 'Could not create appointment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
      >
        <span>+</span>
        <span>Add Walk-in Appointment</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Add Walk-in Patient</h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-600 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Patient Name</label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  disabled={Boolean(preFilledPatient)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none"
                />
                {preFilledPatient && (
                  <p className="mt-1 text-xs text-blue-700">Face-identified patient</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Doctor</label>
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none"
                >
                  <option value="">Choose a doctor</option>
                  {availableDoctors.map((doctor) => (
                    <option key={doctor.id || doctor.name} value={doctor.name}>
                      {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  min={getTodayDate()}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                <div className="grid grid-cols-3 gap-2">
                  <select name="timeHour" value={formData.timeHour} onChange={handleChange} className="rounded-lg border border-gray-300 px-2 py-2">
                    {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <select name="timeMinute" value={formData.timeMinute} onChange={handleChange} className="rounded-lg border border-gray-300 px-2 py-2">
                    {['00', '15', '30', '45'].map((minute) => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <select name="timePeriod" value={formData.timePeriod} onChange={handleChange} className="rounded-lg border border-gray-300 px-2 py-2">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {loading ? 'Adding...' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
