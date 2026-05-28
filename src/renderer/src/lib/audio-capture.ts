import type { AudioSource } from '@shared/types'

const SAMPLE_RATE = 16000
const BUFFER_SIZE = 4096

export class AudioCapture {
  private audioCtx: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private streams: MediaStream[] = []

  async start(source: AudioSource, screenSourceId: string | null): Promise<void> {
    this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
    const ctx = this.audioCtx

    let mixNode: AudioNode

    if (source === 'mic') {
      const stream = await getMicStream()
      this.streams.push(stream)
      mixNode = ctx.createMediaStreamSource(stream)
    } else if (source === 'loopback') {
      if (!screenSourceId) throw new Error('Screen source required for system audio capture')
      const stream = await getLoopbackStream(screenSourceId)
      this.streams.push(stream)
      mixNode = ctx.createMediaStreamSource(stream)
    } else {
      // mixed: mic + loopback summed through a gain node
      const [micStream, loopStream] = await Promise.all([
        getMicStream(),
        screenSourceId ? getLoopbackStream(screenSourceId) : Promise.resolve(null)
      ])
      this.streams.push(micStream)
      if (loopStream) this.streams.push(loopStream)

      const gain = ctx.createGain()
      gain.gain.value = 0.7 // headroom to avoid clipping when summing

      ctx.createMediaStreamSource(micStream).connect(gain)
      if (loopStream) ctx.createMediaStreamSource(loopStream).connect(gain)

      mixNode = gain
    }

    this.processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const int16 = floatToInt16(input)
      window.api.sendAudioChunk(int16)

      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      window.api.sendAudioLevel(Math.sqrt(sum / input.length))
    }

    mixNode.connect(this.processor)
    this.processor.connect(ctx.destination)
  }

  stop(): void {
    this.processor?.disconnect()
    this.processor = null
    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
    for (const s of this.streams) {
      for (const t of s.getTracks()) t.stop()
    }
    this.streams = []
  }
}

async function getMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: SAMPLE_RATE, channelCount: 1 } as MediaTrackConstraints,
    video: false
  })
}

// Capture system audio via the WASAPI loopback track exposed by Electron's
// desktopCapturer. We request video too (required by the constraint) but only
// use the audio tracks; the video track is stopped immediately.
async function getLoopbackStream(screenSourceId: string): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: screenSourceId
      }
    } as MediaTrackConstraints,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: screenSourceId,
        maxWidth: 1,
        maxHeight: 1,
        maxFrameRate: 1
      }
    } as MediaTrackConstraints
  })
  // Drop the video track — we only wanted the audio
  for (const t of stream.getVideoTracks()) t.stop()
  return new MediaStream(stream.getAudioTracks())
}

function floatToInt16(input: Float32Array): Buffer {
  const buf = Buffer.allocUnsafe(input.length * 2)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    buf.writeInt16LE(Math.round(s * 32767), i * 2)
  }
  return buf
}
