import { useCallback, useEffect, useRef } from 'react';
import type { Active } from '@/lib/coffee/domain';
import { brewCue, type BrewAudioMode } from '@/lib/coffee/brew-voice';
import { BrewAudioPlayer } from '@/lib/coffee/brew-audio-player';

export function useBrewAudio(active: Active | null, now: number, mode: BrewAudioMode) {
  const player = useRef<BrewAudioPlayer | null>(null);
  const last = useRef('');
  const unlock = useCallback(() => {
    player.current ??= new BrewAudioPlayer();
    player.current.unlock();
  }, []);
  const cue = brewCue(active, now);
  // The clock rerenders the timer. Only a new step, choice or deadline should speak.
  const announce = useCallback((repeat = false) => {
    const current = brewCue(active, Date.now());
    if (!current || mode === 'off' || document.hidden || !player.current) {
      if (last.current) player.current?.stop();
      last.current = '';
      return;
    }
    const key = mode + '/' + current.key;
    if (repeat || key !== last.current) {
      last.current = key;
      void player.current.play(mode, current.text);
    }
  }, [active,mode]);
  useEffect(() => {
    announce();
    document.addEventListener('visibilitychange', announceVisible);
    function announceVisible() { announce(); }
    return () => document.removeEventListener('visibilitychange', announceVisible);
  }, [cue?.key, announce]);
  // A restored session needs a new user gesture to enable audio on mobile.
  useEffect(() => {
    if (!active || active.status !== 'brewing' || mode === 'off' || player.current) return;
    const activate = () => { unlock(); announce(); };
    document.addEventListener('click', activate, {once:true});
    return () => document.removeEventListener('click',activate);
  },[active,mode,unlock,announce]);
  useEffect(() => () => { player.current?.close(); player.current = null; last.current = ''; }, []);
  return {unlock, repeat: () => { unlock(); announce(true); }};
}
