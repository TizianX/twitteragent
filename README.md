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

## User flow
1. Launch app.
2. Paste Gemini API key in AI Settings and click Save Key.
3. Upload `voice_profile.md` and `voice_samples_raw.md` in Voice Manager.
4. Click **Launch Chrome with Extension** and open X.
5. Click **Start Agent**.

## Build command
```bash
npm run build
```
