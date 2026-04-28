import { useEffect, useMemo, useState } from 'react';
import type { AgentSnapshot } from './lib/types';

const sliderClass = 'w-full accent-neon';

const fallback: AgentSnapshot = {
  status: 'stopped',
  repliesSent: 0,
  personalityState: 'idle',
  voiceLoaded: false,
  voiceStrength: 0,
  lastTweets: [],
  logs: ['system initialized'],
  automation: {
    mentionsOnly: true,
    replyProbability: 0.7,
    delayRandomness: 0.5,
    maxRepliesPerHour: 10,
    allowSelfReplies: false,
    archetypeRouting: true,
  },
  ai: {
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    rewriteStrictness: 0.75,
  },
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-panel p-4 shadow-glow backdrop-blur-md">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [state, setState] = useState<AgentSnapshot>(fallback);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    window.desktopApi.getState().then(setState);
    const off = window.desktopApi.onState(setState);
    return off;
  }, []);

  const statusColor = useMemo(() => {
    if (state.status === 'running') return 'text-emerald-400';
    if (state.status === 'paused') return 'text-yellow-400';
    return 'text-rose-400';
  }, [state.status]);

  return (
    <main className="min-h-screen bg-[#060812] p-6 font-mono text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
        <Panel title="dashboard">
          <div className="space-y-2 text-sm">
            <p className={statusColor}>status: {state.status}</p>
            <p>replies sent: {state.repliesSent}</p>
            <p>personality: {state.personalityState}</p>
            <p>voice strength: {(state.voiceStrength * 100).toFixed(0)}%</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded bg-cyan-500 px-3 py-2 text-black" onClick={() => window.desktopApi.startAgent()}>Start Agent</button>
            <button className="rounded bg-rose-500 px-3 py-2 text-black" onClick={() => window.desktopApi.stopAgent()}>Stop</button>
          </div>
        </Panel>

        <Panel title="voice manager">
          <p className="mb-2 text-xs text-slate-300">Upload voice_profile.md, voice_samples_raw.md, or additional markdown files.</p>
          <button className="rounded bg-cyber px-3 py-2" onClick={() => window.desktopApi.uploadVoiceFiles()}>Upload Voice Files</button>
          <p className="mt-2 text-xs">loaded: {String(state.voiceLoaded)}</p>
        </Panel>

        <Panel title="automation settings">
          <label className="flex items-center justify-between text-sm"><span>mentions only</span><input type="checkbox" checked={state.automation.mentionsOnly} onChange={(e) => window.desktopApi.setAutomation({ mentionsOnly: e.target.checked })} /></label>
          <label className="mt-3 block text-sm">reply probability: {state.automation.replyProbability.toFixed(2)}
            <input className={sliderClass} type="range" min={0} max={1} step={0.05} value={state.automation.replyProbability} onChange={(e) => window.desktopApi.setAutomation({ replyProbability: Number(e.target.value) })} />
          </label>
          <label className="mt-3 block text-sm">delay randomness: {state.automation.delayRandomness.toFixed(2)}
            <input className={sliderClass} type="range" min={0} max={1} step={0.05} value={state.automation.delayRandomness} onChange={(e) => window.desktopApi.setAutomation({ delayRandomness: Number(e.target.value) })} />
          </label>
          <label className="mt-3 block text-sm">max replies/hour
            <input className="mt-1 w-full rounded bg-black/40 p-2" type="number" value={state.automation.maxRepliesPerHour} onChange={(e) => window.desktopApi.setAutomation({ maxRepliesPerHour: Number(e.target.value) })} />
          </label>
        </Panel>

        <Panel title="ai settings">
          <label className="block text-sm">gemini api key
            <input className="mt-1 w-full rounded bg-black/40 p-2" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </label>
          <button className="mt-2 rounded bg-cyan-400 px-3 py-2 text-black" onClick={() => window.desktopApi.setAi({ apiKey })}>Save Key</button>
          <label className="mt-3 block text-sm">model
            <select className="mt-1 w-full rounded bg-black/40 p-2" value={state.ai.model} onChange={(e) => window.desktopApi.setAi({ model: e.target.value })}>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            </select>
          </label>
          <label className="mt-3 block text-sm">temperature: {state.ai.temperature.toFixed(2)}
            <input className={sliderClass} type="range" min={0} max={1.5} step={0.05} value={state.ai.temperature} onChange={(e) => window.desktopApi.setAi({ temperature: Number(e.target.value) })} />
          </label>
          <label className="mt-3 block text-sm">rewrite strictness: {state.ai.rewriteStrictness.toFixed(2)}
            <input className={sliderClass} type="range" min={0} max={1} step={0.05} value={state.ai.rewriteStrictness} onChange={(e) => window.desktopApi.setAi({ rewriteStrictness: Number(e.target.value) })} />
          </label>
        </Panel>

        <Panel title="browser automation">
          <button className="rounded bg-cyan-700 px-3 py-2" onClick={() => window.desktopApi.launchChromeWithExtension()}>Launch Chrome with Extension</button>
          <button className="ml-2 rounded bg-slate-700 px-3 py-2" onClick={() => window.desktopApi.openExtensionGuide()}>Open Extension Folder</button>
          <div className="mt-3 text-xs text-slate-300">
            <p>The app runs websocket bridge on ws://127.0.0.1:3031</p>
          </div>
        </Panel>

        <Panel title="live console">
          <div className="h-64 overflow-auto rounded bg-black/50 p-3 text-xs leading-5 text-emerald-300">
            {state.logs.slice(-200).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
