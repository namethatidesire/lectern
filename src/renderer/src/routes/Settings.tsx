import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import type { AppSettings } from '@shared/types'

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(setSettings)
  }, [])

  async function handleSave(): Promise<void> {
    if (!settings) return
    await window.api.setSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-xl">
        <Section title="AI Summarization">
          <Field label="Claude API Key">
            <input
              type="password"
              value={settings.claudeApiKey}
              onChange={(e) => setSettings({ ...settings, claudeApiKey: e.target.value })}
              placeholder="sk-ant-…"
              className="input"
            />
          </Field>
          <Field label="Ollama Endpoint">
            <input
              type="text"
              value={settings.ollamaEndpoint}
              onChange={(e) => setSettings({ ...settings, ollamaEndpoint: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Ollama Model">
            <input
              type="text"
              value={settings.ollamaModel}
              onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
              placeholder="llama3.1"
              className="input"
            />
          </Field>
        </Section>

        <Section title="Transcription">
          <Field label="Whisper Model">
            <select
              value={settings.whisperModel}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  whisperModel: e.target.value as AppSettings['whisperModel']
                })
              }
              className="input"
            >
              <option value="tiny">Tiny (~75MB, fastest)</option>
              <option value="base">Base (~142MB)</option>
              <option value="small">Small (~466MB, recommended)</option>
              <option value="medium">Medium (~1.5GB, best accuracy)</option>
            </select>
          </Field>
        </Section>

        <Section title="Defaults">
          <Field label="Snapshot Interval (seconds)">
            <input
              type="number"
              value={settings.intervalMs / 1000}
              onChange={(e) =>
                setSettings({ ...settings, intervalMs: Number(e.target.value) * 1000 })
              }
              min={5}
              className="input w-24"
            />
          </Field>
          <Field label="Auto-detect threshold">
            <input
              type="number"
              value={settings.autoDetectThreshold}
              onChange={(e) =>
                setSettings({ ...settings, autoDetectThreshold: Number(e.target.value) })
              }
              min={1}
              max={64}
              className="input w-24"
            />
            <span className="text-xs text-gray-500 ml-2">Hamming distance (lower = more sensitive)</span>
          </Field>
        </Section>
      </div>

      <div className="px-6 py-4 border-t border-gray-800">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-300 mb-3 pb-1 border-b border-gray-800">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
