import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopApi', {
  getState: () => ipcRenderer.invoke('state:get'),
  onState: (cb: (state: unknown) => void) => {
    const handler = (_: unknown, data: unknown) => cb(data);
    ipcRenderer.on('agent-state', handler);
    return () => ipcRenderer.removeListener('agent-state', handler);
  },
  setAutomation: (settings: unknown) => ipcRenderer.invoke('settings:automation', settings),
  setAi: (settings: unknown) => ipcRenderer.invoke('settings:ai', settings),
  uploadVoiceFiles: () => ipcRenderer.invoke('voice:upload'),
  startAgent: () => ipcRenderer.invoke('agent:start'),
  stopAgent: () => ipcRenderer.invoke('agent:stop'),
  testReply: (tweet: string) => ipcRenderer.invoke('agent:testReply', tweet),
  openExtensionGuide: () => ipcRenderer.invoke('extension:open'),
  launchChromeWithExtension: () => ipcRenderer.invoke('extension:launchChrome'),
});
