import { ipcMain, BrowserWindow, shell, dialog } from 'electron'
import { z } from 'zod'
import { IPC } from '@shared/ipc-contract'
import { getScreenSources } from './capture/screen'
import {
  startSession,
  stopSession,
  receiveAudioChunk,
  captureSnapshot,
  saveSnapshotFrame,
  getActiveSession
} from './capture/recorder'
import {
  listLectures,
  getLecture,
  deleteLecture,
  getSegments,
  getSnapshots,
  getNotes,
  getSettings,
  setSettings,
  getLectureFolderPath
} from './store/lectures'
import { exportMarkdown } from './export/markdown'
import { generateWithClaude } from './summarize/claude'
import { generateWithOllama } from './summarize/ollama'
import { snapshotPath } from './store/paths'
import fs from 'fs'

const RecordingConfigSchema = z.object({
  title: z.string().min(1),
  audioSource: z.enum(['mic', 'loopback', 'mixed']),
  snapshotMode: z.enum(['auto', 'interval', 'manual', 'all']),
  intervalMs: z.number().positive().default(30000),
  sourceId: z.string().nullable()
})

export function registerIpcHandlers(win: BrowserWindow): void {
  ipcMain.handle(IPC.GET_SCREEN_SOURCES, async () => {
    return getScreenSources()
  })

  ipcMain.handle(IPC.GET_AUDIO_DEVICES, async () => {
    // Renderer handles getUserMedia device enumeration; this is a no-op stub
    // that returns an empty array — renderer queries navigator.mediaDevices directly
    return []
  })

  ipcMain.handle(IPC.START_RECORDING, async (_e, raw) => {
    const config = RecordingConfigSchema.parse(raw)
    const session = startSession(win, config)
    return { lectureId: session.lectureId, startedAt: session.startedAt }
  })

  ipcMain.handle(IPC.STOP_RECORDING, async (_e, { lectureId }) => {
    if (getActiveSession()?.lectureId !== lectureId) return
    stopSession(win)
  })

  ipcMain.handle(IPC.TAKE_SNAPSHOT, async (_e, { lectureId }) => {
    const session = getActiveSession()
    if (session?.lectureId !== lectureId) return
    captureSnapshot(win, lectureId, 'manual')
  })

  // Renderer sends back PNG data after snapshot:request-frame
  ipcMain.on(
    'snapshot:frame-data',
    (_e, { lectureId, tMs, trigger, pngBase64 }: {
      lectureId: string
      tMs: number
      trigger: 'auto' | 'interval' | 'manual'
      pngBase64: string
    }) => {
      saveSnapshotFrame(win, lectureId, tMs, trigger, pngBase64)
    }
  )

  // Renderer streams PCM chunks from mic capture
  ipcMain.on('audio:chunk', (_e, { buffer }: { buffer: Buffer }) => {
    receiveAudioChunk(buffer)
  })

  ipcMain.on('audio:level', (_e, { rms }: { rms: number }) => {
    win.webContents.send(IPC.AUDIO_LEVEL, { rms })
  })

  ipcMain.handle(IPC.LIST_LECTURES, async () => listLectures())

  ipcMain.handle(IPC.GET_LECTURE, async (_e, { lectureId }) => getLecture(lectureId))

  ipcMain.handle(IPC.DELETE_LECTURE, async (_e, { lectureId }) => deleteLecture(lectureId))

  ipcMain.handle(IPC.GET_SEGMENTS, async (_e, { lectureId }) => getSegments(lectureId))

  ipcMain.handle(IPC.GET_SNAPSHOTS, async (_e, { lectureId }) => getSnapshots(lectureId))

  ipcMain.handle(IPC.GET_NOTES, async (_e, { lectureId }) => getNotes(lectureId))

  ipcMain.handle(IPC.GET_SNAPSHOT_IMAGE, async (_e, { lectureId, tMs }) => {
    const p = snapshotPath(lectureId, tMs)
    if (!fs.existsSync(p)) return null
    const data = fs.readFileSync(p)
    return `data:image/png;base64,${data.toString('base64')}`
  })

  ipcMain.handle(IPC.EXPORT_MARKDOWN, async (_e, { lectureId, outputPath }) => {
    await exportMarkdown(lectureId, outputPath)
  })

  ipcMain.handle(IPC.GET_SETTINGS, async () => getSettings())

  ipcMain.handle(IPC.SET_SETTINGS, async (_e, partial) => setSettings(partial))

  ipcMain.handle(IPC.OPEN_LECTURE_FOLDER, async (_e, { lectureId }) => {
    const folderPath = getLectureFolderPath(lectureId)
    shell.openPath(folderPath)
  })

  ipcMain.handle(
    IPC.SHOW_SAVE_DIALOG,
    async (_e, options: Electron.SaveDialogOptions) => {
      const result = await dialog.showSaveDialog(win, options)
      return result.canceled ? null : result.filePath
    }
  )

  ipcMain.handle(IPC.GENERATE_NOTES, async (_e, { lectureId, model, ollamaModel }) => {
    const settings = getSettings()
    if (model === 'claude') {
      if (!settings.claudeApiKey) throw new Error('Claude API key not set in Settings.')
      await generateWithClaude(lectureId, settings.claudeApiKey)
    } else {
      await generateWithOllama(
        lectureId,
        settings.ollamaEndpoint,
        ollamaModel ?? settings.ollamaModel
      )
    }
  })
}
