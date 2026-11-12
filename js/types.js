import { getTypeChart, getAllTypes } from './config.js';

export function calcEffectiveness(attackerType, defenderTypes) {
  const chart = getTypeChart();
  return defenderTypes.reduce((mult, defType) => {
    const row = chart[attackerType];
    return mult * (row && row[defType] !== undefined ? row[defType] : 1);
  }, 1);
}

export function canDefeat(attackerTypes, defenderTypes) {
  return attackerTypes.some(at => calcEffectiveness(at, defenderTypes) >= 2);
}

export function getWeaknessTypes(defenderTypes) {
  return getAllTypes().filter(at => calcEffectiveness(at, defenderTypes) >= 2);
}

export function getResistanceTypes(defenderTypes) {
  return getAllTypes().filter(t => {
    const e = calcEffectiveness(t, defenderTypes);
    return e > 0 && e < 1;
  });
}

export function getImmunityTypes(defenderTypes) {
  return getAllTypes().filter(t => calcEffectiveness(t, defenderTypes) === 0);
}