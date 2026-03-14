'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGuestId, getGuestName, createOrGetGuest } from '@/lib/guest'
import type { Profile } from '@/lib/types'

export function useGuest() {
  const supabase = createClient()
  const [guestId, setGuestId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNamePrompt, setShowNamePrompt] = useState(false)

  useEffect(() => {
    const id = getGuestId()
    if (id) {
      setGuestId(id)
      // Fetch profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }: { data: Profile | null }) => {
          if (data) {
            setProfile(data)
          } else {
            // Profile was deleted or doesn't exist, prompt again
            setShowNamePrompt(true)
          }
          setLoading(false)
        })
    } else {
      setShowNamePrompt(true)
      setLoading(false)
    }
  }, [supabase])

  const setName = useCallback(async (name: string) => {
    const id = await createOrGetGuest(name)
    setGuestId(id)
    setShowNamePrompt(false)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (data) setProfile(data)
  }, [supabase])

  return { guestId, profile, loading, showNamePrompt, setName }
}
