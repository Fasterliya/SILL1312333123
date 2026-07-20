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
    const known = active(state).length;
    hidden.forEach((item) => { item.discoveredAt = state.totalMonths; });
    const result = hidden.length ? `发现${hidden.length}项健康问题` : (known ? `已确认${known}项健康问题` : '未发现疾病');
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
    const treatTxt = def.fatal || def.incurable ? '病情已得到控制，体内的威胁暂时平息了。'
      : `${disease.name}已被治愈。治疗费用虽然不菲，但健康是无价的。`;
    Game.lifeDirector.addLog(state, '疾病治疗', treatTxt, 'good');
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
      let text = '';
      if (def.type === 'std') {
        const m = { gonorrhea: '私处不适和异常分泌物让你警觉——淋病。这是性传播疾病，需要抗生素治疗。',
          syphilis: '身上出现了不明皮疹，体检结果令人震惊——梅毒。严重的性病，必须尽快治疗。',
          chlamydia: '隐约腹痛和排尿灼烧感——衣原体感染。轻度性病但放任不管会影响生育。',
          hiv: '体检报告上那行字让你无法呼吸——HIV阳性。终身携带但不会发展成艾滋病。坚持治疗就不会因此死去。' };
        text = m[disease.id] || `私处的不适最终迫使你去检查——${def.name}，一种性传播疾病。`;
      } else if (def.type === 'common') {
        const m = { cold: '鼻塞、喉咙痛、浑身无力——感冒了。休息或吃药就能恢复。',
          flu: '高烧不退，浑身酸痛——流感来势汹汹，比普通感冒严重得多。',
          gastritis: '胃部持续灼烧感让你吃不下饭。胃炎发作，需要调整饮食并治疗。',
          insomnia: '连续多天辗转难眠，白天精神恍惚——失眠症正在消耗你的健康。' };
        text = m[disease.id] || `身体不适——${def.name}。可以治疗或等待自愈。`;
      } else if (def.type === 'chronic') {
        const m = { hypertension: '最近总头晕耳鸣，血压远高于正常值——高血压。需要长期服药，不能指望自行痊愈。',
          diabetes: '口干、多饮、体重下降——糖尿病的诊断让你意识到生活方式的代价。',
          arthritis: '关节的僵硬和疼痛越来越频繁——关节炎。年龄带来的磨损需要药物缓解。',
          heart: '胸口偶尔的闷痛终于让你去做了心电图——心脏病。致命的慢性病，不治疗随时可能发作。' };
        text = m[disease.id] || `体检揭示了${def.name}——一种需要长期管理的慢性病。`;
      } else {
        const m = { cervicitis: '下腹隐痛和白带异常——宫颈炎。妇科感染需要及时治疗，否则影响生育。',
          pid: '剧烈的下腹痛让你直不起腰——盆腔炎。严重的妇科感染，需要大剂量抗生素。',
          fibroid: '月经量异常增多，B超发现子宫肌瘤。良性肿瘤但需要手术处理。' };
        text = m[disease.id] || `妇科检查发现了${def.name}——需要积极治疗。`;
      }
      Game.lifeDirector.addLog(state, '健康警报', text, 'normal');
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
        const healTexts = {
          cold: '鼻涕不流了，喉咙也不再痛了。感冒痊愈，身体重新轻快起来。',
          flu: '高烧终于退去，浑身不再酸痛。流感痊愈，你又能正常生活了。',
          gastritis: '胃不再灼痛，食欲慢慢恢复。胃炎痊愈了。',
          insomnia: '昨晚你第一次睡满了7个小时。失眠症终于远去。',
          cervicitis: '所有症状都消失了，妇科复查确认宫颈炎已痊愈。',
          pid: '剧烈的腹痛彻底消失。盆腔炎终于被身体打败了。',
          fibroid: '术后恢复良好，子宫肌瘤已经切除干净。',
          hypertension: '长期服药让血压回归正常范围。虽然不算"痊愈"，但病情已完全受控。',
          diabetes: '规律的用药和饮食控制让血糖回到安全线内——你学会了与糖尿病共存。',
          arthritis: '持续的理疗和药物让关节不再疼痛。老化的痕迹被暂时抚平了。',
        };
        const txt = healTexts[disease.id] || `${disease.name}已经完全恢复。身体回归了健康状态。`;
        Game.lifeDirector.addLog(state, '康复', txt, 'good');
        return;
      }
      if (!hasMonth(disease.treatedAt)) {
        const minimumHealth = def.fatal ? 0 : 1;
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
    const fatalZero = state.stats.健康 <= 0 && Game.healthSafety.hasUntreatedFatal(state);
    if (state.stats.健康 <= 0 && !fatalZero) state.stats.健康 = 1;
    if (fatalZero || reachedLifeExpectancy(state)) {
      Game.legacySystem.prepareDeath(state, fatalZero ? '致命疾病' : '自然衰老');
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
    return rows || '<p class="empty-state">目前没有已发现疾病。健康仍可能因职业倦怠、训练、年龄或随机事件下降，但非致命原因不会降到0。</p>';
  }

  function render(state) {
    const known = active(state).filter((item) => hasMonth(item.discoveredAt)).length;
    const checkupNote = U.age(state) < 18 ? '未成年检测与治疗费用由家庭承担' : '检测费用由个人现金承担';
    const surgery = Game.plasticSurgery ? Game.plasticSurgery.render(state) : '';
    return `<section class="health-summary"><div><span>健康状态</span><strong>${state.stats.健康}</strong>
      <small>已发现疾病 ${known} 项 · 职业倦怠 ${Math.round(state.career.burnout || 0)}</small></div></section>
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
