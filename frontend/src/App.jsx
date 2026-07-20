import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import PatientLogin from './pages/PatientLogin'
import PatientRegister from './pages/PatientRegister'
import FaceCapture from './pages/FaceCapture'
import PatientDashboard from './pages/PatientDashboard'
import DoctorRegister from './pages/DoctorRegister'
import DoctorLogin from './pages/DoctorLogin'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminPortal from './pages/AdminPortal'
import AdminLogin from './pages/AdminLogin'
import ReceptionLogin from './pages/ReceptionLogin'
import ReceptionRegister from './pages/ReceptionRegister'
import ReceptionDashboard from './pages/ReceptionDashboard'
import ReceptionPatientProfile from './pages/ReceptionPatientProfile'
import { User, Activity, CalendarDays, ShieldCheck } from 'lucide-react'

function Home() {
  const portals = [
    { 
      name: 'Patient Portal', 
      to: '/patient', 
      icon: User,
      desc: 'Access your records, manage appointments, and control data sharing',
      color: 'bg-blue-50 text-blue-600',
      border: 'hover:border-blue-500'
    },
    { 
      name: 'Doctor Portal', 
      to: '/doctor', 
      icon: Activity,
      desc: 'View appointments, access records securely, and manage prescriptions',
      color: 'bg-teal-50 text-teal-600',
      border: 'hover:border-teal-500'
    },
    { 
      name: 'Reception Portal', 
      to: '/reception', 
      icon: CalendarDays,
      desc: 'Handle patient check-ins and appointment scheduling',
      color: 'bg-indigo-50 text-indigo-600',
      border: 'hover:border-indigo-500'
    },
    { 
      name: 'Admin Portal', 
      to: '/admin', 
      icon: ShieldCheck,
      desc: 'Manage system operations and users',
      color: 'bg-slate-50 text-slate-600',
      border: 'hover:border-slate-500'
    }
  ]

  return (
    <>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="fixed top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/video/MediAccess.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/30 z-10"></div>

      <div className="relative z-20 min-h-screen bg-transparent font-sans flex flex-col">
      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-xl px-8 py-4 transition-all duration-300 border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer group hover:scale-105 transition-transform duration-300">
              <img
                src="/images/logo.jpg"
                alt="MediAccess Logo"
                className="h-10 w-auto rounded-xl shadow-lg ring-1 ring-white/10"
              />
              <span className="text-2xl font-extrabold font-heading text-white tracking-wide drop-shadow-md">MediAccess</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/80">
              <a href="#" className="relative hover:text-green-400 transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-green-400 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300">Home</a>
              <a href="#" className="relative hover:text-green-400 transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-green-400 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300">About</a>
              <a href="#" className="relative hover:text-green-400 transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-green-400 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300">Contact</a>
              <a href="#" className="relative hover:text-green-400 transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-green-400 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300">Login</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 700ms ease-out forwards;
          }
          .animate-fade-in-up-delay {
            animation: fadeInUp 700ms ease-out 200ms forwards;
            opacity: 0;
          }
        `}</style>
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-bold mb-8 border border-white/20 shadow-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Next-Generation Healthcare
          </div>
          <h1 className="text-5xl md:text-8xl font-extrabold font-heading text-white tracking-wide mb-6 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] animate-fade-in-up">
            MediAccess
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-100 font-medium drop-shadow-md animate-fade-in-up-delay">
            Secure, Smart, and Seamless Healthcare Access. Choose your portal below to enter the ecosystem.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {portals.map((p) => {
              const Icon = p.icon
              return (
                <Link key={p.to} to={p.to} className="group block focus:outline-none h-full">
                  <div className="bg-[#0f172a]/70 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl shadow-black/50 hover:shadow-[0_0_40px_rgba(7ade80,0.15)] hover:border-green-400/40 transform hover:-translate-y-2 hover:scale-105 transition-all duration-500 h-full flex flex-col relative overflow-hidden group-hover:bg-[#0f172a]/80">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-green-400/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-400/20 transition-all duration-700"></div>
                    <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-green-400/20 group-hover:text-green-300 transition-all duration-300 relative z-10 shadow-inner inline-flex">
                      <Icon size={26} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 mb-3 relative z-10">{p.name}</h3>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed flex-1 relative z-10">
                      {p.desc}
                    </p>
                    <div className="mt-8 flex items-center text-sm font-bold text-green-400 group-hover:text-green-300 transition-colors relative z-10">
                      Enter Portal
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/70 backdrop-blur-lg border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <img src="/images/logo.jpg" alt="MediAccess Logo" className="w-8 h-auto rounded shadow-sm" />
                 <span className="font-bold font-heading text-white text-lg tracking-wide">MediAccess</span>
              </div>
              <p className="text-gray-400">Empowering healthcare through secure, AI-driven authentication and data management.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 tracking-wider uppercase text-xs">Contact Information</h4>
              <ul className="space-y-2 text-gray-400">
                <li>contact@mediaccess.health</li>
                <li>1-800-MEDICAL</li>
                <li>123 Innovation Drive, Tech City</li>
              </ul>
            </div>
            <div className="md:text-right">
              <h4 className="text-white font-semibold mb-4 tracking-wider uppercase text-xs">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-green-400 transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors duration-300">Terms of Service</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors duration-300">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-400 text-xs font-semibold">
            &copy; {new Date().getFullYear()} MediAccess Healthcare Systems. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}

function ReceptionCheck() {
  const isLoggedIn = localStorage.getItem('receptionistLoggedIn')

  if (isLoggedIn) {
    return <Navigate to="/reception/dashboard" />
  }

  return <Navigate to="/reception/register" />
}

function DoctorCheck() {
  const isLoggedIn = localStorage.getItem('doctorLoggedIn')

  if (isLoggedIn) {
    return <Navigate to="/doctor/dashboard" />
  }

  return <Navigate to="/doctor/login" />
}

function AdminCheck() {
  const isLoggedIn = localStorage.getItem('adminLoggedIn')

  if (isLoggedIn) {
    return <Navigate to="/admin/dashboard" />
  }

  return <Navigate to="/admin/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/patient" element={<PatientLogin />} />
      <Route path="/patient/register" element={<PatientRegister />} />
      <Route path="/face-capture" element={<FaceCapture />} />
      <Route path="/patient/dashboard" element={<PatientDashboard />} />

      <Route path="/doctor" element={<DoctorCheck />} />
      <Route path="/doctor/login" element={<DoctorLogin />} />
      <Route path="/doctor/register" element={<DoctorRegister />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />

      <Route path="/reception" element={<ReceptionCheck />} />
      <Route path="/reception/login" element={<ReceptionLogin />} />
      <Route path="/reception/register" element={<ReceptionRegister />} />
      <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
      <Route path="/reception/patient/:patientId" element={<ReceptionPatientProfile />} />

      <Route path="/admin" element={<AdminCheck />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminPortal />} />
    </Routes>
  )
}
