'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">{"\u26F3"}</span>
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-gray-400 text-sm mt-1">
          {sent ? 'Check your email' : 'Enter your email to get a reset link'}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-sm px-4 py-4 rounded-xl text-center">
            We sent a password reset link to <span className="font-semibold">{email}</span>. Check your inbox and click the link to reset your password.
          </div>
          <p className="text-center text-gray-500 text-xs">
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              onClick={() => { setSent(false); setError('') }}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              try again
            </button>
          </p>
          <Link
            href="/login"
            className="block w-full text-center bg-dark-700 text-gray-300 py-3 rounded-xl font-medium hover:bg-dark-600 transition-colors text-sm mt-4"
          >
            Back to Log In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link
            href="/login"
            className="block w-full text-center text-gray-400 text-sm hover:text-white transition-colors mt-2"
          >
            Back to Log In
          </Link>
        </form>
      )}
    </div>
  )
}
