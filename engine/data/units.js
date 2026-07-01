// engine/data/units.js — КОНТЕНТ (data-driven). Юниты, оружие, фракции.
// Новый юнит/оружие/раса добавляется ЗДЕСЬ, без правки логики движка.
//
// Размер юнита задаётся в МИРОВЫХ единицах (heightW). Мир ~200 ед. шириной,
// поэтому heightW≈15 -> заметный, но мелкий силуэт. Так размер влияет и на
// рендер, и на дистанцию удара/обнаружения (см. ai/combat).

export const WEAPONS = {
  sword:  { id:'sword',  damageType:'slashing', reachW:1.0, lengthW:0.55, moves:['slash','overhead','thrust','jab'], disarm:0.14, clash:'sparks' },
  spear:  { id:'spear',  damageType:'piercing', reachW:1.5, lengthW:0.95, moves:['thrust','jab','lowcut'],            disarm:0.10, clash:'sparks' },
  club:   { id:'club',   damageType:'blunt',    reachW:0.9, lengthW:0.5,  moves:['overhead','bash','slash'],         disarm:0.08, clash:'thud'   },
  fists:  { id:'fists',  damageType:'blunt',    reachW:0.7, lengthW:0.0,  moves:['jab','bash'],                       disarm:0.0,  clash:'thud'   },
};

// bodyTemplate -> см. model/body.js. assetKey -> ключ в манифесте ассетов (sprite-бэкенд).
export const UNIT_TYPES = {
  soldier: {
    id:'soldier', faction:'empire', bodyTemplate:'humanoid', assetKey:'soldier',
    heightW:15, weapon:'sword',
    stats:{ str:[0.8,1.1], spd:[0.85,1.1], skill:[0.5,0.85], painTol:[0.85,1.2] },
    color:'#cfd6e6',
  },
  brute: { // крупный «жирный» — медленный, живучий, бьёт сильно
    id:'brute', faction:'empire', bodyTemplate:'large', assetKey:'brute',
    heightW:23, weapon:'club',
    stats:{ str:[1.3,1.7], spd:[0.5,0.75], skill:[0.35,0.6], painTol:[1.4,1.9] },
    color:'#d8c4a0',
  },
  imp: { // мелкий быстрый — слабый, юркий
    id:'imp', faction:'legion', bodyTemplate:'small', assetKey:'imp',
    heightW:11, weapon:'sword',
    stats:{ str:[0.5,0.8], spd:[1.15,1.45], skill:[0.4,0.7], painTol:[0.6,0.9] },
    color:'#b06a6a',
  },
  spearman: {
    id:'spearman', faction:'empire', bodyTemplate:'humanoid', assetKey:'spearman',
    heightW:16, weapon:'spear',
    stats:{ str:[0.85,1.1], spd:[0.8,1.05], skill:[0.55,0.85], painTol:[0.85,1.2] },
    color:'#c8d0cf',
  },
};

export const FACTIONS = {
  empire: { id:'empire', name:'Империя', outline:'#4f7fff' },
  legion: { id:'legion', name:'Легион',  outline:'#ff5040' },
  undead: { id:'undead', name:'Нежить',  outline:'#a0ff90' },
};

// собрать конкретные статы юнита из диапазонов типа (с детерминированным rng)
export function rollStats(type, rng) {
  const r = (p) => rng.range(p[0], p[1]);
  return { str:r(type.stats.str), spd:r(type.stats.spd), skill:r(type.stats.skill), painTol:r(type.stats.painTol) };
}
