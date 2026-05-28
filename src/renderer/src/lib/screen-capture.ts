export class ScreenCapture {
  private stream: MediaStream | null = null
  private videoEl: HTMLVideoElement | null = null
  private canvas: OffscreenCanvas | null = null
  private ctx: OffscreenCanvasRenderingContext2D | null = null

  async start(sourceId: string): Promise<void> {
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 5
        }
      }
    } as MediaStreamConstraints

    this.stream = await navigator.mediaDevices.getUserMedia(constraints)

    this.videoEl = document.createElement('video')
    this.videoEl.srcObject = this.stream
    this.videoEl.muted = true
    await this.videoEl.play()

    // Size canvas to video dimensions (capped at 1280x720 for storage efficiency)
    const w = Math.min(this.videoEl.videoWidth || 1280, 1280)
    const h = Math.min(this.videoEl.videoHeight || 720, 720)
    this.canvas = new OffscreenCanvas(w, h)
    this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
  }

  async captureFrame(): Promise<string | null> {
    if (!this.ctx || !this.videoEl || !this.canvas) return null
    this.ctx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height)
    const blob = await this.canvas.convertToBlob({ type: 'image/png' })
    return blobToBase64(blob)
  }

  stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
    this.videoEl = null
    this.canvas = null
    this.ctx = null
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
