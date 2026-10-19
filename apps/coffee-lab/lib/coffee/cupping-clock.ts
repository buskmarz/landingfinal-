/** Compare wall time with the monotonic page clock; sleep and clock edits can diverge. */
export type ClockAnchor={wall:number;monotonic:number};
export function clockDiverged(anchor:ClockAnchor,wall:number,monotonic:number){
 if(![anchor.wall,anchor.monotonic,wall,monotonic].every(Number.isFinite)||monotonic<anchor.monotonic)return true;
 return Math.abs((wall-anchor.wall)-(monotonic-anchor.monotonic))>5000;
}
