'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/feed'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Wait for session cookie to be persisted by the browser client
    if (data.session) {
      await new Promise(resolve => setTimeout(resolve, 500))
      await supabase.auth.getSession()
    }

    window.location.href = redirect
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">{"\u26F3"}</span>
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 text-sm mt-1">Log in to Sleft Golf</p>
      </div>

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
            className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Don&apos;t have an account?{' '}
        <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
