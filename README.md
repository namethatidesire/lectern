# Lectern

A desktop app for taking notes during lectures. Records your screen and audio, transcribes speech locally using Whisper, captures slide snapshots, and generates structured notes with AI.

## Features

- **Audio capture** — microphone or system audio (loopback)
- **Screen capture** — pick any monitor or window as the source
- **Snapshots** — manual hotkey (`Ctrl+Shift+S`), fixed interval, or automatic slide-change detection
- **Local transcription** — runs Whisper entirely on your machine, no data sent anywhere
- **AI notes** — per-slide bullet points and key terms via Claude API or a local Ollama model
- **Markdown export** — full lecture notes with embedded slide images

## Requirements

- Windows 10/11 x64
- Node.js 20+ and pnpm
- MSVC build tools (for native SQLite module) — Visual Studio with "Desktop development with C++" workload
- Python 3.x (for node-gyp)

## Setup

```bash
npm install -g node-gyp   # once, globally
pnpm install              # installs deps and rebuilds native modules for Electron
pnpm build                # compile to out/
```

On first launch the app downloads:
- `whisper.cpp` Windows binary (~8 MB) into `resources/whisper-models/`
- The selected Whisper model (default: `ggml-small.en`, ~466 MB) into the same directory

## Development

```bash
pnpm dev          # hot-reloading dev mode
pnpm build        # production build to out/
pnpm typecheck    # TypeScript check (no emit)
```

### Smoke test / UI verification

```bash
node scripts/smoke-test.mjs   # launches built app, takes screenshots to tmp/shots/
node scripts/drive.mjs        # interactive Playwright REPL for manual UI driving
```

## Architecture

```
Renderer (React + Zustand)
  ├── Library    — past lectures
  ├── Recorder   — start/stop, source picker
  ├── Lecture    — timeline, transcript, notes
  └── Settings   — API keys, model selection

Main process (Node)
  ├── capture/   — WAV writer, screen source lister
  ├── transcribe/— Whisper subprocess wrapper, 30s chunker
  ├── snapshot/  — interval + hotkey triggers
  ├── summarize/ — Claude API (beta prompt caching) + Ollama
  ├── store/     — better-sqlite3 (lectures, segments, snapshots, notes)
  └── export/    — Markdown renderer

IPC bridge (contextBridge / zod-validated)
```

Audio capture runs in the renderer via Web Audio API; PCM is streamed to the main process where it is written as a WAV file and fed to the Whisper chunker in parallel.

## Data storage

All lecture data lives under the Electron `userData` path:

```
%APPDATA%\Roaming\Electron\lectern\
├── lectern.db          — SQLite (metadata, transcripts, notes)
└── lectures\
    └── <ULID>\
        ├── audio.wav
        ├── snapshots\*.png
        └── export.md   (written on export)
```

## Build phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Skeleton + capture | ✅ Done | Electron scaffold, SQLite store, mic audio → WAV, screen capture, snapshot hotkey, Recorder UI, Library UI |
| 2 — Transcription + timeline | ✅ Done | Whisper subprocess (pre-built binary, first-run download), 30s live chunker, timeline view, audio playback with click-to-seek |
| 3 — Snapshot intelligence + loopback | ✅ Done | WASAPI system audio loopback via Electron desktopCapturer, mic+loopback Web Audio mixer, dHash auto slide-change detection (1s poll, Hamming distance threshold), phash deduplication discards duplicate slides |
| 4 — Summarization + export | ⬜ Pending | Claude/Ollama note generation, Markdown export, FTS search |
