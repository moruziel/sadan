import { useEffect } from 'react'

// Keeps the phone screen awake for as long as this app is the foreground tab —
// not just during a voice call. Two layers:
//  1) navigator.wakeLock — the real API (Chrome Android, Safari iOS 16.4+).
//  2) Fallback for browsers without it (older iOS Safari, some WebViews):
//     a muted "video" fed by a 1x1 canvas stream. This is the same technique
//     NoSleep.js uses today — a real <video> element playing counts as active
//     media to the OS, which prevents auto-dim/lock, with no external asset needed.
export default function useKeepAwake() {
  useEffect(() => {
    let wakeLock = null
    let fallbackVideo = null

    async function acquireWakeLock() {
      if (!('wakeLock' in navigator)) return false
      try {
        wakeLock = await navigator.wakeLock.request('screen')
        return true
      } catch (_) {
        return false
      }
    }

    function startFallback() {
      if (fallbackVideo) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        canvas.getContext('2d').fillRect(0, 0, 1, 1)
        const stream = canvas.captureStream(1)

        const video = document.createElement('video')
        video.srcObject = stream
        video.muted = true
        video.playsInline = true
        video.setAttribute('playsinline', '')
        video.setAttribute('aria-hidden', 'true')
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;left:0;'
        document.body.appendChild(video)
        video.play().catch(() => {})
        fallbackVideo = video
      } catch (_) { /* canvas.captureStream unsupported — nothing more we can do */ }
    }

    function stopFallback() {
      if (!fallbackVideo) return
      fallbackVideo.pause()
      fallbackVideo.srcObject?.getTracks().forEach(t => t.stop())
      fallbackVideo.remove()
      fallbackVideo = null
    }

    async function engage() {
      const ok = await acquireWakeLock()
      if (!ok) startFallback()
    }

    engage()

    // Wake locks (and the fallback video, on some browsers) are released when the
    // tab is hidden — re-engage whenever the app comes back to the foreground.
    function onVisibility() {
      if (document.visibilityState === 'visible') engage()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      wakeLock?.release().catch(() => {})
      stopFallback()
    }
  }, [])
}
