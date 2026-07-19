(function initInteractionRouter(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let api = null;

  function finish(result) {
    if (!result) return;
    api.finish(result);
  }

  function handleNavigation(event) {
    const module = event.target.closest('[data-open-module]');
    if (module) return Game.navigation.openModule(module.dataset.openModule, module.dataset.moduleTitle), true;
    const selector = event.target.closest('[data-selector-field]');
    if (selector) return Game.appearance.open(selector.dataset.selectorField), true;
    const avatar = event.target.closest('[data-character-id]');
    if (avatar) return Game.navigation.openCharacter(avatar.dataset.characterId), true;
    return false;
  }

  function handlePortrait(event) {
    const button = event.target.closest('[data-npc-generate]');
    if (!button) return false;
    const panel = button.closest('.npc-panel');
    const custom = panel?.querySelector('[data-npc-prompt]')?.value || '';
    Game.portraitSystem.generateNpc(button.dataset.npcGenerate, custom);
    return true;
  }

  function handleRelations(event, state) {
    const family = event.target.closest('[data-detail-family], [data-person]');
    if (family) {
      Game.familySystem.interact(
        family.dataset.detailFamily || family.dataset.person,
        family.dataset.familyAction || family.dataset.personAction,
      );
      return true;
    }
    const contact = event.target.closest('[data-detail-contact], [data-contact]');
    if (contact) {
      finish(Game.social.interact(
        state, contact.dataset.detailContact || contact.dataset.contact,
        contact.dataset.contactAction,
      ));
      return true;
    }
    const classFilter = event.target.closest('[data-class-filter]');
    if (classFilter) {
      Game.social.setClassFilter(classFilter.dataset.classFilter);
      api.refresh();
      return true;
    }
    if (event.target.closest('[data-create-matches]')) {
      finish(Game.matchmaking.createMatches(state));
      return true;
    }
    return false;
  }

  function handleCareer(event, state) {
    const filter = event.target.closest('[data-job-filter]');
    if (filter) {
      Game.careerSystem.setJobFilter(filter.dataset.jobFilter);
      api.refresh();
      return true;
    }
    const cityFilter = event.target.closest('[data-city-filter]');
    if (cityFilter) {
      Game.careerSystem.setCityFilter(cityFilter.dataset.cityFilter);
      api.refresh();
      return true;
    }
    const work = event.target.closest('[data-work-action]');
    if (work) return finish(Game.careerSystem.work(state, work.dataset.workAction)), true;
    const job = event.target.closest('[data-job]');
    if (job) return finish(Game.careerSystem.apply(state, job.dataset.job)), true;
    const city = event.target.closest('[data-city]');
    if (city) {
      if (root.confirm(`确定迁居${city.dataset.city}吗？当前非自由职业会结束。`)) {
        finish(Game.careerSystem.move(state, city.dataset.city));
      }
      return true;
    }
    return false;
  }

  function handleAssets(event, state) {
    const roam = event.target.closest('[data-roam-area]');
    if (roam) return finish(Game.travelSystem.roam(state, roam.dataset.roamArea)), true;
    const business = event.target.closest('[data-business]');
    if (business) return finish(Game.assetsSystem.buyBusiness(state, business.dataset.business)), true;
    const vehicle = event.target.closest('[data-vehicle]');
    if (vehicle) return finish(Game.assetsSystem.buyVehicle(state, vehicle.dataset.vehicle)), true;
    const stock = event.target.closest('[data-stock]');
    if (stock) return Game.actions.trade(stock.dataset.stock, stock.dataset.trade), true;
    const house = event.target.closest('[data-house]');
    if (house) return Game.actions.buyHouse(Number(house.dataset.house)), true;
    return false;
  }

  function handle(event) {
    if (Game.appearance.handleClick(event)) return;
    if (handlePortrait(event) || handleNavigation(event)) return;
    const state = api.getState();
    if (handleRelations(event, state) || handleCareer(event, state)) return;
    handleAssets(event, state);
  }

  function configure(options) { api = options; }

  Game.interactionRouter = Object.freeze({ configure, handle });
}(window));
