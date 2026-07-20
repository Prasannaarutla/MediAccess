import React, { useState, useEffect } from 'react'
import { FiArrowRight, FiFilter } from 'react-icons/fi'
import {
  isToday,
  subscribeToAppointments,
  subscribeToPatientAppointments,
  updateAppointmentStatus,
  getNextStatus,
  APPOINTMENT_STATUS,
  STATUS_COLORS,
  formatDate,
  formatTime
} from '../utils/appointmentUtils'

/**
 * A reusable list for managing appointments in both Patient and Receptionist dashboards.
 * Supports sectioned layout (Today, Upcoming, Completed).
 */
export default function AppointmentsList({ patientId = null, showActions = true, isPatient = false, showSections = true }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    console.log(`📡 AppointmentsList: Subscribing to ${patientId ? `patient ${patientId}` : 'all'} appointments`)
    
    let unsubscribe;
    if (patientId) {
      unsubscribe = subscribeToPatientAppointments(patientId, (list) => {
        setAppointments(list)
        setLoading(false)
      })
    } else {
      unsubscribe = subscribeToAppointments((list) => {
        setAppointments(list)
        setLoading(false)
      })
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [patientId])

  const handleStatusChange = async (appointmentId, newStatus) => {
    setLoading(true)
    
    try {
      const result = await updateAppointmentStatus(appointmentId, newStatus)
      
      if (result.success) {
        setMessage({ type: 'success', text: `Status updated to ${newStatus}` })
      } else {
        setMessage({ type: 'error', text: result.error || 'Invalid status transition' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update status' })
      console.error('Status update error:', error)
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-surface rounded-3xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
           <span className="text-3xl">📅</span>
        </div>
        <p className="text-slate-600 font-bold text-lg">No appointments yet</p>
        <p className="text-textLight text-sm mt-2 max-w-xs mx-auto">
          Appointments will appear here once booked or registered by clinic staff.
        </p>
      </div>
    )
  }

  // Logic for Sections
  const today = new Date().toISOString().split('T')[0]
  const todaysList = appointments.filter(a => a.date === today && a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
  const upcomingList = appointments.filter(a => a.date > today && a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
  const completedList = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED')

  if (!showSections) {
     return (
        <div className="grid grid-cols-1 gap-4">
          {appointments.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)).map(apt => (
             <AppointmentCard key={apt.id} appointment={apt} onStatusChange={handleStatusChange} loading={loading} showActions={showActions} isPatient={isPatient} />
          ))}
        </div>
     )
  }

  return (
    <div className="space-y-10">
      {/* Message */}
      {message && (
        <div className={`rounded-2xl p-4 transition-all animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800 shadow-sm'}`}>
          <p className="text-sm font-bold flex items-center gap-2">
            {message.type === 'success' ? '✓' : '⚠'} {message.text}
          </p>
        </div>
      )}

      {/* TODAY SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-sm font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> Today
           </h3>
           <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{todaysList.length} Active</span>
        </div>
        {todaysList.length === 0 ? (
           <p className="text-xs font-medium text-slate-400 bg-slate-50/30 border border-dashed border-slate-200 p-6 rounded-2xl text-center">No active appointments for today.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {todaysList.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} onStatusChange={handleStatusChange} loading={loading} showActions={showActions} isPatient={isPatient} />
            ))}
          </div>
        )}
      </div>

      {/* UPCOMING SECTION */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
           Upcoming Schedule
        </h3>
        {upcomingList.length === 0 ? (
           <p className="text-xs font-medium text-slate-400 bg-slate-50/30 border border-dashed border-slate-200 p-6 rounded-2xl text-center">No upcoming appointments scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {upcomingList.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} onStatusChange={handleStatusChange} loading={loading} showActions={showActions} isPatient={isPatient} />
            ))}
          </div>
        )}
      </div>

      {/* COMPLETED SECTION */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
           Completed
        </h3>
        <div className="grid grid-cols-1 gap-4 opacity-75 grayscale-[0.3] hover:grayscale-0 transition duration-300">
          {completedList.length === 0 ? (
             <p className="text-xs font-medium text-slate-400 bg-slate-50/30 border border-dashed border-slate-200 p-6 rounded-2xl text-center">No completed records found.</p>
          ) : (
            completedList.slice(0, 5).map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} onStatusChange={handleStatusChange} loading={loading} showActions={showActions} isPatient={isPatient} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Standalone Appointment Card component
 */
export function AppointmentCard({ appointment, onStatusChange, loading, showActions, isPatient }) {
  const statusColors = STATUS_COLORS[appointment.status] || STATUS_COLORS.BOOKED
  const nextStatus = getNextStatus(appointment.status)
  const today = new Date().toISOString().split('T')[0]
  const appointmentIsToday = appointment.date === today

  return (
    <div className={`group rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all duration-300 ${statusColors.bg}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header Info */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h4 className="font-black text-textDark text-lg font-heading">
              {appointment.patientName}
            </h4>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${statusColors.badge}`}>
              {appointment.status}
            </span>
            {appointment.status === 'ACTIVE' && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight bg-green-500 text-white animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" /> In-Consultation
              </span>
            )}
            {appointment.status === 'CALLING' && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight bg-amber-500 text-white animate-pulse shadow-sm shadow-amber-500/20">
                <span className="w-1.5 h-1.5 bg-white rounded-full" /> Doctor Calling
              </span>
            )}
            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
              {appointment.source}
            </span>
            {appointmentIsToday && !['COMPLETED', 'CANCELLED'].includes(appointment.status) && (
              <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded shadow-sm">
                TODAY
              </span>
            )}
          </div>
          
          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Doctor</p>
              <p className="text-slate-700 font-bold">{appointment.doctor}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Date</p>
              <p className="text-slate-700 font-bold">{formatDate(appointment.date)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Time</p>
              <p className="text-slate-700 font-bold">{formatTime(appointment.time)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">App ID</p>
              <p className="text-slate-500 font-mono text-[11px]">#{String(appointment.id || '').substring(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {showActions && nextStatus && (
            <button
              onClick={() => onStatusChange(appointment.id, nextStatus)}
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 ${
                loading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-teal-700'
              }`}
            >
              <span>{nextStatus === APPOINTMENT_STATUS.ACTIVE ? 'Send Inside' : 'Move Forward'}</span>
              <FiArrowRight size={18} />
            </button>
          )}
          {showActions && !nextStatus && appointment.status === 'COMPLETED' && (
            <div className="px-4 py-2 rounded-xl text-xs font-black text-green-600 bg-green-50 border border-green-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> ARCHIVED
            </div>
          )}
          
          {isPatient && !['COMPLETED', 'CANCELLED', 'ACTIVE'].includes(appointment.status) && (
            <button
              onClick={() => onStatusChange(appointment.id, 'CANCELLED')}
              disabled={loading}
              className="px-4 py-3 rounded-xl font-bold text-sm transition-all border text-red-500 border-red-50 hover:bg-red-50 hover:border-red-100"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Attach Card to default export for convenience
AppointmentsList.Card = AppointmentCard;
