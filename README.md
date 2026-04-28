# X Reply Autopilot

## One-click local run

### macOS/Linux
```bash
./scripts/install-and-run.sh
```

### Windows
```powershell
./scripts/install-and-run.ps1
```

This command installs dependencies (first run), builds the desktop app, and starts it.

## Dev mode
```bash
npm run dev
```

## Installer packages
```bash
npm run package
```
Generated installers appear in `release/`.

## In-app setup checklist
1. Save Gemini API key.
2. Upload `voice_profile.md` and `voice_samples_raw.md`.
3. Click **Launch Chrome with Extension** (it opens an isolated Chrome profile with extension preloaded).
4. Log into X in that opened Chrome window.
5. Click **Start Agent**.
6. Verify `extension: connected` in dashboard.
7. Optional: use **Test Reply Sandbox** to confirm prompt/voice behavior before live posting.

## Build command
```bash
npm run build
```
