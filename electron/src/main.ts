import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { AgentRuntime } from './runtime';

let mainWindow: BrowserWindow | null = null;
let runtime: AgentRuntime;

const isDev = process.env.NODE_ENV === 'development';

function getExtensionPath() {
  return isDev
    ? path.join(process.cwd(), 'extension')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'extension');
}

function getChromeBinary(): string | null {
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'win32') {
    const candidates = [
      process.env['PROGRAMFILES'] ? path.join(process.env['PROGRAMFILES'], 'Google/Chrome/Application/chrome.exe') : '',
      process.env['PROGRAMFILES(X86)'] ? path.join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe') : '',
      process.env['LOCALAPPDATA'] ? path.join(process.env['LOCALAPPDATA'], 'Google/Chrome/Application/chrome.exe') : '',
    ].filter(Boolean);
    return candidates.find((p) => fs.existsSync(p)) ?? null;
  }
  const linuxCandidates = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
  return linuxCandidates.find((p) => fs.existsSync(p)) ?? null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    backgroundColor: '#060812',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  runtime = new AgentRuntime(app.getPath('userData'));
  runtime.onState((state) => {
    mainWindow?.webContents.send('agent-state', state);
  });
  createWindow();

  ipcMain.handle('state:get', async () => runtime.snapshot());
  ipcMain.handle('settings:automation', async (_e, data) => runtime.updateAutomation(data));
  ipcMain.handle('settings:ai', async (_e, data) => runtime.updateAi(data));
  ipcMain.handle('agent:start', async () => runtime.start());
  ipcMain.handle('agent:stop', async () => runtime.stop());
  ipcMain.handle('agent:testReply', async (_e, tweet: string) => runtime.testReply(tweet));

  ipcMain.handle('voice:upload', async () => {
    const response = await dialog.showOpenDialog({
      title: 'Select brand voice files',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }],
    });
    if (response.canceled || response.filePaths.length === 0) return [];
    const dest = path.join(app.getPath('userData'), 'voice');
    fs.mkdirSync(dest, { recursive: true });
    const copied: string[] = [];
    for (const file of response.filePaths) {
      const out = path.join(dest, path.basename(file));
      fs.copyFileSync(file, out);
      copied.push(out);
    }
    runtime.reloadVoice();
    return copied;
  });

  ipcMain.handle('extension:open', async () => {
    await shell.openPath(getExtensionPath());
  });

  ipcMain.handle('extension:launchChrome', async () => {
    const extensionPath = getExtensionPath();
    const chrome = getChromeBinary();
    if (!chrome) {
      await runtime.log('chrome binary not found; opening x.com fallback');
      await shell.openExternal('https://x.com/home');
      return { ok: false, reason: 'chrome_not_found' };
    }

    const userDataDir = path.join(app.getPath('userData'), 'chrome-profile');
    fs.mkdirSync(userDataDir, { recursive: true });
    const args = [
      `--load-extension=${extensionPath}`,
      `--disable-extensions-except=${extensionPath}`,
      `--user-data-dir=${userDataDir}`,
      'https://x.com/home',
    ];

    spawn(chrome, args, {
      detached: true,
      stdio: 'ignore',
    }).unref();

    await runtime.log(`launched chrome with extension at ${extensionPath}`);
    return { ok: true };
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await runtime?.stop();
    app.quit();
  }
});
