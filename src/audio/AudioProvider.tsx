import { createContext, type ReactNode, useEffect, useMemo, useState } from 'react';
import { AudioAnalyzer } from './AudioAnalyzer';
import type { AudioFeatures, AudioSourceState } from './types';

export interface AudioContextValue {
  analyzer: AudioAnalyzer;
  features: AudioFeatures;
  source: AudioSourceState;
  startMicrophone: (deviceId?: string) => Promise<void>;
  startRoomMicrophone: (deviceId?: string) => Promise<void>;
  startSystemAudio: () => Promise<void>;
  startDemo: () => Promise<void>;
  setSensitivity: (value: number) => void;
  stop: () => void;
}

export const AudioReactContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const analyzer = useMemo(() => new AudioAnalyzer(), []);
  const [features, setFeatures] = useState(() => analyzer.current);
  const [source, setSource] = useState<AudioSourceState>(analyzer.state);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setFeatures(analyzer.update());
      setSource(analyzer.state);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      analyzer.stopSource();
    };
  }, [analyzer]);

  const value = useMemo<AudioContextValue>(
    () => ({
      analyzer,
      features,
      source,
      startMicrophone: async (deviceId) => {
        await analyzer.startMicrophone(deviceId);
        setSource(analyzer.state);
      },
      startRoomMicrophone: async (deviceId) => {
        await analyzer.startRoomMicrophone(deviceId);
        setSource(analyzer.state);
      },
      startSystemAudio: async () => {
        await analyzer.startSystemAudio();
        setSource(analyzer.state);
      },
      startDemo: async () => {
        await analyzer.startDemo();
        setSource(analyzer.state);
      },
      setSensitivity: (value) => analyzer.setSensitivity(value),
      stop: () => {
        analyzer.stopSource();
        setSource(analyzer.state);
      },
    }),
    [analyzer, features, source],
  );

  return <AudioReactContext.Provider value={value}>{children}</AudioReactContext.Provider>;
}
