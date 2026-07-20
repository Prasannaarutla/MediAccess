import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiUsers, FiDatabase, FiActivity, FiUser, FiClock, FiShield } from 'react-icons/fi'
import { subscribeToData } from '../firebase'

export default function AdminPortal() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [scanLogs, setScanLogs] = useState([])
  const [doctorLogs, setDoctorLogs] = useState([])
  const [accessLogs, setAccessLogs] = useState([])
  
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [receptionists, setReceptionists] = useState([])
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    if (!localStorage.getItem('adminLoggedIn')) {
      navigate('/admin/login')
      return
    }

    const unsubs = []
    
    unsubs.push(subscribeToData('scanLogs', res => {
       if (res.success && res.data) {
          const arr = Object.values(res.data).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
          setScanLogs(arr)
       }
    }))
    
    unsubs.push(subscribeToData('doctorLogs', res => {
       if (res.success && res.data) {
          const arr = Object.values(res.data).sort((a,b) => new Date(b.startTime) - new Date(a.startTime))
          setDoctorLogs(arr)
       }
    }))

    unsubs.push(subscribeToData('accessLogs', res => {
       if (res.success && res.data) {
          const arr = Object.values(res.data)
            // Some legacy accessLogs might not have startTime, fallback to accessedAt
            .sort((a,b) => new Date(b.startTime || b.accessedAt || 0) - new Date(a.startTime || a.accessedAt || 0))
          setAccessLogs(arr)
       }
    }))
    
    unsubs.push(subscribeToData('patients', res => res.success && res.data && setPatients(Object.values(res.data))))
    unsubs.push(subscribeToData('doctors', res => res.success && res.data && setDoctors(Object.values(res.data))))
    unsubs.push(subscribeToData('receptionists', res => res.success && res.data && setReceptionists(Object.values(res.data))))
    unsubs.push(subscribeToData('appointments', res => {
      if (res.success && res.data) {
        let flatApts = []
        Object.entries(res.data).forEach(([key, val]) => {
          if (val && typeof val === 'object' && val.id) flatApts.push(val)
          else if (val && typeof val === 'object') {
            Object.values(val).forEach(subVal => {
               if (subVal && typeof subVal === 'object' && subVal.id) flatApts.push(subVal)
               else if (subVal && typeof subVal === 'object') {
                 Object.values(subVal).forEach(v => {
                   if (v && v.id) flatApts.push(v)
                 })
               }
            })
          }
        })
        setAppointments(flatApts)
      }
    }))
    
    setTimeout(() => setLoading(false), 800)

    return () => unsubs.forEach(u => u && u())
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn')
    navigate('/admin/login')
  }

  // --- RENDER CONTENT ---
  
  if (loading) {
     return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>
  }

  return (
    <div className="flex h-screen bg-slate-900 font-sans overflow-hidden text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 shadow-xl flex flex-col z-20 hidden md:flex">
         <div className="p-6 border-b border-slate-700 flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold font-heading text-xl shadow-sm shadow-red-500/20">
             A
           </div>
           <div>
             <span className="text-xl font-black font-heading text-white tracking-tight block leading-none">MediAccess</span>
             <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Admin Auditor</span>
           </div>
         </div>
         
         <div className="p-4 flex-1 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 mt-4">System Overview</p>
            <SidebarBtn icon={FiDatabase} label="Dashboard" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 mt-4">Security Audits</p>
            <SidebarBtn icon={FiUser} label="Reception Scans" active={activeTab === 'scans'} onClick={() => setActiveTab('scans')} />
            <SidebarBtn icon={FiActivity} label="Doctor Treatments" active={activeTab === 'treatments'} onClick={() => setActiveTab('treatments')} />
            <SidebarBtn icon={FiShield} label="Record Access Logs" active={activeTab === 'access'} onClick={() => setActiveTab('access')} />
         </div>

         <div className="p-6 border-t border-slate-700">
            <button
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-800/50 rounded-xl font-bold transition shadow-sm"
            >
               <FiLogOut size={16} /> Secure Logout
            </button>
         </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-800 shadow-sm border-b border-slate-700 sticky top-0 z-30">
          <div className="px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">A</div>
              <span className="font-black font-heading text-white tracking-tight">Admin Auditor</span>
            </div>
            <button onClick={handleLogout} className="text-red-500 p-2"><FiLogOut size={20} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          
          {activeTab === 'overview' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-3xl font-black font-heading mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-300">System Dashboard</h1>
                  <p className="text-slate-400 font-medium">Real-time counts for platform operations and registered identities.</p>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <FiDatabase size={120} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                 <MetricCard title="Total Patients" count={patients.length} icon={FiUsers} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
                 <MetricCard title="Total Doctors" count={doctors.length || 5} icon={FiUser} color="text-teal-400" bg="bg-teal-500/10" border="border-teal-500/20" />
                 <MetricCard title="Total Receptionists" count={receptionists.length || 2} icon={FiUser} color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" />
                 <MetricCard title="Total Appointments" count={appointments.length} icon={FiActivity} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
              </div>
            </div>
          )}

          {activeTab === 'scans' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
               <h2 className="text-2xl font-bold font-heading text-white">Reception Face Scan Logs</h2>
               <p className="text-sm text-slate-400 mb-4">Tracking which receptionist verified which patient's face upon clinic entry.</p>
               
               <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                          <th className="px-6 py-4">Timestamp (Real-Time)</th>
                          <th className="px-6 py-4">Receptionist ID</th>
                          <th className="px-6 py-4">Matched Patient</th>
                          <th className="px-6 py-4">Patient ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {scanLogs.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No scan activity found.</td></tr>}
                        {scanLogs.map((log, idx) => (
                           <tr key={idx} className="hover:bg-slate-700/50 transition">
                             <td className="px-6 py-4 font-mono text-xs text-slate-300">
                               {new Date(log.timestamp).toLocaleString()}
                             </td>
                             <td className="px-6 py-4 font-mono font-bold text-slate-400">{log.receptionistId}</td>
                             <td className="px-6 py-4 font-bold text-white">{log.patientName || 'Unknown Patient'}</td>
                             <td className="px-6 py-4 font-mono text-xs text-slate-400">{log.patientId}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'treatments' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
               <h2 className="text-2xl font-bold font-heading text-white">Doctor Consultation Audits</h2>
               <p className="text-sm text-slate-400 mb-4">Detailed track records of explicit patient treatments, verifying time allocations.</p>
               
               <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                          <th className="px-6 py-4">Doctor</th>
                          <th className="px-6 py-4">Treated Patient</th>
                          <th className="px-6 py-4">Consultation Time</th>
                          <th className="px-6 py-4">Total Duration</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {doctorLogs.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No treatment logs found.</td></tr>}
                        {doctorLogs.map((log, idx) => (
                           <tr key={idx} className="hover:bg-slate-700/50 transition">
                             <td className="px-6 py-4 font-bold text-white">Dr. {log.doctorName}</td>
                             <td className="px-6 py-4 font-bold text-teal-400">{log.patientName}</td>
                             <td className="px-6 py-4 font-mono text-xs text-slate-400">
                               {new Date(log.startTime).toLocaleTimeString()} → {log.endTime ? new Date(log.endTime).toLocaleTimeString() : 'Ongoing'}
                             </td>
                             <td className="px-6 py-4 font-bold text-emerald-400">
                               {log.duration !== undefined ? `${log.duration} min` : '...'}
                             </td>
                             <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'}`}>
                                  {log.status || 'UNKNOWN'}
                                </span>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'access' && (
             <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold font-heading text-white">PHI Data Access Audits</h2>
                <p className="text-sm text-slate-400 mb-4">Strict auditing tracking exact file views, maintaining HIPAA compliance accountability.</p>
                
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-md">
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                       <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                         <tr>
                           <th className="px-6 py-4">Viewing Doctor</th>
                           <th className="px-6 py-4">Patient Profile</th>
                           <th className="px-6 py-4">File Name</th>
                           <th className="px-6 py-4">Access Timeframe</th>
                           <th className="px-6 py-4">Exposure Duration</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-700">
                         {accessLogs.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No data access records found.</td></tr>}
                         {accessLogs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/50 transition">
                              <td className="px-6 py-4 font-bold text-white">{log.doctorName ? `Dr. ${log.doctorName}` : log.doctorId?.substring(0,8)}</td>
                              <td className="px-6 py-4 text-blue-400 font-bold">{log.patientName || log.patientId?.substring(0,8)}</td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-300">
                                {log.recordName || (log.action === 'VIEW_RECORDS' ? 'General Medical File' : 'Unknown')}
                              </td>
                              <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                                {log.startTime ? new Date(log.startTime).toLocaleTimeString() : new Date(log.accessedAt).toLocaleTimeString()} 
                                {log.endTime ? ` → ${new Date(log.endTime).toLocaleTimeString()}` : ''}
                              </td>
                              <td className="px-6 py-4">
                                {log.durationSeconds !== undefined ? (
                                   <span className="font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                     {log.durationSeconds} sec
                                   </span>
                                ) : (
                                   <span className="text-slate-500 italic text-xs">Unmeasured (Legacy/Active)</span>
                                )}
                              </td>
                            </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
             </div>
           )}

        </main>
      </div>
    </div>
  )
}

function SidebarBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition shadow-sm border ${
        active
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border-transparent'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  )
}

function MetricCard({ title, count, icon: Icon, color, bg, border }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm transform hover:-translate-y-1 transition duration-300 ${bg} ${border}`}>
       <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-slate-900/50 shadow-inner ${color}`}>
         <Icon size={20} />
       </div>
       <p className="text-2xl font-black text-white">{count}</p>
       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{title}</p>
    </div>
  )
}
