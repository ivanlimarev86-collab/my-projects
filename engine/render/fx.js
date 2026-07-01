// engine/render/fx.js — ВИЗУАЛЬНЫЕ ЭФФЕКТЫ (частицы): кровь, искры, иней, огонь.
// Подписывается на события боя -> создаёт частицы. Рисуется поверх юнитов.

export class FX {
  constructor() { this.parts = []; }

  bind(emitter, view) {
    this.view = view;
    emitter.on('hit', (e) => {
      const sx = view.X(e.point.x), sy = view.Y(e.point.y) - 10 * view.sc;
      this.splat(sx, sy, e.crit ? 8 : 4);
    });
    emitter.on('defend', (e) => { this.spark(view.X(e.point.x), view.Y(e.point.y) - 8 * view.sc); });
    emitter.on('death', (e) => { this.splat(view.X(e.unit.x), view.Y(e.unit.y) - 8 * view.sc, 8); });
    emitter.on('sever',  (e) => { this.splat(view.X(e.unit.x), view.Y(e.unit.y) - 10 * view.sc, 10); });
    emitter.on('shatter',(e) => { this.shards(view.X(e.unit.x), view.Y(e.unit.y) - 10 * view.sc); });
    emitter.on('basehit',(e) => { this.spark(view.X(e.base.x), view.Y(view.laneY)); });
  }

  splat(x, y, n) { for (let i=0;i<n;i++) this.parts.push({k:'b',x,y,
    vx:(Math.random()*2-1)*60, vy:-Math.random()*90-15, life:Math.random()*0.6+0.4, r:Math.random()*1.6+0.8}); }
  spark(x, y) { for (let i=0;i<6;i++) this.parts.push({k:'s',x,y,
    vx:(Math.random()*2-1)*70, vy:-Math.random()*70, life:Math.random()*0.2+0.12, r:Math.random()*1.4+0.6}); }
  shards(x, y){ for (let i=0;i<8;i++) this.parts.push({k:'f',x,y,
    vx:(Math.random()*2-1)*80, vy:-Math.random()*80-10, life:Math.random()*0.5+0.3, r:Math.random()*1.8+0.8}); }

  step(dt, groundY) {
    for (const p of this.parts) {
      p.x += p.vx*dt; p.vy += 380*dt*(p.k==='s'?0.3:1); p.y += p.vy*dt; p.life -= dt;
      if (p.k!=='s' && p.y>groundY) { p.y=groundY; p.vy=0; p.vx*=0.6; }
    }
    this.parts = this.parts.filter(p=>p.life>0);
  }

  draw(ctx) {
    for (const p of this.parts) {
      ctx.globalAlpha = Math.min(1, p.life*1.5);
      ctx.fillStyle = p.k==='s' ? '#ffd86a' : p.k==='f' ? '#bfe6ff' : '#9c1410';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
