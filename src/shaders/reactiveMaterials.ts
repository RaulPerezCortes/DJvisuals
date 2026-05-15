import * as THREE from 'three';
import { shaderUtils } from './common';

export type ReactiveUniforms = {
  uTime: { value: number };
  uBass: { value: number };
  uMid: { value: number };
  uTreble: { value: number };
  uAmplitude: { value: number };
  uBeat: { value: number };
  uBpm: { value: number };
  uResolution: { value: THREE.Vector2 };
  uPrimary: { value: THREE.Color };
  uSecondary: { value: THREE.Color };
  uAccent: { value: THREE.Color };
};

export function createUniforms(): ReactiveUniforms {
  return {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uAmplitude: { value: 0 },
    uBeat: { value: 0 },
    uBpm: { value: 120 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uPrimary: { value: new THREE.Color('#ff2a87') },
    uSecondary: { value: new THREE.Color('#00f2ff') },
    uAccent: { value: new THREE.Color('#fff06a') },
  };
}

export const shaderPlaneVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
uniform float uTime;
uniform float uBass;
uniform float uBeat;
${shaderUtils}

void main() {
  vUv = uv;
  vec3 p = position;
  float wave = fbm(p.xy * 1.7 + uTime * 0.25);
  p.z += (wave - 0.5) * (0.5 + uBass * 1.8 + uBeat * 0.7);
  vPosition = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const psychedelicFragment = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform float uBpm;
uniform vec2 uResolution;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
${shaderUtils}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);
  float pulse = 0.5 + 0.5 * sin(uTime * (0.8 + uBpm / 120.0));
  vec2 k = kaleidoscope(uv, 6.0 + floor(uTreble * 8.0), uTime * 0.12 + uBeat * 0.45);
  float r = length(k);
  float rings = sin((r * 18.0 - uTime * (2.0 + uBass * 5.0)) + fbm(k * 4.0) * 7.0);
  float field = fbm(k * (3.0 + uMid * 6.0) + uTime * 0.32);
  vec3 color = palette(field + rings * 0.08 + uTime * 0.04);
  color = mix(color, uAccent, 0.22 + uTreble * 0.22);
  color += uSecondary * smoothstep(0.72, 1.0, rings) * (0.25 + uTreble);
  color += uPrimary * smoothstep(0.44, 0.0, r) * (uBass + uBeat);
  color *= 0.65 + uAmplitude * 1.25 + pulse * uBeat * 0.55;
  gl_FragColor = vec4(color, 1.0);
}
`;

export const liquidFragment = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform vec2 uResolution;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
${shaderUtils}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 flow = vec2(
    fbm(uv * 2.0 + uTime * 0.18),
    fbm(uv * 2.0 - uTime * 0.15)
  ) - 0.5;
  uv += flow * (0.42 + uBass * 0.65);
  float blobs = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(uTime * (0.21 + fi * 0.03) + fi), cos(uTime * (0.17 + fi * 0.04) + fi * 2.1));
    float radius = 0.18 + 0.12 * sin(uTime + fi) + uBass * 0.22;
    blobs += radius / max(length(uv - c * 0.72), 0.03);
  }
  float edge = smoothstep(2.6, 5.8 + uBeat * 2.0, blobs);
  vec3 color = mix(vec3(0.01, 0.015, 0.025), palette(blobs * 0.08 + uTime * 0.05), edge);
  color = mix(color, uAccent, 0.18);
  color += uSecondary * pow(edge, 8.0) * (0.35 + uTreble);
  color += uPrimary * uBeat * smoothstep(0.8, 0.0, length(uv));
  color *= 0.7 + uAmplitude * 1.4;
  gl_FragColor = vec4(color, 1.0);
}
`;

export const tunnelFragment = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform vec2 uResolution;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
${shaderUtils}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float speed = uTime * (0.7 + uBass * 2.5);
  vec2 polar = vec2(1.0 / max(r, 0.05) + speed, a / PI * 3.0);
  float grid = abs(sin(polar.x * 7.0 + fbm(uv * 3.0) * 2.0)) * abs(sin(polar.y * (8.0 + uTreble * 12.0)));
  float beam = smoothstep(0.82, 1.0, grid);
  vec3 color = palette(polar.x * 0.08 + uTime * 0.04 + uMid);
  color *= beam * (1.2 + uAmplitude * 2.0);
  color = mix(color, uAccent, 0.16 + uMid * 0.18);
  color += uPrimary * uBeat / max(r * 2.0, 0.22);
  color += uSecondary * smoothstep(0.06, 0.0, abs(r - 0.42 - uBass * 0.08));
  gl_FragColor = vec4(color, 1.0);
}
`;

export const fieldFragment = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uAmplitude;
uniform float uBeat;
uniform vec2 uResolution;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
${shaderUtils}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / max(uResolution.y, 1.0);
  float n = 0.0;
  vec2 p = uv;
  for (int i = 0; i < 6; i++) {
    p = abs(p) / max(dot(p, p), 0.18) - (0.62 + uBass * 0.25);
    n += exp(-abs(length(p) - 0.7)) * 0.13;
  }
  float lines = sin((p.x + p.y) * 18.0 + uTime * (2.0 + uTreble * 3.0));
  vec3 color = palette(n + lines * 0.05 + uTime * 0.03);
  color *= n * (2.0 + uAmplitude * 3.0);
  color = mix(color, uAccent, 0.2);
  color += uPrimary * uBeat * smoothstep(1.2, 0.0, length(uv));
  gl_FragColor = vec4(color, 1.0);
}
`;

export function createPlaneMaterial(fragmentShader: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: createUniforms(),
    vertexShader: shaderPlaneVertex,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
}
