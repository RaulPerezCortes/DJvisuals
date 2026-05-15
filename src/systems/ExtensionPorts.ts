export interface FutureExtensionPorts {
  webcamReactive: 'MediaPipe/WebCodecs input bus reserved';
  oscProtocol: 'WebSocket or WebRTC OSC bridge reserved';
  abletonLink: 'Native bridge or LinkKit service reserved';
  ndiOutput: 'Electron/native bridge reserved';
  syphonSpout: 'Native GPU texture bridge reserved';
  aiTextures: 'Async texture provider reserved';
  webgpuMigration: 'Renderer adapter boundary reserved';
  multiplayerSync: 'CRDT/WebRTC clock sync reserved';
  recordingExport: 'MediaRecorder/WebCodecs output reserved';
  visualPresets: 'Serializable EngineSettings and scene params reserved';
  timelineSystem: 'Clocked automation tracks reserved';
}

export const extensionPorts: FutureExtensionPorts = {
  webcamReactive: 'MediaPipe/WebCodecs input bus reserved',
  oscProtocol: 'WebSocket or WebRTC OSC bridge reserved',
  abletonLink: 'Native bridge or LinkKit service reserved',
  ndiOutput: 'Electron/native bridge reserved',
  syphonSpout: 'Native GPU texture bridge reserved',
  aiTextures: 'Async texture provider reserved',
  webgpuMigration: 'Renderer adapter boundary reserved',
  multiplayerSync: 'CRDT/WebRTC clock sync reserved',
  recordingExport: 'MediaRecorder/WebCodecs output reserved',
  visualPresets: 'Serializable EngineSettings and scene params reserved',
  timelineSystem: 'Clocked automation tracks reserved',
};
