import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';

type Automation = {
  mentionsOnly: boolean;
  replyProbability: number;
  delayRandomness: number;
  maxRepliesPerHour: number;
  allowSelfReplies: boolean;
  archetypeRouting: boolean;
};

type Ai = {
  apiKey: string;
  model: string;
  temperature: number;
  rewriteStrictness: number;
};

type PersistedState = {
  automation: Automation;
  ai: Ai;
  repliedIds: string[];
};

type Snapshot = {
  status: 'stopped' | 'running' | 'paused';
  repliesSent: number;
  personalityState: string;
  voiceLoaded: boolean;
  voiceStrength: number;
  lastTweets: string[];
  logs: string[];
  extensionConnected: boolean;
  automation: Automation;
  ai: Omit<Ai, 'apiKey'>;
};

const defaultAutomation: Automation = {
  mentionsOnly: true,
  replyProbability: 0.7,
  delayRandomness: 0.5,
  maxRepliesPerHour: 10,
  allowSelfReplies: false,
  archetypeRouting: true,
};

const defaultAi: Ai = {
  apiKey: '',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  rewriteStrictness: 0.75,
};

export class AgentRuntime {
  private status: Snapshot['status'] = 'stopped';
  private repliesSent = 0;
  private logs: string[] = [];
  private lastTweets: string[] = [];
  private voiceContext = '';
  private voiceStrength = 0;
  private listeners = new Set<(state: Snapshot) => void>();
  private server?: WebSocketServer;
  private sockets = new Set<WebSocket>();
  private repliedIds = new Set<string>();
  private userData: string;
  private automation: Automation;
  private ai: Ai;
  private recentReplyTimes: number[] = [];
  private stateFile: string;

  constructor(userData: string) {
    this.userData = userData;
    this.stateFile = path.join(this.userData, 'agent-state.json');
    const data = this.loadState();
    this.automation = data.automation;
    this.ai = data.ai;
    this.repliedIds = new Set(data.repliedIds);
    this.reloadVoice();
    this.log('runtime booted');
  }

