import { AudioEventBus } from './AudioEventBus';
import type { AudioFeatures, AudioSourceState, FrequencyBands } from './types';
import { clamp01, lerp } from '../utils/math';

const FFT_SIZE = 2048;
const HISTORY_WINDOW = 90;
const MIN_BEAT_INTERVAL = 0.24;
const BPM_MIN = 70;
const BPM_MAX = 180;
const SILENCE_GATE = 0.018;

const emptyBands = (): FrequencyBands => ({
  sub: 0,
  bass: 0,
  lowMid: 0,
  mid: 0,
  highMid: 0,
  treble: 0,
  presence: 0,
});

const createEmptyFeatures = (): AudioFeatures => ({
  time: 0,
  volume: 0,
  energy: 0,
  transient: 0,
  centroid: 0,
  bpm: 0,
  beatConfidence: 0,
  isBeat: false,
  isKick: false,
  isDrop: false,
  bands: emptyBands(),
  waveform: new Float32Array(FFT_SIZE),
  spectrum: new Uint8Array(FFT_SIZE / 2),
});

export class AudioAnalyzer {
  readonly events = new AudioEventBus();

  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private gain?: GainNode;
  private source?: MediaStreamAudioSourceNode | OscillatorNode | AudioBufferSourceNode;
  private inputChain: AudioNode[] = [];
  private stream?: MediaStream;
  private frequencyData = new Uint8Array(FFT_SIZE / 2);
  private timeData = new Float32Array(FFT_SIZE);
  private energyHistory: number[] = [];
  private beatTimes: number[] = [];
  private lastBeatAt = -Infinity;
  private previousEnergy = 0;
  private previousBass = 0;
  private smoothedBands = emptyBands();
  private bandFloors = emptyBands();
  private bandPeaks: FrequencyBands = {
    sub: 0.04,
    bass: 0.04,
    lowMid: 0.04,
    mid: 0.04,
    highMid: 0.04,
    treble: 0.04,
    presence: 0.04,
  };
  private features = createEmptyFeatures();
  private sourceState: AudioSourceState = { mode: 'idle', active: false };
  private demoTimer?: number;
  private inputSensitivity = 1.8;
  private inputProfileGain = 1;
  private rmsFloor = 0.002;
  private rmsPeak = 0.06;

  get state(): AudioSourceState {
    return this.sourceState;
  }

  get current(): AudioFeatures {
    return this.features;
  }

  setSensitivity(value: number): void {
    this.inputSensitivity = Math.max(0.5, Math.min(8, value));
  }

