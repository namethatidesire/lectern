import fs from 'fs'
import { audioPath } from '../store/paths'

const SAMPLE_RATE = 16000
const CHANNELS = 1
const BIT_DEPTH = 16

export class WavWriter {
  private fd: number | null = null
  private sampleCount = 0

  open(lectureId: string): void {
    this.sampleCount = 0
    const p = audioPath(lectureId)
    this.fd = fs.openSync(p, 'w')
    // Write placeholder header
    const header = Buffer.alloc(44)
    fs.writeSync(this.fd, header, 0, 44, 0)
  }

  write(int16Buffer: Buffer): void {
    if (!this.fd) return
    fs.writeSync(this.fd, int16Buffer)
    this.sampleCount += int16Buffer.length / 2
  }

  close(): void {
    if (!this.fd) return
    this.finalizeHeader()
    fs.closeSync(this.fd)
    this.fd = null
  }

  private finalizeHeader(): void {
    if (!this.fd) return
    const dataSize = this.sampleCount * CHANNELS * (BIT_DEPTH / 8)
    const header = Buffer.alloc(44)
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + dataSize, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)
    header.writeUInt16LE(CHANNELS, 22)
    header.writeUInt32LE(SAMPLE_RATE, 24)
    header.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8), 28)
    header.writeUInt16LE(CHANNELS * (BIT_DEPTH / 8), 32)
    header.writeUInt16LE(BIT_DEPTH, 34)
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)
    fs.writeSync(this.fd, header, 0, 44, 0)
  }
}
