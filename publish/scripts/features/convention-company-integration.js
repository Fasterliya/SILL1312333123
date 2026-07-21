(function initConventionCompanyIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.companySystem;
  if (!base) return;
  function run(result) {
    Game._refresh?.();
    Game.view?.showToast?.(result.message, result.ok ? 'good' : 'warning');
    return true;
  }
  function handleClick(event) {
    const target = event?.target;
    const state = Game._getState?.();
    const license = target?.closest?.('[data-convention-license]');
    if (license) return run(Game.conventionCompany.qualify(state, license.dataset.conventionLicense));
    const bid = target?.closest?.('[data-convention-bid]');
    if (bid) {
      const [editionId, companyId] = bid.dataset.conventionBid.split('|');
      return run(Game.conventionCompany.bid(state, editionId, companyId));
    }
    const prep = target?.closest?.('[data-convention-prep]');
    if (prep) {
      const [editionId, companyId, optionId] = prep.dataset.conventionPrep.split('|');
      return run(Game.conventionCompany.prepare(state, editionId, companyId, optionId));
    }
    const partner = target?.closest?.('[data-convention-partner]');
    if (partner) {
      const [editionId, companyId, type, offerId] = partner.dataset.conventionPartner.split('|');
      return run(Game.conventionPartners.negotiate(state, editionId, companyId, type, offerId));
    }
    const operation = target?.closest?.('[data-convention-operation]');
    if (operation) {
      const [editionId, companyId, choiceId] = operation.dataset.conventionOperation.split('|');
      return run(Game.conventionOperations.choose(state, editionId, companyId, choiceId));
    }
    return base.handleClick(event);
  }
  function render(state) {
    return `${base.render(state)}${Game.conventionCompanyView.render(state)}`;
  }
  function monthly(state) {
    base.monthly(state);
    Game.conventionCompanySettlement?.monthly(state);
  }

  Game.companySystem = Object.freeze({ ...base, handleClick, render, monthly });
}(window));
