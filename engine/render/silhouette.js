// engine/render/silhouette.js — ПРОЦЕДУРНЫЙ бэкенд рендера (силуэты).
// Рисует юнита по позе из слоя анимации. Размер = u.heightW * view.sc.
// Реализует тот же интерфейс, что и sprite-бэкенд: drawUnit(ctx, u, view).
// Точки привязки (handR, head) — общие с sprite-бэкендом.

import { FACTIONS } from '../data/units.js';
import { WEAPONS } from '../data/units.js';

export class SilhouetteRenderer {
  // конвертация локальной точки позы -> экран, с учётом размера и направления
  _p(u, view, pt, H, ox, oy, dir) {
    return [ ox + (pt[0]*dir + 0) * H, oy + pt[1] * H ];
  }

  drawUnit(ctx, u, view) {
    const pose = u.anim.pose();
    const H = u.heightW * view.sc * (view.unitScale || 1);  // высота силуэта в px
    const dir = u.dir || 1;
    const ox = view.X(u.x) + (pose.lunge || 0) * H * dir;
    const oy = view.Y(u.y);
    const teamC = (FACTIONS[u.faction] || FACTIONS.empire).outline;

    ctx.save();
    if (u.dead) { const f = Math.min(1, u.deathT*2); ctx.translate(ox, oy); ctx.rotate(dir*1.3*f); ctx.translate(-ox, -oy+ -2*f); }
    if (pose.tilt) { ctx.translate(ox, oy); ctx.rotate(pose.tilt*dir); ctx.translate(-ox, -oy); }
    if (u.flinch > 0) ctx.translate((Math.random()-0.5)*1.5, 0);

    const P = (pt)=>this._p(u, view, pt, H, ox, oy, dir);
    const dis = (k)=>u.parts[k] && u.parts[k].disabled;
    const seg = (a, b, w)=>{ ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]);
      ctx.lineWidth = Math.max(1.4, w*H); ctx.stroke(); };

    const chest=P(pose.chest), pelvis=P(pose.pelvis), head=P(pose.head),
          handR=P(pose.handR), handL=P(pose.handL), footR=P(pose.footR), footL=P(pose.footL);

    ctx.strokeStyle = '#15110c'; ctx.fillStyle = '#15110c'; ctx.lineCap='round';
    // ноги
    if (!dis('leftLeg'))  seg(pelvis, footL, 0.06);
    if (!dis('rightLeg')) seg(pelvis, footR, 0.06);
    // торс
    seg(pelvis, chest, 0.08);
    // левая рука
    if (!dis('leftArm')) seg(chest, handL, 0.05);
    // правая рука + оружие
    if (!dis('rightArm')) {
      seg(chest, handR, 0.055);
      if (!u.disarmed) {
        const wp = WEAPONS[u.weapon]; const len = wp.lengthW * H;
        const a = (pose.weaponAngle||0) * dir;
        ctx.strokeStyle = '#9a9488';
        ctx.beginPath(); ctx.moveTo(handR[0], handR[1]);
        ctx.lineTo(handR[0] + Math.cos(a)*len*dir, handR[1] + Math.sin(a)*len);
        ctx.lineWidth = Math.max(1.2, 0.04*H); ctx.stroke();
        ctx.strokeStyle = '#15110c';
      }
    }
    // голова
    ctx.beginPath(); ctx.arc(head[0], head[1], 0.11*H, 0, 7); ctx.fill();
    // командная обводка
    ctx.strokeStyle = teamC; ctx.lineWidth = Math.max(1, 0.045*H);
    ctx.beginPath(); ctx.arc(head[0], head[1], 0.155*H, 0, 7); ctx.stroke();

    // оверлеи ран/статусов по точкам привязки
    this._overlays(ctx, u, { head, chest, handR, handL, footR, footL }, H);
    ctx.restore();
  }

  _overlays(ctx, u, j, H) {
    const map = { head:j.head, torso:j.chest, rightArm:j.handR, leftArm:j.handL, rightLeg:j.footR, leftLeg:j.footL };
    for (const k in u.parts) {
      const p = u.parts[k], at = map[k]; if (!at) continue;
      if (p.statuses && p.statuses.frozen) { ctx.fillStyle='rgba(150,210,255,.5)';
        ctx.beginPath(); ctx.arc(at[0],at[1],0.13*H,0,7); ctx.fill(); }
      if (p.statuses && p.statuses.impaled) { ctx.strokeStyle='#caa86a'; ctx.lineWidth=Math.max(1,0.03*H);
        ctx.beginPath(); ctx.moveTo(at[0],at[1]); ctx.lineTo(at[0]+0.18*H,at[1]-0.06*H); ctx.stroke(); }
      if (p.disabled && !p.severed && p.lethal===false) { ctx.fillStyle='#7a0f0a';
        ctx.beginPath(); ctx.arc(at[0],at[1],0.05*H,0,7); ctx.fill(); }
    }
  }
}
