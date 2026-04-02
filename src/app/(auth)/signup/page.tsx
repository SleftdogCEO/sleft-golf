'use client'

import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { hapticSuccess, hapticError } from '@/lib/haptics'

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/feed'
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function persistAndRedirect(session: { access_token: string; refresh_token: string }) {
    // Write directly to localStorage (skip setSession which hangs in WKWebView)
    const storageKey = `sb-ujlafipkcptwjtsnydcy-auth-token`
    localStorage.setItem(storageKey, JSON.stringify(session))

    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.set({
          key: 'supabase_session',
          value: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        })
      }
    } catch {
      // Not native
    }
    hapticSuccess()
    window.location.replace(redirect)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use same-origin API route (WKWebView blocks cross-origin Supabase calls)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })

      const result = await res.json()

      // Already registered -- try logging in instead
      if (res.status === 409) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const loginResult = await loginRes.json()
        if (!loginRes.ok || loginResult.error) {
          setError('An account with this email already exists. Try logging in instead.')
          hapticError()
          setLoading(false)
          return
        }
        if (loginResult.session) {
          await persistAndRedirect(loginResult.session)
          return
        }
      }

      if (!res.ok || result.error) {
        setError(result.error || 'Signup failed')
        hapticError()
        setLoading(false)
        return
      }

      if (result.session) {
        await persistAndRedirect(result.session)
        return
      }

      setError('Check your email to confirm your account, then log in.')
      setLoading(false)
    } catch {
      setError('Signup failed. Please try again.')
      hapticError()
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">{"\u26F3"}</span>
        <h1 className="text-2xl font-bold text-white">Join Sleft Golf</h1>
        <p className="text-gray-400 text-sm mt-1">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
            required
            className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Already have an account?{' '}
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-emerald-400 hover:text-emerald-300 font-medium">
          Log in
        </Link>
      </p>
    </div>
  )
}
