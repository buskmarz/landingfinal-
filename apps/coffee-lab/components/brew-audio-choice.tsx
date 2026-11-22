import type { BrewAudioMode } from '@/lib/coffee/brew-voice';
import { hasRecordedVoice } from '@/lib/coffee/brew-audio-player';

export function BrewAudioChoice({value,onChange}:{value:BrewAudioMode;onChange:(value:BrewAudioMode)=>void}) {
  return <label className="field lab-select-field">Avisos de la guía
    <select aria-label="Avisos de la guía" value={value} onChange={event => onChange(event.target.value as BrewAudioMode)}>
      <option value="voice">Voz en español</option>
      <option value="tone">Solo tono</option>
      <option value="off">Silencio</option>
    </select>
    {value === 'voice' && hasRecordedVoice && <small>Voz generada por IA. Para indicaciones personalizadas se usa la voz del dispositivo.</small>}
  </label>;
}
