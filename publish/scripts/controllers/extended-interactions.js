(function initExtendedInteractions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function handleSecret(event, state, finish) {
    const button = event.target.closest('[data-contact-action="secret-date"]');
    if (!button) return false;
    const id = button.dataset.detailContact || button.dataset.contact;
    finish(Game.relationshipSecrets.start(state, Game.people.find(state, id)));
    return true;
  }

  function handleHousehold(event, state, finish) {
    const policy = event.target.closest('[data-household-policy]');
    if (policy) {
      finish(Game.householdSystem.setPolicy(state, policy.dataset.householdPolicy));
      return true;
    }
    const action = event.target.closest('[data-household-action]');
    if (!action) return false;
    finish(Game.householdSystem.act(
      state, action.dataset.householdAction, action.dataset.householdValue,
    ));
    return true;
  }

  function handleCreator(event, state, finish) {
    const button = event.target.closest('[data-creator-action]');
    if (!button) return false;
    const action = button.dataset.creatorAction;
    let result;
    if (action === 'publish') {
      const title = button.closest('.creator-card')?.querySelector('[data-creator-title]')?.value || '';
      result = Game.creatorCareer.publish(state, title);
    } else if (action === 'live') result = Game.creatorCareer.livestream(state);
    else if (action === 'sponsor') result = Game.creatorCareer.sponsor(state);
    else if (action === 'private') result = Game.creatorCareer.privateDeal(state);
    else if (action === 'community') result = Game.creatorCareer.community(state);
    else result = Game.creatorGrowthActions.act(state, action);
    finish(result);
    return true;
  }

  function handleAssault(event, state, finish) {
    var btn = event.target.closest('[data-contact-action="assault"], [data-detail-contact]');
    if (!btn || btn.dataset.contactAction !== 'assault') return false;
    var id = btn.dataset.detailContact || btn.dataset.contact;
    var partner = Game.people.find(state, id);
    if (!partner) return false;
    finish(Game.rapeEncounter.initRape(state, partner, 'contact'));
    return true;
  }

  function handle(event, state, finish) {
    return handleSecret(event, state, finish)
      || handleHousehold(event, state, finish)
      || handleCreator(event, state, finish)
      || handleAssault(event, state, finish);
  }

  Game.extendedInteractions = Object.freeze({ handle });
}(window));
