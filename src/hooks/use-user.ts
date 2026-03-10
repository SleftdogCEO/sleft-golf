'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const supabaseRef = useRef(createClient())
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = supabaseRef.current

    async function fetchOrCreateProfile(authUser: User) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (data) {
        setProfile(data)
        return
      }

      // Profile doesn't exist — create one
      const baseUsername = authUser.email?.split('@')[0] || 'golfer'
      const uniqueUsername = `${baseUsername}_${Date.now().toString(36)}`
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || 'Golfer',
          username: uniqueUsername,
        }, { onConflict: 'id' })
        .select()
        .single()

      if (created) {
        setProfile(created)
        return
      }

      console.error('Profile creation failed:', createError)
      // Last resort: trigger may have created it
      const { data: retryData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      if (retryData) setProfile(retryData)
    }

    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)
      if (authUser) await fetchOrCreateProfile(authUser)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null
      setUser(authUser)
      if (authUser) {
        await fetchOrCreateProfile(authUser)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, profile, loading, userId: user?.id ?? null }
}