  private loadState(): PersistedState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = JSON.parse(fs.readFileSync(this.stateFile, 'utf8')) as PersistedState;
        return {
          automation: { ...defaultAutomation, ...(raw.automation || {}) },
          ai: { ...defaultAi, ...(raw.ai || {}) },
          repliedIds: raw.repliedIds || [],
        };
      }
    } catch {
      // ignore broken state
    }
    return { automation: defaultAutomation, ai: defaultAi, repliedIds: [] };
  }

  private persist() {
    const data: PersistedState = {
      automation: this.automation,
      ai: this.ai,
      repliedIds: [...this.repliedIds].slice(-10000),
    };
    fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2));
  }

  onState(cb: (state: Snapshot) => void) {
    this.listeners.add(cb);
    cb(this.snapshot());
  }

  snapshot(): Snapshot {
    return {
      status: this.status,
      repliesSent: this.repliesSent,
      personalityState: this.status === 'running' ? 'engaged' : 'idle',
      voiceLoaded: Boolean(this.voiceContext),
      voiceStrength: this.voiceStrength,
      lastTweets: [...this.lastTweets].slice(-8),
      logs: [...this.logs].slice(-300),
      extensionConnected: this.sockets.size > 0,
      automation: this.automation,
      ai: {
        model: this.ai.model,
        temperature: this.ai.temperature,
        rewriteStrictness: this.ai.rewriteStrictness,
      },
    };
  }

  async log(line: string) {
    const stamped = `[${new Date().toISOString()}] ${line}`;
    this.logs.push(stamped);
    if (this.logs.length > 500) this.logs = this.logs.slice(-500);
    this.emit();
  }

  private emit() {
    const state = this.snapshot();
    for (const cb of this.listeners) cb(state);
  }

  updateAutomation(partial: Partial<Automation>) {
    this.automation = { ...this.automation, ...partial };
    this.persist();
    this.log(`automation updated: ${JSON.stringify(partial)}`);
  }

  updateAi(partial: Partial<Ai>) {
    this.ai = { ...this.ai, ...partial };
    this.persist();
    this.log('ai settings updated');
  }

  reloadVoice() {
    const voiceDir = path.join(this.userData, 'voice');
    if (!fs.existsSync(voiceDir)) {
      this.voiceContext = '';
      this.voiceStrength = 0;
      this.emit();
      return;
    }
    const files = fs.readdirSync(voiceDir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
    this.voiceContext = files.map((file) => `# ${file}\n${fs.readFileSync(path.join(voiceDir, file), 'utf8')}`).join('\n\n');
    this.voiceStrength = Math.min(1, files.length / 4);
    this.log(`voice loaded from ${files.length} files`);
  }

  async start() {
    if (this.status === 'running') return;
    this.status = 'running';
    this.server = new WebSocketServer({ port: 3031 });
    this.server.on('connection', (socket: WebSocket) => {
      this.sockets.add(socket);
      this.log('extension connected');
      this.emit();
      socket.on('close', () => {
        this.sockets.delete(socket);
        this.log('extension disconnected');
        this.emit();
      });
      socket.on('message', async (raw: Buffer) => {
        try {
          const data = JSON.parse(String(raw));
          await this.handleMessage(socket, data);
        } catch (e) {
          await this.log(`message parse error: ${String(e)}`);
        }
      });
    });
    this.log('agent started; websocket on ws://127.0.0.1:3031');
    this.log('if extension is disconnected: click Launch Chrome with Extension');
  }

  async stop() {
    this.status = 'stopped';
    for (const socket of this.sockets) socket.close();
    this.sockets.clear();
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    this.log('agent stopped');
  }

  async testReply(tweet: string) {
    const response = await this.generateReply(tweet, 'test_user');
    this.log(`test reply: ${response}`);
    return response;
  }

  private canReplyNow() {
    const now = Date.now();
    this.recentReplyTimes = this.recentReplyTimes.filter((t) => now - t < 60 * 60 * 1000);
    return this.recentReplyTimes.length < this.automation.maxRepliesPerHour;
  }

  private async handleMessage(socket: WebSocket, data: any) {
    if (this.status !== 'running') return;

    if (data.type === 'heartbeat') {
      socket.send(JSON.stringify({ type: 'heartbeat_ack', now: Date.now() }));
      return;
    }

    if (data.type === 'tweet') {
      const tweetId = String(data.tweetId);
      const text = String(data.text || '');
      const author = String(data.author || 'unknown');
      const isMention = Boolean(data.isMention);
      this.lastTweets.push(text.slice(0, 140));
      if (this.repliedIds.has(tweetId)) {
        this.log(`skip duplicate tweet ${tweetId}`);
        return;
      }
      if (this.automation.mentionsOnly && !isMention) {
        this.log(`skip non-mention tweet ${tweetId}`);
        return;
      }
      if (!this.canReplyNow()) {
        this.log('rate limit window reached');
        return;
      }
      if (Math.random() > this.automation.replyProbability) {
        this.log(`probability gate skipped tweet ${tweetId}`);
        return;
      }

      this.log(`detected tweet ${tweetId} by @${author}`);
      const reply = await this.generateReply(text, author);
      const jitterMs = Math.floor((2 + Math.random() * 12 * this.automation.delayRandomness) * 1000);
      await new Promise((r) => setTimeout(r, jitterMs));
      socket.send(JSON.stringify({ type: 'post_reply', tweetId, reply }));
      this.repliedIds.add(tweetId);
      this.persist();
      this.repliesSent += 1;
      this.recentReplyTimes.push(Date.now());
      this.log(`posting action dispatched for ${tweetId}`);
      this.emit();
    }

    if (data.type === 'posted') {
      this.log(`reply posted for ${data.tweetId}`);
    }
  }

  private async generateReply(tweet: string, author: string) {
    if (!this.ai.apiKey) {
      this.log('missing api key; fallback reply used');
      return `appreciate this, @${author} — great point.`;
    }
    const client = new GoogleGenerativeAI(this.ai.apiKey);
    const model = client.getGenerativeModel({ model: this.ai.model });

    const draftPrompt = `you are an autonomous x reply assistant.\nrespond to this tweet in 1-2 sentences max.\nauthor: @${author}\ntweet: ${tweet}\nvoice context:\n${this.voiceContext}\n\noutput only reply text.`;
    const draft = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: draftPrompt }] }],
      generationConfig: { temperature: this.ai.temperature },
    });
    const draftText = draft.response.text().trim();
    this.log(`draft reply: ${draftText}`);

    const enforcePrompt = `rewrite this draft to strictly match the following brand voice.\nconstraints: conviction, cadence, lowercase-dominant style, varied length distribution, archetype alignment. strictness=${this.ai.rewriteStrictness}.\nvoice:\n${this.voiceContext}\n\ndraft:\n${draftText}\n\noutput only rewritten reply.`;
    const enforced = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: enforcePrompt }] }],
      generationConfig: { temperature: Math.max(0.2, this.ai.temperature - 0.1) },
    });
    const enforcedText = enforced.response.text().trim().replace(/^"|"$/g, '');
    this.log(`enforced reply: ${enforcedText}`);
    return enforcedText;
  }
}
