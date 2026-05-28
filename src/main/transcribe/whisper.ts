import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import type { TranscriptSegment } from '@shared/types'
import { whisperBinPath, modelPath } from './downloader'

// Write a minimal 16kHz mono PCM WAV suitable for whisper
function writeTempWav(pcm: Int16Array): string {
  const tmpPath = path.join(os.tmpdir(), `lectern-chunk-${Date.now()}.wav`)
  const numSamples = pcm.length
  const sampleRate = 16000
  const byteRate = sampleRate * 2
  const dataSize = numSamples * 2
  const buf = Buffer.allocUnsafe(44 + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)       // PCM
  buf.writeUInt16LE(1, 22)       // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(2, 32)       // block align
  buf.writeUInt16LE(16, 34)      // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    buf.writeInt16LE(pcm[i], 44 + i * 2)
  }
  fs.writeFileSync(tmpPath, buf)
  return tmpPath
}

// Parse whisper.cpp stdout lines like:
//   [00:00:00.000 --> 00:00:05.120]  Hello world.
const SEGMENT_RE = /\[(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\]\s+(.*)/

function parseTime(t: string): number {
  const [h, m, rest] = t.split(':')
  const [s, ms] = rest.split('.')
  return (
    parseInt(h) * 3600000 +
    parseInt(m) * 60000 +
    parseInt(s) * 1000 +
    parseInt(ms)
  )
}

export function transcribeChunk(
  pcm: Int16Array,
  chunkOffsetMs: number,
  lectureId: string,
  modelName: string
): TranscriptSegment[] {
  const bin = whisperBinPath()
  const model = modelPath(modelName)

  if (!fs.existsSync(bin) || !fs.existsSync(model)) return []

  const tmpWav = writeTempWav(pcm)
  try {
    const result = spawnSync(
      bin,
      [
        '-m', model,
        '-f', tmpWav,
        '--no-timestamps', 'false',
        '-t', '4',           // threads
        '--language', 'en',
        '--print-progress', 'false',
      ],
      { encoding: 'utf8', timeout: 120_000 }
    )

    if (result.error) throw result.error

    const segments: TranscriptSegment[] = []
    const lines = (result.stdout ?? '').split('\n')
    for (const line of lines) {
      const m = SEGMENT_RE.exec(line.trim())
      if (!m) continue
      const [, startStr, endStr, text] = m
      const trimmed = text.trim()
      if (!trimmed) continue
      segments.push({
        lectureId,
        startMs: chunkOffsetMs + parseTime(startStr),
        endMs: chunkOffsetMs + parseTime(endStr),
        text: trimmed
      })
    }
    return segments
  } finally {
    try { fs.unlinkSync(tmpWav) } catch { /* ignore */ }
  }
}
