// Native share utility - uses iOS share sheet on native, clipboard on web

export async function sharePost(opts: {
  title: string
  text: string
  url?: string
}): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: 'Share this post',
      })
      return true
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('cancel') || msg.includes('Cancel')) return false
    console.warn('Native share failed:', msg)
  }

  // Web fallback: try Web Share API, then clipboard
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      })
      return true
    } catch {
      // User cancelled
    }
  }

  // Final fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    const shareText = opts.url ? `${opts.text} ${opts.url}` : opts.text
    await navigator.clipboard.writeText(shareText)
    return true
  }

  return false
}

export async function shareRound(opts: {
  courseName: string
  score: number
  par?: number
}): Promise<boolean> {
  const diff = opts.par ? opts.score - opts.par : null
  const scoreText = diff !== null
    ? diff === 0 ? 'even par' : diff < 0 ? `${Math.abs(diff)} under par` : `${diff} over par`
    : `${opts.score}`

  return sharePost({
    title: `Round at ${opts.courseName}`,
    text: `Just shot ${opts.score} (${scoreText}) at ${opts.courseName} on Sleft Golf!`,
    url: 'https://sleftgolf.vercel.app',
  })
}
