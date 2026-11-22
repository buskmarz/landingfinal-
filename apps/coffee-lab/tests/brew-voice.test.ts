import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, EMPTY_EVAL, defaultConfig, type Active } from '../lib/coffee/domain.ts';
import { audioMode, brewCue } from '../lib/coffee/brew-voice.ts';

function brew(method = 'v60', index = 0): Active {
  return {id:'demo',config:defaultConfig(RECIPES.find(r => r.id === method)!),stepIndex:index,startedAt:0,stepStartedAt:0,
    finishedAt:null,physicalSeconds:null,pausedAt:null,status:'brewing',evaluation:EMPTY_EVAL};
}
test('voice follows customized water, cumulative target and reference times', () => {
  const a=brew(); a.config.dose=20;
  assert.match(brewCue(a,0)!.text,/64 gramos de agua.*40 segundos/);
  a.stepIndex=1;
  assert.match(brewCue(a,0)!.text,/128 gramos de agua.*192 gramos.*45 segundos/);
  assert.match(brewCue(brew('french',1),0)!.text,/3 minutos y 30 segundos/);
  assert.match(brewCue(brew('cold',1),0)!.text,/12 horas/);
});
test('espresso speaks beverage yield and Moka preserves its valve instruction', () => {
  assert.match(brewCue(brew('espresso'),0)!.text,/36 gramos de bebida/);
  assert.doesNotMatch(brewCue(brew('espresso'),0)!.text,/vierte/i);
  assert.match(brewCue(brew('moka'),0)!.text,/sin cubrir la válvula/);
});
test('no old pours after catchup and no duplicate cue key for a ticking step', () => {
  const a=brew();
  assert.equal(brewCue(a,1200)!.text,brewCue(a,0)!.text);
  assert.equal(brewCue(a,7500)!.key,brewCue(a,0)!.key);
  assert.match(brewCue(a,7500)!.text,/33 segundos/);
  assert.equal(brewCue(a,42000),null);
  a.stepIndex=3;
  assert.match(brewCue(a,55000)!.text,/Se cumplió el tiempo/);
  a.pausedAt=1000; assert.equal(brewCue(a,2000),null);
  a.pausedAt=null; a.status='review'; assert.equal(brewCue(a,2000),null);
});
test('a declared deviation requires a choice before announcing a quantity', () => {
  const a=brew('v60',1); a.mode='paced'; a.events=[{stepIndex:0,startedAt:0,endedAt:1,completed:true,actualTotal:65}];
  assert.doesNotMatch(brewCue(a,0)!.text,/gramos de agua/);
  a.waterChoice={stepIndex:1,strategy:'target'};
  assert.match(brewCue(a,0)!.text,/108 gramos de agua.*173 gramos/);
  a.waterChoice.strategy='recipe';
  const original=brewCue(a,0)!.text;
  assert.match(original,/115 gramos de agua/); assert.doesNotMatch(original,/173 gramos/);
});
test('old sound and silence settings survive the new voice option', () => {
  assert.equal(audioMode({sound:true}),'tone');
  assert.equal(audioMode({sound:false}),'off');
  assert.equal(audioMode({sound:true,voice:true}),'voice');
});
