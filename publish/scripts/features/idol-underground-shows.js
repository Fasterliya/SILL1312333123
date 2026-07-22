(function initUndergroundIdolShows(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.undergroundIdolCore;

  function train(state, skill) {
    if (!Core.isUndergroundIdol(state)) {
      return { ok: false, message: '只有地下偶像才能进行专项训练' };
    }
    const underground = Core.ensure(state);
    const label = skill === 'dance' ? '舞蹈' : (skill === 'vocal' ? '声乐' : '表情管理');
    const gain = Math.round(U.between(5, 12) * 0.7);
    underground.skills[skill] = U.clamp(underground.skills[skill] + gain, 0, 100);
    state.stats.健康 = U.clamp(state.stats.健康 - 1, 0, 100);
    underground.trainingMonths += 1;
    Core.updateStage(state, underground);
    Game.lifeDirector.addLog(
      state,
      '地下偶像训练',
      `你进行了${label}训练（地下条件有限，效率仅70%），${label}能力 ${underground.skills[skill]}。`,
      'good',
    );
    return {
      ok: true,
      message: `${label}训练完成，当前 ${underground.skills[skill]}（效率70%）`,
    };
  }

  function showNarrative(fans) {
    if (fans < 1000) {
      return 'Livehouse里观众不多，但你依然卖力表演，每一个粉丝都来之不易。';
    }
    if (fans < 5000) {
      return '前排粉丝挥舞应援棒呼喊你的名字，狭小场地里的气氛格外热烈。';
    }
    return '今晚Livehouse爆满，整齐的应援和安可声让你成为地下舞台的焦点。';
  }

  function monthlyShow(state) {
    if (!Core.isUndergroundIdol(state)) {
      return { ok: false, message: '只有地下偶像才能登台演出' };
    }
    const underground = Core.ensure(state);
    if (state.totalMonths <= underground.lastShowMonth) {
      return { ok: false, message: '本月已经完成过Livehouse演出' };
    }
    const ticketPrice = underground.stage === 'trainee' ? 15 : 30;
    const charmFactor = U.clamp((state.stats.魅力 || 30) / 80, 0.4, 1.8);
    const income = Math.round(underground.fans * ticketPrice * charmFactor);
    const totalSkill = underground.skills.dance
      + underground.skills.vocal
      + underground.skills.expression;
    const quality = U.clamp(totalSkill / 150, 0.4, 1.5);
    const baseGain = Math.round(
      underground.fans * 0.03 * quality + U.between(-10, 40) * quality,
    );
    const fanGain = Math.max(baseGain, -Math.round(underground.fans * 0.02));
    underground.fans = Math.max(0, underground.fans + fanGain);
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 3, 0, 100);
    underground.lastShowMonth = state.totalMonths;
    underground.lastIncomeMonth = income;
    Core.updateStage(state, underground);
    Game.lifeDirector.addLog(
      state,
      '地下Livehouse演出',
      `${showNarrative(underground.fans)} 收入${Game.view.money(income)}，粉丝${fanGain >= 0 ? '+' : ''}${fanGain}。`,
      'good',
    );
    return {
      ok: true,
      message: `Livehouse演出完成，收入${Game.view.money(income)}，粉丝${fanGain >= 0 ? '+' : ''}${fanGain}`,
    };
  }

  function specialShow(state) {
    if (!Core.isUndergroundIdol(state)) {
      return { ok: false, message: '只有地下偶像才能举办特殊公演' };
    }
    const underground = Core.ensure(state);
    if (state.totalMonths - underground.lastSpecialShowMonth < 3) {
      return { ok: false, message: '距离上次特殊公演不足3个月，身体需要休息' };
    }
    if (state.stats.健康 < 25) {
      return { ok: false, message: '健康不足，无法承受特殊公演的强度' };
    }
    state.stats.健康 = U.clamp(state.stats.健康 - 20, 0, 100);
    const ticketPrice = underground.stage === 'trainee' ? 25 : 50;
    const charmFactor = U.clamp((state.stats.魅力 || 30) / 80, 0.4, 1.8);
    const income = Math.round(underground.fans * ticketPrice * charmFactor * 2);
    const totalSkill = underground.skills.dance
      + underground.skills.vocal
      + underground.skills.expression;
    const quality = U.clamp(totalSkill / 120, 0.5, 1.6);
    const fanGain = Math.round(
      underground.fans * 0.05 * quality + U.between(20, 80) * quality,
    );
    underground.fans += fanGain;
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
    underground.lastSpecialShowMonth = state.totalMonths;
    underground.lastIncomeMonth = Math.max(underground.lastIncomeMonth || 0, income);
    Game.lifeDirector.addLog(
      state,
      '地下偶像特殊公演',
      `超长公演消耗20健康，收入${Game.view.money(income)}，新增${fanGain}粉丝。`,
      'good',
    );
    return {
      ok: true,
      message: `特殊公演完成！收入${Game.view.money(income)}，粉丝+${fanGain}，健康-20`,
    };
  }

  Game.undergroundIdolShows = Object.freeze({
    train,
    monthlyShow,
    specialShow,
  });
}(window));
