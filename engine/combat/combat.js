// engine/combat/combat.js — РАЗРЕШЕНИЕ БОЯ: попадание по части тела, защита,
// выбивание оружия, кровотечение/угасание «жизни», статусы, смерть.
// Все «эффекты для глаз» уходят событиями в emitter (рендер их слушает).

import { clamp } from '../core/core.js';
import { caps, PART_LABELS } from '../model/body.js';

function weightedPart(aim, rng) {
  let r = rng.next(), a = 0;
  for (const k in aim) { a += aim[k]; if (r <= a) return k; }
  return 'torso';
}

// Матрица «тип урона × состояние части» — спецэффекты (расширяемо).
function specialInteraction(damageType, part, dmg) {
  if (part.statuses.frozen && damageType === 'blunt' && dmg > part.max * 0.3) return 'shatter';
  if (part.statuses.frozen && damageType === 'fire') return 'thaw';
  return null;
}

export function applyHit(att, def, move, weapon, ctx) {
  const { rng, emit } = ctx;
  let partKey = weightedPart(move.aim, rng);
  if (rng.chance(0.35 * (1 - att.skill))) partKey = rng.pick(Object.keys(def.parts));
  const P = def.parts[partKey];

  let dmg = rng.range(move.dmg[0], move.dmg[1]) * caps(att).attack * move.pierce * rng.range(.85, 1.15);
  const crit = rng.chance(0.08 + att.skill * 0.07);
  if (crit) dmg *= 1.7;
  dmg = Math.round(dmg);

  const special = specialInteraction(weapon.damageType, P, dmg);
  if (special === 'thaw') { delete P.statuses.frozen; emit('thaw', { unit: def, part: partKey }); }

  P.hp = clamp(P.hp - dmg, 0, P.max);
  P.bleed += (dmg / P.max) * (weapon.damageType === 'blunt' ? 2 : 9) * def.bleedMul;
  def.pain += dmg * (P.lethal ? 1.4 : 1);
  def.flinch = 0.22;
  def.knock = (att.dir) * Math.min(1.2, dmg / 14);  // отдача от удара (динамика)

  emit('hit', { att, def, part: partKey, dmg, crit, damageType: weapon.damageType,
                point: { x: def.x, y: def.y }, special });

  // заморозка + дробящий = раскрошить часть
  if (special === 'shatter') {
    P.disabled = true; P.severed = true; P.bleed += 4; delete P.statuses.frozen;
    emit('shatter', { unit: def, part: partKey });
  }
  // вывод части из строя / отсечение
  if (P.hp <= 0 && !P.disabled) {
    P.disabled = true;
    if (!P.lethal && dmg > P.max * 0.7 && rng.chance(0.4)) { P.severed = true; P.bleed += 14;
      emit('sever', { unit: def, part: partKey }); }
    else emit('disable', { unit: def, part: partKey });
  }
  // летальные зоны
  if (P.lethal && P.hp <= 0) kill(def, partKey === 'head' ? 'удар в голову' : 'пробитый торс', ctx, att);

  // оглушение
  if (move.stagger && rng.chance(0.5)) { def.state = 'stagger'; def.timer = 0.5; }
}

// защита: уворот / парирование / блок. при парировании — шанс выбить оружие.
export function resolveDefense(att, def, move, ctx) {
  const { rng, emit } = ctx;
  const guard = !def.dead && def.state !== 'stagger' && def.state !== 'prone';
  if (!guard) return { defended: false };
  const d = caps(def).defense;
  const pDdg = clamp(.06 + caps(def).move * .10, .02, .30);
  const pPar = clamp(.10 + d * .30 - move.pierce * .06, .03, .55);
  const pBlk = clamp(.10 + d * .22, .03, .45);
  if (rng.chance(pDdg)) return { defended: true, how: 'dodge' };
  if (rng.chance(pPar)) return { defended: true, how: 'parry' };
  if (rng.chance(pBlk)) return { defended: true, how: 'block' };
  return { defended: false };
}

export function tryDisarm(att, def, defWeaponDisarmChance, ctx) {
  const { rng, emit } = ctx;
  if (def.disarmed) return false;
  if (rng.chance(0.10 + caps(def).defense * 0.12)) {
    def.disarmed = true;
    emit('disarm', { unit: def });
    return true;
  }
  return false;
}

// тик статусов + кровопотери. «жизнь» (vitality) угасает от суммы кровотечений.
export function tickVitals(u, dt, ctx) {
  if (u.dead) return;
  let bleed = 0;
  for (const k in u.parts) {
    const p = u.parts[k];
    p.bleed = Math.max(0, p.bleed - 0.05 * dt);
    bleed += p.bleed;
    if (p.statuses.burning) { p.statuses.burning.t -= dt; p.hp = Math.max(0, p.hp - 6 * dt);
      if (p.statuses.burning.t <= 0) delete p.statuses.burning; }
    if (p.statuses.frozen)  { p.statuses.frozen.t  -= dt; if (p.statuses.frozen.t  <= 0) delete p.statuses.frozen; }
  }
  u.bleedTotal = bleed;
  u.vitality = clamp(u.vitality - bleed * dt * 0.5, 0, 100);
  if (u.vitality <= 0) { kill(u, 'истёк кровью', ctx, null); return; }
  u.pain = Math.max(0, u.pain - 6 * dt);
  if (u.state !== 'fight' && u.state !== 'windup') u.stamina = clamp(u.stamina + 12 * dt, 0, u.maxStam);
  if (u.flinch > 0) u.flinch -= dt;
  if (u.knock) u.knock *= Math.max(0, 1 - dt * 6);
}

export function heal(u, amount, ctx) { // магия лечит: стоп кровь + восстановление
  for (const k in u.parts) { u.parts[k].bleed *= 0.2; u.parts[k].hp = Math.min(u.parts[k].max, u.parts[k].hp + amount * 0.3); }
  u.vitality = clamp(u.vitality + amount, 0, 100);
  ctx.emit('heal', { unit: u, amount });
}

export function kill(u, reason, ctx, killer) {
  if (u.dead) return;
  u.dead = true; u.state = 'dead'; u.deathT = 0;
  ctx.emit('death', { unit: u, reason, killer });
}
