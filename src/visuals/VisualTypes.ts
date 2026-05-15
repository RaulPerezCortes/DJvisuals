import type * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';

export interface VisualScene {
  readonly id: string;
  readonly label: string;
  init(context: VisualSceneContext): void;
  resize(width: number, height: number, pixelRatio: number): void;
  update(delta: number, elapsed: number, audio: AudioFeatures, settings: EngineSettings): void;
  dispose(): void;
}

export interface VisualSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface BeatReactive {
  triggerBeat(strength: number): void;
}
