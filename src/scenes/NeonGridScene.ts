import * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';
import { BaseVisualScene } from '../visuals/BaseVisualScene';

export class NeonGridScene extends BaseVisualScene {
  readonly id = 'neon-grid';
  readonly label = 'Neon Grid';
  private lines?: THREE.LineSegments;
  private material?: THREE.LineBasicMaterial;

  update(delta: number, elapsed: number, audio: AudioFeatures, settings: EngineSettings): void {
    super.update(delta, elapsed, audio, settings);
    if (!this.lines || !this.material) return;
    this.lines.position.z = ((elapsed * settings.speed * (1.5 + audio.bands.bass * 4)) % 2) - 1;
    this.lines.rotation.z = Math.sin(elapsed * 0.2) * 0.05;
    this.material.color.setHSL(0.52 + audio.bands.treble * 0.28, 1, 0.45 + audio.volume * 0.35);
    this.material.color.set(settings.secondaryColor).lerp(new THREE.Color(settings.primaryColor), audio.bands.bass + this.beatPulse * 0.4);
    this.material.opacity = 0.45 + this.beatPulse * 0.45;
    this.group.rotation.x = -0.94 + audio.bands.mid * 0.2;
    this.group.scale.setScalar(1 + audio.bands.bass * 0.25 + this.beatPulse * 0.12);
  }

  protected build(): void {
    const geometry = new THREE.BufferGeometry();
    const segments = 80;
    const extent = 18;
    const vertices: number[] = [];
    for (let i = -segments; i <= segments; i += 1) {
      const p = (i / segments) * extent;
      vertices.push(-extent, 0, p, extent, 0, p);
      vertices.push(p, 0, -extent, p, 0, extent);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.material = new THREE.LineBasicMaterial({
      color: '#00f2ff',
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.7,
    });
    this.lines = new THREE.LineSegments(geometry, this.material);
    this.lines.position.y = -1.2;
    this.group.add(this.lines);
  }
}
