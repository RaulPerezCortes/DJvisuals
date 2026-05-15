import { useEffect, useRef, useState } from 'react';
import { defaultEngineSettings, type EngineSettings } from '../systems/EngineSettings';
import { VisualEngineCore } from '../systems/VisualEngineCore';
import { useAudioFeatures } from '../hooks/useAudioFeatures';

export function VisualEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VisualEngineCore | null>(null);
  const { analyzer, features } = useAudioFeatures();
  const [settings, setSettings] = useState<EngineSettings>({ ...defaultEngineSettings });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new VisualEngineCore({
      canvas,
      analyzer,
      onSettingsChange: (next) => setSettings({ ...next }),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [analyzer]);

  return (
    <main className="app-shell">
      <canvas ref={canvasRef} className="visual-canvas" />
      <div
        className="artist-title"
        style={{
          color: settings.textColor,
          opacity: settings.textOpacity,
          fontSize: `clamp(42px, ${10 * settings.textSize}vw, ${132 * settings.textSize}px)`,
          transform: `translateX(-50%) scale(${1 + features.transient * 0.08 + (features.isBeat ? 0.06 : 0)})`,
          textShadow: `0 0 ${18 + features.energy * 56}px ${settings.textGlowColor}`,
        }}
      >
        {settings.artistName.trim() || 'ARTIST NAME'}
      </div>
    </main>
  );
}
