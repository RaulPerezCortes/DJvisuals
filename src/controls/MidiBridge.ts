type MidiMessageHandler = (data: Uint8Array) => void;

export class MidiBridge {
  private access?: MIDIAccess;
  private handler?: MidiMessageHandler;

  async init(handler: MidiMessageHandler): Promise<boolean> {
    this.handler = handler;
    if (!navigator.requestMIDIAccess) return false;
    this.access = await navigator.requestMIDIAccess();
    const access = this.access;
    access.inputs.forEach((input) => {
      input.onmidimessage = (event) => {
        if (event.data) this.handler?.(event.data);
      };
    });
    return true;
  }

  dispose(): void {
    this.access?.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
  }
}
