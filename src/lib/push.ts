// APNs push notification sender
// Requires env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8 (base64-encoded .p8 file contents)

import { createAdminClient } from '@/lib/supabase/admin'
import { SignJWT, importPKCS8 } from 'jose'

const BUNDLE_ID = 'com.sleftgolf.app'

async function getApnsToken(): Promise<string | null> {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const keyP8 = process.env.APNS_KEY_P8

  if (!keyId || !teamId || !keyP8) return null

  // Decode the base64-encoded .p8 key
  const keyContent = Buffer.from(keyP8, 'base64').toString('utf-8')
  const privateKey = await importPKCS8(keyContent, 'ES256')

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey)

  return jwt
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // Get device token for this user
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) {
      console.log(`No device token for user ${userId}`)
      return false
    }

    const apnsToken = await getApnsToken()
    if (!apnsToken) {
      console.warn('APNs credentials not configured (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8)')
      return false
    }

    let sent = false
    for (const { token, platform } of tokens) {
      if (platform !== 'ios') continue

      const payload = {
        aps: {
          alert: { title, body },
          sound: 'default',
          badge: 1,
        },
        ...(data || {}),
      }

      // Use APNs HTTP/2 API (production)
      const apnsHost = 'https://api.push.apple.com'
      const res = await fetch(`${apnsHost}/3/device/${token}`, {
        method: 'POST',
        headers: {
          'authorization': `bearer ${apnsToken}`,
          'apns-topic': BUNDLE_ID,
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        sent = true
      } else {
        const errBody = await res.text()
        console.error(`APNs push failed for token ${token.slice(0, 10)}...:`, res.status, errBody)
        // Remove invalid tokens
        if (res.status === 410 || res.status === 400) {
          await supabase.from('device_tokens').delete().eq('token', token)
        }
      }
    }

    return sent
  } catch (err) {
    console.error('Push notification error:', err)
    return false
  }
}
