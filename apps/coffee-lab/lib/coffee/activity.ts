import type { Brew } from './domain.ts';

export function dayKey(date: Date): string {
 return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}

export function monthActivity(brews: readonly Brew[], year: number, month: number) {
 const start = new Date(year, month, 1);
 const end = new Date(year, month+1, 1);
 const days = new Map<string, number>();
 let cups=0, rated=0;
 const methods = new Set<string>();
 for (const brew of brews) {
  if (brew.startedAt < start.getTime() || brew.startedAt >= end.getTime()) continue;
  const key = dayKey(new Date(brew.startedAt));
  days.set(key, (days.get(key) ?? 0)+1);
  cups++;
  if (brew.evaluation.rating > 0) rated++;
  methods.add(brew.config.recipe.id);
 }
 return {days, cups, rated, methods:methods.size, offset:(start.getDay()+6)%7, length:new Date(year,month+1,0).getDate()};
}

export function favoriteBrew(brews: readonly Brew[]): Brew | undefined {
 return brews.reduce<Brew | undefined>((best, brew) => {
  const rating = brew.evaluation.rating;
  if (rating <= 0) return best;
  if (!best || rating > best.evaluation.rating || (rating === best.evaluation.rating && brew.startedAt > best.startedAt)) return brew;
  return best;
 }, undefined);
}

export function daysSinceDate(value: string, today = new Date()): number | null {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
 const date = new Date(value+'T00:00:00Z');
 if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) return null;
 const days = (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - date.getTime())/86_400_000;
 return days < 0 ? null : days;
}
