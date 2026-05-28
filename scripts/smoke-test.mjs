import { _electron as electron } from 'playwright-core'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '..')
const SHOT_DIR = path.join(APP_DIR, 'tmp', 'shots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe')

console.log('Launching Lectern…')
const app = await electron.launch({
  executablePath: electronBin,
  args: [APP_DIR],
  timeout: 30_000,
})

console.log('Waiting for window…')
await new Promise((r) => setTimeout(r, 4000))

const windows = app.windows()
console.log(`Windows open: ${windows.length}`)
for (const w of windows) console.log(' URL:', w.url())

const page = windows.find((w) => !w.url().startsWith('devtools://')) ?? await app.firstWindow()
await page.waitForSelector('#root', { timeout: 10_000 })

// Screenshot 1: Library (landing)
const shot1 = path.join(SHOT_DIR, '01-library.png')
await page.screenshot({ path: shot1 })
console.log('Screenshot:', shot1)

// Check page content
const bodyText = await page.evaluate(() => document.body.innerText)
const hasLectern = bodyText.includes('Lectern') || bodyText.includes('New Recording')
console.log('Has Lectern UI:', hasLectern)
console.log('Body excerpt:', bodyText.slice(0, 200).replace(/\n/g, ' '))

// Navigate to recorder page by clicking "New Recording"
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button, a')]
  const btn = btns.find((b) => b.textContent?.includes('New Recording'))
  btn?.click()
})
await new Promise((r) => setTimeout(r, 1500))

const shot2 = path.join(SHOT_DIR, '02-recorder.png')
await page.screenshot({ path: shot2 })
console.log('Screenshot:', shot2)

const recorderText = await page.evaluate(() => document.body.innerText)
console.log('Recorder page excerpt:', recorderText.slice(0, 300).replace(/\n/g, ' '))

await app.close()
console.log('\nSmoke test complete.')
