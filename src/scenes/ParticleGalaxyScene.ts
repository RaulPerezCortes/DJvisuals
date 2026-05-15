import * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';
import { BaseVisualScene } from '../visuals/BaseVisualScene';
import type { VisualSceneContext } from '../visuals/VisualTypes';

const COUNT = 42000;

export class ParticleGalaxyScene extends BaseVisualScene {
  readonly id = 'particle-galaxy';
  readonly label = 'Particle Galaxy';
  private points?: THREE.Points;
  private positions?: Float32Array;
  private colors?: Float32Array;
  private seeds?: Float32Array;
  private material?: THREE.PointsMaterial;
  private primary = new THREE.Color();
  private secondary = new THREE.Color();
  private accent = new THREE.Color();

  update(delta: number, elapsed: number, audio: AudioFeatures, settings: EngineSettings): void {
    super.update(delta, elapsed, audio, settings);
    if (!this.points || !this.positions || !this.colors || !this.seeds || !this.material) return;

    const bass = audio.bands.bass * settings.intensity;
    const treble = audio.bands.treble;
    this.primary.set(settings.primaryColor);
    this.secondary.set(settings.secondaryColor);
    this.accent.set(settings.accentColor);
    const speed = settings.speed * (bass * 0.65 + this.beatPulse * 1.25 + audio.transient * 0.55);
    this.group.rotation.y += delta * speed;
    this.group.rotation.z += delta * (treble * 0.18 + this.beatPulse * 0.35);
    this.group.scale.setScalar(1 + bass * 0.16 + this.beatPulse * 0.08);
    this.material.size = 0.018 + audio.volume * 0.032 + this.beatPulse * 0.025;

    const time = elapsed * settings.speed;
    for (let i = 0; i < COUNT; i += 1) {
      const i3 = i * 3;
      const seed = this.seeds[i];
      const wave = Math.sin(time * (0.8 + seed * 0.7) + seed * 18.0) * (bass * 0.3 + this.beatPulse * 0.16);
      this.positions[i3 + 1] += wave * delta;
      this.positions[i3 + 1] *= 0.996;
      const mix = Math.min(1, seed * 0.35 + bass + this.beatPulse * 0.6);
      const color = seed > 0.82 ? this.accent : this.secondary;
      this.colors[i3] = color.r * (1 - mix) + this.primary.r * mix;
      this.colors[i3 + 1] = color.g * (1 - mix) + this.primary.g * mix + treble * 0.18;
      this.colors[i3 + 2] = color.b * (1 - mix) + this.primary.b * mix + audio.bands.mid * 0.12;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  protected build(_context: VisualSceneContext): void {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(COUNT * 3);
    this.colors = new Float32Array(COUNT * 3);
    this.seeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i += 1) {
      const i3 = i * 3;
      const radius = Math.pow(Math.random(), 0.54) * 5.7;
      const arm = (i % 6) / 6 * Math.PI * 2;
      const spin = radius * 1.24;
      const angle = arm + spin + (Math.random() - 0.5) * 0.58;
      const height = (Math.random() - 0.5) * 0.36 * (1 - radius / 6);
      this.positions[i3] = Math.cos(angle) * radius;
      this.positions[i3 + 1] = height;
      this.positions[i3 + 2] = Math.sin(angle) * radius;
      this.colors[i3] = 0.4 + Math.random() * 0.4;
      this.colors[i3 + 1] = Math.random() * 0.35;
      this.colors[i3 + 2] = 0.75 + Math.random() * 0.25;
      this.seeds[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }
}
