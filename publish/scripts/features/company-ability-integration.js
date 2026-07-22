(function initCompanyAbilityIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.companySystem;
  if (!base) return;

  function monthly(state) {
    base.monthly(state);
    if (!state.companies?.length) return;
    Game.structuredTraits.addExperience(state.profile, 'entrepreneur');
    state.companies.forEach((company) => {
      const original = Number(company.monthlyIncome) || 0;
      const sizeDifficulty = Math.min(18, Math.round(Math.abs(original) / 20000));
      const resolution = Game.actionResolver.preview(state, {
        primary: '管理', secondary: '心计', difficulty: 50 + sizeDifficulty,
        context: Math.min(8, company.employees?.length || 0), label: `${company.name}经营`,
      });
      const factor = original >= 0
        ? 0.72 + resolution.multiplier * 0.34
        : Math.max(0.55, 1.1 - resolution.multiplier * 0.25);
      company.monthlyIncome = Math.round(original * factor);
      company.abilityResult = {
        score: resolution.score, tier: resolution.tier, label: resolution.tierLabel,
      };
      if (original >= 0 || company.type === 'solo-proprietor') {
        state.money += company.monthlyIncome - original;
      }
    });
  }

  Game.companySystem = Object.freeze({ ...base, monthly });
}(window));
