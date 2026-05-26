import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function AuthPage() {
  const navigate  = useNavigate()
  // useNavigate gives us a function to change the URL
  // navigate('/') goes to dashboard

  const { login, register } = useAuthStore()
  // Pull just what we need from the auth store

  // Which tab is active
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Form fields — one state per field
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')

  // UI state
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function switchTab(newTab: 'login' | 'register') {
    setTab(newTab)
    setError('')   // clear error when switching tabs
    // Don't clear form fields — user might switch by accident
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // e.preventDefault() stops the browser's default form submit
    // (which would reload the page) — same concept as PHP forms

    setError('')      // clear previous errors
    setLoading(true)  // show spinner

    try {
      if (tab === 'login') {
        await login(email, password)
        // login() is in our Zustand store
        // it calls the API and updates global state
      } else {
        await register({ name, email, phone, password })
      }

      // If we get here — success. Navigate to dashboard.
      // Small delay allows state to settle (optional but safe)
    await new Promise(resolve => setTimeout(resolve, 50))
    navigate('/')

    } catch (err: any) {
      // API returned an error — extract the message
      // Laravel validation errors look like:
      // { message: "...", errors: { email: ["..."], password: ["..."] } }

      const laravelMessage = err?.response?.data?.message
      const firstError = Object.values(
        err?.response?.data?.errors ?? {}
      )?.[0]?.[0]
      // Object.values gets all error arrays
      // [0][0] gets first array, first message

      setError(laravelMessage ?? firstError ?? 'Something went wrong.')

    } finally {
      setLoading(false) // always hide spinner, success or fail
      // finally runs whether try succeeded or catch ran
    }
  }


  // Reuse this class string on every input
  const inputClass = `
    w-full px-4 py-3 rounded-xl text-sm
    bg-gray-50 border border-gray-200
    focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand
    transition-all placeholder:text-gray-400
  `

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gray-50">

      {/* Logo area */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 mb-4">
          <span className="text-2xl font-bold text-brand">FL</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FriendLedger</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track what friends owe — simply.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-200 rounded-xl p-1 mb-6">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`
              flex-1 py-2.5 text-sm font-medium rounded-lg transition-all
              ${tab === t
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {t === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      {/* .map() on an array renders multiple elements */}
      {/* key={t} is required — React needs to track list items */}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name — only show on register tab */}
        {tab === 'register' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              placeholder="Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        )}
        {/* tab === 'register' && (...) */}
        {/* If tab is 'register' → show this. Otherwise → show nothing. */}
        {/* This is conditional rendering with && */}

        {/* Email — always shown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            placeholder="alice@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {/* Phone — register only */}
        {tab === 'register' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Password with show/hide toggle */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye    className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
        {/* setShowPassword(v => !v) */}
        {/* v => !v is a functional update — takes current value, flips it */}
        {/* Safer than setShowPassword(!showPassword) when updates are fast */}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full py-3.5 rounded-xl font-semibold text-sm text-white
            bg-brand hover:bg-brand/90 active:scale-[0.98]
            transition-all disabled:opacity-60
            flex items-center justify-center gap-2
          "
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading
            ? 'Please wait...'
            : tab === 'login' ? 'Sign in' : 'Create account'
          }
        </button>

      </form>
    </div>
  )
}

