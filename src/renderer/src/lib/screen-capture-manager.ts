import { ScreenCapture } from './screen-capture'

let _active: ScreenCapture | null = null

export function setActiveCapture(sc: ScreenCapture | null): void {
  _active = sc
}

export function getActiveCapture(): ScreenCapture | null {
  return _active
}
