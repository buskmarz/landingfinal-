import { Capacitor, registerPlugin } from '@capacitor/core';
import manifest from './brew-voice-clips.json';
import type { BrewAudioMode } from './brew-voice';

const recordings: Record<string, string> = manifest;
export const hasRecordedVoice = Object.keys(recordings).length > 0;
const nativeSpeech = registerPlugin<{ speak(options:{text:string}):Promise<void>; stop():Promise<void> }>('CoffeeSpeech');

export class BrewAudioPlayer {
  private context?: AudioContext;
  private source?: AudioScheduledSourceNode;
  private utterance?: SpeechSynthesisUtterance;
  private download?: AbortController;
  private version = 0;
  private native = Capacitor.isPluginAvailable('CoffeeSpeech');

  // Called in the tap handler, before any asynchronous storage transaction.
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== 'running') void this.context.resume().catch(() => {});
    } catch { /* The device may still provide spoken instructions. */ }
  }

  stop() {
    this.version++;
    this.download?.abort();
    this.download = undefined;
    try { this.source?.stop(); } catch { /* It may already have ended. */ }
    this.source = undefined;
    if (this.utterance) {
      this.utterance.onerror = null;
      this.utterance = undefined;
      window.speechSynthesis?.cancel();
    }
    if (this.native) void nativeSpeech.stop().catch(() => {});
  }

  close() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
  }

  private tone() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const note = ctx.createOscillator();
    const level = ctx.createGain();
    note.frequency.value = 660;
    level.gain.setValueAtTime(.06,ctx.currentTime);
    level.gain.exponentialRampToValueAtTime(.001,ctx.currentTime + .23);
    note.connect(level).connect(ctx.destination);
    this.source = note;
    note.start();
    note.stop(ctx.currentTime + .25);
  }

  private deviceVoice(text: string, version: number) {
    if (version !== this.version) return;
    const fallback = () => { if (version === this.version) this.tone(); };
    if (this.native) {
      void nativeSpeech.speak({text}).catch(fallback);
      return;
    }
    try {
      const synth = window.speechSynthesis;
      const voice = new SpeechSynthesisUtterance(text);
      voice.lang = 'es-MX';
      const voices = synth.getVoices();
      const spanish = voices.find(v => v.localService && /^es[-_]MX$/i.test(v.lang))
        ?? voices.find(v => v.localService && /^es\b/i.test(v.lang));
      if (spanish) voice.voice = spanish;
      voice.onerror = fallback;
      this.utterance = voice;
      synth.speak(voice);
    } catch { fallback(); }
  }

  async play(mode: BrewAudioMode, text: string) {
    this.stop();
    const version = this.version;
    if (mode === 'off') return;
    if (mode === 'tone') { this.tone(); return; }
    const file = recordings[text];
    const ctx = this.context;
    if (file && ctx?.state === 'running') {
      const controller = new AbortController();
      this.download = controller;
      const timeout = window.setTimeout(() => controller.abort(), 1200);
      try {
        const response = await fetch('/coffee-lab/voice/' + file, {signal:controller.signal});
        if (!response.ok) throw Error();
        const data = await ctx.decodeAudioData(await response.arrayBuffer());
        if (version !== this.version) return;
        const source = ctx.createBufferSource();
        source.buffer = data;
        source.connect(ctx.destination);
        this.source = source;
        source.start();
        return;
      } catch { /* Fall back to device speech if the clip is unavailable. */ }
      finally { clearTimeout(timeout); }
    }
    this.deviceVoice(text,version);
  }
}
