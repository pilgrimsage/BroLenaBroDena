import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ArrowRight, RotateCcw, Loader2, User } from 'lucide-react'
import api from '@/api/axios'
import { useAuthStore } from '@/store/auth'

// Three steps in the auth flow
type Step = 'phone' | 'otp' | 'name'

export default function AuthPage() {
  const navigate = useNavigate()
  const { fetchMe } = useAuthStore()

  const [step,    setStep]    = useState<Step>('phone')
  const [phone,   setPhone]   = useState('')
  const [otp,     setOtp]     = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [resendIn,setResendIn]= useState(0)

  // Dev only — server returns OTP for easy testing
  const [devOtp,  setDevOtp]  = useState('')


  useEffect(() => {
  if (otp.length === 6 && step === 'otp') {
    // Small delay so user sees the filled digits before submit
    const timer = setTimeout(() => {
      handleVerifyOtp({ preventDefault: () => {} } as any)
    }, 600)
    return () => clearTimeout(timer)
  }
}, [otp, step])

  // ── Step 1: Send OTP ───────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('Enter your phone number.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/send-otp', { phone })
      setStep('otp')
      startResendTimer()

      // Dev mode — show OTP
      if (data.otp) {
        setDevOtp(data.otp); 
        setOtp(data.otp);
      }

    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send OTP.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', {
        phone,
        code: otp,
        name: name || undefined,
      })

      // Store token
      localStorage.setItem('auth_token', data.token)
      useAuthStore.setState({
        user: data.user,
        token: data.token,
        isLoggedIn: true,
      })

      navigate('/')

    } catch (err: any) {
      const response = err?.response?.data

      // New user needs to provide name
      if (response?.requires === 'name') {
        setStep('name')
        setError('')
        return
      }

      setError(response?.message ?? 'Invalid OTP.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Submit name then verify again ──────────────────────────
  async function handleSubmitName(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Enter your name.')
      return
    }

    // Re-use verify with name included
    await handleVerifyOtp(e)
  }

  // ── Resend timer ───────────────────────────────────────────────────
  function startResendTimer() {
    setResendIn(30)
    const interval = setInterval(() => {
      setResendIn(v => {
        if (v <= 1) { clearInterval(interval); return 0 }
        return v - 1
      })
    }, 1000)
  }

  async function handleResend() {
    setOtp('')
    setError('')
    setDevOtp('')
    await handleSendOtp({ preventDefault: () => {} } as any)
  }

  // ── Shared styles ──────────────────────────────────────────────────
  const input = `
    w-full px-4 py-3.5 rounded-2xl text-sm font-medium
    bg-gray-100 dark:bg-white/5
    border border-transparent
    focus:border-brand focus:bg-white dark:focus:bg-white/10
    focus:outline-none focus:ring-0
    transition-all placeholder:text-gray-400
    dark:text-white
  `

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12
                    bg-gray-50 dark:bg-gray-950">

      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center
                        w-16 h-16 rounded-2xl bg-brand/10 mb-4">
          <span className="text-2xl font-black text-brand">BB</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          BrolenaBrodena
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track money between friends — simply.
        </p>
      </div>

      {/* ── Step indicators ──────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['phone', 'otp', 'name'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all
              ${step === s
                ? 'w-6 bg-brand'
                : i < ['phone','otp','name'].indexOf(step)
                  ? 'bg-brand/40'
                  : 'bg-gray-200 dark:bg-white/10'
              }`}
            />
          </div>
        ))}
      </div>

      {/* ── Step 1: Phone ────────────────────────────────────────── */}
      {step === 'phone' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500
                              dark:text-gray-400 mb-2 uppercase tracking-wide">
              Your phone number
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2
                              flex items-center gap-2 pointer-events-none">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 font-medium border-r
                                 border-gray-200 dark:border-white/10 pr-2">
                  +91
                </span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                className={input + ' pl-24'}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">
              We'll send a one-time password to this number
            </p>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white
                       bg-brand hover:bg-brand-dark active:scale-[0.98]
                       transition-all disabled:opacity-60
                       flex items-center justify-center gap-2">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ArrowRight className="w-4 h-4" />
            }
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>
      )}

      {/* ── Step 2: OTP ──────────────────────────────────────────── */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500
                                dark:text-gray-400 uppercase tracking-wide">
                Enter OTP
              </label>
              <button type="button" onClick={() => setStep('phone')}
                className="text-xs text-brand font-medium">
                Change number
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Sent to <span className="font-semibold">+91 {phone}</span>
            </p>

            {/* Dev OTP hint */}
            {devOtp && (
  <div className="bg-amber-50 dark:bg-amber-500/10 border
                  border-amber-200 dark:border-amber-500/20
                  rounded-xl px-4 py-2.5 mb-3
                  flex items-center justify-between">
    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
      🧪 OTP auto-filled: {devOtp}
    </p>
    <span className="text-[10px] text-amber-500">
      Submitting…
    </span>
  </div>
)}


            {/* OTP input — big digits */}
            <input
              type="text"
              inputMode="numeric"
              placeholder="● ● ● ● ● ●"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className={input + ' text-center text-2xl font-black tracking-[0.5em]'}
              autoFocus
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading || otp.length !== 6}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white
                       bg-brand hover:bg-brand-dark active:scale-[0.98]
                       transition-all disabled:opacity-60
                       flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Verifying…' : 'Verify OTP'}
          </button>

          {/* Resend */}
          <div className="text-center">
            {resendIn > 0 ? (
              <p className="text-xs text-gray-400">
                Resend OTP in {resendIn}s
              </p>
            ) : (
              <button type="button" onClick={handleResend}
                className="text-xs text-brand font-semibold
                           flex items-center gap-1 mx-auto">
                <RotateCcw className="w-3 h-3" />
                Resend OTP
              </button>
            )}
          </div>
        </form>
      )}

      {/* ── Step 3: Name (new users only) ────────────────────────── */}
      {step === 'name' && (
        <form onSubmit={handleSubmitName} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500
                              dark:text-gray-400 mb-2 uppercase tracking-wide">
              What's your name?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Looks like you're new here! What should we call you?
            </p>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2
                               w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Alice"
                value={name}
                onChange={e => setName(e.target.value)}
                className={input + ' pl-11'}
                autoFocus
              />
            </div>
          </div>

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading || !name.trim()}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white
                       bg-brand hover:bg-brand-dark active:scale-[0.98]
                       transition-all disabled:opacity-60
                       flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Get started →'}
          </button>
        </form>
      )}

    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-500/10 border border-red-100
                    dark:border-red-500/20 text-red-600 dark:text-red-400
                    text-xs rounded-xl px-4 py-3">
      {message}
    </div>
  )
}