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
    if (selector) return Game.appearance.open(
      selector.dataset.selectorField,
      selector.dataset.selectorTarget,
    ), true;
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
    const style = event.target.closest('[data-parenting-style]');
    if (style) return finish(Game.parenting.setStyle(state, style.dataset.parentingStyle)), true;
    const parenting = event.target.closest('[data-parenting-child]');
    if (parenting) {
      return finish(Game.parenting.act(
        state, parenting.dataset.parentingChild, parenting.dataset.parentingAction,
      )), true;
    }
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
    const workplace = event.target.closest('[data-workplace-action]');
    if (workplace) return finish(Game.workplace.act(state, workplace.dataset.workplaceAction)), true;
    const specialty = event.target.closest('[data-career-specialty]');
    if (specialty) return finish(Game.careerSpecialties.choose(state, specialty.dataset.careerSpecialty)), true;
    const careerAction = event.target.closest('[data-career-action]');
    if (careerAction) return finish(Game.careerSpecialties.act(state, careerAction.dataset.careerAction)), true;
    const filter = event.target.closest('[data-job-filter]');
    if (filter) {
      Game.careerView.setJobFilter(filter.dataset.jobFilter);
      api.refresh();
      return true;
    }
    const cityFilter = event.target.closest('[data-city-filter]');
    if (cityFilter) {
      Game.careerView.setCityFilter(cityFilter.dataset.cityFilter);
      api.refresh();
      return true;
    }
    const work = event.target.closest('[data-work-action]');
    if (work) return finish(Game.careerSystem.work(state, work.dataset.workAction)), true;
    const detail = event.target.closest('[data-job-detail]');
    if (detail) return Game.careerView.openJob(state, detail.dataset.jobDetail), true;
    const apply = event.target.closest('[data-job-apply]');
    if (apply) {
      const result = Game.careerSystem.apply(state, apply.dataset.jobApply);
      finish(result);
      if (result.ok) Game.navigation.closeDetail();
      return true;
    }
    const city = event.target.closest('[data-city]');
    if (city) {
      if (root.confirm(`确定迁居${city.dataset.city}吗？当前非自由职业会结束。`)) {
        finish(Game.careerSystem.move(state, city.dataset.city));
      }
      return true;
    }
    return false;
  }

  function handleLifeSystems(event, state) {
    const transfer = event.target.closest('[data-civic-transfer]');
    if (transfer) return finish(Game.civicSystem.transfer(state, transfer.dataset.civicTransfer)), true;
    const surname = event.target.closest('[data-civic-surname]');
    if (surname) {
      if (root.confirm(`确定采用“${surname.dataset.civicSurname}”作为当地文化姓氏吗？`)) {
        finish(Game.civicSystem.changeSurname(state, surname.dataset.civicSurname));
      }
      return true;
    }
    const studyFocus = event.target.closest('[data-study-focus]');
    if (studyFocus) return finish(Game.educationSystem.setFocus(state, studyFocus.dataset.studyFocus)), true;
    const education = event.target.closest('[data-education-action]');
    if (education) return finish(Game.educationSystem.act(state, education.dataset.educationAction)), true;
    const action = event.target.closest('[data-health-action]');
    if (action) {
      return finish(Game.healthSystem.action(state, action.dataset.healthAction,
        action.dataset.healthValue)), true;
    }
    const surgery = event.target.closest('[data-surgery]');
    if (surgery) {
      return finish(Game.plasticSurgery?.perform(state, surgery.dataset.surgery) || { ok: false, message: '手术系统不可用' }), true;
    }
    const bankRepay = event.target.closest('[data-bank-repay]');
    if (bankRepay) return finish(Game.bankSystem?.repayLoan(state, bankRepay.dataset.bankRepay) || { ok: false }), true;
    const psych = event.target.closest('[data-psych-action]');
    if (psych) {
      const result = psych.dataset.psychAction === 'rehab'
        ? Game.psychology.rehab(state)
        : Game.psychology.reduceGuilt(state, psych.dataset.psychMethod);
      return finish(result), true;
    }
    if (event.target.closest('[data-criminal-blackmarket]')) {
      return finish(Game.criminalSystem.enterBlackMarket(state)), true;
    }
    const frequency = event.target.closest('[data-npc-frequency]');
    if (frequency) {
      Game.npcInitiative.changeFrequency(state, frequency.dataset.npcFrequency);
      return finish({ ok: true, message: 'NPC主动事件频率已更新' }), true;
    }
    const companyFire = event.target.closest('[data-company-fire]');
    if (companyFire) return finish(Game.companySystem?.fireEmployee(state, companyFire.dataset.companyId, companyFire.dataset.employeeId) || { ok: false }), true;
    return false;
  }

  function handleAssets(event, state) {
    const marketFilter = event.target.closest('[data-market-filter]');
    if (marketFilter) {
      Game.marketView.setFilter(marketFilter.dataset.marketFilter);
      api.refresh();
      return true;
    }
    const companyStock = event.target.closest('[data-company-stock]');
    if (companyStock) return Game.marketView.openDetail(state, companyStock.dataset.companyStock), true;
    const stockTrade = event.target.closest('[data-stock-company]');
    if (stockTrade) {
      Game.actions.trade(stockTrade.dataset.stockCompany, stockTrade.dataset.trade, stockTrade.dataset.lot);
      Game.marketView.openDetail(state, stockTrade.dataset.stockCompany);
      return true;
    }
    const journeyStart = event.target.closest('[data-journey-start]');
    if (journeyStart) return finish(Game.journeySystem.start(state, journeyStart.dataset.journeyStart)), true;
    const journeyChoice = event.target.closest('[data-journey-choice]');
    if (journeyChoice) return finish(Game.journeySystem.choose(state, journeyChoice.dataset.journeyChoice)), true;
    if (Game.travelInteractions?.handleClick(event)) return true;
    const roam = event.target.closest('[data-roam-area]');
    if (roam) return finish(Game.travelSystem.roam(state, roam.dataset.roamArea)), true;
    const propertyBuy = event.target.closest('[data-property-buy]');
    if (propertyBuy) return finish(Game.propertySystem.buy(state, Number(propertyBuy.dataset.propertyBuy))), true;
    if (event.target.closest('[data-property-sell]')) {
      if (root.confirm('确定出售当前房产并结清剩余贷款吗？')) finish(Game.propertySystem.sell(state));
      return true;
    }
    const propertyRepay = event.target.closest('[data-property-repay]');
    if (propertyRepay) return finish(Game.propertySystem.repay(state, propertyRepay.dataset.propertyRepay)), true;
    const business = event.target.closest('[data-business]');
    if (business) return finish(Game.assetsSystem.buyBusiness(state, business.dataset.business)), true;
    const vehicle = event.target.closest('[data-vehicle]');
    if (vehicle) return finish(Game.assetsSystem.buyVehicle(state, vehicle.dataset.vehicle)), true;
    const bankAction = event.target.closest('[data-bank-action]');
    if (bankAction) {
      const action = bankAction.dataset.bankAction;
      if (action === 'repay') return finish(Game.bankSystem.repayLoan(state, bankAction.dataset.bankValue)), true;
      if (action === 'welfare') return finish(Game.bankSystem.welfare(state)), true;
      const amount = root.prompt('输入贷款金额：', '10000');
      if (amount !== null) finish(Game.bankSystem.applyLoan(state, bankAction.dataset.bankType, Number(amount)));
      return true;
    }
    const companyAction = event.target.closest('[data-company-action]');
    if (companyAction) {
      const action = companyAction.dataset.companyAction;
      if (action === 'create') Game.companySystem?.startCreation(state);
      else if (action === 'invest') Game.companySystem?.investMore(state, companyAction.dataset.companyId, Number(companyAction.dataset.amount));
      else if (action === 'sell') Game.companySystem?.sellCompany(state, companyAction.dataset.companyId);
      else if (action === 'close') Game.companySystem?.closeCompany(state, companyAction.dataset.companyId);
      api.refresh(); return true;
    }
    const companyHire = event.target.closest('[data-company-hire]');
    if (companyHire) return finish(Game.companySystem?.hireEmployee(state, companyHire.dataset.companyId) || { ok: false }), true;
    return false;
  }

  function handle(event) {
    if (Game.npcInitiative?.handleClick?.(event)) return;
    if (Game.relationshipPanel?.handleClick?.(event)) return;
    if (Game.subjectPanel?.handleClick?.(event)) return;
    if (Game.companySystem?.handleClick?.(event)) { Game._save?.(); return; }
    if (Game.undergroundIdol?.handleClick?.(event)) { Game._save?.(); return; }
    if (Game.careerPanelActions?.handleClick?.(event)) return;
    if (Game.careerPanels?.handleClick?.(event)) { Game._save?.(); return; }
    if (Game.encounterSystem?.handleClick?.(event)) return;
    if (Game.brothelSystem?.handleClick?.(event)) { Game._save?.(); return; }
    if (Game.hookupSystem?.handleClick?.(event)) { Game._save?.(); return; }
    if (Game.idolSystem?.handleClick?.(event)) return;
    if (Game.familyConflict?.handleClick?.(event)) return;
    if (Game.travelInteractions?.handleClick?.(event)) return;
    if (Game.portraitGallery.handleClick(event)) return;
    if (Game.characterChat.handleClick(event)) return;
    if (Game.hunterMode.handleClick(event)) return;
    if (Game.saveManager.handleClick(event)) return;
    if (Game.roleBook.handleClick(event)) return;
    if (Game.appearance.handleClick(event)) return;
    if (Game.drawSettings.handleClick(event)) return;
    if (Game.schoolLines.handleClick(event)) return;
    if (handlePortrait(event) || handleNavigation(event)) return;
    const state = api.getState();
    if (Game.extendedInteractions.handle(event, state, finish)) return;
    if (handleRelations(event, state) || handleCareer(event, state) || handleLifeSystems(event, state)) return;
    handleAssets(event, state);
  }

  function configure(options) { api = options; }

  Game.interactionRouter = Object.freeze({ configure, handle });
}(window));
