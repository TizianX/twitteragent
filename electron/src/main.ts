import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { AgentRuntime } from './runtime';

let mainWindow: BrowserWindow | null = null;
let runtime: AgentRuntime;

const isDev = process.env.NODE_ENV === 'development';

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
    const extensionPath = isDev
      ? path.join(process.cwd(), 'extension')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'extension');
    await shell.openPath(extensionPath);
  });
  ipcMain.handle('extension:launchChrome', async () => {
    const extensionPath = isDev
      ? path.join(process.cwd(), 'extension')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'extension');
    const url = `googlechrome --load-extension=\"${extensionPath}\" https://x.com/home`;
    await runtime.log(`launch command: ${url}`);
    if (process.platform === 'darwin') {
      await shell.openExternal(`file:///Applications/Google%20Chrome.app`);
    } else {
      await shell.openExternal('https://x.com/home');
    }
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
