(function initInteractionRouterAssets(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function handle(event, state, finish, refresh) {
    const marketFilter = event.target.closest('[data-market-filter]');
    if (marketFilter) {
      Game.marketView.setFilter(marketFilter.dataset.marketFilter);
      refresh();
      return true;
    }
    const companyStock = event.target.closest('[data-company-stock]');
    if (companyStock) {
      Game.marketView.openDetail(state, companyStock.dataset.companyStock);
      return true;
    }
    const stockTrade = event.target.closest('[data-stock-company]');
    if (stockTrade) {
      Game.actions.trade(
        stockTrade.dataset.stockCompany,
        stockTrade.dataset.trade,
        stockTrade.dataset.lot,
      );
      Game.marketView.openDetail(state, stockTrade.dataset.stockCompany);
      return true;
    }
    const journeyStart = event.target.closest('[data-journey-start]');
    if (journeyStart) {
      finish(Game.journeySystem.start(state, journeyStart.dataset.journeyStart));
      return true;
    }
    const journeyChoice = event.target.closest('[data-journey-choice]');
    if (journeyChoice) {
      finish(Game.journeySystem.choose(state, journeyChoice.dataset.journeyChoice));
      return true;
    }
    if (Game.travelInteractions?.handleClick(event)) return true;
    const roam = event.target.closest('[data-roam-area]');
    if (roam) {
      finish(Game.travelSystem.roam(state, roam.dataset.roamArea));
      return true;
    }
    const propertyBuy = event.target.closest('[data-property-buy]');
    if (propertyBuy) {
      finish(Game.propertySystem.buy(state, Number(propertyBuy.dataset.propertyBuy)));
      return true;
    }
    if (event.target.closest('[data-property-sell]')) {
      if (root.confirm('确定出售当前房产并结清剩余贷款吗？')) {
        finish(Game.propertySystem.sell(state));
      }
      return true;
    }
    const propertyRepay = event.target.closest('[data-property-repay]');
    if (propertyRepay) {
      finish(Game.propertySystem.repay(state, propertyRepay.dataset.propertyRepay));
      return true;
    }
    const business = event.target.closest('[data-business]');
    if (business) {
      finish(Game.assetsSystem.buyBusiness(state, business.dataset.business));
      return true;
    }
    const vehicle = event.target.closest('[data-vehicle]');
    if (vehicle) {
      finish(Game.assetsSystem.buyVehicle(state, vehicle.dataset.vehicle));
      return true;
    }
    const bankAction = event.target.closest('[data-bank-action]');
    if (bankAction) {
      const action = bankAction.dataset.bankAction;
      if (action === 'repay') {
        finish(Game.bankSystem.repayLoan(state, bankAction.dataset.bankValue));
      } else if (action === 'welfare') {
        finish(Game.bankSystem.welfare(state));
      } else {
        const amount = root.prompt('输入贷款金额：', '10000');
        if (amount !== null) {
          finish(Game.bankSystem.applyLoan(state, bankAction.dataset.bankType, Number(amount)));
        }
      }
      return true;
    }
    const companyAction = event.target.closest('[data-company-action]');
    if (companyAction) {
      const action = companyAction.dataset.companyAction;
      const companyId = companyAction.dataset.companyId;
      if (action === 'create') Game.companySystem?.startCreation(state);
      else if (action === 'invest') {
        Game.companySystem?.investMore(state, companyId, Number(companyAction.dataset.amount));
      } else if (action === 'sell') Game.companySystem?.sellCompany(state, companyId);
      else if (action === 'close') Game.companySystem?.closeCompany(state, companyId);
      refresh();
      return true;
    }
    const companyHire = event.target.closest('[data-company-hire]');
    if (companyHire) {
      finish(Game.companySystem?.hireEmployee(state, companyHire.dataset.companyId)
        || { ok: false });
      return true;
    }
    return false;
  }

  Game.interactionRouterAssets = Object.freeze({ handle });
}(window));
