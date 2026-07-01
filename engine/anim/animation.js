// engine/anim/animation.js — СЛОЙ АНИМАЦИИ. Единый «скелет/поза» для ВСЕХ
// бэкендов рендера. Процедурный силуэт рисует позу напрямую; sprite-бэкенд
// использует те же точки привязки (handR — кисть с оружием, head — голова),
// чтобы оружие/стрелы/эффекты цеплялись одинаково.
//
// Координаты позы — ЛОКАЛЬНЫЕ, в долях высоты юнита: ступни в (0,0), вверх = -y,
// «вперёд» = +x (рендер зеркалит по направлению взгляда u.dir).

const BASE = () => ({
  head:[0,-0.92], chest:[0,-0.70], pelvis:[0,-0.45],
  handR:[0.20,-0.55], handL:[-0.20,-0.55],
  footR:[0.12,0], footL:[-0.12,0],
  weaponAngle:-0.35, lunge:0, tilt:0,
});

const sin = (p)=>Math.sin(p*Math.PI*2);

// Каждый клип: { dur, loop, pose(phase)->skeleton }. phase 0..1.
export const CLIPS = {
  idle:  { dur:1.4, loop:true,  pose:(p)=>{ const s=BASE(); const b=sin(p)*0.012;
            s.chest[1]-=b; s.head[1]-=b; return s; } },
  walk:  { dur:0.6, loop:true,  pose:(p)=>{ const s=BASE(); const a=sin(p);
            s.footR=[0.12+a*0.16,Math.min(0,-Math.abs(a)*0.06)]; s.footL=[-0.12-a*0.16,Math.min(0,-Math.abs(-a)*0.06)];
            s.handR=[0.20-a*0.10,-0.55]; s.handL=[-0.20+a*0.10,-0.55]; s.chest[1]-=Math.abs(a)*0.02; return s; } },
  idle_: { dur:1, loop:true, pose:(p)=>BASE() },

  // ЗАМАХ (windup) — рука/оружие отводятся; высота зависит от направления удара
  windup_high:{ dur:.5, loop:false, pose:(p)=>{ const s=BASE(); s.handR=[-0.10-p*0.08,-0.85-p*0.12];
            s.weaponAngle=-1.5-p*0.7; s.tilt=-0.05*p; return s; } },
  windup_mid: { dur:.5, loop:false, pose:(p)=>{ const s=BASE(); s.handR=[-0.10-p*0.12,-0.58];
            s.weaponAngle=-2.2*p-0.4; s.tilt=-0.04*p; return s; } },
  windup_low: { dur:.5, loop:false, pose:(p)=>{ const s=BASE(); s.handR=[-0.05-p*0.1,-0.40+p*0.05];
            s.weaponAngle=0.6+p*0.5; return s; } },

  // УДАР (strike) — мах вперёд + выпад (lunge). Разные дуги по направлению.
  strike_high:{ dur:.18, loop:false, pose:(p)=>{ const s=BASE(); s.lunge=Math.sin(p*Math.PI)*0.22;
            s.handR=[0.28*p+0.05,-0.75+0.6*p]; s.weaponAngle=-1.4+2.4*p; s.tilt=0.06*p; return s; } },
  strike_mid: { dur:.18, loop:false, pose:(p)=>{ const s=BASE(); s.lunge=Math.sin(p*Math.PI)*0.25;
            s.handR=[0.35*p+0.05,-0.55]; s.weaponAngle=-1.2+1.8*p; return s; } },
  strike_low: { dur:.18, loop:false, pose:(p)=>{ const s=BASE(); s.lunge=Math.sin(p*Math.PI)*0.20;
            s.handR=[0.30*p+0.05,-0.30-0.1*p]; s.weaponAngle=0.8-1.2*p; return s; } },

  block: { dur:.4, loop:false, pose:(p)=>{ const s=BASE(); s.handR=[0.06,-0.78]; s.weaponAngle=-1.6; return s; } },
  hit:   { dur:.3, loop:false, pose:(p)=>{ const s=BASE(); const k=(1-p); s.lunge=-0.14*k;
            s.chest[0]=-0.06*k; s.head[0]=-0.08*k; s.tilt=-0.1*k; return s; } },
  prone: { dur:1, loop:true, pose:(p)=>{ const s=BASE(); s.tilt=1.2; s.chest[1]=-0.2; s.head=[0.4,-0.2]; return s; } },
};

// карта логического состояния ИИ -> имя клипа
export function clipFor(animState) {
  if (CLIPS[animState]) return animState;
  return 'idle';
}

export class AnimController {
  constructor() { this.clip = 'idle'; this.t = 0; }
  set(name) { const c = clipFor(name); if (c !== this.clip) { this.clip = c; this.t = 0; } }
  update(dt) {
    const c = CLIPS[this.clip]; this.t += dt;
    if (c.loop) this.t %= c.dur; else this.t = Math.min(this.t, c.dur);
  }
  pose() { const c = CLIPS[this.clip]; return c.pose(c.dur ? this.t / c.dur : 0); }
}
