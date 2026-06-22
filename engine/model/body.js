// engine/model/body.js — МОДЕЛЬ ТЕЛА: шаблоны, части, статусы, производные
// способности. Масштабонезависима (размер живёт в data/units.heightW).

import { clamp } from '../core/core.js';

// Шаблоны тела: набор частей, их прочность и летальность. Разные расы = разные
// шаблоны (large/small масштабируют прочность; undead кровит слабо и т.п.).
const TEMPLATES = {
  humanoid: {
    head:{max:24,lethal:true}, torso:{max:60,lethal:true},
    rightArm:{max:28}, leftArm:{max:28}, rightLeg:{max:34}, leftLeg:{max:34},
    bleedMul:1,
  },
  large: {
    head:{max:34,lethal:true}, torso:{max:110,lethal:true},
    rightArm:{max:48}, leftArm:{max:48}, rightLeg:{max:60}, leftLeg:{max:60},
    bleedMul:1,
  },
  small: {
    head:{max:16,lethal:true}, torso:{max:38,lethal:true},
    rightArm:{max:18}, leftArm:{max:18}, rightLeg:{max:22}, leftLeg:{max:22},
    bleedMul:1,
  },
};

export const PART_LABELS = { head:'голова', torso:'торс', rightArm:'пр.рука',
  leftArm:'лев.рука', rightLeg:'пр.нога', leftLeg:'лев.нога' };

export function makeBody(templateId) {
  const tpl = TEMPLATES[templateId] || TEMPLATES.humanoid;
  const parts = {};
  for (const k in tpl) {
    if (k === 'bleedMul') continue;
    parts[k] = { hp: tpl[k].max, max: tpl[k].max, lethal: !!tpl[k].lethal,
      bleed: 0, disabled: false, severed: false,
      statuses: {} /* frozen/burning/impaled/... -> {t} */ };
  }
  return { parts, bleedMul: tpl.bleedMul };
}

// Производные способности из текущего состояния тела — здесь «живёт» реализм.
export function caps(u) {
  const p = u.parts;
  const armOK  = !p.rightArm.disabled ? 1 : (!p.leftArm.disabled ? .55 : .15);
  const defArm = !p.leftArm.disabled  ? 1 : (!p.rightArm.disabled ? .7 : .3);
  const legs   = (p.rightLeg.disabled ? 0 : .5) + (p.leftLeg.disabled ? 0 : .5);
  const stamF  = .35 + .65 * (u.stamina / u.maxStam);
  const bloodF = .4 + .6 * (u.vitality / 100);
  const painF  = clamp(1 - (u.pain / (120 * u.painTol)), .35, 1);
  const fist   = u.disarmed ? .45 : 1;
  // заморозка ноги/руки блокирует её функцию
  const frozenLeg = (p.rightLeg.statuses.frozen ? .5 : 0) + (p.leftLeg.statuses.frozen ? .5 : 0);
  return {
    attack:  u.str * armOK * stamF * painF * bloodF * fist,
    defense: u.skill * defArm * stamF * painF * (legs > 0 ? 1 : .6),
    move:    u.spd * (legs - frozenLeg <= 0 ? 0 : (legs === 1 ? 1 : .55)) * stamF * bloodF,
    canFight: armOK > .1 && p.head.hp > 0 && p.torso.hp > 0,
  };
}
