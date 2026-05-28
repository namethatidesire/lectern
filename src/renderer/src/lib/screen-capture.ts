import { hammingDistance } from '@shared/hash'

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

  async captureFrameWithHash(): Promise<{ pngBase64: string; dhash: string } | null> {
    if (!this.ctx || !this.videoEl || !this.canvas) return null
    this.ctx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height)
    const dhash = computeDHash(this.ctx, this.canvas.width, this.canvas.height)
    const blob = await this.canvas.convertToBlob({ type: 'image/png' })
    const pngBase64 = await blobToBase64(blob)
    return { pngBase64, dhash }
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

// dHash: resize to 9×8, grayscale, compare adjacent pixels per row → 64-bit hex
function computeDHash(
  ctx: OffscreenCanvasRenderingContext2D,
  _w: number,
  _h: number
): string {
  const small = new OffscreenCanvas(9, 8)
  const sc = small.getContext('2d') as OffscreenCanvasRenderingContext2D
  sc.drawImage(ctx.canvas, 0, 0, 9, 8)
  const { data } = sc.getImageData(0, 0, 9, 8)

  // Grayscale luma of each pixel
  const gray: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    gray.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]))
  }

  // 8 rows × 8 column comparisons = 64 bits
  let bits = ''
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      bits += gray[row * 9 + col] < gray[row * 9 + col + 1] ? '1' : '0'
    }
  }

  // Pack 4 bits → 1 hex char
  let hex = ''
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  }
  return hex
}

export { hammingDistance }

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve((reader.result as string).split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
