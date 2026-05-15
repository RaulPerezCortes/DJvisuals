export interface EngineSettings {
  artistName: string;
  sceneId: string;
  beatOnlyMotion: boolean;
  audioInputId: string;
  audioSensitivity: number;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  textGlowColor: string;
  textSize: number;
  textOpacity: number;
  textX: number;
  textY: number;
  textMotionAmount: number;
  textMotionSpeed: number;
  textAudioMotion: boolean;
  textLayer: 'front' | 'back';
  intensity: number;
  speed: number;
  bloom: number;
  trails: number;
  glitch: number;
  rgbShift: number;
  filmGrain: number;
  vignette: number;
  debug: boolean;
  pixelRatioCap: number;
}

export const defaultEngineSettings: EngineSettings = {
  artistName: 'artist name',
  sceneId: 'particle-galaxy',
  beatOnlyMotion: true,
  audioInputId: 'default',
  audioSensitivity: 2.5,
  backgroundColor: '#050508',
  primaryColor: '#ff2a87',
  secondaryColor: '#00f2ff',
  accentColor: '#fff06a',
  textColor: '#ffffff',
  textGlowColor: '#ff2a87',
  textSize: 1,
  textOpacity: 0.94,
  textX: 50,
  textY: 78,
  textMotionAmount: 0,
  textMotionSpeed: 0.8,
  textAudioMotion: true,
  textLayer: 'front',
  intensity: 1,
  speed: 1,
  bloom: 0.2,
  trails: 0.32,
  glitch: 0,
  rgbShift: 0.38,
  filmGrain: 0,
  vignette: 0.5,
  debug: true,
  pixelRatioCap: 1.75,
};
