'use client'

import { useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { registerPushNotifications } from '@/lib/push-notifications'

export function CapacitorBridge() {
  const { userId } = useUser()

  useEffect(() => {
    async function initCapacitor() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        // Configure status bar
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#0b0f0e' })

        // Hide splash screen after app loads
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()

        // Configure keyboard behavior
        const { Keyboard } = await import('@capacitor/keyboard')
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-open')
        })
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-open')
        })

        // Handle app URL open (deep links)
        const { App } = await import('@capacitor/app')
        App.addListener('appUrlOpen', (data) => {
          const url = new URL(data.url)
          if (url.pathname) {
            window.location.href = url.pathname
          }
        })

        // Handle back button (Android + good practice)
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back()
          }
        })

        // Restore session from native storage on cold launch
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const { value: savedSession } = await Preferences.get({ key: 'supabase_session' })
          if (savedSession) {
            const session = JSON.parse(savedSession)
            // Write directly to localStorage (skip setSession which makes cross-origin calls)
            const storageKey = `sb-ujlafipkcptwjtsnydcy-auth-token`
            localStorage.setItem(storageKey, JSON.stringify(session))
          }
        } catch {
          // No saved session
        }
      } catch {
        // Not running in Capacitor
      }
    }

    initCapacitor()
  }, [])

  // Register push notifications when user is authenticated
  useEffect(() => {
    if (!userId) return

    async function initPush() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        const supabase = createClient()
        await registerPushNotifications(supabase, userId!)
      } catch {
        // Push not available
      }
    }

    initPush()
  }, [userId])

  // Persist session to native storage whenever auth state changes
  useEffect(() => {
    async function persistSession() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        const { Preferences } = await import('@capacitor/preferences')
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session) {
              await Preferences.set({
                key: 'supabase_session',
                value: JSON.stringify({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }),
              })
            } else {
              await Preferences.remove({ key: 'supabase_session' })
            }
          }
        )

        return () => subscription.unsubscribe()
      } catch {
        // Not native
      }
    }

    persistSession()
  }, [])

  return null
}
