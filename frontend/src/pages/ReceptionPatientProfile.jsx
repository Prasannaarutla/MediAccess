import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchData, subscribeToData, requestConsent } from '../firebase'
import {
  APPOINTMENT_STATUS,
  DOCTORS as STATIC_DOCTORS,
  addOrUpdatePatientAppointment,
  createAppointment,
  formatDate,
  formatTime,
  getAppointmentForPatientOnDate,
  getAppointmentsByPatient,
  getNextStatus,
  getTodayDate,
  sortAppointments,
  subscribeToPatientAppointments,
  updateAppointmentStatus
} from '../utils/appointmentUtils'
import ReceptionCallMonitor from '../components/ReceptionCallMonitor'

const to24Hour = (hour12, minute, period) => {
  let hour = parseInt(hour12, 10)
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

const getAgeFromDob = (dob) => {
  if (!dob) return 'N/A'
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age
}

export default function ReceptionPatientProfile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { patientId } = useParams()

  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState(location.state?.patient || null)
  const [records, setRecords] = useState([])
  const [appointments, setAppointments] = useState([])
  const [todayAppointment, setTodayAppointment] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const [formData, setFormData] = useState({
    doctor: '',
    date: getTodayDate(),
    timeHour: '09',
    timeMinute: '00',
    timePeriod: 'AM'
  })
  const [availableDoctors, setAvailableDoctors] = useState([])

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
        setAvailableDoctors(STATIC_DOCTORS.map(name => ({ id: null, name })))
      }
    })
  }, [])


  useEffect(() => {
    const isLoggedIn = localStorage.getItem('receptionistLoggedIn')
    if (!isLoggedIn) {
      navigate('/reception/login')
      return
    }

    const loadPatient = async () => {
      try {
        setLoading(true)
        if (!patient) {
          const patientResult = await fetchData(`patients/${patientId}`)
          if (!patientResult.success || !patientResult.data) {
            setError('Patient not found in Firebase.')
            setLoading(false)
            return
          }

          setPatient({ patientId, ...patientResult.data })
        }

        // Patient details loaded
      } catch (loadError) {
        setError(loadError.message || 'Failed to load patient profile.')
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
  }, [navigate, patientId])

  useEffect(() => {
    if (!patientId) return

    const unsubscribe = subscribeToPatientAppointments(patientId, (list) => {
      setAppointments(list)
      const today = getTodayDate()
      // Look for any appointment on this date (filtering 'today' alias happens in util)
      const todayApp = list.find(a => a.date === today)
      setTodayAppointment(todayApp || null)
    })

    return () => unsubscribe && unsubscribe()
  }, [patientId])

  useEffect(() => {
    const unsubscribe = subscribeToData(`patients/${patientId}/records`, (result) => {
      if (!result.success || !result.data) {
        setRecords([])
        return
      }

      const list = Object.entries(result.data).map(([id, value]) => ({ id, ...value }))
      setRecords(list)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [patientId])

  const age = useMemo(() => getAgeFromDob(patient?.dob), [patient?.dob])

  const onFormChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBookAppointment = async (event) => {
    event.preventDefault()
    setError('')
    setActionMessage('')

    if (!formData.doctor) {
      setError('Please select a doctor.')
      return
    }

    if (!formData.date) {
      setError('Please select a date.')
      return
    }

    try {
      setBooking(true)
      const time = to24Hour(formData.timeHour, formData.timeMinute, formData.timePeriod)
      const selectedDoctor = availableDoctors.find(d => d.name === formData.doctor)
      
      const appointment = createAppointment(
        patient?.name || 'Unknown Patient',
        formData.doctor,
        formData.date,
        time,
        APPOINTMENT_STATUS.BOOKED,
        'Reception',
        patientId,
        selectedDoctor?.id || null
      )

      const saveResult = await addOrUpdatePatientAppointment(patientId, formData.date, appointment)

      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to create appointment.')
        return
      }

      setActionMessage('Appointment booked successfully.')
    } catch (bookingError) {
      setError(bookingError.message || 'Booking failed.')
    } finally {
      setBooking(false)
    }
  }

  const handleAdvanceTodayStatus = async () => {
    if (!todayAppointment) return
    const nextStatus = getNextStatus(todayAppointment.status)
    if (!nextStatus) return

    try {
      setUpdatingStatus(true)
      setError('')
      setActionMessage('')

      const result = await updateAppointmentStatus(todayAppointment.id, nextStatus)
      if (!result.success) {
        setError(result.error || 'Could not update status.')
        return
      }

      setActionMessage(`Appointment moved to ${nextStatus}.`)
    } catch (statusError) {
      setError(statusError.message || 'Status update failed.')
    } finally {
      setUpdatingStatus(false)
    }
  }
  

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-gray-600">Loading patient profile...</div>
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
          <p className="text-red-700">{error || 'Patient profile unavailable.'}</p>
          <Link to="/reception/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Reception Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const nextStatus = todayAppointment ? getNextStatus(todayAppointment.status) : null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ReceptionCallMonitor />
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reception Patient View</h1>
            <p className="text-sm text-gray-600">Patient ID: {patientId}</p>
          </div>
          <Link to="/reception/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-200">
            Back to Dashboard
          </Link>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {actionMessage && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{actionMessage}</div>}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900">Patient Profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-500">Name</p>
                <p className="text-lg font-semibold text-gray-900">{patient.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Phone</p>
                <p className="text-lg font-semibold text-gray-900">{patient.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Date of Birth</p>
                <p className="text-lg font-semibold text-gray-900">{patient.dob || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Age</p>
                <p className="text-lg font-semibold text-gray-900">{age}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-gray-500">Email</p>
                <p className="text-lg font-semibold text-gray-900">{patient.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900">Today Appointment</h2>
            {todayAppointment ? (
              <div className="mt-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-gray-700"><span className="font-semibold">Doctor:</span> {todayAppointment.doctor}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Time:</span> {formatTime(todayAppointment.time)}</p>
                <p className="text-sm text-gray-700"><span className="font-semibold">Status:</span> {todayAppointment.status}</p>
                {nextStatus && (
                  <button
                    type="button"
                    onClick={handleAdvanceTodayStatus}
                    disabled={updatingStatus}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {updatingStatus ? 'Updating...' : `Move to ${nextStatus}`}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No appointment found for today.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900">Walk-in Booking</h2>
            {!todayAppointment && (
              <p className="mt-2 text-sm text-gray-600">Create a new appointment if patient has no current-day booking.</p>
            )}
            {todayAppointment ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                Existing appointment already present for today.
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Doctor</label>
                  <select
                    name="doctor"
                    value={formData.doctor}
                    onChange={onFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select doctor</option>
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
                    onChange={onFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      name="timeHour"
                      value={formData.timeHour}
                      onChange={onFormChange}
                      className="rounded-lg border border-gray-300 px-2 py-2"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <select
                      name="timeMinute"
                      value={formData.timeMinute}
                      onChange={onFormChange}
                      className="rounded-lg border border-gray-300 px-2 py-2"
                    >
                      {['00', '15', '30', '45'].map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                    <select
                      name="timePeriod"
                      value={formData.timePeriod}
                      onChange={onFormChange}
                      className="rounded-lg border border-gray-300 px-2 py-2"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={booking}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {booking ? 'Booking...' : 'Book Appointment'}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900">Medical Records Access</h2>
            <p className="mt-2 text-sm text-gray-600">
              Medical records are secured and require explicit patient consent for viewing. 
              Only authorized doctors can initiate access requests during a consultation.
            </p>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Security Notice</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Patient consent is mandatory for viewing medical records. 
                Doctors must request access through their portal, which the patient can then approve for a specific duration.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900">Appointment History</h2>
          {appointments.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No appointments yet for this patient.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2">Date</th>
                    <th className="py-2">Time</th>
                    <th className="py-2">Doctor</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="border-b border-gray-100 text-gray-800">
                      <td className="py-2">{formatDate(appointment.date)}</td>
                      <td className="py-2">{formatTime(appointment.time)}</td>
                      <td className="py-2">{appointment.doctor}</td>
                      <td className="py-2">{appointment.status}</td>
                      <td className="py-2">{appointment.source || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
