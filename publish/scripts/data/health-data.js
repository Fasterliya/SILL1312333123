(function initHealthData(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const rows = [
    ['cold', '感冒', 'common', 0, 1, 400, 2, 0.05],
    ['flu', '流感', 'common', 0, 2, 800, 3, 0.1],
    ['gastritis', '胃炎', 'common', 16, 2, 1200, 4, 0.08],
    ['insomnia', '失眠症', 'common', 18, 1, 600, 3, 0.08],
    ['hypertension', '高血压', 'chronic', 35, 3, 2000, 18, 0.13],
    ['diabetes', '糖尿病', 'chronic', 40, 3, 2500, 24, 0.17],
    ['arthritis', '关节炎', 'chronic', 45, 2, 1800, 18, 0.1],
    ['heart', '心脏病', 'chronic', 50, 4, 5000, 0, 0.3, true],
    ['gonorrhea', '淋病', 'std', 16, 2, 2000, 0, 0.1, false, true],
    ['syphilis', '梅毒', 'std', 16, 3, 5000, 0, 0.18, false, true],
    ['chlamydia', '衣原体感染', 'std', 16, 1, 1500, 0, 0.07, false, true],
    ['hiv', 'HIV感染', 'std', 16, 5, 15000, 0, 0.32, false, true],
    ['cervicitis', '宫颈炎', 'gyn', 18, 2, 3000, 4, 0.09],
    ['pid', '盆腔炎', 'gyn', 18, 3, 4500, 5, 0.16],
    ['fibroid', '子宫肌瘤', 'gyn', 30, 3, 6000, 8, 0.13],
  ];
  const diseases = rows.map(([id, name, type, minAge, severity, treatCost,
    selfHealMonths, healthPenalty, fatal = false, incurable = false]) => ({
    id, name, type, minAge, severity, treatCost, selfHealMonths,
    healthPenalty, fatal, incurable,
  }));

  Game.healthData = Object.freeze({
    diseases: Object.freeze(diseases),
    get: (id) => diseases.find((item) => item.id === id) || null,
  });
}(window));
