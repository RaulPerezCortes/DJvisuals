import * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';
import { shaderUtils } from '../shaders/common';
import { createUniforms, type ReactiveUniforms } from '../shaders/reactiveMaterials';
import { BaseVisualScene } from '../visuals/BaseVisualScene';

const vertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBeat;
${shaderUtils}

void main() {
  vNormal = normal;
  vec3 p = position;
  float n = noise3(normal * (2.5 + uTreble * 4.0) + uTime * 0.45);
  p += normal * ((n - 0.5) * (0.45 + uBass * 1.2) + uBeat * 0.24);
  vPosition = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
${shaderUtils}

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
  float n = noise3(vPosition * (2.0 + uMid * 4.0) + uTime * 0.6);
  vec3 color = palette(n + uTime * 0.04 + uBass * 0.2);
  color = mix(color, uAccent, 0.18 + uMid * 0.2);
  color += uSecondary * fresnel * (1.1 + uTreble);
  color += uPrimary * uBeat * 0.9;
  color *= 0.8 + uAmplitude * 1.5;
  gl_FragColor = vec4(color, 1.0);
}
`;

export class ReactiveSphereScene extends BaseVisualScene {
  readonly id = 'reactive-sphere';
  readonly label = 'Audio Reactive Sphere';
  private material?: THREE.ShaderMaterial & { uniforms: ReactiveUniforms };
  private mesh?: THREE.Mesh;

  update(delta: number, elapsed: number, audio: AudioFeatures, settings: EngineSettings): void {
    super.update(delta, elapsed, audio, settings);
    if (!this.material || !this.mesh) return;
    this.updateUniforms(this.material.uniforms, elapsed * settings.speed, audio, settings);
    this.mesh.rotation.x += delta * (audio.bands.mid * 0.72 + this.beatPulse * 0.9);
    this.mesh.rotation.y += delta * (audio.bands.treble * 0.9 + this.beatPulse * 1.15);
    this.mesh.scale.setScalar(1 + audio.bands.bass * 0.18 + this.beatPulse * 0.1);
  }

  protected build(): void {
    const geometry = new THREE.IcosahedronGeometry(2.1, 72);
    this.material = new THREE.ShaderMaterial({
      uniforms: createUniforms(),
      vertexShader: vertex,
      fragmentShader: fragment,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }) as THREE.ShaderMaterial & { uniforms: ReactiveUniforms };
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
  }
}
