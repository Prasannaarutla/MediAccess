import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MedicalRecordsUpload from '../components/MedicalRecordsUpload'
import AppointmentBooking from '../components/AppointmentBooking'
import AppointmentsList from '../components/AppointmentsList'
import { getAppointments, flattenAppointments, updateAppointmentStatus, APPOINTMENT_STATUS, formatDate } from '../utils/appointmentUtils'
import { subscribeToData, updateConsentStatus } from '../firebase'
import NotificationModal from '../components/NotificationModal'
import { LayoutDashboard, Calendar, FileText, ClipboardList, User, ShieldAlert, Activity, FilePlus, Copy, Bell, Menu, X, Clock, CheckCircle, CreditCard, Check, ChevronRight, Filter } from 'lucide-react'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [patientId, setPatientId] = useState(null)
  const [patientData, setPatientData] = useState(null)
  const [patientFace, setPatientFace] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [appointments, setAppointments] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [copied, setCopied] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [consents, setConsents] = useState([])
  const [pendingConsents, setPendingConsents] = useState([])
  const [activeConsents, setActiveConsents] = useState([])
  const [pastConsents, setPastConsents] = useState([])
  const [selectedDuration, setSelectedDuration] = useState(15)
  const [processingConsent, setProcessingConsent] = useState(null)
  const [activeConsentTimeLeft, setActiveConsentTimeLeft] = useState({})
  const [appointmentFilter, setAppointmentFilter] = useState('upcoming')
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [activeConsentRequest, setActiveConsentRequest] = useState(null)

  useEffect(() => {
    // Retrieve data from localStorage
    const id = localStorage.getItem('patientId')
    const face = localStorage.getItem('patientFace')
    const registerData = localStorage.getItem('patientRegisterData')

    if (!id || !registerData) {
      // Redirect to registration if data not found
      navigate('/patient')
      return
    }

    setPatientId(id)
    setPatientData(JSON.parse(registerData))
    setPatientFace(face)
  }, [navigate])

  // Real-time subscription for medical records
  useEffect(() => {
    if (!patientId) return

    console.log(`📋 Subscribing to medical records for ${patientId}`)
    const unsubscribeRecords = subscribeToData(
      `patients/${patientId}/records`,
      (result) => {
        if (result.success && result.data) {
          const recordsArray = Object.entries(result.data).map(([id, record]) => ({ id, ...record }))
          setMedicalRecords(recordsArray)
          console.log(`📊 Medical records updated: ${recordsArray.length} files`)
        } else {
          setMedicalRecords([])
          console.log('📊 No medical records found')
        }
      }
    )

    return () => {
      if (unsubscribeRecords) unsubscribeRecords()
    }
  }, [patientId])

  // Real-time subscription for appointments
  useEffect(() => {
    if (!patientId) return

    console.log(`📅 Subscribing to appointments for ${patientId}`)
    const unsubscribeAppointments = subscribeToData(
      `appointments`,
      (result) => {
        if (result.success && result.data) {
          const allAppointments = flattenAppointments(result.data)
          const patientAppointments = allAppointments.filter(
            (apt) => apt.patientId === patientId
          )
          setAppointments(patientAppointments.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)))
          console.log(`📅 Appointments updated: ${patientAppointments.length} total`)
        } else {
          setAppointments([])
          console.log('📅 No appointments found')
        }
      }
    )

    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments()
    }
  }, [patientId])

  // Real-time subscription for consents
  useEffect(() => {
    if (!patientId) return

    console.log(`📋 Subscribing to consents for ${patientId}`)
    const unsubscribeConsents = subscribeToData(
      'consents',
      (result) => {
        if (result.success && result.data) {
          const now = new Date().toISOString()
          const allConsents = Object.entries(result.data)
            .map(([id, val]) => ({ id, ...val }))
            .filter(c => c.patientId === patientId)
          
          setConsents(allConsents)
          const pending = allConsents.filter(c => c.status === 'PENDING')
          setPendingConsents(pending)
          
          // Trigger Popup for the most recent pending consent if not already shown
          if (pending.length > 0) {
            const latest = pending.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
            if (!activeConsentRequest || activeConsentRequest.id !== latest.id) {
               setActiveConsentRequest(latest)
               setShowConsentModal(true)
            }
          } else {
            setShowConsentModal(false)
          }

          setActiveConsents(allConsents.filter(c => c.status === 'APPROVED' && c.expiresAt > now))
          setPastConsents(allConsents.filter(c => 
            c.status === 'REJECTED' || 
            c.status === 'EXPIRED' || 
            (c.status === 'APPROVED' && c.expiresAt <= now)
          ))
        } else {
          setConsents([])
          setPendingConsents([])
          setActiveConsents([])
          setPastConsents([])
        }
      }
    )

    return () => {
      if (unsubscribeConsents) unsubscribeConsents()
    }
  }, [patientId])

  // Real-time timer for active consents (Patient Side)
  useEffect(() => {
    if (activeConsents.length === 0) {
      setActiveConsentTimeLeft({})
      return
    }

    const timer = setInterval(() => {
      const now = new Date()
      const newTimeLefts = {}
      
      activeConsents.forEach(consent => {
        const expiry = new Date(consent.expiresAt)
        const diff = expiry - now
        
        if (diff > 0) {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          newTimeLefts[consent.id] = `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
      })
      
      setActiveConsentTimeLeft(newTimeLefts)
    }, 1000)

    return () => clearInterval(timer)
  }, [activeConsents])

  const handleConsentAction = async (consentId, action, duration = null) => {
    try {
      setProcessingConsent(consentId)
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
      const result = await updateConsentStatus(consentId, status, duration)
      
      if (result.success) {
        console.log(`✅ PATIENT CONSENT: Successfully updated ${consentId} to ${status} for ${duration || 'N/A'} min`)
      } else {
        console.error(`❌ PATIENT CONSENT: Failed to update ${consentId}`, result.error)
      }
      if (!result.success) {
        alert('Failed to update consent: ' + result.error)
      }
    } catch (err) {
      console.error('Error updating consent:', err)
    } finally {
      setProcessingConsent(null)
    }
  }

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('patientId')
    localStorage.removeItem('patientFace')
    localStorage.removeItem('patientRegisterData')
    localStorage.removeItem('patientLoggedIn')
    // Redirect to home
    navigate('/')
  }

  if (!patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  // --- DERIVED DATA ---
  const now = new Date()
  const handleStatusUpdate = async (aptId, newStatus) => {
    const result = await updateAppointmentStatus(aptId, newStatus)
    if (result.success) {
      setRefreshKey(prev => prev + 1)
    } else {
      alert(result.error || 'Failed to update appointment')
    }
  }

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening'
  
  const upcomingAppointment = appointments.find(apt => 
    new Date(apt.date + ' ' + apt.time) >= now && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
  )

  const recentlyBooked = [...appointments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]

  const recentTimeline = [
    ...appointments.map(a => ({ id: `apt-${a.id}`, type: 'appointment', date: new Date(a.date + ' ' + a.time), title: `Appointment ${a.status}`, desc: a.doctor, icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50' })),
    ...medicalRecords.map(m => ({ id: `rec-${m.id}`, type: 'record', date: new Date(m.uploadedAt), title: `Record Uploaded`, desc: m.fileName, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' })),
    ...consents.filter(c => c.status === 'APPROVED').map(c => ({ id: `con-${c.id}`, type: 'consent', date: new Date(c.createdAt), title: `Consent Given`, desc: c.doctorName, icon: ShieldAlert, color: 'text-teal-500', bg: 'bg-teal-50' }))
  ].sort((a, b) => b.date - a.date).slice(0, 3)

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'records', label: 'Medical Records', icon: ClipboardList },
    { id: 'consents', label: 'Consents', icon: ShieldAlert },
    { id: 'profile', label: 'Profile', icon: User }
  ]

  const copyToClipboard = () => {
    navigator.clipboard.writeText(patientId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            {/* HERO SECTION */}
            <div className="relative rounded-3xl bg-gradient-to-br from-primary to-secondary p-8 md:p-10 text-white shadow-xl overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black font-heading mb-2">{greeting}, {patientData.name.split(' ')[0]}!</h2>
                  <p className="text-teal-50 text-sm md:text-base opacity-90 max-w-xl">Your health dashboard is ready. Stay on top of your upcoming consultations and manage your medical records securely.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  {upcomingAppointment && (
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 min-w-[260px] shadow-sm flex-1">
                      <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={12}/> Next Appointment</p>
                      <div className="flex items-center gap-4">
                        <div className="bg-white text-primary w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shadow-md border-b-4 border-teal-100">
                          {String(upcomingAppointment.date || '').split('-')[2] || '??'}
                        </div>
                        <div>
                          <p className="font-bold text-base leading-tight truncate max-w-[120px]">{String(upcomingAppointment.doctor || '').replace('Dr. ', '')}</p>
                          <p className="text-xs text-teal-50 font-medium">{upcomingAppointment.time}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {recentlyBooked && (
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 min-w-[260px] shadow-sm flex-1">
                      <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle size={12}/> Recently Booked</p>
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-400 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-md">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-base leading-tight truncate max-w-[120px]">{String(recentlyBooked.doctor || '').replace('Dr. ', '')}</p>
                          <p className="text-xs text-teal-50 font-medium">{formatDate(recentlyBooked.date)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 pointer-events-none">
                <Activity size={240} />
              </div>
            </div>

            {/* NEW: Doctor is viewing records notification */}
            {activeConsents.map(consent => (
              activeConsentTimeLeft[consent.id] && (
                <div key={consent.id} className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm flex items-center justify-between animate-in slide-in-from-top duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-pulse">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900">Active Record Access</h4>
                      <p className="text-sm text-green-700">Dr. <span className="font-bold">{consent.doctorName}</span> is currently viewing your records.</p>
                    </div>
                  </div>
                  <div className="bg-green-600 text-white px-4 py-2 rounded-xl font-mono font-bold text-sm flex items-center gap-2 shadow-sm">
                    <Clock size={16} /> {activeConsentTimeLeft[consent.id]}
                  </div>
                </div>
              )
            ))}

            {/* Priority Notifications */}
            {pendingConsents.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm animate-pulse-slow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900">Health Action Required</h3>
                    <p className="text-xs text-amber-700">A doctor is requesting consent.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {pendingConsents.map(request => (
                    <div key={request.id} className="bg-surface/80 backdrop-blur-sm border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm font-medium text-amber-900">Dr. {request.doctorName} requested access</div>
                      <button onClick={() => setActiveTab('consents')} className="w-full sm:w-auto px-6 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition shadow-sm text-sm">Handle Request</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INTERACTIVE CARDS & QUICK ACTIONS (2 Column Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              
              <div className="lg:col-span-2 space-y-6">
                 {/* 4 Dashboard Cards */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div onClick={() => setActiveTab('appointments')} className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100 group">
                      <div className="w-12 h-12 bg-teal-50 text-primary rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition shadow-sm">
                        <Calendar size={24} />
                      </div>
                      <h3 className="font-bold text-textDark text-lg">Appointments</h3>
                      <p className="text-textLight text-sm font-medium mt-1">{appointments.length} Scheduled</p>
                    </div>
                    <div onClick={() => setActiveTab('records')} className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100 group">
                      <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center mb-4 group-hover:bg-secondary group-hover:text-white transition shadow-sm">
                        <FileText size={24} />
                      </div>
                      <h3 className="font-bold text-textDark text-lg">Medical Records</h3>
                      <p className="text-textLight text-sm font-medium mt-1">{medicalRecords.length} Files Uploaded</p>
                    </div>
                    <div className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100 group">
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition shadow-sm">
                        <FilePlus size={24} />
                      </div>
                      <h3 className="font-bold text-textDark text-lg">Prescriptions</h3>
                      <p className="text-textLight text-sm font-medium mt-1">Digital Rx Access</p>
                    </div>
                    <div onClick={() => setActiveTab('consents')} className="bg-surface p-6 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100 group">
                      <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition shadow-sm">
                        <ShieldAlert size={24} />
                      </div>
                      <h3 className="font-bold text-textDark text-lg">Consents</h3>
                      <p className="text-textLight text-sm font-medium mt-1">{activeConsents.length} Active</p>
                    </div>
                 </div>

                 {/* Quick Actions Panel */}
                 <div className="bg-surface rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
                    <h3 className="text-lg font-bold text-textDark mb-5 flex items-center gap-2"><Activity size={20} className="text-primary"/> Quick Actions</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                       <button onClick={() => setActiveTab('appointments')} className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-teal-700 text-white py-3.5 px-4 rounded-xl font-bold transition shadow-sm hover:shadow-md hover:-translate-y-0.5">
                         <Calendar size={18}/> Book Appointment
                       </button>
                       <button onClick={() => setActiveTab('records')} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3.5 px-4 rounded-xl font-bold transition shadow-sm hover:shadow-md hover:-translate-y-0.5">
                         <ClipboardList size={18}/> Upload Record
                       </button>
                    </div>
                 </div>
              </div>

              {/* Right Column: ID & Timeline */}
              <div className="space-y-6">
                 {/* DIGITAL HEALTH ID */}
                 <div className="bg-surface rounded-2xl shadow-md border border-slate-100 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition group-hover:scale-110"></div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 flex items-center gap-2"><CreditCard size={14}/> Digital Health ID</p>
                    <h3 className="text-xl font-black text-textDark mb-4">{patientData.name}</h3>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-inner">
                       <code className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 truncate mr-2 tracking-wide">{patientId}</code>
                       <button onClick={copyToClipboard} className="p-2 bg-white text-slate-600 hover:text-primary rounded-lg border border-slate-200 shadow-sm transition">
                         {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                       </button>
                    </div>
                 </div>

                 {/* RECENT ACTIVITY TIMELINE */}
                 <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-textDark mb-6 flex items-center gap-2"><Clock size={18} className="text-slate-400"/> Recent Activity</h3>
                    {recentTimeline.length === 0 ? (
                      <p className="text-sm text-textLight italic text-center py-4 bg-slate-50 rounded-xl border border-slate-100">No recent activity found.</p>
                    ) : (
                      <div className="space-y-6">
                        {recentTimeline.map((item, idx) => {
                          const Icon = item.icon
                          return (
                            <div key={item.id} className="flex gap-4 relative">
                               {idx !== recentTimeline.length - 1 && <div className="absolute top-10 left-5 w-0.5 h-[calc(100%-1rem)] bg-slate-100"></div>}
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${item.bg} ${item.color} flex-shrink-0 shadow-sm ring-4 ring-white`}>
                                 <Icon size={16} />
                               </div>
                               <div className="pt-1.5 pb-2">
                                 <p className="text-sm font-bold text-textDark leading-none">{item.title}</p>
                                 <p className="text-xs font-medium text-slate-500 mt-1">{item.desc}</p>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">{item.date.toLocaleDateString()} • {item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                               </div>
                            </div>
                          )
                        })}
                        <button onClick={() => setActiveTab('records')} className="w-full mt-4 py-2 text-sm font-bold text-primary hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl flex items-center justify-center gap-1 transition">
                           All History <ChevronRight size={16}/>
                        </button>
                      </div>
                    )}
                 </div>
              </div>
              
            </div>
          </div>
        )

      case 'appointments':
        return (
          <div className="bg-surface rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div>
                <h2 className="text-3xl font-black font-heading text-textDark">Consultations</h2>
                <p className="text-sm text-textLight font-medium">Manage your schedule and history.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Tabs / Filters */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1">
                  {['upcoming', 'completed', 'cancelled'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAppointmentFilter(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                        appointmentFilter === tab 
                          ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <AppointmentBooking patientName={patientData.name} patientId={patientId} onBookingSuccess={() => setRefreshKey(prev => prev + 1)} />
              </div>
            </div>

            {/* Structured Appointment List */}
            <div className="space-y-6">
              {(() => {
                const today = new Date().toISOString().split('T')[0]
                let filtered = appointments
                
                if (appointmentFilter === 'upcoming') {
                  filtered = appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
                    .sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
                } else if (appointmentFilter === 'completed') {
                  filtered = appointments.filter(a => a.status === 'COMPLETED')
                    .sort((a,b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
                } else {
                  filtered = appointments.filter(a => a.status === 'CANCELLED')
                    .sort((a,b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
                }

                if (filtered.length === 0) {
                  return (
                    <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Filter className="text-slate-300" size={30} />
                      </div>
                      <p className="text-slate-500 font-bold">No {appointmentFilter} appointments found</p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-1 gap-4">
                    {filtered.map(apt => (
                      <AppointmentsList.Card 
                        key={apt.id} 
                        appointment={apt} 
                        showActions={appointmentFilter === 'upcoming'} 
                        isPatient={true} 
                        onStatusChange={handleStatusUpdate}
                      />
                    ))}
                  </div>
                )
              })()}
            </div>
            
            {/* Real-time Consent Popup */}
            {activeConsentRequest && (
              <NotificationModal
                isOpen={showConsentModal}
                onClose={() => setShowConsentModal(false)}
                title="Data Access Request"
                subtitle="Doctor is requesting access to your medical records"
                type="info"
                doctorName={activeConsentRequest.doctorName}
                patientName={patientData.name}
                detailLabel="Req ID"
                detailValue={`#${String(activeConsentRequest.id || '').substring(0,8)}`}
                showDurationPicker={true}
                selectedDuration={selectedDuration}
                onDurationChange={setSelectedDuration}
                primaryActionLabel="Approve Access"
                onPrimaryAction={() => {
                  handleConsentAction(activeConsentRequest.id, 'approve', selectedDuration)
                  setShowConsentModal(false)
                }}
                secondaryActionLabel="Deny Request"
                onSecondaryAction={() => {
                  handleConsentAction(activeConsentRequest.id, 'reject')
                  setShowConsentModal(false)
                }}
              />
            )}
          </div>
        )

      case 'profile':
        return (
          <div className="bg-surface rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 max-w-3xl animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold font-heading text-textDark mb-6">Patient Profile</h2>
            {patientFace && (
              <div className="mb-8 flex items-center gap-6">
                <img src={patientFace} alt="Patient face" className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-50 shadow-md" />
                <div>
                  <h3 className="text-xl font-bold text-textDark">{patientData.name}</h3>
                  <p className="text-xs font-bold text-primary bg-teal-50 px-3 py-1 rounded-full inline-block mt-2 uppercase tracking-widest flex items-center gap-1"><CheckCircle size={12}/> Verified Identity</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <div className="border-b border-slate-100 pb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                <p className="text-base font-semibold text-textDark">{patientData.name}</p>
              </div>
              <div className="border-b border-slate-100 pb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</label>
                <p className="text-base font-semibold text-textDark">{patientData.dob}</p>
              </div>
              <div className="border-b border-slate-100 pb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gender</label>
                <p className="text-base font-semibold text-textDark capitalize">{patientData.gender}</p>
              </div>
              <div className="border-b border-slate-100 pb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                <p className="text-base font-semibold text-textDark">{patientData.phone}</p>
              </div>
              <div className="border-b border-slate-100 pb-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                <p className="text-base font-semibold text-textDark">{patientData.email}</p>
              </div>
            </div>
            <button className="mt-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition shadow-sm hover:shadow-md text-sm">Request Data Update</button>
          </div>
        )

      case 'records':
        return <MedicalRecordsUpload />

      case 'consents':
        return (
          <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-heading text-textDark">Data Access Management</h2>
                <p className="text-sm font-medium text-textLight mt-1">Control which doctors can view your medical records.</p>
              </div>
              {pendingConsents.length > 0 && <span className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm animate-pulse flex items-center gap-2"><Bell size={16}/> {pendingConsents.length} Pending</span>}
            </div>

            {pendingConsents.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50 flex items-center gap-2">
                  <ShieldAlert className="text-amber-500" size={18} />
                  <h3 className="font-bold text-textDark">Action Required</h3>
                </div>
                <div className="p-6 space-y-4">
                  {pendingConsents.map((request) => (
                    <div key={request.id} className="p-5 border border-amber-200 bg-amber-50/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition">
                      <div>
                        <h4 className="font-bold text-textDark text-lg">Dr. {request.doctorName || 'Doctor'}</h4>
                        <p className="text-sm font-medium text-textLight mt-1">Requesting temporary access to your health history.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} className="w-full sm:w-auto px-4 py-2 bg-white border border-amber-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm cursor-pointer">
                          <option value={15}>15 Minutes</option>
                          <option value={30}>30 Minutes</option>
                          <option value={60}>1 Hour</option>
                        </select>
                        <div className="flex gap-2 w-full sm:w-auto">
                           <button onClick={() => handleConsentAction(request.id, 'reject')} disabled={processingConsent === request.id} className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition shadow-sm hover:shadow-md">Reject</button>
                           <button onClick={() => handleConsentAction(request.id, 'approve', selectedDuration)} disabled={processingConsent === request.id} className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition shadow-sm hover:shadow-md whitespace-nowrap">Approve</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={18} />
                  <h3 className="font-bold text-textDark">Active Access</h3>
                </div>
                <div className="divide-y divide-slate-50 flex-1">
                  {activeConsents.length === 0 ? (
                    <p className="p-6 text-textLight text-sm font-medium italic py-12 text-center text-slate-400">No active data sharing permissions.</p>
                  ) : (
                    activeConsents.map(c => (
                      <div key={c.id} className="p-5 flex items-center justify-between group hover:bg-slate-50 transition">
                         <div>
                            <p className="font-bold text-textDark text-base">Dr. {c.doctorName}</p>
                            <p className="text-[10px] font-mono font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1.5 inline-block border border-green-100 shadow-sm">Expires: {new Date(c.expiresAt).toLocaleTimeString()}</p>
                         </div>
                         <button onClick={() => handleConsentAction(c.id, 'reject')} className="text-xs font-bold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 hover:border-transparent px-3 py-1.5 rounded-lg transition shadow-sm hover:shadow-md">Revoke</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 relative z-10 bg-surface">
                  <Clock className="text-slate-400" size={18} />
                  <h3 className="font-bold text-textDark">Past Access History</h3>
                </div>
                <div className="divide-y divide-slate-50 flex-1 h-full relative z-10 bg-surface">
                   <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0">
                      <Clock size={160} />
                   </div>
                  {pastConsents.length === 0 ? (
                    <p className="p-6 text-textLight text-sm font-medium italic py-12 text-center text-slate-400 relative z-10">No recent consent activity.</p>
                  ) : (
                    pastConsents.slice(0, 5).map(c => (
                      <div key={c.id} className="p-5 flex items-center justify-between relative z-10 group hover:bg-slate-50/50 transition">
                         <div>
                            <p className="font-bold text-slate-700 font-heading">Dr. {c.doctorName}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</p>
                         </div>
                         <span className={`text-[10px] font-bold px-2 py-1 rounded-md shadow-sm border ${c.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{c.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {!sidebarOpen && (
         <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(true)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-surface/90 backdrop-blur-xl border-r border-slate-200 shadow-sm flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${!sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
         <div className="p-6 border-b border-slate-100/50 flex flex-col gap-4">
           {/* Mobile Close Button */}
           <button onClick={() => setSidebarOpen(true)} className="md:hidden absolute top-4 right-4 text-slate-500 bg-slate-100 p-1.5 rounded-full"><X size={16}/></button>
           
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold font-heading text-xl shadow-sm">M</div>
             <div>
               <span className="text-xl font-black font-heading text-textDark tracking-tight block leading-none">MediAccess</span>
               <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Patient Portal</span>
             </div>
           </div>
         </div>
         
         <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 mt-4">Menu</p>
            {sidebarLinks.map(link => {
              const Icon = link.icon
              const isActive = activeTab === link.id
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setActiveTab(link.id)
                    if (window.innerWidth < 768) setSidebarOpen(true)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 outline-none hover:shadow-sm ${isActive ? 'bg-primary/5 text-primary ring-1 ring-primary/20 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} /> {link.label}
                </button>
              )
            })}
         </div>

         <div className="p-6 border-t border-slate-100/50">
            <div className="bg-slate-50 border border-slate-100 hover:border-slate-200 transition rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-inner">
              {patientFace ? (
                <img src={patientFace} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-sm bg-white border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border border-slate-300">
                  {patientData?.name?.charAt(0) || 'P'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-textDark truncate">{patientData.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">Patient</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full text-xs py-2 bg-red-50/50 border border-red-100 rounded-xl font-bold text-red-500 hover:bg-red-500 hover:text-white hover:border-transparent text-center transition shadow-sm hover:shadow-md">Secure Sign Out</button>
         </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/50 shadow-sm">
          <div className="px-4 sm:px-8 h-16 flex justify-between items-center">
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-600 hover:text-primary transition p-2 bg-slate-100 hover:bg-blue-50 rounded-lg shadow-sm">
               <Menu size={20} />
            </button>
            <h1 className="hidden md:block text-xl font-black font-heading text-textDark capitalize">{activeTab.replace('-', ' ')}</h1>
            
            <div className="flex items-center gap-4 ml-auto">
               <button className="relative p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-full transition shadow-sm border border-transparent hover:border-blue-100">
                 <Bell size={20} />
                 {pendingConsents.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface animate-pulse"></span>}
               </button>
               {patientFace && <img src={patientFace} alt="Top avatar" className="w-8 h-8 rounded-full shadow-sm object-cover hidden sm:block border border-slate-200 ring-2 ring-primary/10"/>}
            </div>
          </div>
        </header>

        {/* Scrollable Layout Context */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
           <div className="max-w-7xl mx-auto pb-12">
             {renderContent()}
           </div>
        </main>
      </div>
    </div>
  )
}
