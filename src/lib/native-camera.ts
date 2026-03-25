// Native camera utility - uses Capacitor Camera on native, falls back to file input on web

export interface PhotoResult {
  dataUrl: string
  blob: Blob
}

export async function takePhoto(): Promise<PhotoResult | null> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // Let user choose camera or gallery
        width: 1024,
        height: 1024,
      })
      if (image.dataUrl) {
        const res = await fetch(image.dataUrl)
        const blob = await res.blob()
        return { dataUrl: image.dataUrl, blob }
      }
    }
  } catch (e: unknown) {
    // User cancelled or camera not available
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('cancel') || msg.includes('Cancel')) return null
    console.warn('Native camera failed, falling back to file input:', msg)
  }
  return null
}

export async function pickPhoto(): Promise<PhotoResult | null> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 1920,
        height: 1920,
      })
      if (image.dataUrl) {
        const res = await fetch(image.dataUrl)
        const blob = await res.blob()
        return { dataUrl: image.dataUrl, blob }
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('cancel') || msg.includes('Cancel')) return null
    console.warn('Native photo picker failed:', msg)
  }
  return null
}

export async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
