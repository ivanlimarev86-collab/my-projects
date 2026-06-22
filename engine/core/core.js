// engine/core/core.js — базовые утилиты: детерминированный RNG, мат, события.
// Ни от чего не зависит. Используется всем движком.

// --- Детерминированный ГПСЧ (mulberry32). Один сид -> один бой (реплеи/тесты). ---
export function makeRNG(seed = 12345) {
  let s = seed >>> 0;
  const next = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + next() * (b - a),
    int:   (a, b) => Math.floor(a + next() * (b - a + 1)),
    chance: (p) => next() < p,
    pick:  (arr) => arr[Math.floor(next() * arr.length)],
  };
}

// --- мат ---
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp  = (a, b, t) => a + (b - a) * t;
export const dist  = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const TAU   = Math.PI * 2;

// --- простая шина событий: движок -> рендер/звук/игра ---
export class Emitter {
  constructor() { this.h = new Map(); }
  on(ev, fn)  { (this.h.get(ev) || this.h.set(ev, []).get(ev)).push(fn); return this; }
  emit(ev, p) { const a = this.h.get(ev); if (a) for (const f of a) f(p); }
}
