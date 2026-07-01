// engine/index.js — точка сборки движка. Игра импортирует только отсюда.
// Контракт (упрощённый §11 ТЗ): создать бой, тикать, слушать события, забрать
// результат. Рендер подключается отдельным бэкендом (силуэт сейчас, sprite — с
// твоей сгенерённой графикой).

export { Battle } from './arena/battle.js';
export { SilhouetteRenderer } from './render/silhouette.js';
export { SpriteRenderer, AssetStore } from './render/sprite.js';
export { FX } from './render/fx.js';
export { UNIT_TYPES, WEAPONS, FACTIONS } from './data/units.js';
export { CLIPS } from './anim/animation.js';

// view — мост мировые<->экранные координаты. Рендер обновляет его при resize.
export function makeView() {
  const v = { W: 0, H: 0, sc: 1, ox: 0, oy: 0, laneY: 0,
    X(wx) { return wx * this.sc + this.ox; },
    Y(wy) { return wy * this.sc + this.oy; } };
  return v;
}
