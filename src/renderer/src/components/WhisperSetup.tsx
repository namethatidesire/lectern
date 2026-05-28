import { useEffect, useState } from 'react'
import { Download, CheckCircle, Loader } from 'lucide-react'
import type { WhisperStatus } from '@shared/types'

interface Props {
  onReady?: () => void
}

export default function WhisperSetup({ onReady }: Props): JSX.Element | null {
  const [status, setStatus] = useState<WhisperStatus | null>(null)
  const [downloading, setDownloading] = useState<'bin' | 'model' | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    refresh()
    const unsub = window.api.onWhisperDownloadProgress(({ what, pct }) => {
      if (downloading === what) setProgress(pct)
    })
    return (): void => { unsub() }
  }, [])

  useEffect(() => {
    if (status?.binReady && status.modelReady) onReady?.()
  }, [status])

  async function refresh(): Promise<void> {
    const s = await window.api.getWhisperStatus()
    setStatus(s)
  }

  async function handleDownload(what: 'bin' | 'model'): Promise<void> {
    setDownloading(what)
    setProgress(0)
    setError(null)
    try {
      await window.api.downloadWhisper(what)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDownloading(null)
    }
  }

  if (!status) return null
  if (status.binReady && status.modelReady) return null

  return (
    <div className="bg-yellow-950/40 border border-yellow-700/40 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-yellow-200">Whisper setup required</h3>
      <p className="text-xs text-yellow-300/70">
        Transcription needs the whisper.cpp binary and a model file. Downloads happen once and
        are stored locally.
      </p>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 rounded p-2">{error}</p>
      )}

      <div className="space-y-2">
        <SetupRow
          label="whisper.cpp binary"
          ready={status.binReady}
          downloading={downloading === 'bin'}
          progress={progress}
          onDownload={() => handleDownload('bin')}
        />
        <SetupRow
          label={`Model: ggml-${status.modelName}.en (~${MODEL_SIZES[status.modelName] ?? '?'}MB)`}
          ready={status.modelReady}
          downloading={downloading === 'model'}
          progress={progress}
          onDownload={() => handleDownload('model')}
          disabled={!status.binReady}
        />
      </div>
    </div>
  )
}

const MODEL_SIZES: Record<string, number> = {
  tiny: 75,
  base: 142,
  small: 466,
  medium: 1500
}

function SetupRow({
  label,
  ready,
  downloading,
  progress,
  onDownload,
  disabled
}: {
  label: string
  ready: boolean
  downloading: boolean
  progress: number
  onDownload: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {ready ? (
        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
      ) : downloading ? (
        <Loader className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0" />
      )}
      <span className={`text-xs flex-1 ${ready ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
        {label}
      </span>
      {!ready && (
        downloading ? (
          <div className="flex items-center gap-2 text-xs text-indigo-300 min-w-[80px]">
            <div className="flex-1 bg-gray-700 rounded-full h-1">
              <div
                className="bg-indigo-500 h-1 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress}%
          </div>
        ) : (
          <button
            onClick={onDownload}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-xs disabled:opacity-40 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        )
      )}
    </div>
  )
}
