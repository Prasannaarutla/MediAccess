import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, HeartPulse } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Simple hardcoded admin credentials
    if (email === 'admin@mediaccess.com' && password === 'Admin@123') {
      localStorage.setItem('adminLoggedIn', 'true')
      setTimeout(() => {
        setLoading(false)
        navigate('/admin/dashboard')
      }, 1000)
    } else {
      setTimeout(() => {
        setLoading(false)
        setError('Invalid admin credentials.')
      }, 800)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('/images/bg-dots.svg')] bg-repeat">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-white mb-6">
          <ShieldCheck size={56} className="text-red-500" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
          System Administration
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Authorized personnel only. Secure portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-2xl shadow-red-900/20 sm:rounded-2xl sm:px-10 border border-slate-700">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm font-bold text-center">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Admin Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl shadow-sm placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                  placeholder="admin@mediaccess.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Master Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl shadow-sm placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Authenticating...' : 'Secure Authorization'}
              </button>
            </div>
          </form>

          <div className="mt-6">
             <Link to="/" className="text-slate-400 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition">
               &larr; Back to Public Portals
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
