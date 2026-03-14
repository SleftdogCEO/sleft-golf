'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const supabaseRef = useRef(createClient())
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrCreateProfile = useCallback(async (authUser: User) => {
    const supabase = supabaseRef.current

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
    const { data: retryData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    if (retryData) setProfile(retryData)
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    let mounted = true

    // Explicitly read session from localStorage on mount
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        const authUser = session?.user ?? null
        setUser(authUser)

        if (authUser) {
          await fetchOrCreateProfile(authUser)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // Skip INITIAL_SESSION since init() handles it
        if (event === 'INITIAL_SESSION') return

        const authUser = session?.user ?? null
        setUser(authUser)
        if (authUser) {
          await fetchOrCreateProfile(authUser)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchOrCreateProfile])

  return { user, profile, loading, userId: user?.id ?? null }
}
