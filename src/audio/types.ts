export type AudioEventName = 'beat' | 'kick' | 'drop' | 'energyPeak';

export interface FrequencyBands {
  sub: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  presence: number;
}

export interface AudioFeatures {
  time: number;
  volume: number;
  energy: number;
  transient: number;
  centroid: number;
  bpm: number;
  beatConfidence: number;
  isBeat: boolean;
  isKick: boolean;
  isDrop: boolean;
  bands: FrequencyBands;
  waveform: Float32Array;
  spectrum: Uint8Array;
}

export interface AudioEventPayload {
  feature: AudioFeatures;
  strength: number;
}

export type AudioEventHandler = (payload: AudioEventPayload) => void;

export interface AudioSourceState {
  mode: 'idle' | 'microphone' | 'room-microphone' | 'system' | 'demo';
  active: boolean;
  error?: string;
}
