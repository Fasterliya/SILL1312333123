(function initCompanyAbilityIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.companySystem;
  if (!base) return;

  function monthly(state) {
    base.monthly(state);
    if (!state.companies?.length) return;
    Game.structuredTraits.addExperience(state.profile, 'entrepreneur');
    const management = Game.characterAttributes.playerValue(state, '管理');
    const intrigue = Game.characterAttributes.playerValue(state, '心计');
    state.companies.forEach((company) => {
      const original = Number(company.monthlyIncome) || 0;
      const factor = original >= 0
        ? 0.85 + management / 200
        : Math.max(0.55, 1.05 - intrigue / 180);
      company.monthlyIncome = Math.round(original * factor);
      if (original >= 0 || company.type === 'solo-proprietor') {
        state.money += company.monthlyIncome - original;
      }
    });
  }

  Game.companySystem = Object.freeze({ ...base, monthly });
}(window));
