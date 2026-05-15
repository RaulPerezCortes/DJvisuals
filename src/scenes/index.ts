import { ParticleGalaxyScene } from './ParticleGalaxyScene';
import { NeonGridScene } from './NeonGridScene';
import { ReactiveSphereScene } from './ReactiveSphereScene';
import { ShaderPlaneScene } from './ShaderPlaneScene';
import { WaveFieldScene } from './WaveFieldScene';
import type { VisualScene } from '../visuals/VisualTypes';

export const sceneFactories: Array<() => VisualScene> = [
  () => new ParticleGalaxyScene(),
  () => new ShaderPlaneScene('tunnel-warp', 'Tunnel Warp', 'tunnel'),
  () => new ShaderPlaneScene('liquid-blobs', 'Liquid Blobs', 'liquid'),
  () => new ShaderPlaneScene('psychedelic-plane', 'Psychedelic Shader Plane', 'psychedelic'),
  () => new NeonGridScene(),
  () => new ReactiveSphereScene(),
  () => new ShaderPlaneScene('fractal-noise', 'Fractal / Noise Scene', 'field'),
  () => new WaveFieldScene(),
];

export const sceneOptions = sceneFactories.map((factory) => {
  const scene = factory();
  const option = { id: scene.id, label: scene.label };
  scene.dispose();
  return option;
});
