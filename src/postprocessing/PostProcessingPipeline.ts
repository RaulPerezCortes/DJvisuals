import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import type { EngineSettings } from '../systems/EngineSettings';

type UniformPass = {
  uniforms: Record<string, { value: unknown }>;
};

export class PostProcessingPipeline {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly glitch: GlitchPass;
  private readonly afterimage: AfterimagePass;
  private readonly rgb: ShaderPass;
  private readonly film: FilmPass;
  private readonly vignette: ShaderPass;
  private width = 1;
  private height = 1;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.afterimage = new AfterimagePass(0.32);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.55, 0.08);
    this.rgb = new ShaderPass(RGBShiftShader);
    this.glitch = new GlitchPass(64);
    this.film = new FilmPass(0.18, false);
    this.vignette = new ShaderPass(VignetteShader);

    this.composer.addPass(this.afterimage);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.rgb);
    this.composer.addPass(this.glitch);
    this.composer.addPass(this.film);
    this.composer.addPass(this.vignette);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.width = width;
    this.height = height;
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
  }

  update(settings: EngineSettings, audioEnergy: number): void {
    this.afterimage.uniforms.damp.value = 1 - settings.trails * 0.44;
    this.afterimage.enabled = settings.trails > 0.01;
    this.bloom.strength = settings.bloom * (0.8 + audioEnergy * 1.2);
    this.bloom.radius = 0.3 + settings.bloom * 0.55;
    this.rgb.uniforms.amount.value = settings.rgbShift * 0.0035 * (1 + audioEnergy * 2);
    this.rgb.enabled = settings.rgbShift > 0.01;
    this.glitch.enabled = settings.glitch > 0.01 && Math.random() < settings.glitch * 0.05;
    (this.film as unknown as UniformPass).uniforms.intensity.value = settings.filmGrain * 0.55;
    this.film.enabled = settings.filmGrain > 0.01;
    this.vignette.uniforms.offset.value = 0.92;
    this.vignette.uniforms.darkness.value = 0.8 + settings.vignette * 1.1;
    this.vignette.enabled = settings.vignette > 0.01;
  }

  render(delta: number): void {
    this.composer.render(delta);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
