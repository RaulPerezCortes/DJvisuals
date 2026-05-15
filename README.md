# DJ Visuals Engine

Professional Vite + React + TypeScript base for realtime DJ/VJ visuals. It uses Three.js, GLSL shader materials, Web Audio API analysis, GPU particle systems, postprocessing, keyboard controls, lil-gui and a modular scene architecture.

## Install

```bash
npm install
npm run dev
```

Open the local Vite URL. In the Audio panel, use `Audio ordenador` to capture the computer/tab audio, or `Audio micro` to capture a physical microphone. Browser audio capture requires HTTPS or localhost.

For projection, use `Abrir salida` in the Visual panel. It opens a clean output tab at `?output=1`; keep the original tab as the controller and press `F` in the output tab if you want it fullscreen.

## Build

```bash
npm run build
```

## Architecture

```text
src/
  audio/            Web Audio graph, FFT, beat/BPM/event analysis
  visuals/          Shared scene interfaces and base class
  shaders/          Reusable GLSL noise, fbm, kaleidoscope, RGB/pulse utilities
  scenes/           Eight audio-reactive visual scenes
  systems/          Engine settings, renderer core, future extension ports
  components/       React HUD and canvas host
  hooks/            Reusable React audio hook
  utils/            Math and realtime helpers
  postprocessing/   Bloom, trails, glitch, RGB shift, film grain, vignette
  controls/         Keyboard and MIDI bridge
```

## Runtime Controls

- `1` to `8`: switch scenes
- `Left` / `Right`: previous or next scene
- `F`: fullscreen
- `D`: toggle debug flag
- `+` / `-`: intensity
- lil-gui: scene, speed, bloom, trails, glitch, RGB shift, grain, vignette, pixel ratio cap

## Audio Features

The analyzer emits normalized `0-1` values for volume, energy, transients, sub/bass/mid/treble/presence bands, spectral centroid, beat confidence and event pulses.

Events available from `AudioAnalyzer.events`:

- `beat`
- `kick`
- `drop`
- `energyPeak`

## Scenes

1. Particle Galaxy
2. Tunnel Warp
3. Liquid Blobs
4. Psychedelic Shader Plane
5. Neon Grid
6. Audio Reactive Sphere
7. Fractal / Noise Scene
8. Wave Distortion Field

## Performance Notes

- WebGL renderer uses high-performance GPU preference and capped pixel ratio.
- Scene switching disposes geometries/materials and rebuilds only the active scene.
- Particle scenes use typed arrays and update existing buffer attributes.
- Postprocessing is parameterized and can be disabled by setting pass intensity to zero.
- Animation is delta-time based and clamps large frame deltas.
- Mobile adaptation is handled through responsive fullscreen canvas and `pixelRatioCap`.

## Extension Ports

`src/systems/ExtensionPorts.ts` reserves architecture boundaries for webcam reactive visuals, OSC, Ableton Link, NDI, Syphon/Spout, AI-generated textures, WebGPU migration, multiplayer sync, recording/export, presets and timeline automation.
