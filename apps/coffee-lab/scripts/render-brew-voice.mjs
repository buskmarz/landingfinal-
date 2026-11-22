// Bakes the public starter recipes into the app once. Never called by the build or timer.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { RECIPES, defaultConfig, EMPTY_EVAL } from '../lib/coffee/domain.ts';
import { brewCue } from '../lib/coffee/brew-voice.ts';

const manifest = new URL('../lib/coffee/brew-voice-clips.json', import.meta.url);
const folder = new URL('../public/voice/', import.meta.url);
const catalog = {};
for (const recipe of RECIPES) {
  for (const [stepIndex, step] of recipe.steps.entries()) {
    const active = {id:'sample', config:defaultConfig(recipe), stepIndex, mode:'guided', status:'brewing',
      startedAt:0, stepStartedAt:0, pausedAt:null, finishedAt:null, physicalSeconds:null, evaluation:EMPTY_EVAL};
    for (const at of [0, step.seconds * 1000]) {
      const cue = brewCue(active, at);
      if (cue) catalog[cue.text] = createHash('sha256').update('tts-1-hd/nova/v1/' + cue.text).digest('hex').slice(0,20) + '.mp3';
    }
  }
}
const pending = [];
for (const [text, file] of Object.entries(catalog)) {
  const bytes = await readFile(new URL(file, folder)).catch(() => null);
  if (!bytes?.length) pending.push({text, file});
}
// tts-1-hd is priced per character. Count UTF-8 bytes conservatively.
const cost = pending.reduce((sum, clip) => sum + Buffer.byteLength(clip.text), 0) * 30 / 1_000_000;
console.log(pending.length + ' clips pendientes. Estimación máxima US$' + cost.toFixed(4));
if (process.argv.includes('--generate')) {
  if (cost > 3) throw Error('El lote supera US$3.');
  const key = process.env.COFFEE_LAB_OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!key && pending.length) throw Error('Falta la clave privada de OpenAI.');
  await mkdir(folder, {recursive:true});
  for (const {text, file} of pending) {
    const result = await fetch('https://api.openai.com/v1/audio/speech', {method:'POST',
      headers:{Authorization:'Bearer ' + key, 'Content-Type':'application/json'},
      body:JSON.stringify({model:'tts-1-hd', voice:'nova', input:text, response_format:'mp3'}), signal:AbortSignal.timeout(45000)});
    if (!result.ok || !result.headers.get('content-type')?.startsWith('audio/')) throw Error('Audio no generado. HTTP ' + result.status);
    const bytes = Buffer.from(await result.arrayBuffer());
    if (bytes.length < 128) throw Error('Audio incompleto.');
    const dest = new URL(file,folder);
    const temp = new URL(file + '.tmp',folder);
    await writeFile(temp,bytes);
    await rename(temp,dest);
  }
  await writeFile(manifest,JSON.stringify(catalog,null,2) + '\n');
}
