(function initHealthSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const diseasePool = [
    ['cold', '感冒', 'common', 0, 1, 400, 2],
    ['flu', '流感', 'common', 0, 2, 800, 3],
    ['gastritis', '胃炎', 'common', 16, 2, 1200, 4],
    ['insomnia', '失眠症', 'common', 18, 1, 600, 3],
    ['hypertension', '高血压', 'chronic', 35, 3, 2000, 18],
    ['diabetes', '糖尿病', 'chronic', 40, 3, 2500, 24],
    ['arthritis', '关节炎', 'chronic', 45, 2, 1800, 18],
    ['heart', '心脏病', 'chronic', 50, 4, 5000, 0, true],
    ['gonorrhea', '淋病', 'std', 16, 2, 2000, 0, false, true],
    ['syphilis', '梅毒', 'std', 16, 3, 5000, 0, false, true],
    ['chlamydia', '衣原体感染', 'std', 16, 1, 1500, 0, false, true],
    ['hiv', 'HIV感染', 'std', 16, 5, 15000, 0, false, true],
    ['cervicitis', '宫颈炎', 'gyn', 18, 2, 3000, 4],
    ['pid', '盆腔炎', 'gyn', 18, 3, 4500, 5],
    ['fibroid', '子宫肌瘤', 'gyn', 30, 3, 6000, 8],
  ].map(([id, name, type, minAge, severity, treatCost, selfHealMonths,
    fatal = false, incurable = false]) => (
    { id, name, type, minAge, severity, treatCost, selfHealMonths, fatal, incurable }
  ));

  const definition = (id) => diseasePool.find((item) => item.id === id);
  const hasMonth = (value) => Number.isFinite(value);
  const active = (state) => (state.health.diseases || []).filter((item) => !hasMonth(item.healedAt));

  function payMedical(state, amount) {
    const cost = Math.max(0, Math.round(amount));
    if (U.age(state) < 18) {
      state.familyWealth = (Number(state.familyWealth) || 0) - cost;
      return { cost, payer: '家庭资产' };
    }
    Game.economy.spend(state, cost);
    return { cost, payer: '个人现金' };
  }

  function paymentText(payment) {
    return `${payment.payer}承担 ${Game.view.money(payment.cost)}`;
  }

  function checkup(state) {
    const payment = payMedical(state, 1200);
    state.health.lastCheckupMonth = state.totalMonths;
    state.health.careLevel = U.clamp(state.health.careLevel + 12, 0, 100);
    const hidden = active(state).filter((item) => !hasMonth(item.discoveredAt));
    hidden.forEach((item) => { item.discoveredAt = state.totalMonths; });
    const result = hidden.length ? `发现${hidden.length}项健康问题` : '没有发现新的健康问题';
    Game.lifeDirector.addLog(state, '健康检测', `完成健康检测，${result}。`, hidden.length ? 'normal' : 'good');
    return { ok: true, message: `健康检测完成，${result}；${paymentText(payment)}` };
  }

  function treat(state, diseaseId) {
    const disease = active(state).find((item) => item.id === diseaseId && !hasMonth(item.treatedAt));
    const def = disease && definition(disease.id);
    if (!disease || !def) return { ok: false, message: '该疾病当前不需要治疗' };
    const payment = payMedical(state, def.treatCost);
    disease.discoveredAt = hasMonth(disease.discoveredAt) ? disease.discoveredAt : state.totalMonths;
    disease.treatedAt = state.totalMonths;
    if (!def.fatal && !def.incurable) disease.healedAt = state.totalMonths;
    state.stats.健康 = U.clamp(state.stats.健康 + Math.max(4, def.severity * 3), 0, 100);
    const result = def.fatal || def.incurable ? '病情已得到控制' : '已经痊愈';
    Game.lifeDirector.addLog(state, '疾病治疗', `${disease.name}${result}。`, 'good');
    return { ok: true, message: `${disease.name}${result}；${paymentText(payment)}` };
  }

  function action(state, type, value) {
    if (type === 'checkup') return checkup(state);
    if (type === 'treat') return treat(state, value);
    return { ok: false, message: '未知的健康操作' };
  }

  function addDisease(state, diseaseId) {
    const def = definition(diseaseId);
    if (!def || active(state).some((item) => item.id === diseaseId)) return null;
    const disease = {
      id: def.id, name: def.name, type: def.type, severity: def.severity,
      infectedAt: state.totalMonths,
      discoveredAt: ['common', 'std'].includes(def.type) ? state.totalMonths : null,
      treatedAt: null, healedAt: null,
    };
    state.health.diseases.push(disease);
    if (hasMonth(disease.discoveredAt)) {
      const advice = def.incurable ? '不可痊愈，但不会致死，治疗后可以控制病情。'
        : (def.fatal ? '需要尽快治疗。' : '可以治疗或等待自行恢复。');
      Game.lifeDirector.addLog(state, '健康警报', `你患上了${def.name}，${advice}`, 'normal');
    }
    return disease;
  }

  function checkSTD(state, riskLevel) {
    const chance = { low: 0.02, medium: 0.06, high: 0.12 }[riskLevel] || 0.03;
    if (Math.random() >= chance) return null;
    const pool = ['gonorrhea', 'chlamydia', 'syphilis'].filter((id) => (
      !active(state).some((item) => item.id === id)
    ));
    const result = pool.length ? addDisease(state, U.random(pool)) : null;
    if (result) state.health.stdHistory.push({ id: result.id, name: result.name, infectedAt: state.totalMonths });
    return result;
  }

  function retire(state) {
    if (state.health.retired) return;
    const salary = state.career.salary || 0;
    state.health.retired = true;
    state.health.pension = Math.max(1800, Math.round(salary * 0.34 + state.health.retirementFund / 240));
    Object.assign(state.career, {
      job: null, jobId: null, company: null, salary: 0, performance: 0, management: false,
    });
    Game.workplace.leave(state);
    Game.lifeDirector.addLog(state, '正式退休', '你结束全职工作，开始领取养老金。', 'milestone');
  }

  function reachedLifeExpectancy(state) {
    const identity = Game.hunterMode.identity(state);
    if (identity.skin) {
      Game.mortality.ensurePerson(identity.skin);
      return Game.timeSystem.ageMonths(state) >= identity.skin.lifeExpectancyMonths;
    }
    if (!Number.isInteger(state.health.lifeExpectancyMonths)) {
      state.health.lifeExpectancyMonths = Game.mortality.lifeMonths(
        `player-${state.generation}-${state.profile.genetics?.code || state.name}`,
      );
    }
    return Game.timeSystem.ageMonths(state) >= state.health.lifeExpectancyMonths;
  }

  function monthly(state) {
    const age = U.age(state);
    if (state.health.retired) state.money += state.health.pension;
    else if (state.career.salary > 0) state.health.retirementFund += Math.round(state.career.salary * 0.03);
    if (age >= 65 && state.career.job && !state.health.retired) retire(state);
    active(state).forEach((disease) => {
      const def = definition(disease.id);
      if (!def) return;
      disease.infectedAt = hasMonth(disease.infectedAt)
        ? disease.infectedAt : (hasMonth(disease.discoveredAt) ? disease.discoveredAt : state.totalMonths);
      if (!def.fatal && !def.incurable
        && state.totalMonths - disease.infectedAt >= def.selfHealMonths) {
        disease.healedAt = state.totalMonths;
        Game.lifeDirector.addLog(state, '自行痊愈', `${disease.name}已经自行痊愈。`, 'good');
        return;
      }
      if (!hasMonth(disease.treatedAt)) {
        const minimumHealth = def.type === 'std' ? 1 : 0;
        state.stats.健康 = U.clamp(
          state.stats.健康 - Math.max(1, def.severity), minimumHealth, 100,
        );
      }
    });
    if (state.totalMonths % 4 === 0 && Math.random() < 0.08 + (age > 60 ? 0.05 : 0)) {
      const pool = diseasePool.filter((item) => (
        item.type === 'common' && age >= item.minAge && !active(state).some((disease) => disease.id === item.id)
      ));
      if (pool.length) addDisease(state, U.random(pool).id);
    }
    if (state.stats.健康 <= 0 || reachedLifeExpectancy(state)) {
      Game.legacySystem.prepareDeath(state, state.stats.健康 <= 0 ? '致命疾病' : '自然衰老');
    }
  }

  function diseaseRows(state) {
    const rows = active(state).filter((item) => hasMonth(item.discoveredAt)).map((disease) => {
      const def = definition(disease.id);
      if (!def) return '';
      const managed = (def.fatal || def.incurable) && hasMonth(disease.treatedAt);
      const infectedAt = hasMonth(disease.infectedAt) ? disease.infectedAt : state.totalMonths;
      const status = managed ? (def.incurable ? '长期控制，不会致死' : '病情已控制')
        : (def.incurable ? '不可痊愈，但不会致死' : (def.fatal ? '致命疾病，需要治疗'
          : `可自行痊愈，预计${Math.max(0, def.selfHealMonths - (state.totalMonths - infectedAt))}个月`));
      const button = hasMonth(disease.treatedAt) ? '' : `<button data-health-action="treat"
        data-health-value="${disease.id}">治疗 · ${Game.view.money(def.treatCost)}</button>`;
      return `<article class="disease-row"><div><strong>${disease.name}</strong><small>${status}</small></div>${button}</article>`;
    }).join('');
    return rows || '<p class="empty-state">目前没有已发现疾病。可痊愈的非致命疾病会随时间自行恢复。</p>';
  }

  function render(state) {
    const known = active(state).filter((item) => hasMonth(item.discoveredAt)).length;
    const checkupNote = U.age(state) < 18 ? '未成年检测与治疗费用由家庭承担' : '检测费用由个人现金承担';
    const surgery = Game.plasticSurgery ? Game.plasticSurgery.render(state) : '';
    return `<section class="health-summary"><div><span>健康状态</span><strong>${state.stats.健康}</strong>
      <small>已发现疾病 ${known} 项</small></div></section>
      <section class="health-module"><header><span>01</span><div><h3>检测健康</h3><small>${checkupNote}</small></div></header>
      <button class="health-primary" data-health-action="checkup">进行健康检测 · ${Game.view.money(1200)}</button></section>
      <section class="health-module"><header><span>02</span><div><h3>疾病治疗</h3>
      <small>普通疾病可自行恢复；性病不可痊愈，但治疗后可长期控制且不会致死</small></div></header>
      <div class="disease-list">${diseaseRows(state)}</div></section>
      <section class="health-module"><header><span>03</span><div><h3>整容</h3>
      <small>保留外貌改造、手术风险与历史记录</small></div></header>${surgery}</section>`;
  }

  Game.healthSystem = Object.freeze({ action, monthly, render, checkSTD, addDisease });
}(window));
