'use client'

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

export function OfflineScreen() {
  const [isOffline, setIsOffline] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    function handleOffline() { setIsOffline(true) }
    function handleOnline() { setIsOffline(false) }

    // Check initial state
    if (!navigator.onLine) setIsOffline(true)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  async function handleRetry() {
    setRetrying(true)
    try {
      const res = await fetch('/api/posts', { method: 'HEAD' })
      if (res.ok) {
        setIsOffline(false)
        window.location.reload()
      }
    } catch {
      // Still offline
    } finally {
      setRetrying(false)
    }
  }

  if (!isOffline) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-dark-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Connection</h2>
        <p className="text-gray-400 mb-8">
          Sleft Golf needs an internet connection to load your feed, tee times, and messages.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Checking...' : 'Try Again'}
        </button>
      </div>
    </div>
  )
}