  async getAudioInputs(): Promise<Array<{ id: string; label: string }>> {
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      if (!devices.some((device) => device.kind === 'audioinput' && device.label)) {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        probe.getTracks().forEach((track) => track.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
      }
      return devices
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }));
    } catch {
      return [];
    }
  }

  async startMicrophone(deviceId = 'default'): Promise<void> {
    this.stopSource();
    try {
      this.resetCalibration();
      this.inputProfileGain = 1.8;
      const context = await this.ensureContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      const input = context.createMediaStreamSource(stream);
      this.connectSource(input, 'mic');
      this.stream = stream;
      this.source = input;
      this.sourceState = { mode: 'microphone', active: true };
    } catch (error) {
      this.sourceState = {
        mode: 'idle',
        active: false,
        error: error instanceof Error ? error.message : 'Microphone unavailable',
      };
      throw error;
    }
  }

  async startRoomMicrophone(deviceId = 'default'): Promise<void> {
    this.stopSource();
    try {
      this.resetCalibration();
      this.inputProfileGain = 2.15;
      const context = await this.ensureContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: { ideal: 48000 },
        },
        video: false,
      });
      const input = context.createMediaStreamSource(stream);
      this.connectSource(input, 'room');
      this.stream = stream;
      this.source = input;
      this.sourceState = { mode: 'room-microphone', active: true };
    } catch (error) {
      this.sourceState = {
        mode: 'idle',
        active: false,
        error: error instanceof Error ? error.message : 'Room microphone unavailable',
      };
      throw error;
    }
  }

  async startSystemAudio(): Promise<void> {
    this.stopSource();
    try {
      this.resetCalibration();
      const context = await this.ensureContext();
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('System audio capture is not available in this browser');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('No system audio track was shared');
      }
      const input = context.createMediaStreamSource(stream);
      this.connectSource(input);
      this.stream = stream;
      this.source = input;
      this.sourceState = { mode: 'system', active: true };
    } catch (error) {
      this.sourceState = {
        mode: 'idle',
        active: false,
        error: error instanceof Error ? error.message : 'System audio unavailable',
      };
      throw error;
    }
  }

  async startDemo(): Promise<void> {
    this.stopSource();
    this.resetCalibration();
    const context = await this.ensureContext();
    const merger = context.createGain();
    merger.gain.value = 0.22;

    const kick = context.createOscillator();
    const bass = context.createOscillator();
    const lead = context.createOscillator();
    const noise = context.createBufferSource();
    const noiseGain = context.createGain();

    kick.type = 'sine';
    bass.type = 'sawtooth';
    lead.type = 'triangle';
    kick.frequency.value = 52;
    bass.frequency.value = 104;
    lead.frequency.value = 392;
    noise.buffer = this.createNoiseBuffer(context);
    noise.loop = true;
    noiseGain.gain.value = 0.08;

    kick.connect(merger);
    bass.connect(merger);
    lead.connect(merger);
    noise.connect(noiseGain);
    noiseGain.connect(merger);
    this.connectSource(merger);

    const step = () => {
      const now = context.currentTime;
      const phase = (now * 2) % 1;
      const envelope = Math.exp(-phase * 8);
      kick.frequency.setTargetAtTime(46 + envelope * 42, now, 0.012);
      bass.frequency.setTargetAtTime(82 + Math.sin(now * 0.7) * 18, now, 0.04);
      lead.frequency.setTargetAtTime(220 + Math.sin(now * 1.25) * 180, now, 0.03);
      merger.gain.setTargetAtTime(0.12 + envelope * 0.35, now, 0.018);
      this.demoTimer = window.setTimeout(step, 24);
    };

    kick.start();
    bass.start();
    lead.start();
    noise.start();
    this.source = kick;
    this.sourceState = { mode: 'demo', active: true };
    step();
  }

  stopSource(): void {
    window.clearTimeout(this.demoTimer);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    if (this.source && 'stop' in this.source) {
      try {
        this.source.stop();
      } catch {
        // Source may already be stopped.
      }
    }
    this.inputChain.forEach((node) => node.disconnect());
    this.inputChain = [];
    this.source?.disconnect();
    this.source = undefined;
    this.sourceState = { mode: 'idle', active: false };
  }

  update(now = performance.now() / 1000): AudioFeatures {
    if (!this.analyser) {
      this.features = { ...this.features, time: now, isBeat: false, isKick: false, isDrop: false };
      return this.features;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeData);

    const volume = this.computeRms(this.timeData);
    const measuredBands = this.computeBands(this.frequencyData);
    const silent = volume < SILENCE_GATE;
    const bands = silent ? emptyBands() : measuredBands;
    const roomMode = this.sourceState.mode === 'room-microphone';
    const energy = silent
      ? 0
      : roomMode
        ? clamp01(volume * 0.56 + bands.bass * 0.5 + bands.mid * 0.2 + bands.treble * 0.14)
        : clamp01(volume * 1.45 + bands.bass * 0.62 + bands.mid * 0.22 + bands.treble * 0.18);
    const transient = silent ? 0 : clamp01((energy - this.previousEnergy) * 7.5);
    const bassRise = silent ? 0 : clamp01((bands.bass - this.previousBass) * 8);
    const centroid = silent ? 0 : this.computeSpectralCentroid(this.frequencyData);

    this.energyHistory.push(energy);
    if (this.energyHistory.length > HISTORY_WINDOW) this.energyHistory.shift();
    const avgEnergy = this.energyHistory.reduce((sum, value) => sum + value, 0) / this.energyHistory.length;
    const variance =
      this.energyHistory.reduce((sum, value) => sum + (value - avgEnergy) ** 2, 0) /
      this.energyHistory.length;
    const dynamicThreshold = avgEnergy + Math.sqrt(variance) * (roomMode ? 0.52 : 0.78) + (roomMode ? 0.008 : 0.018);
    const beatReady = now - this.lastBeatAt > MIN_BEAT_INTERVAL;
    const isBeat =
      !silent &&
      beatReady &&
      energy > dynamicThreshold &&
      transient > (roomMode ? 0.018 : 0.035) &&
      energy > (roomMode ? 0.018 : 0.045);
    const isKick = isBeat && (bands.bass > (roomMode ? 0.1 : 0.18) || bassRise > (roomMode ? 0.08 : 0.14));
    const isDrop = !silent && energy > 0.62 && transient > 0.08 && bands.bass + bands.mid > 0.62;
    const isEnergyPeak = !silent && energy > avgEnergy + Math.sqrt(variance) * 1.35 && energy > 0.3;

    if (isBeat) {
      this.lastBeatAt = now;
      this.beatTimes.push(now);
      this.beatTimes = this.beatTimes.filter((time) => now - time < 8);
    }

    const bpm = this.estimateBpm();
    const beatConfidence = clamp01(this.beatTimes.length / 12);
    this.previousEnergy = lerp(this.previousEnergy, energy, 0.32);
    this.previousBass = lerp(this.previousBass, bands.bass, 0.35);

    this.features = {
      time: now,
      volume,
      energy,
      transient,
      centroid,
      bpm,
      beatConfidence,
      isBeat,
      isKick,
      isDrop,
      bands,
      waveform: this.timeData,
      spectrum: this.frequencyData,
    };

    if (isBeat) this.events.emit('beat', { feature: this.features, strength: transient });
    if (isKick) this.events.emit('kick', { feature: this.features, strength: bands.bass });
    if (isDrop) this.events.emit('drop', { feature: this.features, strength: energy });
    if (isEnergyPeak) this.events.emit('energyPeak', { feature: this.features, strength: energy });
    return this.features;
  }

  private async ensureContext(): Promise<AudioContext> {
    this.context ??= new AudioContext({ latencyHint: 'interactive' });
    if (this.context.state === 'suspended') await this.context.resume();
    this.analyser ??= this.createAnalyser(this.context);
    this.gain ??= this.context.createGain();
    this.gain.gain.value = 0;
    this.analyser.connect(this.gain);
    this.gain.connect(this.context.destination);
    return this.context;
  }

  private createAnalyser(context: AudioContext): AnalyserNode {
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.58;
    analyser.minDecibels = -96;
    analyser.maxDecibels = -6;
    return analyser;
  }

  private connectSource(source: AudioNode, mode: 'direct' | 'mic' | 'room' = 'direct'): void {
    if (!this.analyser) return;
    this.inputChain.forEach((node) => node.disconnect());
    this.inputChain = [];
    if (mode === 'direct' || !this.context) {
      source.connect(this.analyser);
      return;
    }

    const highpass = this.context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = mode === 'room' ? 32 : 24;
    highpass.Q.value = 0.72;

    const lowShelf = this.context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 165;
    lowShelf.gain.value = mode === 'room' ? 10 : 5;

    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = mode === 'room' ? -48 : -44;
    compressor.knee.value = 24;
    compressor.ratio.value = mode === 'room' ? 7 : 5;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;

    const preamp = this.context.createGain();
    preamp.gain.value = mode === 'room' ? 3.4 : 2.6;

    source.connect(highpass);
    highpass.connect(lowShelf);
    lowShelf.connect(compressor);
    compressor.connect(preamp);
    preamp.connect(this.analyser);
    this.inputChain = [highpass, lowShelf, compressor, preamp];
  }

  private computeRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
    const raw = Math.sqrt(sum / buffer.length);
    if (this.sourceState.mode !== 'room-microphone') {
      return clamp01(raw * (4.2 + this.inputSensitivity * 1.8) * this.inputProfileGain);
    }

    const floorRate = raw < this.rmsFloor ? 0.025 : 0.003;
    const peakRate = raw > this.rmsPeak ? 0.16 : 0.006;
    this.rmsFloor = lerp(this.rmsFloor, raw, floorRate);
    this.rmsPeak = Math.max(0.012, lerp(this.rmsPeak, raw, peakRate));
    const floor = Math.min(this.rmsFloor + 0.0015, this.rmsPeak - 0.006);
    const range = Math.max(0.008, this.rmsPeak - floor);
    const normalized = Math.max(0, (raw - floor) / range);
    return clamp01(Math.pow(normalized, 0.9) * (0.58 + this.inputSensitivity * 0.16));
  }

  private computeBands(data: Uint8Array): FrequencyBands {
    const nyquist = (this.context?.sampleRate ?? 48000) / 2;
    const bandAverage = (fromHz: number, toHz: number) => {
      const start = Math.max(0, Math.floor((fromHz / nyquist) * data.length));
      const end = Math.min(data.length - 1, Math.ceil((toHz / nyquist) * data.length));
      let sum = 0;
      let count = 0;
      for (let i = start; i <= end; i += 1) {
        sum += data[i] / 255;
        count += 1;
      }
      return count > 0 ? sum / count : 0;
    };

    const raw = {
      sub: bandAverage(20, 60),
      bass: bandAverage(60, 180),
      lowMid: bandAverage(180, 500),
      mid: bandAverage(500, 2000),
      highMid: bandAverage(2000, 5000),
      treble: bandAverage(5000, 10000),
      presence: bandAverage(10000, 16000),
    };

    const normalized = this.normalizeBands(raw);

    const smooth = 0.38;
    this.smoothedBands = {
      sub: lerp(this.smoothedBands.sub, normalized.sub, smooth),
      bass: lerp(this.smoothedBands.bass, normalized.bass, smooth),
      lowMid: lerp(this.smoothedBands.lowMid, normalized.lowMid, smooth),
      mid: lerp(this.smoothedBands.mid, normalized.mid, smooth),
      highMid: lerp(this.smoothedBands.highMid, normalized.highMid, smooth),
      treble: lerp(this.smoothedBands.treble, normalized.treble, smooth),
      presence: lerp(this.smoothedBands.presence, normalized.presence, smooth),
    };
    return this.smoothedBands;
  }

  private normalizeBands(raw: FrequencyBands): FrequencyBands {
    const normalize = (key: keyof FrequencyBands) => {
      const value = raw[key];
      const floorRate = value < this.bandFloors[key] ? 0.018 : 0.002;
      const peakRate = value > this.bandPeaks[key] ? 0.22 : 0.004;
      this.bandFloors[key] = lerp(this.bandFloors[key], value, floorRate);
      this.bandPeaks[key] = Math.max(0.025, lerp(this.bandPeaks[key], value, peakRate));
      const floor = Math.min(this.bandFloors[key] + 0.004, this.bandPeaks[key] - 0.012);
      const range = Math.max(0.018, this.bandPeaks[key] - floor);
      const normalized = (value - floor) / range;
      const sensitivity = this.sourceState.mode === 'room-microphone' ? 0.78 + this.inputSensitivity * 0.22 : this.inputSensitivity;
      return clamp01(Math.pow(Math.max(0, normalized) * sensitivity * this.inputProfileGain, 0.86));
    };

    return {
      sub: normalize('sub'),
      bass: normalize('bass'),
      lowMid: normalize('lowMid'),
      mid: normalize('mid'),
      highMid: normalize('highMid'),
      treble: normalize('treble'),
      presence: normalize('presence'),
    };
  }

  private resetCalibration(): void {
    this.energyHistory = [];
    this.beatTimes = [];
    this.lastBeatAt = -Infinity;
    this.previousEnergy = 0;
    this.previousBass = 0;
    this.smoothedBands = emptyBands();
    this.bandFloors = emptyBands();
    this.bandPeaks = {
      sub: 0.04,
      bass: 0.04,
      lowMid: 0.04,
      mid: 0.04,
      highMid: 0.04,
      treble: 0.04,
      presence: 0.04,
    };
    this.rmsFloor = 0.002;
    this.rmsPeak = 0.06;
  }

  private computeSpectralCentroid(data: Uint8Array): number {
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 1) {
      const magnitude = data[i] / 255;
      weighted += i * magnitude;
      total += magnitude;
    }
    return total > 0 ? clamp01(weighted / total / data.length) : 0;
  }

  private estimateBpm(): number {
    if (this.beatTimes.length < 4) return this.features.bpm;
    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i += 1) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }
    const candidates = intervals
      .map((interval) => {
        let bpm = 60 / interval;
        while (bpm < BPM_MIN) bpm *= 2;
        while (bpm > BPM_MAX) bpm /= 2;
        return bpm;
      })
      .filter((bpm) => Number.isFinite(bpm));
    if (!candidates.length) return this.features.bpm;
    const average = candidates.reduce((sum, value) => sum + value, 0) / candidates.length;
    return Math.round(lerp(this.features.bpm || average, average, 0.18));
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < output.length; i += 1) {
      output[i] = (Math.random() * 2 - 1) * 0.25;
    }
    return buffer;
  }
}
