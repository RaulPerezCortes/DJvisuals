import * as THREE from 'three';
import type { AudioFeatures } from '../audio/types';
import type { EngineSettings } from '../systems/EngineSettings';
import { createPlaneMaterial, fieldFragment, liquidFragment, psychedelicFragment, tunnelFragment } from '../shaders/reactiveMaterials';
import type { ReactiveUniforms } from '../shaders/reactiveMaterials';
import { BaseVisualScene } from '../visuals/BaseVisualScene';
import type { VisualSceneContext } from '../visuals/VisualTypes';

const fragments = {
  psychedelic: psychedelicFragment,
  liquid: liquidFragment,
  tunnel: tunnelFragment,
  field: fieldFragment,
} as const;

type ShaderPlaneKind = keyof typeof fragments;

export class ShaderPlaneScene extends BaseVisualScene {
  readonly id: string;
  readonly label: string;
  private material?: THREE.ShaderMaterial & { uniforms: ReactiveUniforms };
  private mesh?: THREE.Mesh;
  private width = 1;
  private height = 1;

  constructor(id: string, label: string, private readonly kind: ShaderPlaneKind) {
    super();
    this.id = id;
    this.label = label;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const aspect = width / Math.max(height, 1);
    if (this.mesh) this.mesh.scale.set(aspect >= 1 ? aspect : 1, aspect >= 1 ? 1 : 1 / aspect, 1);
  }

  update(delta: number, elapsed: number, audio: AudioFeatures, settings: EngineSettings): void {
    super.update(delta, elapsed, audio, settings);
    if (!this.material) return;
    this.updateUniforms(this.material.uniforms, elapsed * settings.speed, audio, settings, this.width, this.height);
    this.material.uniforms.uBeat.value *= settings.intensity;
  }

  protected build(): void {
    const geometry = new THREE.PlaneGeometry(8, 8, 160, 160);
    this.material = createPlaneMaterial(fragments[this.kind]) as THREE.ShaderMaterial & {
      uniforms: ReactiveUniforms;
    };
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.position.z = -2;
    this.group.add(this.mesh);
  }
}
