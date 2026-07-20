import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  subscribeToDoctorAppointments, 
  updateAppointmentStatus, 
  APPOINTMENT_STATUS, 
  STATUS_COLORS,
  formatTime,
  getTodayDate
} from '../utils/appointmentUtils'
import { getData, subscribeToData, getActiveConsent, requestConsent, revokeDoctorAccess, startRecordViewLog, endRecordViewLog, startDoctorConsultation, endDoctorConsultation } from '../firebase'
import { FiUsers, FiClock, FiCheckCircle, FiPlay, FiSearch, FiLogOut, FiX, FiLock, FiUnlock, FiShield, FiUser } from 'react-icons/fi'
import DoctorPrescriptionForm from '../components/DoctorPrescriptionForm'
import PrescriptionViewer from '../components/PrescriptionViewer'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const [doctorData, setDoctorData] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)
  const [activeTab, setActiveTab] = useState('queue')
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [patientDetails, setPatientDetails] = useState(null)
  const [patientRecords, setPatientRecords] = useState([])
  const [activeConsent, setActiveConsent] = useState(null)
  const [checkingConsent, setCheckingConsent] = useState(false)
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [incomingPatient, setIncomingPatient] = useState(null)
  const appointmentsRef = React.useRef([])
  const [previewRecord, setPreviewRecord] = useState(null)
  const [activeLogId, setActiveLogId] = useState(localStorage.getItem('activeConsultationLogId'))
  const [activeConsultationAptId, setActiveConsultationAptId] = useState(localStorage.getItem('activeConsultationAptId'))
  const [recordAccessLogId, setRecordAccessLogId] = useState(null)

  useEffect(() => {
    // Check if doctor is logged in
    const doctorLoggedIn = localStorage.getItem('doctorLoggedIn')
    const storedDoctorData = localStorage.getItem('doctorData')
    const doctorId = localStorage.getItem('doctorId')

    if (!doctorLoggedIn || !storedDoctorData || !doctorId) {
      navigate('/doctor/login')
      return
    }

    const docData = JSON.parse(storedDoctorData)
    setDoctorData(docData)

    // Subscribe to today's appointments for this doctor
    const today = getTodayDate()
    const targetDate = activeTab === 'history' ? null : today
    
    console.log(`📡 Subscribing to appointments for doctor ${doctorId} (Tab: ${activeTab})`)
    
    const unsubscribe = subscribeToDoctorAppointments(doctorId, targetDate, (list) => {
      let filteredList = list;
      
      if (activeTab === 'history') {
        filteredList = list.filter(a => 
          a.status === 'COMPLETED' || a.status === 'CANCELLED' || (a.date < today && a.status !== 'ACTIVE')
        )
      } else if (activeTab === 'upcoming') {
        filteredList = list.filter(a => a.date > today)
      } else {
         filteredList = list.filter(a => a.date === today)
      }

      // Step: Detect CALLING -> ACTIVE transition for notifications (only relevant for queue)
      if (activeTab === 'queue' && appointmentsRef.current.length > 0) {
        filteredList.forEach(newApt => {
          const oldApt = appointmentsRef.current.find(a => a.id === newApt.id)
          if (oldApt && oldApt.status === 'CALLING' && newApt.status === 'ACTIVE') {
            setIncomingPatient(newApt)
          }
        })
      }
      
      setAppointments(filteredList)
      appointmentsRef.current = filteredList
      setLoading(false)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [navigate, activeTab])

  // NEW: Auto-Audit Monitoring
  // Detects when an appointment becomes ACTIVE (e.g. sent by Reception) and starts log
  useEffect(() => {
    if (activeTab !== 'queue' || !doctorData) return

    const activeApt = appointments.find(a => a.status === 'ACTIVE')
    if (activeApt && !activeLogId) {
      console.log(`📝 AUDIT LOG: Auto-detecting ACTIVE appointment #${activeApt.id}. Starting consultation audit...`)
      
      startDoctorConsultation(
        localStorage.getItem('doctorId'), 
        doctorData.name, 
        activeApt.patientId, 
        activeApt.patientName, 
        activeApt.id
      ).then(res => {
        if (res.success) {
          localStorage.setItem('activeConsultationLogId', res.id)
          localStorage.setItem('activeConsultationAptId', activeApt.id)
          setActiveLogId(res.id)
          setActiveConsultationAptId(activeApt.id)
        }
      })
    }
  }, [appointments, activeLogId, activeTab, doctorData])

  // Effect to load patient details when selected
  useEffect(() => {
    if (!selectedPatient) {
      setPatientDetails(null)
      setPatientRecords([])
      return
    }

    // Fetch patient profile
    getData(`patients/${selectedPatient}`).then(result => {
      if (result.success && result.data) {
        setPatientDetails(result.data)
      }
    })

    // Live subscription for active consent
    setCheckingConsent(true)
    const doctorId = localStorage.getItem('doctorId')
    const unsubscribeConsent = subscribeToData('consents', (result) => {
      if (result.success && result.data) {
        const now = new Date().toISOString()
        const consents = Object.entries(result.data).map(([id, val]) => ({ id, ...val }))
        const active = (consents || []).find(c => 
          String(c.patientId) === String(selectedPatient) && 
          String(c.doctorId) === String(doctorId) && 
          c.status === 'APPROVED' && 
          c.expiresAt > now
        )
        
        if (consents && consents.length > 0) {
           console.log(`🛡️ CONSENT SYNC: Found ${consents.length} total consents. Match for Patient:${selectedPatient} Doctor:${doctorId}? ${active ? 'YES' : 'NO'}`)
           if (!active) {
             const partialMatch = consents.find(c => String(c.patientId) === String(selectedPatient) && String(c.doctorId) === String(doctorId))
             if (partialMatch) console.log(`⚠️ CONSENT SYNC: Partial match found but maybe status is ${partialMatch.status} or expired at ${partialMatch.expiresAt} (Now: ${now})`)
           }
        }

        setActiveConsent(active || null)
      } else {
        setActiveConsent(null)
      }
      setCheckingConsent(false)
    })

    // Find the appointment details for selectedPatient to check status
    const currentApt = appointments.find(a => 
      String(a.patientId) === String(selectedPatient) && 
      !['COMPLETED', 'CANCELLED'].includes(a.status)
    )
    if (currentApt) {
      setSelectedAppointmentId(currentApt.id)
    } else {
      // Fallback for history view
      const historyApt = appointments.find(a => String(a.patientId) === String(selectedPatient))
      if (historyApt) setSelectedAppointmentId(historyApt.id)
    }

    // Subscribe to patient's medical records
    const unsubscribeRecords = subscribeToData(`patients/${selectedPatient}/records`, (result) => {
      if (result.success && result.data) {
        setPatientRecords(Object.values(result.data))
      } else {
        setPatientRecords([])
      }
    })

    return () => {
      if (unsubscribeConsent) unsubscribeConsent()
      if (unsubscribeRecords) unsubscribeRecords()
    }
  }, [selectedPatient, appointments])

  // Timer for consent expiry
  useEffect(() => {
    if (!activeConsent || !activeConsent.expiresAt) {
      setTimeLeft(null)
      return
    }

    const timer = setInterval(() => {
      const now = new Date()
      const expiry = new Date(activeConsent.expiresAt)
      const diff = expiry - now

      if (diff <= 0) {
        setActiveConsent(null)
        setTimeLeft(null)
        clearInterval(timer)
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeConsent])

  const handleRequestAccessFromDoctor = async () => {
    if (!hasAgreedToTerms) {
      alert('Please agree to the terms and conditions first.')
      return
    }

    try {
      setRequestingAccess(true)
      const doctorId = localStorage.getItem('doctorId')
      const result = await requestConsent(
        selectedPatient, 
        doctorId, 
        'doctor', 
        doctorData.name,
        selectedAppointmentId
      )

      if (result.success) {
        alert('Access request sent to patient.')
      } else {
        alert('Failed to send request: ' + result.error)
      }
    } catch (err) {
      console.error('Error requesting access:', err)
    } finally {
      setRequestingAccess(false)
    }
  }

  const handleStatusUpdate = async (appointmentId, newStatus) => {
    // If we are calling from WAITING, we move to CALLING (bridged flow)
    // If we are COMPLETED from ACTIVE, we revoke data access
    
    let confirmMsg = ""
    if (newStatus === APPOINTMENT_STATUS.CALLING) {
      confirmMsg = "Notify Receptionist to send this patient inside?"
    } else if (newStatus === APPOINTMENT_STATUS.ACTIVE) {
      confirmMsg = "Start consultation now?"
    } else if (newStatus === APPOINTMENT_STATUS.COMPLETED) {
      confirmMsg = "Mark this consultation as completed and revoke data access?"
    }
    
    if (confirmMsg && !window.confirm(confirmMsg)) return

    try {
      const result = await updateAppointmentStatus(appointmentId, newStatus)
      if (!result.success) {
        alert('Failed to update status: ' + result.error)
      } else {
        const apt = appointments.find(a => a.id === appointmentId)
        
        // Admin Tracking Logs
        if (newStatus === APPOINTMENT_STATUS.ACTIVE) {
           // Only start if not already auto-started by effect
           if (!activeLogId) {
             const logResult = await startDoctorConsultation(localStorage.getItem('doctorId'), doctorData.name, apt.patientId, apt.patientName, appointmentId)
             if (logResult.success) {
               localStorage.setItem('activeConsultationLogId', logResult.id)
               localStorage.setItem('activeConsultationAptId', appointmentId)
               setActiveLogId(logResult.id)
               setActiveConsultationAptId(appointmentId)
             }
           }
        } else if (newStatus === APPOINTMENT_STATUS.COMPLETED) {
           const logIdToClose = activeLogId || localStorage.getItem('activeConsultationLogId')
           if (logIdToClose) {
             console.log(`📝 AUDIT LOG: Closing consultation log ${logIdToClose}`)
             await endDoctorConsultation(logIdToClose)
             localStorage.removeItem('activeConsultationLogId')
             localStorage.removeItem('activeConsultationAptId')
             setActiveLogId(null)
             setActiveConsultationAptId(null)
           }
           
           // Revoke access immediately when consultation is completed
           const doctorId = localStorage.getItem('doctorId')
           if (apt) {
             await revokeDoctorAccess(apt.patientId, doctorId)
           }
        }
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('An error occurred while updating status')
    }
  }

  const handleViewRecord = async (record) => {
    try {
      // Start logging access
      const docId = localStorage.getItem('doctorId')
      const pName = patientDetails?.name || 'Patient'
      const docName = doctorData?.name || 'Doctor'
      const logRes = await startRecordViewLog(docId, docName, selectedPatient, pName, record.fileName)
      if (logRes.success) setRecordAccessLogId(logRes.id)

      // Step 4: Handle native prescriptions bypassing S3
      if (record.type === 'prescription' || record.fileType === 'prescription') {
        setPreviewRecord({
          ...record,
          isPrescription: true
        })
        return
      }

      const s3Key = record.s3Key || record.key; // Support older files if 'key' was previously saved, else strict s3Key
      
      if (!s3Key) {
        alert("Unable to load file. This record was uploaded before secure S3 tracking was implemented. Please re-upload it.")
        return
      }

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${BACKEND_URL}/get-view-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ s3Key: s3Key }),
      })

      if (!response.ok) throw new Error('Failed to get view URL')

      const data = await response.json()
      if (data.success) {
        setPreviewRecord({
          ...record,
          viewUrl: data.viewUrl
        })
      } else {
        throw new Error(data.error || 'Server returned failure')
      }
    } catch (err) {
      console.error('Error viewing record:', err)
      alert("Unable to load file. Please try again.")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('doctorLoggedIn')
    localStorage.removeItem('doctorEmail')
    localStorage.removeItem('doctorId')
    localStorage.removeItem('doctorData')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading your schedule...</p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Patients', value: appointments.length, icon: <FiUsers />, color: 'text-primary', bg: 'bg-teal-50' },
    { label: 'Waiting', value: appointments.filter(a => a.status === 'WAITING' || a.status === 'BOOKED').length, icon: <FiClock />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Consulting', value: appointments.filter(a => a.status === 'ACTIVE').length, icon: <FiPlay />, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, icon: <FiCheckCircle />, color: 'text-slate-600', bg: 'bg-background' },
  ]

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-200 shadow-sm flex flex-col z-20 hidden md:flex">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center font-bold font-heading text-xl shadow-sm">
             M
           </div>
           <div>
             <span className="text-xl font-black font-heading text-textDark tracking-tight block leading-none">MediAccess</span>
             <span className="text-xs font-bold text-secondary uppercase tracking-widest">Provider</span>
           </div>
         </div>
         
         <div className="p-4 flex-1 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 mt-4">Consultation Desk</p>
            <button 
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition shadow-sm border ${
                activeTab === 'queue' ? 'bg-teal-50 text-secondary border-teal-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent'
              }`}
            >
               <FiUsers size={18} /> Patient Queue
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition shadow-sm border ${
                activeTab === 'upcoming' ? 'bg-teal-50 text-secondary border-teal-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent'
              }`}
            >
               <FiClock size={18} /> Upcoming
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition shadow-sm border ${
                activeTab === 'history' ? 'bg-teal-50 text-secondary border-teal-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent'
              }`}
            >
               <FiCheckCircle size={18} /> History
            </button>
         </div>

         <div className="p-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                {doctorData?.name?.charAt(0) || 'D'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-textDark truncate">{doctorData?.name || 'Doctor'}</p>
                <p className="text-xs text-textLight truncate">{doctorData?.phone || 'Specialist'}</p>
              </div>
            </div>
            <button
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-bold transition"
            >
               <FiLogOut size={16} /> Secure Sign Out
            </button>
         </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden bg-surface shadow-sm border-b border-slate-200 sticky top-0 z-30">
          <div className="px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center font-bold font-heading">M</div>
              <span className="font-black font-heading text-textDark tracking-tight">MediAccess</span>
            </div>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-2"><FiLogOut size={20} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Patient Coming Notification */}
        {incomingPatient && (
          <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300-sm flex items-center justify-between animate-bounce-slow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <FiUser size={20} />
              </div>
              <div>
                <h4 className="font-bold text-green-900">Patient is Coming!</h4>
                <p className="text-sm text-green-700">
                  <span className="font-bold">{incomingPatient.patientName}</span> has been sent inside by Reception.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIncomingPatient(null)}
              className="p-2 hover:bg-green-100 rounded-full text-green-600 transition"
            >
              <FiX size={20} />
            </button>
          </div>
        )}

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 font-bold">
             {activeTab === 'history' ? 'Consultation History' : activeTab === 'upcoming' ? 'Upcoming Appointments' : "Today's Schedule"}
          </h1>
          <p className="text-textLight">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-surface p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-textLight uppercase tracking-wider">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Appointments List */}
        <div className="bg-surface rounded-xl shadow-md hover:shadow-lg transition-all duration-300-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-background/50 flex items-center justify-between">
            <h2 className="font-bold text-textDark">
               {activeTab === 'history' ? 'Past Records' : activeTab === 'upcoming' ? 'Future Schedule' : 'Patients Queue'}
            </h2>
            <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded">Live Sync</span>
          </div>

          {appointments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUsers size={30} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">
                {activeTab === 'upcoming' ? 'No future appointments scheduled.' : activeTab === 'history' ? 'No past records found.' : 'No appointments scheduled for today.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {appointments.map((apt, idx) => (
                <div key={apt.id} className="p-6 hover:bg-background transition duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold border border-green-100">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 font-bold text-lg">{apt.patientName}</h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm font-medium text-textLight flex items-center gap-1">
                            <FiClock size={14} /> {activeTab !== 'queue' ? `${apt.date} at ${formatTime(apt.time)}` : formatTime(apt.time)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[apt.status]?.badge || 'bg-gray-200'} ${STATUS_COLORS[apt.status]?.text || 'text-gray-800'}`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPatient(apt.patientId)
                          setSelectedAppointmentId(apt.id)
                        }}
                        disabled={apt.status === 'COMPLETED' || apt.status === 'CANCELLED'}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                          apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
                            ? 'text-primary bg-teal-50 hover:bg-teal-100'
                            : 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-50'
                        }`}
                        title={apt.status === 'COMPLETED' ? "Consultation finished" : "View patient history"}
                      >
                        <FiSearch size={16} /> Details
                      </button>
                      
                      {apt.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            if (apt.status === 'CALLING') return;
                            const next = apt.status === 'ACTIVE' ? APPOINTMENT_STATUS.COMPLETED : APPOINTMENT_STATUS.CALLING;
                            handleStatusUpdate(apt.id, next);
                          }}
                          disabled={apt.status === 'CALLING'}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition shadow-md hover:shadow-lg transition-all duration-300-sm ${
                            apt.status === 'ACTIVE'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : apt.status === 'CALLING'
                                ? 'bg-amber-100 text-amber-500 cursor-wait'
                                : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {apt.status === 'ACTIVE' ? (
                            <><FiCheckCircle size={16} /> Complete</>
                          ) : apt.status === 'CALLING' ? (
                            <><FiClock size={16} /> Called</>
                          ) : (
                            <><FiPlay size={16} /> Call Patient</>
                          )}
                        </button>
                      )}
                      
                      {apt.status === 'COMPLETED' && activeTab === 'queue' && (
                        <span className="text-green-600 font-bold flex items-center gap-1 text-sm">
                          <FiCheckCircle /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-md hover:shadow-lg transition-all duration-300-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-background/50">
              <h3 className="text-xl font-bold text-slate-900 font-bold">Patient File</h3>
              <button onClick={() => setSelectedPatient(null)} className="p-2 hover:bg-gray-200 rounded-full transition">
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {patientDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
                      <p className="text-lg font-bold text-textDark">{patientDetails.name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age / Gender</label>
                      <p className="text-lg font-bold text-textDark">{patientDetails.age || 'N/A'} yrs / {patientDetails.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</label>
                      <p className="text-lg font-bold text-textDark">{patientDetails.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blood Group</label>
                      <p className="text-lg font-bold text-textDark text-red-600">{patientDetails.bloodGroup || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-textDark mb-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <span className="flex items-center gap-2">📋 Medical Records ({patientRecords.length})</span>
                         {appointments.find(a => a.id === selectedAppointmentId)?.status === 'ACTIVE' && (
                           <button onClick={() => setShowPrescriptionForm(true)} className="text-xs bg-teal-100 text-teal-700 hover:bg-teal-200 px-3 py-1 rounded-xl transition font-bold flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-300-sm">
                             ➕ Add Prescription
                           </button>
                         )}
                       </div>
                       {activeConsent && (
                         <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-300-sm">
                           <FiUnlock size={12} /> Access Active: {timeLeft || 'Expired'}
                         </span>
                       )}
                    </h4>

                    {checkingConsent ? (
                      <div className="py-8 text-center text-textLight">Verifying access permissions...</div>
                    ) : activeConsent ? (
                      // Allow viewing if there's any active/queued appointment for this patient
                      !appointments.find(a => String(a.patientId) === String(selectedPatient) && !['COMPLETED', 'CANCELLED'].includes(a.status)) ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                           <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                             <FiLock size={24} />
                           </div>
                           <h5 className="font-bold text-amber-800">Appointment Not Active</h5>
                           <p className="text-xs text-amber-600 mt-2">
                             Access to records is strictly restricted to active consultations. 
                             Please call the patient to resume access.
                           </p>
                        </div>
                      ) : patientRecords.length === 0 ? (
                        <div className="bg-background border border-dashed border-slate-200 rounded-xl p-8 text-center text-textLight text-sm">
                          No medical records uploaded for this patient.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {patientRecords.map((record, i) => {
                             return (
                            <button 
                               key={i} 
                               onClick={() => handleViewRecord(record)}
                               className="flex items-center text-left p-3 bg-surface border border-slate-200 rounded-xl hover:border-primary hover:shadow-md hover:shadow-lg transition-all duration-300-md transition group w-full"
                             >
                               <span className="text-2xl mr-3 group-hover:scale-110 transition">
                                 {record.type === 'prescription' || record.fileType === 'prescription' ? '💊' : record.fileType?.includes('pdf') ? '📄' : '🖼️'}
                               </span>
                               <div className="min-w-0 flex-1 flex flex-col justify-center">
                                 <p className="text-sm font-bold text-textDark truncate">{record.fileName}</p>
                                 <p className="text-[10px] text-textLight uppercase">{new Date(record.uploadedAt).toLocaleDateString()}</p>
                               </div>
                               <FiSearch className="text-slate-400 group-hover:text-primary transition ml-2" />
                             </button>
                             )
                          })}
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                          <FiLock size={24} />
                        </div>
                        <h5 className="font-bold text-slate-800">Access Not Granted</h5>
                        <p className="text-xs text-slate-500 mt-2 mb-6">
                          You do not have active consent to view this patient's medical records. 
                          Please request access from the patient.
                        </p>
                        
                        <div className="max-w-xs mx-auto space-y-4">
                          <label className="flex items-start gap-2 text-left cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={hasAgreedToTerms}
                              onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                              className="mt-1 rounded text-primary focus:ring-primary"
                            />
                            <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition font-medium">
                              I agree to access patient data only for medical purposes and will not misuse it.
                            </span>
                          </label>
                          
                          <button
                            onClick={handleRequestAccessFromDoctor}
                            disabled={requestingAccess || !hasAgreedToTerms}
                            className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all duration-300-sm hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {requestingAccess ? 'Sending Request...' : '📩 Request Patient Consent'}
                          </button>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-center gap-1.5 text-slate-400">
                          <FiShield size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Secure Consent Layer</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-textLight text-sm">Retrieving patient history...</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-background border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedPatient(null)}
                className="px-6 py-2 bg-surface border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-background transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Record Preview Modal */}
      {previewRecord && activeConsent && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex flex-col p-4 sm:p-8 animate-in fade-in duration-300"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between mb-4 text-white">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setPreviewRecord(null)
                  if (recordAccessLogId) {
                    endRecordViewLog(recordAccessLogId)
                    setRecordAccessLogId(null)
                  }
                }}
                className="p-2 hover:bg-surface/10 rounded-full transition"
              >
                <FiX size={24} />
              </button>
              <div>
                <h3 className="font-bold text-lg">{previewRecord.fileName}</h3>
                <p className="text-xs text-slate-400">Viewing Record • {previewRecord.type === 'prescription' ? 'Digital Prescription' : previewRecord.fileType}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Persistent Timer in Preview */}
              <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full border border-green-500/30">
                <FiClock size={16} />
                <span className="text-sm font-mono font-bold">Access Expires In: {timeLeft || '...'}</span>
              </div>
              
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 bg-surface/5 px-3 py-1 rounded border border-white/10">
                Secure Viewer • Download Disabled
              </span>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300-2xl flex items-center justify-center relative">
             {previewRecord.isPrescription ? (
               <PrescriptionViewer 
                 patientId={selectedPatient} 
                 prescriptionId={previewRecord.prescriptionId} 
               />
             ) : previewRecord.fileType?.includes('pdf') ? (
               <iframe 
                 src={`${previewRecord.viewUrl}#toolbar=0`}
                 className="w-full h-full border-none"
                 title="PDF Preview"
               />
             ) : (
               <img 
                 src={previewRecord.viewUrl} 
                 alt="Medical Record Preview"
                 className="max-w-full max-h-full object-contain pointer-events-none p-4"
               />
             )}
          </div>
        </div>
      )}

      {/* Prescription Form Modal */}
      {showPrescriptionForm && (
        <DoctorPrescriptionForm
          patientId={selectedPatient}
          patientName={patientDetails?.name}
          doctorId={localStorage.getItem('doctorId')}
          doctorName={doctorData?.name || 'Doctor'}
          appointmentId={selectedAppointmentId}
          onClose={() => setShowPrescriptionForm(false)}
        />
      )}
      </div>
    </div>
  )
}
