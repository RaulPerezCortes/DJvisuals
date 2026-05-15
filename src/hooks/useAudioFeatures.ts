import { useContext } from 'react';
import { AudioReactContext } from '../audio/AudioProvider';

export function useAudioFeatures() {
  const context = useContext(AudioReactContext);
  if (!context) throw new Error('useAudioFeatures must be used inside AudioProvider');
  return context;
}
