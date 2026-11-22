import { pourPlan, tick, totalWater, type Active, type Preferences } from './domain.ts';

export type BrewAudioMode = 'off' | 'tone' | 'voice';
export function audioMode(prefs: Pick<Preferences, 'sound' | 'voice'>): BrewAudioMode {
  if (!prefs.sound) return 'off';
  return prefs.voice ? 'voice' : 'tone';
}
export function audioPreferences(mode: BrewAudioMode) {
  return { sound: mode !== 'off', voice: mode === 'voice' };
}

function duration(seconds: number) {
  const units = [[3600, 'hora', 'horas'], [60, 'minuto', 'minutos'], [1, 'segundo', 'segundos']] as const;
  let rest = Math.ceil(seconds);
  const parts: string[] = [];
  for (const [unit, singular, plural] of units) {
    const n = Math.floor(rest / unit);
    if (n) parts.push(n === 1 ? (unit === 3600 ? 'una ' : 'un ') + singular : n + ' ' + plural);
    rest %= unit;
  }
  return parts.join(' y ');
}

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const grams = (n: number) => n === 1 ? 'un gramo' : number.format(n) + ' gramos';

export function brewCue(active: Active | null, now: number) {
  if (!active || active.status !== 'brewing' || active.pausedAt !== null) return null;
  // After a suspended tab wakes, wait for the clock to commit the current step.
  if (tick(active, now).stepIndex !== active.stepIndex) return null;
  const { config, stepIndex } = active;
  const step = config.recipe.steps[stepIndex];
  const left = Math.ceil(step.seconds - Math.max(0, now - active.stepStartedAt) / 1000);
  const key = active.id + '/' + stepIndex;
  const plan = pourPlan(active);
  const choice = active.waterChoice?.stepIndex === stepIndex ? active.waterChoice.strategy : undefined;
  if (plan.canChoose && !choice) return { key: key + '/choice', text: 'El peso anterior cambió. Elige si quieres seguir las cantidades de la receta o mantener el objetivo de la báscula.' };
  if (left <= 0) {
    const text = config.recipe.id === 'espresso'
      ? 'Se cumplió el tiempo de referencia. Revisa el peso en la taza y detén la bomba al alcanzar el objetivo.'
      : 'Se cumplió el tiempo de referencia. Confirma cuando termines.';
    return {key: key + '/due', text};
  }

  const add = choice === 'target' && plan.canChoose ? plan.adjusted : plan.planned.add;
  const underway = step.seconds - left >= 5;
  let instruction: string;
  if (plan.planned.add > 0) {
    const target = plan.canChoose && choice === 'recipe' ? '' : ' Hasta que la báscula marque ' + grams(plan.planned.total) + '.';
    if (add === 0) instruction = 'Ya alcanzaste el objetivo de agua.';
    else if (underway) instruction = 'Este vertido es de ' + grams(add) + ' de agua en total.' + target;
    else instruction = 'Ahora vierte ' + grams(add) + ' de agua.' + (stepIndex ? target : '');
    if (!underway) instruction += ' ' + step.instruction;
  } else if (config.recipe.id === 'espresso') {
    instruction = step.instruction + ' El objetivo en la taza es de ' + grams(totalWater(config)) + ' de bebida.';
  } else {
    instruction = step.instruction;
  }
  const timing = underway ? (left === 1 ? 'Queda ' : 'Quedan ') + duration(left) + ' de referencia.'
    : 'Tiempo de este paso, ' + duration(step.seconds) + '.';
  return {key: key + '/' + (choice || 'step'), text: instruction + ' ' + timing};
}
