import { VisualEngine } from './components/VisualEngine';
import { AudioProvider } from './audio/AudioProvider';

export function App() {
  return (
    <AudioProvider>
      <VisualEngine />
    </AudioProvider>
  );
}
