import { addData, fetchData, saveData, updateData, subscribeToData } from '../firebase'

export const APPOINTMENT_STATUS = {
  BOOKED: 'BOOKED',
  WAITING: 'WAITING',
  CALLING: 'CALLING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NOT_AVAILABLE: 'NOT_AVAILABLE'
}

export const STATUS_COLORS = {
  BOOKED: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-200' },
  WAITING: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-200' },
  CALLING: { bg: 'bg-amber-100', text: 'text-amber-800', badge: 'bg-amber-200' },
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-200' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', badge: 'bg-gray-200' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-800', badge: 'bg-red-200' },
  NOT_AVAILABLE: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-200' }
}

export const DOCTORS = [
  'Dr. Sarah Johnson',
  'Dr. Michael Chen',
  'Dr. Emma Wilson',
  'Dr. James Brown',
  'Dr. Lisa Anderson'
]

const STATUS_ORDER = [
  APPOINTMENT_STATUS.BOOKED,
  APPOINTMENT_STATUS.WAITING,
  APPOINTMENT_STATUS.CALLING,
  APPOINTMENT_STATUS.ACTIVE,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.NOT_AVAILABLE
]

export const getTodayDate = () => new Date().toISOString().split('T')[0]

const looksLikeAppointment = (value) => {
  return value && typeof value === 'object' && typeof value.status === 'string'
}

export const flattenAppointments = (node, path = []) => {
  if (!node || typeof node !== 'object') {
    return []
  }

  const appointmentsMap = new Map()

  const traverse = (currentNode, currentPath = []) => {
    // If it's a flat appointment node
    if (looksLikeAppointment(currentNode) && currentNode.id) {
      appointmentsMap.set(currentNode.id, {
        ...currentNode,
        _path: `appointments/${currentNode.id}`
      })
      return
    }

    // Special case for the legacy nested structure if found
    if (looksLikeAppointment(currentNode)) {
      const [patientId, date] = currentPath
      const id = currentNode.id || `${patientId || 'appointment'}_${date || Date.now()}`
      if (!appointmentsMap.has(id)) {
        appointmentsMap.set(id, {
          id,
          patientId: currentNode.patientId || patientId || null,
          date: currentNode.date || date || null,
          ...currentNode,
          _path: currentPath.length ? `appointments/${currentPath.join('/')}` : null
        })
      }
      return
    }

    Object.entries(currentNode).forEach(([key, value]) => {
      if (key === 'today') return
      
      // If key is an ID and value is an appointment
      if (typeof value === 'object' && looksLikeAppointment(value)) {
        const id = value.id || key
        if (!appointmentsMap.has(id)) {
          appointmentsMap.set(id, {
            id,
            ...value,
            _path: `appointments/${id}`
          })
        }
      } else if (typeof value === 'object') {
        traverse(value, [...currentPath, key])
      }
    })
  }

  traverse(node, path)
  return Array.from(appointmentsMap.values())
}

export const getAppointments = async () => {
  try {
    const result = await fetchData('appointments')
    if (!result.success || !result.data) {
      return []
    }

    return flattenAppointments(result.data)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return []
  }
}

export const getAppointmentsByPatient = async (patientId) => {
  const allAppointments = await getAppointments()
  return allAppointments.filter((item) => item.patientId === patientId)
}

export const getAppointmentForPatientOnDate = async (patientId, date) => {
  try {
    const primaryPath = `appointments/${patientId}/${date}`
    const primary = await fetchData(primaryPath)

    if (primary.success && primary.data && looksLikeAppointment(primary.data)) {
      return {
        success: true,
        data: {
          id: primary.data.id || `${patientId}_${date}`,
          patientId,
          date,
          ...primary.data,
          _path: primaryPath
        }
      }
    }

    if (date === getTodayDate()) {
      const todayPath = `appointments/${patientId}/today`
      const todayResult = await fetchData(todayPath)
      if (todayResult.success && todayResult.data && looksLikeAppointment(todayResult.data)) {
        return {
          success: true,
          data: {
            id: todayResult.data.id || `${patientId}_${date}`,
            patientId,
            date,
            ...todayResult.data,
            _path: todayPath
          }
        }
      }
    }

    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: error.message, data: null }
  }
}

