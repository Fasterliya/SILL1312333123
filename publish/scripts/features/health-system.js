(function initHealthSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const insurance = {
    基础医保: { monthly: 80, cover: 0.45 },
    补充医疗: { monthly: 350, cover: 0.7 },
    高端医疗: { monthly: 900, cover: 0.88 },
  };
  const dietScore = { 均衡饮食: 2, 清淡饮食: 3, 高蛋白饮食: 1, 高油高糖: -4 };

  function price(state, amount) {
    return Math.round(amount * (1 - insurance[state.health.insurance].cover));
  }

  function setDiet(state, value) {
    if (!(value in dietScore)) return { ok: false, message: '没有这种饮食计划' };
    state.health.diet = value;
    return { ok: true, message: `饮食计划调整为${value}` };
  }

  function setSleep(state, value) {
    const hours = Number(value);
    if (![6, 7, 8, 9].includes(hours)) return { ok: false, message: '睡眠时长无效' };
    state.health.sleep = hours;
    return { ok: true, message: `计划每晚睡眠 ${hours} 小时` };
  }

  function setInsurance(state, value) {
    if (!insurance[value]) return { ok: false, message: '没有这种医疗保障' };
    state.health.insurance = value;
    return { ok: true, message: `医疗保障调整为${value}` };
  }

  function action(state, type, value) {
    if (type === 'save') {
      const amount = Number(value);
      if (![1000, 5000].includes(amount) || state.money < amount) return { ok: false, message: '退休储备资金不足' };
      state.money -= amount;
      state.health.retirementFund += amount;
      return { ok: true, message: `退休储备增加 ${Game.view.money(amount)}` };
    }
    if (type === 'checkup') {
      const cost = price(state, 1200);
      Game.economy.spend(state, cost);
      state.health.lastCheckupMonth = state.totalMonths;
      state.health.careLevel = U.clamp(state.health.careLevel + 12, 0, 100);
      state.stats.健康 = U.clamp(state.stats.健康 + 3, 0, 100);
      /* discover hidden diseases */
      const hidden = (state.health.diseases || []).filter((d) => !d.discoveredAt);
      hidden.forEach((d) => { d.discoveredAt = state.totalMonths; });
      if (hidden.length) {
        const names = hidden.map((d) => d.name).join('、');
        Game.lifeDirector.addLog(state, '体检发现', `体检发现了隐藏疾病：${names}`, 'normal');
        return { ok: true, message: Game.economy.message(state, `体检完成，发现${hidden.length}项健康问题`) };
      }
      return { ok: true, message: Game.economy.message(state, '完成体检，健康风险得到更早管理') };
    }
    if (type === 'treat') {
      const diseases = (state.health.diseases || []);
      const untreated = diseases.filter((d) => !d.treatedAt);
      if (!untreated.length) return { ok: false, message: '当前没有需要治疗的疾病' };
      const target = untreated[0];
      const cost = price(state, target.type === 'std' ? 3200 : 2600);
      Game.economy.spend(state, cost);
      target.treatedAt = state.totalMonths;
      state.stats.健康 = U.clamp(state.stats.健康 + (target.type === 'std' ? 12 : 8), 0, 100);
      return { ok: true, message: Game.economy.message(state, `${target.name}治疗完成`) };
    }
    if (type === 'surgery') return Game.plasticSurgery.perform(state, value);
    if (type === 'retire') return retire(state);
    if (type === 'family') {
      const elder = state.family.find((person) => ['父亲', '母亲', '祖父', '祖母'].includes(person.relation) && person.status === '健康');
      if (!elder) return { ok: false, message: '当前没有需要照护的长辈' };
      Game.economy.spend(state, 1200);
      Game.relationshipMemory.record(state, elder, '养老照护', '承担了陪诊与生活照护', 10, -4);
      return { ok: true, message: Game.economy.message(state, `你陪伴并照顾了${elder.name}`) };
    }
    if (type === 'grandchild') {
      const child = state.family.find((person) => ['儿子', '女儿'].includes(person.relation) && person.childrenCount > 0);
      if (!child) return { ok: false, message: '当前家庭中还没有孙辈' };
      state.stats.心情 = U.clamp(state.stats.心情 + 8, 0, 100);
      Game.relationshipMemory.record(state, child, '隔代陪伴', '共同照看并陪伴了下一代孩子', 8, -2);
      return { ok: true, message: '陪伴孙辈让家庭关系更加紧密' };
    }
    state.stats.心情 = U.clamp(state.stats.心情 + 6, 0, 100);
    state.cityLife.reputation = U.clamp(state.cityLife.reputation + 3, 0, 100);
    return { ok: true, message: '参与社区活动，晚年社交更加充实' };
  }

  function retire(state) {
    if (U.age(state) < 60) return { ok: false, message: '60岁后可以办理退休' };
    if (state.health.retired) return { ok: false, message: '已经处于退休生活' };
    const salary = state.career.salary || 0;
    state.health.retired = true;
    state.health.pension = Math.max(1800, Math.round(salary * 0.34 + state.health.retirementFund / 240));
    Object.assign(state.career, {
      job: null, jobId: null, company: null, salary: 0, performance: 0, management: false,
    });
    Game.workplace.leave(state);
    Game.lifeDirector.addLog(state, '正式退休', `你开始领取每月 ${Game.view.money(state.health.pension)} 的养老金。`, 'milestone');
    return { ok: true, message: `退休完成，每月养老金 ${Game.view.money(state.health.pension)}` };
  }

  function addCondition(state) {
    const pool = ['高血压', '血糖异常', '关节退化', '心血管风险'];
    const next = U.random(pool.filter((item) => !state.health.conditions.includes(item)));
    if (next) {
      state.health.conditions.push(next);
      Game.lifeDirector.addLog(state, '健康变化', `体检提示${next}，需要长期管理。`, 'normal');
    }
  }

  /* ---- disease system ---- */
  const diseasePool = [
    { id: 'cold', name: '感冒', type: 'common', minAge: 0, severity: 1, treatCost: 400, healMonths: 2 },
    { id: 'flu', name: '流感', type: 'common', minAge: 0, severity: 2, treatCost: 800, healMonths: 3 },
    { id: 'gastritis', name: '胃炎', type: 'common', minAge: 16, severity: 2, treatCost: 1200, healMonths: 2 },
    { id: 'insomnia', name: '失眠症', type: 'common', minAge: 18, severity: 1, treatCost: 600, healMonths: 3 },
    { id: 'hypertension', name: '高血压', type: 'chronic', minAge: 35, severity: 3, treatCost: 2000, healMonths: 0 },
    { id: 'diabetes', name: '糖尿病', type: 'chronic', minAge: 40, severity: 3, treatCost: 2500, healMonths: 0 },
    { id: 'arthritis', name: '关节炎', type: 'chronic', minAge: 45, severity: 2, treatCost: 1800, healMonths: 0 },
    { id: 'heart', name: '心脏病', type: 'chronic', minAge: 50, severity: 4, treatCost: 5000, healMonths: 0 },
    { id: 'gonorrhea', name: '淋病', type: 'std', minAge: 16, severity: 2, treatCost: 2000, healMonths: 3 },
    { id: 'syphilis', name: '梅毒', type: 'std', minAge: 16, severity: 3, treatCost: 5000, healMonths: 6 },
    { id: 'chlamydia', name: '衣原体感染', type: 'std', minAge: 16, severity: 1, treatCost: 1500, healMonths: 2 },
    { id: 'hiv', name: 'HIV感染', type: 'std', minAge: 16, severity: 5, treatCost: 15000, healMonths: 0 },
    { id: 'cervicitis', name: '宫颈炎', type: 'gyn', minAge: 18, severity: 2, treatCost: 3000, healMonths: 4 },
    { id: 'pid', name: '盆腔炎', type: 'gyn', minAge: 18, severity: 3, treatCost: 4500, healMonths: 5 },
    { id: 'fibroid', name: '子宫肌瘤', type: 'gyn', minAge: 30, severity: 3, treatCost: 6000, healMonths: 6 },
  ];

  function addDisease(state, diseaseId) {
    const def = diseasePool.find((d) => d.id === diseaseId);
    if (!def) return null;
    const diseases = state.health.diseases || [];
    const existing = diseases.find((d) => d.id === diseaseId && !d.treatedAt);
    if (existing) return null;
    const disease = {
      id: def.id, name: def.name, type: def.type, severity: def.severity,
      discoveredAt: (def.type === 'common' || def.type === 'std') ? state.totalMonths : null,
      treatedAt: null, healedAt: null,
    };
    diseases.push(disease);
    state.health.diseases = diseases;
    if (disease.discoveredAt) {
      Game.lifeDirector.addLog(state, '健康警报', `你感染了${def.name}${def.type === 'std' ? '(性传播疾病)' : ''}，建议尽快就医。`, 'normal');
    }
    return disease;
  }

  function checkSTD(state, riskLevel) {
    const chance = { low: 0.02, medium: 0.06, high: 0.12 }[riskLevel] || 0.03;
    if (Math.random() >= chance) return null;
    const pool = ['gonorrhea', 'chlamydia', 'syphilis'].filter((id) => {
      const diseases = state.health.diseases || [];
      return !diseases.some((d) => d.id === id && !d.treatedAt);
    });
    if (!pool.length) return null;
    const diseaseId = U.random(pool);
    const result = addDisease(state, diseaseId);
    if (result) state.health.stdHistory.push({ id: result.id, name: result.name, infectedAt: state.totalMonths });
    return result;
  }

  function lifeExpectancy(state) {
    const identity = Game.hunterMode.identity(state);
    if (identity.skin) {
      Game.mortality.ensurePerson(identity.skin);
      return identity.skin.lifeExpectancyMonths;
    }
    if (!Number.isInteger(state.health.lifeExpectancyMonths)) {
      state.health.lifeExpectancyMonths = Game.mortality.lifeMonths(
        `player-${state.generation}-${state.profile.genetics?.code || state.name}`,
      );
    }
    return state.health.lifeExpectancyMonths;
  }

  function monthly(state) {
    const age = U.age(state);
    const critical = state.stats.健康 <= 0;
    if (age >= 18) state.money -= insurance[state.health.insurance].monthly;
    if (state.health.retired) state.money += state.health.pension;
    else if (state.career.salary > 0) state.health.retirementFund += Math.round(state.career.salary * 0.03);
    if (age >= 65 && state.career.job && !state.health.retired) retire(state);
    if (state.totalMonths % 6 === 0) {
      const sleep = state.health.sleep >= 8 ? 2 : (state.health.sleep <= 6 ? -3 : 0);
      state.stats.健康 = U.clamp(state.stats.健康 + dietScore[state.health.diet] + sleep, 0, 100);
    }
    if (state.career.burnout >= 80 && state.totalMonths % 3 === 0) {
      state.stats.健康 = U.clamp(state.stats.健康 - 2, 0, 100);
    }
    if (age >= 40 && state.month === 1) {
      const risk = U.clamp(0.03 + (age - 40) / 300 + (60 - state.stats.健康) / 250, 0.02, 0.42);
      if (Math.random() < risk) addCondition(state);
    }
    if (state.health.conditions.length) state.money -= price(state, 320 * state.health.conditions.length);
    /* disease progression */
    const diseases = state.health.diseases || [];
    diseases.forEach((d) => {
      if (d.treatedAt) {
        const def = diseasePool.find((x) => x.id === d.id);
        const healTime = def ? def.healMonths : 3;
        if (state.totalMonths - d.treatedAt >= healTime && !d.healedAt) {
          d.healedAt = state.totalMonths;
          Game.lifeDirector.addLog(state, '康复', `${d.name}已经痊愈。`, 'good');
        }
      }
      if (!d.treatedAt) {
        const healthDrain = d.type === 'chronic' ? 2 : (d.type === 'std' ? 4 : 3);
        state.stats.健康 = U.clamp(state.stats.健康 - healthDrain, 0, 100);
        if (d.type === 'std' && d.severity >= 3 && state.gender === '女') {
          /* severe STD affects fertility */
          if (state.profile.fertilityBase > 0) state.profile.fertilityBase = Math.max(8, state.profile.fertilityBase - 1);
        }
      }
    });
    /* common disease random infection */
    if (state.totalMonths % 4 === 0) {
      const age = U.age(state);
      const commonChance = 0.08 + (age > 60 ? 0.05 : 0);
      if (Math.random() < commonChance) {
        const pool = diseasePool.filter((d) => d.type === 'common' && age >= d.minAge &&
          !(state.health.diseases || []).some((x) => x.id === d.id && !x.treatedAt));
        if (pool.length) addDisease(state, U.random(pool).id);
      }
    }
    const reachedLifespan = Game.timeSystem.ageMonths(state) >= lifeExpectancy(state);
    if (critical || reachedLifespan) {
      Game.legacySystem.prepareDeath(state, state.health.conditions.length ? '慢性疾病并发症' : '自然衰老');
    }
  }

  function render(state) {
    const conditions = state.health.conditions.length ? state.health.conditions.join('、') : '暂无慢性问题';
    const diseases = (state.health.diseases || []).filter((d) => !d.healedAt);
    const diseaseList = diseases.length ? diseases.map((d) => {
      const status = d.treatedAt ? '(治疗中)' : (d.discoveredAt ? '(未治疗)' : '(未发现)');
      return `${d.name}${d.type === 'std' ? '⚠' : ''}${status}`;
    }).join('、') : '暂无疾病';
    const ending = state.legacy.ending ? `<p class="ending-note">人生结局：${state.legacy.ending.age}岁 · ${state.legacy.ending.cause}</p>` : '';
    const surgerySection = Game.plasticSurgery ? Game.plasticSurgery.render(state) : '';

    return `<section class="health-summary"><div><span>健康状态</span><strong>${state.stats.健康}</strong>
      <small>慢性：${conditions}</small><small class="disease-list">疾病：${diseaseList}</small></div>
      <dl><div><dt>睡眠</dt><dd>${state.health.sleep}小时</dd></div>
      <div><dt>医疗保障</dt><dd>${state.health.insurance}</dd></div><div><dt>退休储备</dt>
      <dd>${Game.view.money(state.health.retirementFund)}</dd></div><div><dt>养老金</dt>
      <dd>${Game.view.money(state.health.pension)}/月</dd></div></dl></section>
      <h3>生活方式</h3><div class="system-choice">${Object.keys(dietScore).map((item) => (
        `<button class="${state.health.diet === item ? 'active' : ''}" data-health-diet="${item}">${item}</button>`)).join('')}</div>
      <div class="system-choice">${[6, 7, 8, 9].map((item) => (
        `<button class="${state.health.sleep === item ? 'active' : ''}" data-health-sleep="${item}">${item}小时</button>`)).join('')}</div>
      <h3>保障与养老</h3><div class="system-choice">${Object.keys(insurance).map((item) => (
        `<button class="${state.health.insurance === item ? 'active' : ''}" data-health-insurance="${item}">${item}</button>`)).join('')}</div>
      <div class="system-actions"><button data-health-action="checkup">健康体检</button>
      <button data-health-action="treat">治疗疾病</button><button data-health-action="save" data-health-value="1000">储备1千</button>
      <button data-health-action="save" data-health-value="5000">储备5千</button>
      <button data-health-action="family">照顾长辈</button><button data-health-action="social">社区社交</button>
      <button data-health-action="grandchild">陪伴孙辈</button>
      <button data-health-action="retire">办理退休</button></div>
      ${surgerySection}${ending}`;
  }

  Game.healthSystem = Object.freeze({ setDiet, setSleep, setInsurance, action, monthly, render, checkSTD, addDisease });
}(window));
