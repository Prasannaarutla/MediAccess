import React, { useState, useEffect } from 'react'
import { FiBell, FiArrowRight, FiX } from 'react-icons/fi'
import NotificationModal from './NotificationModal'
import { subscribeToData } from '../firebase'
import { updateAppointmentStatus, APPOINTMENT_STATUS, flattenAppointments } from '../utils/appointmentUtils'

export default function ReceptionCallMonitor() {
  const [callingAppointments, setCallingAppointments] = useState([])

  useEffect(() => {
    // Subscribe to calling appointments globally
    const unsubscribe = subscribeToData('appointments', (result) => {
      if (result.success && result.data) {
        const all = flattenAppointments(result.data)
        const calling = all.filter(a => a.status === 'CALLING')
        if (calling.length > 0) {
          console.log(`🔔 CALL MONITOR: Detected ${calling.length} calling appointments`, calling)
        }
        setCallingAppointments(calling)
      } else {
        setCallingAppointments([])
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus)
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  if (callingAppointments.length === 0) return null

  // We show a modal for the first calling appointment in the queue
  const activeCall = callingAppointments[0]

  return (
    <NotificationModal
      isOpen={callingAppointments.length > 0}
      onClose={() => handleStatusChange(activeCall.id, APPOINTMENT_STATUS.WAITING)}
      title="Incoming Call!"
      subtitle="Doctor is waiting for a patient"
      type="info"
      doctorName={activeCall.doctor}
      patientName={activeCall.patientName}
      detailLabel="App ID"
      detailValue={`#${activeCall.id}`}
      primaryActionLabel="Sending Patient"
      onPrimaryAction={() => handleStatusChange(activeCall.id, APPOINTMENT_STATUS.ACTIVE)}
      secondaryActionLabel="Not Available"
      onSecondaryAction={() => handleStatusChange(activeCall.id, APPOINTMENT_STATUS.WAITING)}
    />
  )
}
