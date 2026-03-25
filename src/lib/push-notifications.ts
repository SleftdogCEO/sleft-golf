// Push notification registration and handling for Capacitor iOS

import type { SupabaseClient } from '@supabase/supabase-js'

export async function registerPushNotifications(supabase: SupabaseClient, userId: string) {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return

    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Request permission
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') return

    // Register with APNs
    await PushNotifications.register()

    // Listen for token
    PushNotifications.addListener('registration', async (token) => {
      // Store the device token in Supabase for server-side push
      await supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: userId,
            token: token.value,
            platform: 'ios',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' }
        )
    })

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.warn('Push registration error:', error)
    })

    // Handle received notifications (app is open)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification)
    })

    // Handle notification taps (app was in background)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      if (data?.url) {
        window.location.href = data.url
      }
    })
  } catch (e) {
    console.warn('Push notification setup failed:', e)
  }
}

export async function checkPushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return 'denied'

    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.checkPermissions()
    return result.receive as 'granted' | 'denied' | 'prompt'
  } catch {
    return 'denied'
  }
}
