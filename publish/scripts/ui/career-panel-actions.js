(function initCareerPanelActions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function finish(result) {
    if (!result) return;
    const state = Game._getState?.();
    if (result.ok && state) Game.specialCareerRanks?.sync(state);
    Game._refresh?.();
    Game._save?.();
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
  }

  function switchTab(button) {
    const panel = button.closest('.career-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-career-tab]').forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    panel.querySelectorAll('[data-panel-tab]').forEach((item) => {
      item.style.display = item.dataset.panelTab === button.dataset.careerTab ? '' : 'none';
    });
  }

  function buyBlackMarket(state, itemIds) {
    state.blackMarket = state.blackMarket && typeof state.blackMarket === 'object'
      ? state.blackMarket : { stock: {} };
    state.blackMarket.stock ||= {};
    const items = Game.careerPanels.BLACK_MARKET_ITEMS.filter((item) => itemIds.includes(item.id));
    const cost = items.reduce((sum, item) => sum + item.buyPrice, 0);
    if (!items.length) return { ok: false, message: '没有可购买的黑市商品' };
    if (state.money < cost) return { ok: false, message: `进货需要${Game.view.money(cost)}` };
    Game.economy.spend(state, cost);
    items.forEach((item) => {
      state.blackMarket.stock[item.id] = (state.blackMarket.stock[item.id] || 0) + 1;
    });
    Game.criminalSystem.addRecord(state, items.length > 1 ? 4 : 1);
    return { ok: true, message: `完成${items.length}件黑市商品进货` };
  }

  function pimpAction(state, button) {
    state.brothel = state.brothel && typeof state.brothel === 'object'
      ? state.brothel : { girls: [], policeRisk: 15, security: 0, capacity: 3 };
    const action = button.dataset.pimpAction;
    if (action === 'security') {
      if (state.money < 5000) return { ok: false, message: '提升安保需要5000元' };
      Game.economy.spend(state, 5000);
      state.brothel.security += 1;
      state.brothel.policeRisk = Math.max(0, state.brothel.policeRisk - 8);
      return { ok: true, message: '会所安保提升，警方风险下降' };
    }
    if (action === 'expand') {
      if (state.money < 20000) return { ok: false, message: '扩大会所需要20000元' };
      Game.economy.spend(state, 20000);
      state.brothel.capacity += 2;
      return { ok: true, message: '会所容量增加2人' };
    }
    if (action === 'recruit') {
      if (state.brothel.girls.length >= state.brothel.capacity) return { ok: false, message: '会所容量已满' };
      const person = Game.people.find(state, button.dataset.recruitId);
      if (!person) return { ok: false, message: '招募对象已离开城市' };
      const salary = Number(button.dataset.recruitSalary) || 2000;
      if (state.money < salary) return { ok: false, message: '资金不足以支付首月薪资' };
      Game.economy.spend(state, salary);
      person.sexWork = { isProstitute: true, brothelId: 'player' };
      state.brothel.girls.push({
        id: person.id, name: person.name, age: Game.content.personAge(state, person),
        health: person.stats?.健康 || 70, loyalty: person.affection || 40,
        monthlyIncome: salary * 2, status: '接客中',
      });
      return { ok: true, message: `${person.name}加入了会所` };
    }
    return null;
  }

  function handleClick(event) {
    const tab = event.target.closest('[data-career-tab]');
    if (tab) {
      switchTab(tab);
      return true;
    }
    const state = Game._getState?.();
    if (!state) return false;
    const market = event.target.closest('[data-black-market]');
    if (market) {
      const ids = market.dataset.blackMarket === 'buyAll'
        ? Game.careerPanels.BLACK_MARKET_ITEMS.map((item) => item.id)
        : [market.dataset.itemId];
      finish(buyBlackMarket(state, ids));
      return true;
    }
    const pimp = event.target.closest('[data-pimp-action]');
    if (pimp) {
      finish(pimpAction(state, pimp));
      return true;
    }
    return false;
  }

  Game.careerPanelActions = Object.freeze({ handleClick });
}(window));
