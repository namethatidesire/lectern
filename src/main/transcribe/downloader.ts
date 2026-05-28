import https from 'https'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { app } from 'electron'

const WHISPER_REPO = 'ggerganov/whisper.cpp'

// Map model name to Hugging Face filename
const MODEL_FILES: Record<string, string> = {
  tiny: 'ggml-tiny.en.bin',
  base: 'ggml-base.en.bin',
  small: 'ggml-small.en.bin',
  medium: 'ggml-medium.en.bin'
}

export function whisperDir(): string {
  const dir = path.join(app.getPath('userData'), 'lectern', 'whisper')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function whisperBinPath(): string {
  return path.join(whisperDir(), 'whisper-main.exe')
}

export function modelPath(modelName: string): string {
  const file = MODEL_FILES[modelName] ?? MODEL_FILES.small
  return path.join(whisperDir(), file)
}

export function isBinReady(): boolean {
  return fs.existsSync(whisperBinPath())
}

export function isModelReady(modelName: string): boolean {
  return fs.existsSync(modelPath(modelName))
}

async function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'lectern-app' } }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try { resolve(JSON.parse(data) as T) }
        catch (e) { reject(e) }
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

function downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string): void => {
      https.get(u, { headers: { 'User-Agent': 'lectern-app' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location!)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`))
          return
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        const tmp = dest + '.tmp'
        const out = fs.createWriteStream(tmp)
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (total > 0 && onProgress) onProgress(Math.round((received / total) * 100))
        })
        res.pipe(out)
        out.on('finish', () => {
          fs.renameSync(tmp, dest)
          resolve()
        })
        out.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
}

export async function downloadBinary(onProgress?: (pct: number) => void): Promise<void> {
  // Fetch latest release from GitHub API
  const release = await fetchJson<{ assets: { name: string; browser_download_url: string }[] }>(
    `https://api.github.com/repos/${WHISPER_REPO}/releases/latest`
  )

  const asset = release.assets.find(
    (a) =>
      a.name.includes('blas') &&
      a.name.includes('x64') &&
      a.name.endsWith('.zip')
  )
  if (!asset) {
    throw new Error(
      'Could not find whisper.cpp Windows BLAS binary in latest release. ' +
      'Download manually from https://github.com/ggerganov/whisper.cpp/releases'
    )
  }

  const zipPath = path.join(whisperDir(), 'whisper-bin.zip')
  await downloadFile(asset.browser_download_url, zipPath, onProgress)

  const zip = new AdmZip(zipPath)
  const entry = zip.getEntries().find((e) => e.entryName.endsWith('main.exe'))
  if (!entry) throw new Error('main.exe not found in whisper zip')

  fs.writeFileSync(whisperBinPath(), entry.getData())
  fs.unlinkSync(zipPath)
}

export async function downloadModel(
  modelName: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const file = MODEL_FILES[modelName]
  if (!file) throw new Error(`Unknown model: ${modelName}`)
  const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${file}`
  await downloadFile(url, modelPath(modelName), onProgress)
}
