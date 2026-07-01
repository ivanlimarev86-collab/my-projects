// engine/render/sprite.js — SPRITE-бэкенд рендера: подключает СГЕНЕРЁННУЮ
// графику/анимацию (из твоего API) через манифест ассетов (см.
// prototype/assets-manifest.example.json и prototype/VISUAL-ANIM-ARCH.md).
//
// Ключевая идея: логика боя НЕ меняется. Манифест описывает спрайт-листы по
// клипам (idle/walk/strike_*/...), их кадры/тайминги, точку якоря и точки
// привязки (handR для оружия). Кадр выбирается по тому же animState, что и в
// силуэте. Если ассет ещё не сгенерён/не загружен — падаем на силуэт (fallback).

import { clipFor } from '../anim/animation.js';
import { WEAPONS } from '../data/units.js';

export class AssetStore {
  constructor() { this.manifest = null; this.images = new Map(); }
  // manifest — объект; loadImage — функция (url)->Promise<Image> (среда-зависимо)
  async load(manifest, loadImage) {
    this.manifest = manifest;
    const urls = new Set();
    for (const key in manifest.units || {}) {
      const u = manifest.units[key];
      for (const cl in u.clips || {}) if (u.clips[cl].image) urls.add(u.clips[cl].image);
      if (u.weapon && u.weapon.image) urls.add(u.weapon.image);
    }
    await Promise.all([...urls].map(async (url) => {
      try { this.images.set(url, await loadImage(url)); } catch { /* пропускаем — будет fallback */ }
    }));
  }
  unit(key) { return this.manifest && this.manifest.units ? this.manifest.units[key] : null; }
  img(url)  { return this.images.get(url); }
}

export class SpriteRenderer {
  constructor(store, fallback) { this.store = store; this.fallback = fallback; }

  drawUnit(ctx, u, view) {
    const def = this.store.unit(u.assetKey);
    const clip = def && def.clips ? def.clips[clipFor(u.animState)] : null;
    const sheet = clip && this.store.img(clip.image);
    if (!def || !clip || !sheet) { return this.fallback.drawUnit(ctx, u, view); } // graceful fallback

    const H = u.heightW * view.sc * (view.unitScale || 1);
    const scale = H / def.size.heightPx;
    const dir = u.dir || 1;
    const fw = clip.frameSize[0], fh = clip.frameSize[1];
    const frame = clip.loop
      ? Math.floor((u.anim.t / (CLIPdur(clip))) * clip.frames) % clip.frames
      : Math.min(clip.frames - 1, Math.floor((u.anim.t / CLIPdur(clip)) * clip.frames));
    const sx = (frame % (sheet.width / fw | 0)) * fw;
    const sy = Math.floor(frame / (sheet.width / fw | 0)) * fh;

    const anchor = def.size.anchor || [0.5, 1.0];
    const dx = view.X(u.x) - fw * scale * anchor[0];
    const dy = view.Y(u.y) - fh * scale * anchor[1];

    ctx.save();
    if (dir < 0) { ctx.translate(view.X(u.x), 0); ctx.scale(-1, 1); ctx.translate(-view.X(u.x), 0); }
    if (u.dead) { const f = Math.min(1, u.deathT * 2); ctx.translate(view.X(u.x), view.Y(u.y));
      ctx.rotate(1.3 * f); ctx.translate(-view.X(u.x), -view.Y(u.y)); }
    ctx.drawImage(sheet, sx, sy, fw, fh, dx, dy, fw * scale, fh * scale);

    // оружие по точке привязки кадра (attach.handR[frame]) или из позы скелета
    if (!u.disarmed && def.weapon && this.store.img(def.weapon.image)) {
      const grip = (clip.attach && clip.attach.handR && clip.attach.handR[frame]) || null;
      const wimg = this.store.img(def.weapon.image);
      if (grip) {
        const gx = dx + grip[0] * scale, gy = dy + grip[1] * scale;
        ctx.drawImage(wimg, gx - def.weapon.grip[0]*scale, gy - def.weapon.grip[1]*scale,
          def.weapon.size[0]*scale, def.weapon.size[1]*scale);
      }
    }
    ctx.restore();
  }
}

function CLIPdur(clip) { return clip.frames / (clip.fps || 12); }
