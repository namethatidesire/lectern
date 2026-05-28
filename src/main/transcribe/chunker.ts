import { EventEmitter } from 'events'
import { transcribeChunk } from './whisper'

const SAMPLE_RATE = 16000
const CHUNK_SECONDS = 30
const OVERLAP_SECONDS = 2
const CHUNK_SAMPLES = SAMPLE_RATE * CHUNK_SECONDS
const OVERLAP_SAMPLES = SAMPLE_RATE * OVERLAP_SECONDS

export class Chunker extends EventEmitter {
  private samples: Int16Array = new Int16Array(0)
  private sessionOffsetMs = 0   // ms from start-of-recording to start of current buffer
  private sampleCount = 0       // total samples received since start
  private lectureId = ''
  private modelName = ''
  private running = false

  start(lectureId: string, modelName: string): void {
    this.lectureId = lectureId
    this.modelName = modelName
    this.samples = new Int16Array(0)
    this.sessionOffsetMs = 0
    this.sampleCount = 0
    this.running = true
  }

  stop(): void {
    this.running = false
    // Flush remainder (at least 1s) so the last words aren't lost
    if (this.samples.length >= SAMPLE_RATE) {
      this.flush(this.samples)
    }
    this.samples = new Int16Array(0)
  }

  push(int16Buffer: Buffer): void {
    if (!this.running) return

    const incoming = new Int16Array(
      int16Buffer.buffer,
      int16Buffer.byteOffset,
      int16Buffer.length / 2
    )

    const combined = new Int16Array(this.samples.length + incoming.length)
    combined.set(this.samples)
    combined.set(incoming, this.samples.length)
    this.samples = combined
    this.sampleCount += incoming.length

    if (this.samples.length >= CHUNK_SAMPLES) {
      const chunk = this.samples.slice(0, CHUNK_SAMPLES)
      this.flush(chunk)
      // Keep the last OVERLAP_SECONDS as the lead-in for the next chunk
      this.samples = this.samples.slice(CHUNK_SAMPLES - OVERLAP_SAMPLES)
      this.sessionOffsetMs =
        Math.floor(((this.sampleCount - this.samples.length) / SAMPLE_RATE) * 1000)
    }
  }

  private flush(pcm: Int16Array): void {
    const offsetMs = this.sessionOffsetMs
    const lectureId = this.lectureId
    const modelName = this.modelName

    // Run synchronously on a worker would be ideal; for now run inline.
    // transcribeChunk is CPU-bound (~5–30s for 30s audio on CPU).
    setImmediate(() => {
      const segments = transcribeChunk(pcm, offsetMs, lectureId, modelName)
      for (const seg of segments) {
        this.emit('segment', seg)
      }
    })
  }
}

export const chunker = new Chunker()
