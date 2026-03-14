'use client'

import { useEffect } from 'react'

export function CapacitorBridge() {
  useEffect(() => {
    async function initCapacitor() {
      try {
        // Only run in Capacitor native context
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

        // Handle back button on Android (also good practice)
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back()
          }
        })
      } catch {
        // Not running in Capacitor, ignore
      }
    }

    initCapacitor()
  }, [])

  return null
}
