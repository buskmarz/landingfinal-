import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthActivity, favoriteBrew, daysSinceDate, dayKey } from '../lib/coffee/activity.ts';
import { RECIPES, defaultConfig, EMPTY_EVAL, type Brew } from '../lib/coffee/domain.ts';
const brew = (id: string, date: Date, rating: number, method=0): Brew => ({
 id, config:defaultConfig(RECIPES[method]), startedAt:date.getTime(),
 finishedAt:date.getTime()+150000, physicalSeconds:150, evaluation:{...EMPTY_EVAL,rating}
});
test('calendar groups local days and counts only this month',()=>{
 const day = new Date(2026,10,1,23,55);
 const result=monthActivity([brew('a',day,4),brew('b',day,0,1),brew('c',new Date(2026,9,31,23,55),5)],2026,10);
 assert.deepEqual([result.cups,result.rated,result.methods,result.days.get(dayKey(day))],[2,1,2,2]);
});
test('favorite uses actual rating, with newest winning ties',()=>{
 const a=brew('a',new Date(2026,10,1),4),b=brew('b',new Date(2026,10,2),4),c=brew('c',new Date(2026,10,3),0);
 assert.equal(favoriteBrew([c,a,b])?.id,'b');
 assert.equal(favoriteBrew([c]),undefined);
});
test('bag age uses calendar days and rejects invalid or future dates',()=>{
 const today=new Date(2026,10,6,23,55);
 assert.equal(daysSinceDate('2026-11-01',today),5);
 assert.equal(daysSinceDate('2026-11-06',today),0);
 for(const bad of ['','2026-02-30','2026-11-07'])assert.equal(daysSinceDate(bad,today),null);
});
