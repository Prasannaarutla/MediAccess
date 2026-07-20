import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCamera, FiLogOut, FiBell, FiUser, FiArrowRight, FiX } from 'react-icons/fi'
import AppointmentsList from '../components/AppointmentsList'
import ReceptionFaceScan from '../components/ReceptionFaceScan'
import ReceptionCallMonitor from '../components/ReceptionCallMonitor'
import ReceptionPatientRegister from '../components/ReceptionPatientRegister'
import { subscribeToData, logFaceScan } from '../firebase'

export default function ReceptionDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [receptionistName, setReceptionistName] = useState('Receptionist')
  const [receptionistEmail, setReceptionistEmail] = useState('')
  const [showFaceScan, setShowFaceScan] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('receptionistLoggedIn')
    if (!isLoggedIn) {
      navigate('/reception/login')
      return
    }

    const email = localStorage.getItem('receptionistEmail') || ''
    const profile = JSON.parse(localStorage.getItem('receptionistData') || '{}')

    setReceptionistName(profile.name || 'Receptionist')
    setReceptionistEmail(email)
    setLoading(false)
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('receptionistEmail')
    localStorage.removeItem('receptionistLoggedIn')
    localStorage.removeItem('receptionistId')
    localStorage.removeItem('receptionistData')
    navigate('/reception/login')
  }

  const handlePatientFound = async (patient) => {
    if (!patient?.patientId) {
      return
    }

    try {
      // Log the face scan to Firebase for admin trackings
      const receptionistId = localStorage.getItem('receptionistId') || 'unknown'
      await logFaceScan(receptionistId, patient.patientId, patient.name)
    } catch (e) {
      console.error('Failed to log face scan', e)
    }

    setShowFaceScan(false)
    setShowRegister(false)
    navigate(`/reception/patient/${patient.patientId}`, {
      state: { patient }
    })
  }

  const handleRegisterSuccess = (patient) => {
    setShowRegister(false)
    navigate(`/reception/patient/${patient.patientId}`, {
      state: { patient }
    })
  }

  if (loading) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-200 shadow-sm flex flex-col z-20 hidden md:flex">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold font-heading text-xl shadow-sm">
             M
           </div>
           <div>
             <span className="text-xl font-black font-heading text-textDark tracking-tight block leading-none">MediAccess</span>
             <span className="text-xs font-bold text-primary uppercase tracking-widest">Front Desk</span>
           </div>
         </div>
         
         <div className="p-4 flex-1 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 mt-4">Operations</p>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-teal-50 text-teal-700 rounded-xl font-bold transition shadow-sm border border-teal-100">
               <FiUser size={18} /> Daily Schedule
            </button>
            <button 
                onClick={() => setShowRegister(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-bold transition border border-transparent"
             >
                <FiUser size={18} /> Register Patient
             </button>
         </div>

         <div className="p-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                {receptionistName.charAt(0) || 'R'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-textDark truncate">{receptionistName}</p>
                <p className="text-xs text-textLight truncate">{receptionistEmail}</p>
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
        {/* Mobile Header */}
        <header className="md:hidden bg-surface shadow-sm border-b border-slate-200 sticky top-0 z-30">
          <div className="px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold font-heading">M</div>
              <span className="font-black font-heading text-textDark tracking-tight">Front Desk</span>
            </div>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-2"><FiLogOut size={20} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-secondary p-8 text-white shadow-lg overflow-hidden relative">
              <div className="relative z-10">
                <h1 className="text-3xl font-black font-heading mb-2">Front Desk Operations</h1>
                <p className="text-teal-50 font-medium">Verify patient identities and manage the incoming flow efficiently.</p>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-20">
                <FiUser size={120} />
              </div>
            </div>

        {/* Global Call Monitor */}
        <ReceptionCallMonitor />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-surface p-6 shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-1">
            <h2 className="text-xl font-bold text-slate-900 font-bold">Face Recognition</h2>
            <p className="mt-2 text-sm text-slate-600">
              Scan a patient face to identify profile and continue appointment handling.
            </p>
            <button
              type="button"
              onClick={() => setShowFaceScan(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-white hover:bg-teal-700 transition shadow-md"
            >
              <FiCamera size={18} />
              Scan Patient Face
            </button>
            <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs text-teal-800">
              Tip: Use good lighting and keep the face centered for best matching confidence.
            </div>
          </div>

          <div className="rounded-xl bg-surface p-6 shadow-md hover:shadow-lg transition-all duration-300 lg:col-span-2">
            <h2 className="mb-4 text-xl font-bold text-slate-900 font-bold">Appointments Overview</h2>
            <AppointmentsList />
          </div>
        </div>
      </div>

      {showFaceScan && (
        <ReceptionFaceScan
          onPatientFound={handlePatientFound}
          onClose={() => setShowFaceScan(false)}
          onShowRegister={() => {
            setShowFaceScan(false)
            setShowRegister(true)
          }}
        />
      )}

      {showRegister && (
        <ReceptionPatientRegister 
          onClose={() => setShowRegister(false)}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}
      </main>
      </div>
    </div>
  )
}
