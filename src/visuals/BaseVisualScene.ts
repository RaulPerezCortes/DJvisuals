import * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';
import type { ReactiveUniforms } from '../shaders/reactiveMaterials';
import { damp } from '../utils/math';
import type { VisualScene, VisualSceneContext } from './VisualTypes';

export abstract class BaseVisualScene implements VisualScene {
  abstract readonly id: string;
  abstract readonly label: string;
  protected group = new THREE.Group();
  protected context?: VisualSceneContext;
  protected beatPulse = 0;

  init(context: VisualSceneContext): void {
    this.context = context;
    context.scene.add(this.group);
    this.build(context);
  }

  resize(_width: number, _height: number, _pixelRatio: number): void {}

  update(delta: number, _elapsed: number, audio: AudioFeatures, _settings: EngineSettings): void {
    this.beatPulse = damp(this.beatPulse, audio.isBeat ? 1 : 0, audio.isBeat ? 28 : 6, delta);
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.context?.scene.remove(this.group);
    this.group.clear();
  }

  protected abstract build(context: VisualSceneContext): void;

  protected updateUniforms(
    uniforms: ReactiveUniforms,
    elapsed: number,
    audio: AudioFeatures,
    settings: EngineSettings,
    width = 1,
    height = 1,
  ): void {
    uniforms.uTime.value = elapsed;
    uniforms.uBass.value = audio.bands.bass;
    uniforms.uMid.value = audio.bands.mid;
    uniforms.uTreble.value = audio.bands.treble;
    uniforms.uAmplitude.value = audio.volume;
    uniforms.uBeat.value = this.beatPulse;
    uniforms.uBpm.value = audio.bpm || 120;
    uniforms.uResolution.value.set(width, height);
    uniforms.uPrimary.value.set(settings.primaryColor);
    uniforms.uSecondary.value.set(settings.secondaryColor);
    uniforms.uAccent.value.set(settings.accentColor);
  }
}
