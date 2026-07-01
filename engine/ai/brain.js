// engine/ai/brain.js — «МОЗГ» NPC: восприятие -> цель -> поведение.
// Состояния: advance (идёт к базе врага) -> fight (микро-дуэль) -> hitbase.
// Выставляет u.animState и u.face (направление взгляда) для слоя анимации.

import { dist, clamp } from '../core/core.js';
import { caps } from '../model/body.js';
import { MOVES } from '../data/moves.js';
import { WEAPONS } from '../data/units.js';
import { applyHit, resolveDefense, tryDisarm, tickVitals } from '../combat/combat.js';

function findTarget(u, battle) {
  let best = null, bd = 1e9;
  for (const e of battle.units) {
    if (e.dead || e.side === u.side) continue;
    const d = dist(u.x, u.y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return bd < u.detectW ? best : null;
}

function chooseMove(u, foe, battle) {
  const wp = WEAPONS[u.weapon];
  const fp = foe.parts, pool = [];
  for (const id of wp.moves) {
    const m = MOVES[id]; if (!m) continue;
    let w = 1;
    if (u.stamina < m.stam * 1.2) w *= .2;
    if (m.id === 'overhead') w *= .6 + u.skill * .6;
    if ((fp.head.hp < 10 || fp.torso.hp < 18) && (m.id === 'thrust' || m.id === 'overhead')) w *= 2.2;
    if (foe.state === 'prone' && m.id === 'thrust') w *= 3;
    pool.push([m, w]);
  }
  let t = pool.reduce((a, [, w]) => a + w, 0), r = battle.rng.next() * t;
  for (const [m, w] of pool) { r -= w; if (r <= 0) return m; }
  return MOVES[wp.moves[0]];
}

function stepToward(u, tx, ty, speed, dt) {
  const dx = tx - u.x, dy = ty - u.y, len = Math.hypot(dx, dy) || 1;
  const v = (8 + 10 * speed);
  u.x += dx / len * v * dt;
  u.y += dy / len * v * dt * 0.6;
  u.y = clamp(u.y, u.laneMin, u.laneMax);
  u.face = dx >= 0 ? 1 : -1;
}

export function think(u, battle, dt) {
  const ctx = battle.ctx;
  if (u.dead) { u.deathT += dt; return; }

  // отдача/откидывание (динамика удара)
  if (u.knock) u.x += u.knock * 8 * dt;

  tickVitals(u, dt, ctx);
  if (u.dead) return;
  const c = caps(u);

  if (!c.canFight) { if (u.state !== 'prone') { u.state = 'prone'; u.timer = 99; } u.animState = 'prone'; return; }

  if (!u.target || u.target.dead) u.target = findTarget(u, battle);

  if (u.target) {
    const foe = u.target;
    u.face = (foe.x - u.x) >= 0 ? 1 : -1; u.dir = u.face;
    const d = dist(u.x, u.y, foe.x, foe.y);
    const reach = WEAPONS[u.weapon].reachW * u.heightW;
    if (d > reach) { stepToward(u, foe.x, foe.y, c.move, dt); u.animState = 'walk'; u.state = 'advance'; return; }
    fightTick(u, foe, battle, dt);
    return;
  }

  // нет врагов: к базе врага; дошёл — бьём базу
  const eb = battle.enemyBase(u);
  u.face = u.dir;
  if (Math.abs(u.x - eb.x) > battle.baseReachW) {
    stepToward(u, eb.x, u.y, c.move, dt); u.animState = 'walk'; u.state = 'advance';
  } else {
    u.animState = 'overhead'; u.state = 'hitbase';
    u.timer -= dt;
    if (u.timer <= 0) { u.timer = 0.6; eb.hp = Math.max(0, eb.hp - battle.rng.range(6, 11) * c.attack);
      ctx.emit('basehit', { base: eb, by: u }); }
  }
}

function fightTick(u, foe, battle, dt) {
  const ctx = battle.ctx;
  switch (u.state) {
    case 'advance': case 'hitbase': case 'prone': u.state = 'ready'; u.timer = 0; break;
    case 'ready': {
      if (u.stamina < 10) { u.state = 'recover'; u.timer = .5; u.animState = 'idle'; break; }
      u.move = chooseMove(u, foe, battle);
      u.state = 'windup'; u.timer = u.move.wind;
      u.animState = 'windup_' + u.move.region;  // высота замаха = направление удара
      break;
    }
    case 'windup': {
      u.timer -= dt; u.animState = 'windup_' + u.move.region;
      if (u.timer <= 0) {
        u.animState = 'strike_' + u.move.region;
        u.stamina = Math.max(0, u.stamina - u.move.stam);
        const def = resolveDefense(u, foe, u.move, ctx);
        if (def.defended) {
          ctx.emit('defend', { att: u, def: foe, how: def.how, point: { x: (u.x + foe.x) / 2, y: u.y } });
          if (def.how === 'parry') tryDisarm(u, foe, WEAPONS[u.weapon].disarm, ctx);
        } else {
          applyHit(u, foe, u.move, WEAPONS[u.weapon], ctx);
        }
        u.state = 'strike'; u.timer = 0.12; // короткая фаза удара (hit-stop)
      }
      break;
    }
    case 'strike': u.timer -= dt; if (u.timer <= 0) { u.state = 'recover'; u.timer = u.move.rec; } break;
    case 'recover': u.timer -= dt; u.animState = 'idle'; if (u.timer <= 0) u.state = 'ready'; break;
    case 'stagger': u.timer -= dt; u.animState = 'hit'; if (u.timer <= 0) u.state = 'ready'; break;
  }
}
