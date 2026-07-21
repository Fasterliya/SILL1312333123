(function initRemovedAssets(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const LEGACY_PRICES = Object.freeze({
    stall: 18000, cafe: 120000, studio: 260000, shop: 360000,
    restaurant: 680000, factory: 1600000, hotel: 2800000, techfirm: 5200000,
    bike: 1800, scooter: 6800, compact: 98000, suv: 260000, sports: 880000,
  });

  function valueOf(ids) {
    return (ids || []).reduce((sum, id) => sum + (LEGACY_PRICES[id] || 0), 0);
  }

  function migrate(state) {
    state.assets ||= {};
    const businesses = Array.isArray(state.assets.businesses) ? state.assets.businesses : [];
    const vehicles = Array.isArray(state.assets.vehicles) ? state.assets.vehicles : [];
    if (state.assets.legacyAssetsRemoved) {
      delete state.assets.businesses;
      delete state.assets.vehicles;
      return 0;
    }
    const originalValue = valueOf(businesses) + valueOf(vehicles);
    const recovered = Math.round(originalValue * 0.7);
    delete state.assets.businesses;
    delete state.assets.vehicles;
    state.assets.legacyAssetsRemoved = true;
    if (recovered > 0) {
      state.money += recovered;
      Game.lifeDirector?.addLog(state, '旧资产清算',
        `产业与座驾系统已移除，原有资产按70%折价回收${Game.view.money(recovered)}。`, 'milestone');
    }
    return recovered;
  }

  Game.removedAssets = Object.freeze({ migrate });
}(window));
