const SAMPLE_RATE = 16000

export class AudioCapture {
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null

  async start(deviceId: string | null): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId
        ? ({ deviceId: { exact: deviceId }, sampleRate: SAMPLE_RATE, channelCount: 1 } as MediaTrackConstraints)
        : ({ sampleRate: SAMPLE_RATE, channelCount: 1 } as MediaTrackConstraints),
      video: false
    }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints)
    this.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
    const source = this.audioCtx.createMediaStreamSource(this.stream)

    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const int16 = floatToInt16(input)
      window.api.sendAudioChunk(int16)

      // RMS level
      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      const rms = Math.sqrt(sum / input.length)
      window.api.sendAudioLevel(rms)
    }

    source.connect(this.processor)
    this.processor.connect(this.audioCtx.destination)
  }

  stop(): void {
    this.processor?.disconnect()
    this.processor = null
    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
  }
}

function floatToInt16(input: Float32Array): Buffer {
  const buf = Buffer.allocUnsafe(input.length * 2)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    buf.writeInt16LE(Math.round(s * 32767), i * 2)
  }
  return buf
}
