// engine/data/moves.js — ПРИЁМЫ (data-driven). region (high/mid/low) и side
// управляют анимацией «удар с разных сторон» и зоной поражения.
// dmg в усл. ед.; wind/rec в секундах; stam расход; pierce пробитие.

export const MOVES = {
  slash:    { id:'slash',    region:'mid',  dmg:[8,13],  wind:.34, rec:.42, stam:9,  pierce:1.0, sweep:true,
              aim:{torso:.45,rightArm:.2,leftArm:.2,head:.1,rightLeg:.025,leftLeg:.025} },
  overhead: { id:'overhead', region:'high', dmg:[14,22], wind:.55, rec:.6,  stam:15, pierce:1.1,
              aim:{head:.5,torso:.3,rightArm:.1,leftArm:.1} },
  thrust:   { id:'thrust',   region:'mid',  dmg:[10,16], wind:.4,  rec:.48, stam:11, pierce:1.6, lunge:1.3,
              aim:{torso:.6,head:.15,rightArm:.1,leftArm:.1,rightLeg:.025,leftLeg:.025} },
  jab:      { id:'jab',      region:'mid',  dmg:[4,7],   wind:.18, rec:.26, stam:5,  pierce:1.2,
              aim:{torso:.4,head:.25,rightArm:.175,leftArm:.175} },
  lowcut:   { id:'lowcut',   region:'low',  dmg:[7,12],  wind:.4,  rec:.48, stam:10, pierce:1.0, sweep:true,
              aim:{rightLeg:.42,leftLeg:.42,torso:.16} },
  bash:     { id:'bash',     region:'mid',  dmg:[3,6],   wind:.3,  rec:.4,  stam:8,  pierce:.6, stagger:true,
              aim:{head:.4,torso:.6} },
};

export const MOVE_NAMES = {
  slash:'рубящий', overhead:'наотмашь', thrust:'укол', jab:'тычок', lowcut:'подсечка', bash:'оглушение',
};
