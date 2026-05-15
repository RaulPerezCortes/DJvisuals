import * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';
import { BaseVisualScene } from '../visuals/BaseVisualScene';

export class WaveFieldScene extends BaseVisualScene {
  readonly id = 'wave-field';
  readonly label = 'Wave Distortion Field';
  private mesh?: THREE.Points;
  private positions?: Float32Array;
  private base?: Float32Array;
  private material?: THREE.PointsMaterial;
  private readonly side = 180;

  update(delta: number, elapsed: number, audio: AudioFeatures, settings: EngineSettings): void {
    super.update(delta, elapsed, audio, settings);
    if (!this.mesh || !this.positions || !this.base || !this.material) return;
    const count = this.side * this.side;
    const time = elapsed * settings.speed;
    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const x = this.base[i3];
      const z = this.base[i3 + 2];
      const distance = Math.sqrt(x * x + z * z);
      this.positions[i3 + 1] =
        Math.sin(distance * 2.6 - time * (3 + audio.bands.bass * 8)) *
          (0.12 + audio.bands.bass * 0.8) +
        Math.sin(x * 4 + time + audio.bands.treble * 4) * 0.08 +
        this.beatPulse * Math.exp(-distance * 0.35) * 0.8;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.material.size = 0.012 + audio.volume * 0.04;
    this.material.color.set(settings.primaryColor).lerp(new THREE.Color(settings.accentColor), audio.bands.treble);
    this.group.rotation.y += delta * (audio.transient * 0.45 + this.beatPulse * 0.65);
  }

  protected build(): void {
    const count = this.side * this.side;
    this.positions = new Float32Array(count * 3);
    this.base = new Float32Array(count * 3);
    let ptr = 0;
    for (let z = 0; z < this.side; z += 1) {
      for (let x = 0; x < this.side; x += 1) {
        const px = (x / (this.side - 1) - 0.5) * 8;
        const pz = (z / (this.side - 1) - 0.5) * 8;
        this.positions[ptr] = px;
        this.positions[ptr + 1] = 0;
        this.positions[ptr + 2] = pz;
        this.base[ptr] = px;
        this.base[ptr + 1] = 0;
        this.base[ptr + 2] = pz;
        ptr += 3;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      color: '#ff2a87',
      size: 0.018,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Points(geometry, this.material);
    this.mesh.rotation.x = -0.8;
    this.group.add(this.mesh);
  }
}
