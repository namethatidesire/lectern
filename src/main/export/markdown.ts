import fs from 'fs'
import path from 'path'
import { getLecture, getSegments, getSnapshots, getNotes } from '../store/lectures'
import { snapshotPath } from '../store/paths'

function msToTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export async function exportMarkdown(lectureId: string, outputPath: string): Promise<void> {
  const lecture = getLecture(lectureId)
  if (!lecture) throw new Error(`Lecture ${lectureId} not found`)

  const segments = getSegments(lectureId)
  const snapshots = getSnapshots(lectureId)
  const notes = getNotes(lectureId)

  const outputDir = path.dirname(outputPath)
  const snapshotsOut = path.join(outputDir, 'snapshots')
  fs.mkdirSync(snapshotsOut, { recursive: true })

  const date = new Date(lecture.startedAt).toLocaleString()
  const duration = lecture.durationMs ? msToTimestamp(lecture.durationMs) : 'unknown'

  const lines: string[] = [
    `# ${lecture.title}`,
    ``,
    `*Recorded ${date} · Duration: ${duration}*`,
    ``
  ]

  const overallNote = notes.find((n) => n.snapshotTMs === null && n.kind === 'summary')
  if (overallNote) {
    lines.push(`## Summary`, ``, overallNote.body, ``)
  }

  lines.push(`---`, ``)

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]
    const nextTMs = snapshots[i + 1]?.tMs ?? (lecture.durationMs ?? Infinity)

    // Copy snapshot to output dir
    const srcPath = snapshotPath(lectureId, snap.tMs)
    const destFilename = snap.filename
    const destPath = path.join(snapshotsOut, destFilename)
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath)
    }

    lines.push(`## Slide ${i + 1} — ${msToTimestamp(snap.tMs)}`)
    lines.push(``)
    lines.push(`![Slide ${i + 1}](snapshots/${destFilename})`)
    lines.push(``)

    const slideNotes = notes.filter((n) => n.snapshotTMs === snap.tMs)
    const bullets = slideNotes.find((n) => n.kind === 'bullets')
    const keyterms = slideNotes.find((n) => n.kind === 'keyterms')

    if (bullets) {
      lines.push(`**Notes:**`, ``, bullets.body, ``)
    }
    if (keyterms) {
      lines.push(`**Key terms:** ${keyterms.body}`, ``)
    }

    const slideSegments = segments.filter(
      (s) => s.startMs >= snap.tMs && s.startMs < nextTMs
    )
    if (slideSegments.length > 0) {
      lines.push(`**Transcript:**`, ``)
      lines.push(`> ${slideSegments.map((s) => s.text).join(' ')}`, ``)
    }

    lines.push(`---`, ``)
  }

  fs.writeFileSync(outputPath, lines.join('\n'))
}
