/// <reference types="vite/client" />

import type { AgentSnapshot, AiSettings, AutomationSettings } from './lib/types';

declare global {
  interface Window {
    desktopApi: {
      getState: () => Promise<AgentSnapshot>;
      onState: (cb: (state: AgentSnapshot) => void) => () => void;
      setAutomation: (settings: Partial<AutomationSettings>) => Promise<void>;
      setAi: (settings: Partial<AiSettings>) => Promise<void>;
      uploadVoiceFiles: () => Promise<string[]>;
      startAgent: () => Promise<void>;
      stopAgent: () => Promise<void>;
      testReply: (tweet: string) => Promise<string>;
      openExtensionGuide: () => Promise<void>;
      launchChromeWithExtension: () => Promise<void>;
    };
  }
}

export {};
