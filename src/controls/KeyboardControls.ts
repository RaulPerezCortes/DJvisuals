import type { EngineSettings } from '../systems/EngineSettings';
import type { VisualScene } from '../visuals/VisualTypes';

interface KeyboardControlOptions {
  settings: EngineSettings;
  scenes: VisualScene[];
  onScene: (sceneId: string) => void;
  onFullscreen: () => void;
  onDebugToggle: () => void;
}

export class KeyboardControls {
  private readonly handler: (event: KeyboardEvent) => void;

  constructor(private readonly options: KeyboardControlOptions) {
    this.handler = (event) => this.onKey(event);
    window.addEventListener('keydown', this.handler);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handler);
  }

  private onKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    const { settings, scenes, onScene, onFullscreen, onDebugToggle } = this.options;
    const current = scenes.findIndex((scene) => scene.id === settings.sceneId);
    if (event.key >= '1' && event.key <= '8') {
      const scene = scenes[Number(event.key) - 1];
      if (scene) onScene(scene.id);
    }
    if (event.key === 'ArrowRight') onScene(scenes[(current + 1 + scenes.length) % scenes.length].id);
    if (event.key === 'ArrowLeft') onScene(scenes[(current - 1 + scenes.length) % scenes.length].id);
    if (event.key.toLowerCase() === 'f') onFullscreen();
    if (event.key.toLowerCase() === 'd') onDebugToggle();
    if (event.key === '+') settings.intensity = Math.min(2.5, settings.intensity + 0.1);
    if (event.key === '-') settings.intensity = Math.max(0.1, settings.intensity - 0.1);
  }
}
