import { ScreenCapture, hammingDistance } from './screen-capture'

let _active: ScreenCapture | null = null
let _autoTimer: ReturnType<typeof setInterval> | null = null
let _lastHash: string | null = null

export function setActiveCapture(sc: ScreenCapture | null): void {
  _active = sc
  if (!sc) stopAutoDetect()
}

export function getActiveCapture(): ScreenCapture | null {
  return _active
}

export function startAutoDetect(
  threshold: number,
  pollMs: number,
  onSlideChange: (pngBase64: string, dhash: string) => void
): void {
  stopAutoDetect()
  _lastHash = null

  _autoTimer = setInterval(async () => {
    if (!_active) return
    const result = await _active.captureFrameWithHash()
    if (!result) return

    const { pngBase64, dhash } = result

    if (_lastHash === null) {
      // First frame — always capture
      _lastHash = dhash
      onSlideChange(pngBase64, dhash)
      return
    }

    const dist = hammingDistance(_lastHash, dhash)
    if (dist > threshold) {
      _lastHash = dhash
      onSlideChange(pngBase64, dhash)
    }
  }, pollMs)
}

export function stopAutoDetect(): void {
  if (_autoTimer) {
    clearInterval(_autoTimer)
    _autoTimer = null
  }
  _lastHash = null
}
