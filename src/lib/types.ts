export type AgentStatus = 'stopped' | 'running' | 'paused';

export interface AutomationSettings {
  mentionsOnly: boolean;
  replyProbability: number;
  delayRandomness: number;
  maxRepliesPerHour: number;
  allowSelfReplies: boolean;
  archetypeRouting: boolean;
}

export interface AiSettings {
  apiKey: string;
  model: string;
  temperature: number;
  rewriteStrictness: number;
}

export interface AgentSnapshot {
  status: AgentStatus;
  repliesSent: number;
  personalityState: string;
  voiceLoaded: boolean;
  voiceStrength: number;
  extensionConnected: boolean;
  lastTweets: string[];
  logs: string[];
  automation: AutomationSettings;
  ai: Omit<AiSettings, 'apiKey'>;
}
