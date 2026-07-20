(function initEconomicCareerActions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const State = Game.economicCareerState;

  function finish(result) {
    if (!result) return;
    Game._refresh?.();
    Game._save?.();
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
  }

  function accept(state, appointmentId) {
    const data = State.ensure(state).sexWork;
    const index = data.appointments.findIndex((item) => item.id === appointmentId);
    if (index < 0) return { ok: false, message: '预约已经失效' };
    if (state.stats.健康 < 10) return { ok: false, message: '健康过低，无法继续接待' };
    const appointment = data.appointments.splice(index, 1)[0];
    state.money += appointment.price;
    state.stats.健康 = U.clamp(state.stats.健康 - 3, 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 - 1, 0, 100);
    state.career.burnout = U.clamp((state.career.burnout || 0) + 5, 0, 100);
    data.completed += 1;
    Game.lifeDirector.addLog(
      state,
      '完成预约',
      `完成${appointment.service}，收入${Game.view.money(appointment.price)}。`,
      'normal',
    );
    return { ok: true, message: `接待完成，收入${Game.view.money(appointment.price)}` };
  }

  function sexWorkAction(state, button) {
    const data = State.ensure(state).sexWork;
    const action = button.dataset.economicAction;
    if (action === 'accept') return accept(state, button.dataset.appointmentId);
    if (action === 'reject') {
      const rejected = data.appointments.shift();
      if (!rejected) return { ok: false, message: '当前没有可拒绝的预约' };
      data.rejected += 1;
      return { ok: true, message: `已拒绝${rejected.name}的预约` };
    }
    if (action === 'street') {
      const income = Math.round(300 + state.stats.魅力 * U.between(6, 14));
      state.money += income;
      state.stats.健康 = U.clamp(state.stats.健康 - 5, 0, 100);
      state.career.burnout = U.clamp((state.career.burnout || 0) + 8, 0, 100);
      return { ok: true, message: `主动揽客收入${Game.view.money(income)}，健康-5` };
    }
    if (action === 'venue') {
      const cost = data.venueLevel * 5000;
      if (state.money < cost) return { ok: false, message: `升级场地需要${Game.view.money(cost)}` };
      Game.economy.spend(state, cost);
      data.venueLevel += 1;
      State.refreshAppointments(state, true);
      return { ok: true, message: `场地升至${data.venueLevel}级，预约报价提高` };
    }
    if (action === 'patron') {
      const candidates = (state.worldPeople || []).filter((person) => (
        person.status === '健康'
        && (person.wealth || 0) >= 500000
        && U.personAge(state, person) >= 25
        && !data.patrons.some((patron) => patron.id === person.id)
      ));
      const person = U.random(candidates);
      if (!person) return { ok: false, message: '当前城市没有合适的新金主' };
      data.patrons.push({ id: person.id, name: person.name, loyalty: 40, deals: 0 });
      Game.relationshipSecrets?.addHookRecord(state, person, '金主关系');
      return { ok: true, message: `与${person.name}建立了金主关系` };
    }
    if (action === 'private') {
      const patron = data.patrons.find((item) => item.id === button.dataset.patronId);
      if (!patron) return { ok: false, message: '金主关系已经失效' };
      const income = Math.round(2000 + patron.loyalty * 80);
      state.money += income;
      patron.deals += 1;
      patron.loyalty = U.clamp(patron.loyalty + 4, 0, 100);
      state.stats.健康 = U.clamp(state.stats.健康 - 4, 0, 100);
      return { ok: true, message: `私下交易收入${Game.view.money(income)}` };
    }
    if (action === 'checkup') {
      if (state.money < 800) return { ok: false, message: '体检需要800元' };
      Game.economy.spend(state, 800);
      state.health.lastCheckupMonth = state.totalMonths;
      state.health.std = Math.random() < (state.career.burnout || 0) / 500 ? '需复查' : '无';
      return { ok: true, message: `体检完成：${state.health.std === '无' ? '未发现异常' : '发现风险，建议治疗'}` };
    }
    if (action === 'rest') {
      state.stats.健康 = U.clamp(state.stats.健康 + 10, 0, 100);
      state.career.burnout = U.clamp((state.career.burnout || 0) - 18, 0, 100);
      state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
      return { ok: true, message: '完成休息，健康+10，倦怠下降' };
    }
    return null;
  }

  function useItem(state, item) {
    const market = State.ensure(state).blackMarket;
    market.stock[item.id] -= 1;
    market.used[item.id] = (market.used[item.id] || 0) + 1;
    if (item.id === 'fakeId') {
      state.criminal.evasionSkill = U.clamp((state.criminal.evasionSkill || 0) + 8, 0, 100);
    } else if (item.id === 'toy' || item.id === 'smKit') {
      state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
    } else if (item.id === 'spyCam') {
      state.creator = state.creator || {};
      state.creator.scandalRisk = U.clamp((state.creator.scandalRisk || 0) + 12, 0, 100);
      Game.criminalSystem.addRecord(state, 5);
    } else {
      state.stats.健康 = U.clamp(state.stats.健康 - 3, 0, 100);
      state.psychology.sexAddiction = U.clamp((state.psychology.sexAddiction || 0) + 3, 0, 100);
    }
    return { ok: true, message: `已使用${item.name}` };
  }

  function marketAction(state, button) {
    const market = State.ensure(state).blackMarket;
    const action = button.dataset.economicMarket;
    if (action === 'sell-all') {
      let income = 0;
      State.ITEMS.forEach((item) => {
        income += (market.stock[item.id] || 0) * item.sell;
        market.stock[item.id] = 0;
      });
      if (!income) return { ok: false, message: '当前没有库存可出售' };
      state.money += income;
      Game.criminalSystem.addRecord(state, 8);
      return { ok: true, message: `批量出售收入${Game.view.money(income)}` };
    }
    const item = State.findItem(button.dataset.itemId);
    if (!item) return { ok: false, message: '商品已经下架' };
    if (action === 'buy') {
      if (state.money < item.buy) return { ok: false, message: '资金不足' };
      Game.economy.spend(state, item.buy);
      market.stock[item.id] = (market.stock[item.id] || 0) + 1;
      Game.criminalSystem.addRecord(state, item.risk);
      return { ok: true, message: `购入1件${item.name}` };
    }
    if ((market.stock[item.id] || 0) < 1) return { ok: false, message: '库存不足' };
    if (action === 'sell') {
      market.stock[item.id] -= 1;
      state.money += item.sell;
      Game.criminalSystem.addRecord(state, item.risk + 1);
      return { ok: true, message: `出售${item.name}，收入${Game.view.money(item.sell)}` };
    }
    if (action === 'use') return useItem(state, item);
    return null;
  }

  function handleClick(event) {
    const state = Game._getState?.();
    if (!state) return false;
    const sexWork = event.target.closest('[data-economic-action]');
    if (sexWork) {
      finish(sexWorkAction(state, sexWork));
      return true;
    }
    const market = event.target.closest('[data-economic-market]');
    if (market) {
      finish(marketAction(state, market));
      return true;
    }
    return false;
  }

  Game.economicCareerActions = Object.freeze({ handleClick });
}(window));
