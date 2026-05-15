import { useEffect, useRef, useState } from 'react';
import type { AudioFeatures } from '../audio/types';
import { defaultEngineSettings, type EngineSettings } from '../systems/EngineSettings';
import { VisualEngineCore } from '../systems/VisualEngineCore';
import { useAudioFeatures } from '../hooks/useAudioFeatures';

type SyncMessage =
  | { type: 'settings'; settings: EngineSettings }
  | { type: 'audio'; features: AudioFeatures }
  | { type: 'request-state' };

const SYNC_CHANNEL = 'dj-visuals-control';
const SETTINGS_STORAGE_KEY = 'dj-visuals-settings';

const readStoredSettings = (): EngineSettings => {
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...defaultEngineSettings, ...JSON.parse(stored) } : { ...defaultEngineSettings };
  } catch {
    return { ...defaultEngineSettings };
  }
};

const serializeFeatures = (features: AudioFeatures): AudioFeatures => ({
  ...features,
  bands: { ...features.bands },
  waveform: new Float32Array(0),
  spectrum: new Uint8Array(0),
});

export function VisualEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VisualEngineCore | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const remoteFeaturesRef = useRef<AudioFeatures | null>(null);
  const latestFeaturesRef = useRef<AudioFeatures | null>(null);
  const latestSettingsRef = useRef<EngineSettings | null>(null);
  const isOutput = new URLSearchParams(window.location.search).get('output') === '1';
  const { analyzer, features } = useAudioFeatures();
  const [settings, setSettings] = useState<EngineSettings>(() => readStoredSettings());
  const [displayFeatures, setDisplayFeatures] = useState<AudioFeatures>(features);
  const activeFeatures = isOutput ? displayFeatures : features;
  const textTime = activeFeatures.time * settings.textMotionSpeed;
  const textDriftX = Math.sin(textTime) * settings.textMotionAmount;
  const textDriftY = Math.cos(textTime * 0.72) * settings.textMotionAmount * 0.45;
  const textAudioScale = settings.textAudioMotion ? activeFeatures.transient * 0.08 + (activeFeatures.isBeat ? 0.06 : 0) : 0;

  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    latestFeaturesRef.current = features;
  }, [features]);

  useEffect(() => {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;
      if (message.type === 'request-state' && !isOutput) {
        const currentSettings = latestSettingsRef.current ?? settings;
        const currentFeatures = latestFeaturesRef.current ?? features;
        channel.postMessage({ type: 'settings', settings: currentSettings } satisfies SyncMessage);
        channel.postMessage({ type: 'audio', features: serializeFeatures(currentFeatures) } satisfies SyncMessage);
        return;
      }
      if (!isOutput) return;
      if (message.type === 'settings') {
        setSettings({ ...message.settings });
        engineRef.current?.setSettings(message.settings);
      }
      if (message.type === 'audio') {
        remoteFeaturesRef.current = message.features;
        setDisplayFeatures(message.features);
      }
    };
    if (isOutput) channel.postMessage({ type: 'request-state' } satisfies SyncMessage);
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [isOutput]);

  useEffect(() => {
    if (isOutput) return;
    const compactFeatures = serializeFeatures(features);
    channelRef.current?.postMessage({ type: 'audio', features: compactFeatures } satisfies SyncMessage);
    setDisplayFeatures(features);
  }, [features, isOutput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new VisualEngineCore({
      canvas,
      analyzer,
      enableGui: !isOutput,
      getAudioFeatures: () => (isOutput ? remoteFeaturesRef.current ?? latestFeaturesRef.current ?? features : analyzer.current),
      onOpenOutput: () => {
        const outputUrl = new URL(window.location.href);
        outputUrl.searchParams.set('output', '1');
        window.open(outputUrl.toString(), '_blank', 'noopener');
        channelRef.current?.postMessage({ type: 'settings', settings: latestSettingsRef.current ?? settings } satisfies SyncMessage);
      },
      onSettingsChange: (next) => {
        const nextSettings = { ...next };
        setSettings(nextSettings);
        if (!isOutput) {
          window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
          channelRef.current?.postMessage({ type: 'settings', settings: nextSettings } satisfies SyncMessage);
        }
      },
    });
    engine.setSettings(latestSettingsRef.current ?? settings);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [analyzer, isOutput]);

  return (
    <main className="app-shell">
      <canvas ref={canvasRef} className="visual-canvas" />
      <div
        className={`artist-title ${settings.textLayer === 'back' ? 'behind-visuals' : 'above-visuals'}`}
        style={{
          color: settings.textColor,
          opacity: settings.textOpacity,
          left: `${settings.textX}%`,
          top: `${settings.textY}%`,
          fontSize: `clamp(42px, ${10 * settings.textSize}vw, ${132 * settings.textSize}px)`,
          transform: `translate(calc(-50% + ${textDriftX}px), calc(-50% + ${textDriftY}px)) scale(${1 + textAudioScale})`,
          textShadow: `0 0 ${18 + activeFeatures.energy * 56}px ${settings.textGlowColor}`,
        }}
      >
        {settings.artistName.trim() || 'artist name'}
      </div>
    </main>
  );
}
