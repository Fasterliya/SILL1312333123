(function initHealthSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const hasMonth = (value) => Number.isFinite(value);
  const active = (state) => (state.health.diseases || []).filter((item) => !hasMonth(item.healedAt));
  const definition = (id) => Game.healthData.get(id);

  function payMedical(state, amount) {
    const cost = Math.max(0, Math.round(amount));
    if (U.age(state) < 18) {
      state.familyWealth = (Number(state.familyWealth) || 0) - cost;
      return { cost, payer: '家庭资产' };
    }
    Game.economy.spend(state, cost);
    return { cost, payer: '个人现金' };
  }

  const paymentText = (payment) => `${payment.payer}承担 ${Game.view.money(payment.cost)}`;

  function checkup(state) {
    const payment = payMedical(state, 1200);
    state.health.lastCheckupMonth = state.totalMonths;
    state.health.careLevel = U.clamp(state.health.careLevel + 12, 0, 100);
    const hidden = active(state).filter((item) => !hasMonth(item.discoveredAt));
    hidden.forEach((item) => { item.discoveredAt = state.totalMonths; });
    Game.healthModel.sync(state);
    const known = active(state).length;
    const result = hidden.length ? `发现${hidden.length}项健康问题` : (known ? `确认${known}项健康问题` : '未发现疾病');
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
    if (['common', 'gyn'].includes(def.type) && !def.incurable) disease.healedAt = state.totalMonths;
    Game.healthModel.sync(state);
    const result = hasMonth(disease.healedAt) ? '已经治愈' : '进入长期控制';
    Game.lifeDirector.addLog(state, '疾病治疗',
      `${disease.name}${result}，健康上限会随病情解除或受控而恢复。`, 'good');
    return { ok: true, message: `${disease.name}${result}；${paymentText(payment)}` };
  }

  function lifestyle(state, type) {
    if (state.health.lastLifestyleMonth === state.totalMonths) {
      return { ok: false, message: '本月已经安排过健康生活行动' };
    }
    if (type === 'exercise') {
      const stamina = Game.staminaSystem?.spend(state, 10) || { ok: true };
      if (!stamina.ok) return stamina;
      state.health.lifestyleScore = U.clamp((state.health.lifestyleScore || 0) + 1.5, -10, 10);
      Game.characterAttributes.gain(state, '体能', 1.5, '规律运动');
      Game.stressSystem.reduce(state, 5, '规律运动');
    } else if (type === 'rest') {
      state.health.sleep = U.clamp(state.health.sleep + 1, 4, 10);
      Game.stressSystem.reduce(state, 9, '充分休息');
    } else return { ok: false, message: '未知的生活方式安排' };
    state.health.lastLifestyleMonth = state.totalMonths;
    Game.healthModel.sync(state);
    return { ok: true, message: type === 'exercise' ? '完成规律运动，体能经验增长并缓解压力' : '安排充分休息，睡眠和压力得到改善' };
  }

  function action(state, type, value) {
    if (type === 'checkup') return checkup(state);
    if (type === 'treat') return treat(state, value);
    if (type === 'lifestyle') return lifestyle(state, value);
    return { ok: false, message: '未知的健康操作' };
  }

  function diseaseText(def) {
    if (def.type === 'std') return `${def.name}属于性传播疾病，需要尽快检查和治疗。`;
    if (def.type === 'chronic') return `${def.name}会持续压低健康上限，需要长期管理。`;
    if (def.type === 'gyn') return `检查发现${def.name}，及时治疗可以解除健康上限惩罚。`;
    return `${def.name}正在影响身体状态，休息或治疗有助于恢复。`;
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
    Game.healthModel.sync(state);
    if (hasMonth(disease.discoveredAt)) {
      Game.lifeDirector.addLog(state, '健康警报', diseaseText(def), 'normal');
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

  function recoverDiseases(state) {
    active(state).forEach((disease) => {
      const def = definition(disease.id);
      if (!def || !['common', 'gyn'].includes(def.type) || def.incurable) return;
      disease.infectedAt = hasMonth(disease.infectedAt) ? disease.infectedAt : state.totalMonths;
      if (state.totalMonths - disease.infectedAt < def.selfHealMonths) return;
      disease.healedAt = state.totalMonths;
      Game.lifeDirector.addLog(state, '康复', `${disease.name}已经恢复，健康上限开始回升。`, 'good');
    });
  }

  function monthly(state) {
    const age = U.age(state);
    if (state.health.retired) state.money += state.health.pension;
    else if (state.career.salary > 0) state.health.retirementFund += Math.round(state.career.salary * 0.03);
    if (age >= 65 && state.career.job && !state.health.retired) retire(state);
    recoverDiseases(state);
    if (state.totalMonths % 4 === 0 && Math.random() < 0.08 + (age > 60 ? 0.05 : 0)) {
      const pool = Game.healthData.diseases.filter((item) => (
        item.type === 'common' && age >= item.minAge
        && !active(state).some((disease) => disease.id === item.id)
      ));
      if (pool.length) addDisease(state, U.random(pool).id);
    }
    Game.healthModel.monthly(state);
    const cause = Game.healthModel.deathCause(state);
    if (cause) Game.legacySystem.prepareDeath(state, cause);
  }

  function diseaseRows(state) {
    const rows = active(state).filter((item) => hasMonth(item.discoveredAt)).map((disease) => {
      const def = definition(disease.id);
      if (!def) return '';
      const managed = hasMonth(disease.treatedAt);
      const penalty = Math.round(def.healthPenalty * (managed ? 25 : 100));
      const status = managed ? `已控制 · 健康上限-${penalty}%`
        : `活动中 · 健康上限-${penalty}%`;
      const button = managed ? '' : `<button data-health-action="treat"
        data-health-value="${disease.id}">治疗 · ${Game.view.money(def.treatCost)}</button>`;
      return `<article class="disease-row"><div><strong>${disease.name}</strong><small>${status}</small></div>${button}</article>`;
    }).join('');
    return rows || '<p class="empty-state">目前没有已发现疾病。多种疾病会按剩余健康比例相乘，而不是永久扣除基础生命力。</p>';
  }

  function render(state) {
    const item = Game.healthModel.sync(state);
    const known = active(state).filter((entry) => hasMonth(entry.discoveredAt)).length;
    const status = Game.healthModel.status(item.current);
    const surgery = Game.plasticSurgery ? Game.plasticSurgery.render(state) : '';
    const disabled = state.health.lastLifestyleMonth === state.totalMonths ? 'disabled' : '';
    return `<section class="health-summary"><div><span>健康状态 · ${status}</span>
      <strong>${item.current}%</strong><small>当前上限 ${item.ceiling}% · 已发现疾病 ${known} 项</small></div></section>
      <section class="health-module"><header><span>01</span><div><h3>生命力评估</h3>
      <small>基础生命力隐藏；年龄、强健、生活方式、睡眠、医疗与压力共同计算</small></div></header>
      <button class="health-primary" data-health-action="checkup">健康检测 · ${Game.view.money(1200)}</button>
      <div class="study-actions"><button data-health-action="lifestyle" data-health-value="exercise" ${disabled}>规律运动</button>
      <button data-health-action="lifestyle" data-health-value="rest" ${disabled}>充分休息</button></div></section>
      <section class="health-module"><header><span>02</span><div><h3>疾病与治疗</h3>
      <small>活动疾病持续压低健康上限，治疗后逐步恢复</small></div></header>
      <div class="disease-list">${diseaseRows(state)}</div></section>
      <section class="health-module"><header><span>03</span><div><h3>整容</h3>
      <small>保留外貌改造、手术风险与历史记录</small></div></header>${surgery}</section>`;
  }

  Game.healthSystem = Object.freeze({ action, monthly, render, checkSTD, addDisease });
}(window));