export const addOrUpdatePatientAppointment = async (patientId, date, appointment) => {
  try {
    const appointmentId = appointment.id || `${patientId}_${Date.now()}`
    const normalizedAppointment = {
      ...appointment,
      id: appointmentId,
      patientId,
      date,
      updatedAt: new Date().toISOString()
    }

    // Save to FLAT structure (Strict Source of Truth)
    const flatSave = await saveData(`appointments/${appointmentId}`, normalizedAppointment)
    return flatSave
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const subscribeToDoctorAppointments = (doctorId, date, callback) => {
  return subscribeToData('appointments', (result) => {
    if (!result.success || !result.data) {
      callback([])
      return
    }

    const all = flattenAppointments(result.data)
    const filtered = all.filter(a => a.doctorId === doctorId && (!date || a.date === date))
    callback(sortAppointments(filtered))
  })
}

export const subscribeToAppointments = (callback) => {
  return subscribeToData('appointments', (result) => {
    if (!result.success || !result.data) {
      callback([])
      return
    }

    callback(flattenAppointments(result.data))
  })
}

export const subscribeToPatientAppointments = (patientId, callback) => {
  return subscribeToData('appointments', (result) => {
    if (!result.success || !result.data) {
      callback([])
      return
    }

    const all = flattenAppointments(result.data)
    const filtered = all.filter(a => a.patientId === patientId)
    callback(sortAppointments(filtered))
  })
}

export const createAppointment = (
  patientName,
  doctor,
  date,
  time,
  status,
  source,
  patientId = null,
  doctorId = null
) => {
  return {
    patientName,
    doctor, // Name
    doctorId, // ID
    date,
    time,
    status,
    source,
    patientId,
    createdAt: new Date().toISOString()
  }
}

export const addAppointment = async (appointment) => {
  try {
    if (appointment?.patientId && appointment?.date) {
      return await addOrUpdatePatientAppointment(appointment.patientId, appointment.date, appointment)
    }

    return await addData('appointments', appointment)
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const updateAppointmentStatus = async (appointmentId, newStatus) => {
  try {
    const appointments = await getAppointments()
    const target = appointments.find((item) => item.id === appointmentId)

    if (!target) {
      return { success: false, error: 'Appointment not found' }
    }

    const currentIndex = STATUS_ORDER.indexOf(target.status)
    const newIndex = STATUS_ORDER.indexOf(newStatus)
    
    // Allow standard transition OR any jump to CALLING/ACTIVE/COMPLETED by Doctor
    const validTransition = newIndex === currentIndex + 1 
      || newStatus === APPOINTMENT_STATUS.COMPLETED
      || newStatus === APPOINTMENT_STATUS.CANCELLED
      || (newStatus === APPOINTMENT_STATUS.CALLING && (target.status === APPOINTMENT_STATUS.BOOKED || target.status === APPOINTMENT_STATUS.WAITING))
      || (newStatus === APPOINTMENT_STATUS.ACTIVE && (target.status === APPOINTMENT_STATUS.BOOKED || target.status === APPOINTMENT_STATUS.WAITING || target.status === APPOINTMENT_STATUS.CALLING))

    if (!validTransition) {
      return { success: false, error: `Invalid status transition from ${target.status} to ${newStatus}` }
    }

    const path = `appointments/${appointmentId}`
    const updateResult = await updateData(path, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })

    return updateResult
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const getNextStatus = (currentStatus) => {
  const statusFlow = {
    BOOKED: APPOINTMENT_STATUS.WAITING,
    WAITING: APPOINTMENT_STATUS.CALLING,
    CALLING: APPOINTMENT_STATUS.ACTIVE,
    ACTIVE: APPOINTMENT_STATUS.COMPLETED,
    COMPLETED: null,
    NOT_AVAILABLE: APPOINTMENT_STATUS.WAITING // Can try calling again later
  }

  return statusFlow[currentStatus] || null
}

export const sortAppointments = (appointments) => {
  const today = getTodayDate()

  return [...appointments].sort((a, b) => {
    const aIsToday = a.date === today
    const bIsToday = b.date === today

    if (aIsToday && !bIsToday) return -1
    if (!aIsToday && bIsToday) return 1

    if (a.date !== b.date) {
      return new Date(a.date) - new Date(b.date)
    }

    return (a.time || '').localeCompare(b.time || '')
  })
}

export const getTodaysAppointments = (appointments) => {
  const today = getTodayDate()
  return appointments.filter((appointment) => appointment.date === today)
}

export const formatTime = (timeString) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export const isToday = (dateString) => dateString === getTodayDate()
