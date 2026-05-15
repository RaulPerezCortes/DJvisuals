import * as THREE from 'three';
import GUI from 'lil-gui';
import type { AudioAnalyzer } from '../audio/AudioAnalyzer';
import type { AudioFeatures } from '../audio/types';
import { KeyboardControls } from '../controls/KeyboardControls';
import { MidiBridge } from '../controls/MidiBridge';
import { PostProcessingPipeline } from '../postprocessing/PostProcessingPipeline';
import { sceneFactories } from '../scenes';
import { defaultEngineSettings, type EngineSettings } from './EngineSettings';
import type { VisualScene } from '../visuals/VisualTypes';

interface EngineOptions {
  canvas: HTMLCanvasElement;
  analyzer: AudioAnalyzer;
  onSettingsChange?: (settings: EngineSettings) => void;
}

export class VisualEngineCore {
  readonly settings: EngineSettings = { ...defaultEngineSettings };
  readonly scenes: VisualScene[] = sceneFactories.map((factory) => factory());

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 120);
  private readonly pipeline: PostProcessingPipeline;
  private readonly clock = new THREE.Clock();
  private readonly keyboard: KeyboardControls;
  private readonly midi = new MidiBridge();
  private gui?: GUI;
  private active?: VisualScene;
  private frame = 0;
  private disposed = false;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private visualTime = 0;
  private readonly audioReadout = {
    source: 'idle',
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    bpm: 0,
  };
  private micDeviceOptions: Record<string, string> = { 'Default mic': 'default' };
  private micDeviceController?: { options: (options: Record<string, string>) => unknown; updateDisplay: () => unknown };

  constructor(private readonly options: EngineOptions) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.camera.position.set(0, 0, 6);
    this.pipeline = new PostProcessingPipeline(this.renderer, this.scene, this.camera);
    this.keyboard = new KeyboardControls({
      settings: this.settings,
      scenes: this.scenes,
      onScene: (id) => this.setScene(id),
      onFullscreen: () => void this.toggleFullscreen(),
      onDebugToggle: () => {
        this.settings.debug = !this.settings.debug;
        this.options.onSettingsChange?.(this.settings);
      },
    });
    this.attachAudioEvents();
    this.options.analyzer.setSensitivity(this.settings.audioSensitivity);
    this.initGui();
    void this.initMidi();
    this.setScene(this.settings.sceneId);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  start(): void {
    this.clock.start();
    const loop = () => {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(loop);
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const audio = this.options.analyzer.current;
      this.visualTime += this.computeVisualDelta(delta, audio);
      this.updateReadout(audio);
      this.renderer.setClearColor(this.settings.backgroundColor, 1);
      this.active?.update(delta, this.visualTime, audio, this.settings);
      this.pipeline.update(this.settings, audio.energy);
      this.pipeline.render(delta);
    };
    loop();
  }

  setScene(sceneId: string): void {
    const next = this.scenes.find((scene) => scene.id === sceneId) ?? this.scenes[0];
    if (this.active === next) return;
    this.active?.dispose();
    this.scene.clear();
    this.active = next;
    this.settings.sceneId = next.id;
    next.init({ scene: this.scene, camera: this.camera, renderer: this.renderer });
    next.resize(this.width, this.height, this.pixelRatio);
    this.options.onSettingsChange?.(this.settings);
  }

  setSettings(patch: Partial<EngineSettings>): void {
    Object.assign(this.settings, patch);
    if (patch.audioSensitivity !== undefined) {
      this.options.analyzer.setSensitivity(patch.audioSensitivity);
    }
    this.resize();
    this.options.onSettingsChange?.(this.settings);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.resize);
    this.keyboard.dispose();
    this.midi.dispose();
    this.gui?.destroy();
    this.active?.dispose();
    this.pipeline.dispose();
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const parent = this.options.canvas.parentElement;
    this.width = parent?.clientWidth || window.innerWidth;
    this.height = parent?.clientHeight || window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.settings.pixelRatioCap);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / Math.max(this.height, 1);
    this.camera.updateProjectionMatrix();
    this.pipeline.resize(this.width, this.height, this.pixelRatio);
    this.active?.resize(this.width, this.height, this.pixelRatio);
  };

  private attachAudioEvents(): void {
    this.options.analyzer.events.on('beat', ({ strength }) => {
      this.renderer.toneMappingExposure = 1.05 + strength * 0.6;
    });
  }

  private initGui(): void {
    this.gui = new GUI({ title: 'VJ Engine', width: 310 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.right = '16px';
    this.gui.domElement.style.bottom = '16px';
    this.gui.domElement.style.top = 'auto';
    this.gui.onChange(() => {
      this.options.analyzer.setSensitivity(this.settings.audioSensitivity);
      this.options.onSettingsChange?.(this.settings);
    });

    const audioControls = {
      refreshMics: () => void this.refreshAudioInputs(),
      mic: () => void this.options.analyzer.startMicrophone(this.settings.audioInputId),
      roomMic: () => void this.options.analyzer.startRoomMicrophone(this.settings.audioInputId),
      fullscreen: () => void this.toggleFullscreen(),
    };

    const audio = this.gui.addFolder('Audio');
    audio.add(audioControls, 'refreshMics').name('Refresh mics');
    this.micDeviceController = audio
      .add(this.settings, 'audioInputId', this.micDeviceOptions)
      .name('input') as unknown as { options: (options: Record<string, string>) => unknown; updateDisplay: () => unknown };
    audio.add(audioControls, 'mic').name('Mic');
    audio.add(audioControls, 'roomMic').name('Mic externo');
    audio.add(this.settings, 'audioSensitivity', 0.5, 8, 0.1).name('sensitivity');
    audio.add(this.audioReadout, 'source').name('source').listen().disable();
    audio.add(this.audioReadout, 'volume', 0, 1, 0.01).name('volume').listen().disable();
    audio.add(this.audioReadout, 'bass', 0, 1, 0.01).name('bass').listen().disable();
    audio.add(this.audioReadout, 'mid', 0, 1, 0.01).name('mid').listen().disable();
    audio.add(this.audioReadout, 'treble', 0, 1, 0.01).name('treble').listen().disable();
    audio.add(this.audioReadout, 'energy', 0, 1, 0.01).name('energy').listen().disable();
    audio.add(this.audioReadout, 'bpm').name('bpm').listen().disable();

    const visual = this.gui.addFolder('Visual');
    visual.add(this.settings, 'sceneId', this.scenes.map((scene) => scene.id)).name('scene').onChange((id: string) => this.setScene(id));
    visual.add(this.settings, 'beatOnlyMotion').name('beat only');
    visual.add(this.settings, 'intensity', 0.1, 2.5, 0.01);
    visual.add(this.settings, 'speed', 0.1, 3, 0.01);
    visual.add(this.settings, 'pixelRatioCap', 0.75, 2, 0.05).name('pixel cap').onChange(() => this.resize());
    visual.add(audioControls, 'fullscreen').name('Fullscreen');

    const colors = this.gui.addFolder('Colors');
    colors.addColor(this.settings, 'backgroundColor').name('background');
    colors.addColor(this.settings, 'primaryColor').name('primary');
    colors.addColor(this.settings, 'secondaryColor').name('secondary');
    colors.addColor(this.settings, 'accentColor').name('accent');

    const text = this.gui.addFolder('Text');
    text.add(this.settings, 'artistName').name('artist');
    text.addColor(this.settings, 'textColor').name('color');
    text.addColor(this.settings, 'textGlowColor').name('glow');
    text.add(this.settings, 'textSize', 0.35, 1.8, 0.01).name('size');
    text.add(this.settings, 'textOpacity', 0, 1, 0.01).name('opacity');

    const fx = this.gui.addFolder('FX');
    fx.add(this.settings, 'bloom', 0, 2, 0.01);
    fx.add(this.settings, 'trails', 0, 0.96, 0.01);
    fx.add(this.settings, 'glitch', 0, 1, 0.01);
    fx.add(this.settings, 'rgbShift', 0, 1, 0.01);
    fx.add(this.settings, 'filmGrain', 0, 1, 0.01);
    fx.add(this.settings, 'vignette', 0, 1, 0.01);

    audio.close();
    visual.close();
    colors.close();
    text.close();
    fx.close();
    void this.refreshAudioInputs();
  }

  private async initMidi(): Promise<void> {
    await this.midi.init((data) => {
      const [status, control, value] = data;
      if ((status & 0xf0) !== 0xb0) return;
      const normalized = value / 127;
      if (control === 1) this.settings.intensity = 0.2 + normalized * 2.3;
      if (control === 2) this.settings.bloom = normalized * 2;
      if (control === 3) this.settings.trails = normalized * 0.96;
      if (control === 4) this.settings.rgbShift = normalized;
    });
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const fullscreenTarget = this.options.canvas.parentElement ?? document.documentElement;
    await fullscreenTarget.requestFullscreen();
  }

  private computeVisualDelta(delta: number, audio: AudioFeatures): number {
    if (!this.settings.beatOnlyMotion) return delta * this.settings.speed;
    const beatImpulse = audio.isBeat ? 1.5 : 0;
    const kickImpulse = audio.isKick ? 1.2 : 0;
    const reactiveMotion =
      beatImpulse +
      kickImpulse +
      audio.transient * 2.6 +
      Math.max(0, audio.energy - 0.08) * 0.32;
    return delta * this.settings.speed * reactiveMotion;
  }

  private updateReadout(audio: AudioFeatures): void {
    const source = this.options.analyzer.state;
    this.audioReadout.source = source.active ? source.mode : source.error ?? 'idle';
    this.audioReadout.volume = Number(audio.volume.toFixed(2));
    this.audioReadout.bass = Number(audio.bands.bass.toFixed(2));
    this.audioReadout.mid = Number(audio.bands.mid.toFixed(2));
    this.audioReadout.treble = Number(audio.bands.treble.toFixed(2));
    this.audioReadout.energy = Number(audio.energy.toFixed(2));
    this.audioReadout.bpm = audio.bpm;
  }

  private async refreshAudioInputs(): Promise<void> {
    const inputs = await this.options.analyzer.getAudioInputs();
    const options: Record<string, string> = { 'Default mic': 'default' };
    inputs.forEach((input) => {
      options[input.label] = input.id;
    });
    this.micDeviceOptions = options;
    this.micDeviceController?.options(options);
    if (!Object.values(options).includes(this.settings.audioInputId)) {
      this.settings.audioInputId = 'default';
    }
    this.micDeviceController?.updateDisplay();
  }
}
