import { useState } from 'react'
import { useTheme } from '@aplo/ui'
import { supabase } from '../supabase'

const ALLOWED_DOMAIN = 'aplodigital.com.au'
const APLO_TEAL = '#0d9488'

type Mode = 'signin' | 'signup' | 'forgot' | 'reset'

interface Props {
  unauthorizedEmail?: string | null
  mode?: Mode
}

export function AuthPage({ unauthorizedEmail, mode: initialMode }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [mode, setMode] = useState<Mode>(initialMode ?? 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reset = (nextMode: Mode) => {
    setMode(nextMode)
    setError(null)
    setSuccess(null)
    setPassword('')
  }

  const validateDomain = (e: string) => {
    if (!e.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} accounts are allowed.`)
      return false
    }
    return true
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validateDomain(email)) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validateDomain(email)) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Check your email to confirm your account.')
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password updated — you are now signed in.')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validateDomain(email)) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password reset link sent — check your email.')
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors ${
    isDark
      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500'
      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500'
  }`

  const cardClass = `w-full max-w-sm rounded-2xl border p-8 shadow-xl ${
    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
  }`

  const labelClass = `block text-xs font-medium mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-4">
      {/* Branding */}
      <div className="mb-6 text-center select-none">
        <div
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3"
          style={{ background: APLO_TEAL }}
        >
          <span className="text-white font-bold text-lg tracking-tight">A</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Project Timeline</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'reset' ? 'Set a new password' : mode === 'forgot' ? 'Reset your password' : mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
        </p>
      </div>

      <div className={cardClass}>
        {/* Unauthorized email error */}
        {unauthorizedEmail && !error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5">
            <p className="text-xs text-red-500 leading-snug">
              <span className="font-medium">{unauthorizedEmail}</span> is not authorised.
              Please use an @{ALLOWED_DOMAIN} account.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 rounded-lg border border-teal-500/30 bg-teal-500/5 px-3 py-2.5">
            <p className="text-xs text-teal-600 dark:text-teal-400">{success}</p>
          </div>
        )}

        {/* Sign in form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${ALLOWED_DOMAIN}`}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: APLO_TEAL }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <div className="flex justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => reset('forgot')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => reset('signup')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {/* Sign up form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ryan Keon"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${ALLOWED_DOMAIN}`}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: APLO_TEAL }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <div className="text-center text-xs pt-1">
              <button
                type="button"
                onClick={() => reset('signin')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {/* Reset password form (arrived via email link) */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className={labelClass}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: APLO_TEAL }}
            >
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {/* Forgot password form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${ALLOWED_DOMAIN}`}
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: APLO_TEAL }}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <div className="text-center text-xs pt-1">
              <button
                type="button"
                onClick={() => reset('signin')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
