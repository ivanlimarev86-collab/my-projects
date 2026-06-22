// engine/arena/battle.js — МЕНЕДЖЕР ПОЛЯ (формат §1.5/§7 ТЗ): две базы,
// дорожка, спавн волнами, поиск целей, тик симуляции, события. Рендер вынесен
// в render-бэкенды (silhouette/sprite) — этот класс их только вызывает.

import { makeRNG, Emitter, dist } from '../core/core.js';
import { makeBody } from '../model/body.js';
import { UNIT_TYPES, FACTIONS, rollStats } from '../data/units.js';
import { AnimController } from '../anim/animation.js';
import { think } from '../ai/brain.js';

let _uid = 0;

export class Battle {
  constructor(opts = {}) {
    this.rng = makeRNG(opts.seed || 12345);
    this.emitter = new Emitter();
    this.ctx = { rng: this.rng, emit: (e, p) => this.emitter.emit(e, p) };

    this.world = { wWidth: 200, wHeight: 0, laneY: 0, laneH: 40 };
    this.leftBase  = { x: 16,  hp: opts.baseHp || 1000, max: opts.baseHp || 1000, side: 'L' };
    this.rightBase = { x: 184, hp: opts.baseHp || 1000, max: opts.baseHp || 1000, side: 'R' };
    this.baseReachW = 12;

    this.units = [];
    this.drops = [];
    this.stats = { lKills: 0, rKills: 0 };
    this.spawn = { L: 0, R: 0 };
    this.spawnPool = opts.spawnPool || ['soldier', 'soldier', 'spearman', 'imp', 'brute'];
    this.maxPerSide = opts.maxPerSide || 14;
    this.over = false; this.winner = null;

    this.emitter.on('death', (e) => { this.stats[e.unit.side === 'L' ? 'rKills' : 'lKills']++; });
    this.emitter.on('disarm', (e) => { this.drops.push({ x: e.unit.x + e.unit.dir * 4, y: e.unit.y, taken: false }); });
  }

  on(ev, fn) { this.emitter.on(ev, fn); return this; }
  enemyBase(u) { return u.side === 'L' ? this.rightBase : this.leftBase; }

  setViewportWorld(wHeight) { // рендер сообщает пропорции экрана
    this.world.wHeight = wHeight;
    this.world.laneY = wHeight * 0.46;
    this.world.laneH = wHeight * 0.34;
  }

  createUnit(side, typeKey) {
    const type = UNIT_TYPES[typeKey] || UNIT_TYPES.soldier;
    const st = rollStats(type, this.rng);
    const body = makeBody(type.bodyTemplate);
    const u = {
      id: ++_uid, side, dir: side === 'L' ? 1 : -1, face: side === 'L' ? 1 : -1,
      typeKey, assetKey: type.assetKey, faction: type.faction, weapon: type.weapon,
      heightW: type.heightW, detectW: type.heightW * 1.8,
      ...st, painTol: st.painTol,
      pain: 0, morale: 1, stamina: 100, maxStam: 100, vitality: 100,
      parts: body.parts, bleedMul: body.bleedMul, bleedTotal: 0,
      state: 'advance', animState: 'walk', timer: 0, move: null, target: null,
      dead: false, deathT: 0, disarmed: false, flinch: 0, knock: 0,
      anim: new AnimController(),
      x: 0, y: 0,
      laneMin: this.world.laneY - this.world.laneH / 2,
      laneMax: this.world.laneY + this.world.laneH / 2,
    };
    const base = side === 'L' ? this.leftBase : this.rightBase;
    u.x = base.x + (side === 'L' ? 1 : -1) * this.rng.range(4, 10);
    u.y = this.world.laneY + this.rng.range(-this.world.laneH / 2, this.world.laneH / 2);
    this.units.push(u);
    return u;
  }

  spawnWaves(dt) {
    for (const side of ['L', 'R']) {
      this.spawn[side] -= dt;
      if (this.spawn[side] <= 0) {
        this.spawn[side] = this.rng.range(1.4, 2.6);
        const alive = this.units.filter(u => !u.dead && u.side === side).length;
        if (alive < this.maxPerSide) this.createUnit(side, this.rng.pick(this.spawnPool));
      }
    }
  }

  separate() {
    const U = this.units;
    for (let i = 0; i < U.length; i++) { const a = U[i]; if (a.dead) continue;
      for (let j = i + 1; j < U.length; j++) { const b = U[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.heightW + b.heightW) * 0.18;
        if (d > 0 && d < min) { const p = (min - d) / d * 0.25; a.x -= dx*p; a.y -= dy*p; b.x += dx*p; b.y += dy*p; }
      }
    }
  }

  tick(dt) {
    if (this.over) return;
    this.spawnWaves(dt);
    for (const u of this.units) { think(u, this, dt); u.anim.set(u.animState); u.anim.update(dt); }
    this.separate();
    this.units = this.units.filter(u => !(u.dead && u.deathT > 4));
    // конец боя
    if (this.leftBase.hp <= 0 || this.rightBase.hp <= 0) {
      this.over = true; this.winner = this.leftBase.hp <= 0 ? 'R' : 'L';
      this.emitter.emit('over', { winner: this.winner });
    }
  }

  // RENDER: фон/база/юниты через переданный бэкенд (renderer.drawUnit), затем fx.
  render(ctx, view, renderer, fx) {
    const { W, H, sc } = view;
    const g = ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#3f7a3a'); g.addColorStop(1,'#2c5526');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // дорожка
    ctx.fillStyle='#b79b6a'; ctx.fillRect(0, view.Y(this.world.laneY - this.world.laneH/2), W, this.world.laneH*sc);
    // базы
    this._drawBase(ctx, view, this.leftBase, 'L');
    this._drawBase(ctx, view, this.rightBase, 'R');
    // дропы оружия
    ctx.strokeStyle='#9a9488'; ctx.lineWidth=2;
    for (const d of this.drops) { if (d.taken) continue; const x=view.X(d.x), y=view.Y(d.y);
      ctx.beginPath(); ctx.moveTo(x-5,y); ctx.lineTo(x+5,y-3); ctx.stroke(); }
    // юниты: мёртвые ниже, живые сверху, по y
    const ordered = [...this.units].sort((a,b)=>((a.dead?0:1)-(b.dead?0:1)) || (a.y-b.y));
    for (const u of ordered) renderer.drawUnit(ctx, u, view);
    if (fx) fx.draw(ctx);
  }

  _drawBase(ctx, view, b, side) {
    const x=view.X(b.x), y=view.Y(this.world.laneY), c=FACTIONS[side==='L'?'empire':'legion'].outline;
    ctx.fillStyle = side==='L' ? '#2a4a8a' : '#8a2a2a'; ctx.strokeStyle='#15110c'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.rect(x-9, y-22, 18, 30); ctx.fill(); ctx.stroke();
    const w=46, hx=x-w/2, hy=y-46, f=b.hp/b.max;
    ctx.fillStyle='#000'; ctx.fillRect(hx-1,hy-1,w+2,7);
    ctx.fillStyle=c; ctx.fillRect(hx,hy,w*f,5);
    ctx.fillStyle='#eaddc4'; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillText(Math.ceil(b.hp), x, hy-3);
  }

  result() {
    return { winner: this.winner,
      survivors: this.units.filter(u=>!u.dead).map(u=>({id:u.id,side:u.side,type:u.typeKey})),
      stats: { ...this.stats } };
  }
}
