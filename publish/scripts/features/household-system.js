(function initHouseholdSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const policies = {
    共同承担: { cohesion: 3, boundaries: 1, care: 3, education: 1 },
    独立生活: { cohesion: -1, boundaries: 5, care: -1, education: 1 },
    教育投入: { cohesion: 1, boundaries: 1, care: 0, education: 5 },
    照护优先: { cohesion: 3, boundaries: -1, care: 5, education: 0 },
  };
  const goals = ['事业发展', '独立生活', '亲密关系', '照护家人', '财务稳定'];

  function hash(value) {
    let result = 2166136261;
    String(value || '').split('').forEach((char) => {
      result ^= char.charCodeAt(0);
      result = Math.imul(result, 16777619);
    });
    return result >>> 0;
  }

  function ensurePerson(person) {
    person.socialState = person.socialState && typeof person.socialState === 'object'
      ? person.socialState : {};
    person.socialState.respect = clamp(person.socialState.respect ?? person.affection);
    person.socialState.favorDebt = clamp(person.socialState.favorDebt);
    person.socialState.dependence = clamp(person.socialState.dependence ?? 30);
    person.socialState.lifeGoal ||= goals[hash(person.id || person.name) % goals.length];
    return person.socialState;
  }

  function ensure(state) {
    state.household = state.household && typeof state.household === 'object' ? state.household : {};
    const home = state.household;
    home.policy = policies[home.policy] ? home.policy : '共同承担';
    home.sharedBudget = Math.max(0, Math.round(Number(home.sharedBudget) || 0));
    home.cohesion = clamp(home.cohesion ?? 62);
    home.boundaries = clamp(home.boundaries ?? 58);
    home.careBalance = clamp(home.careBalance ?? 55);
    home.educationSupport = clamp(home.educationSupport ?? 50);
    home.conflict = clamp(home.conflict ?? 12);
    home.lastReviewYear = Number.isInteger(home.lastReviewYear) ? home.lastReviewYear : state.year - 1;
    home.lastMeetingYear = Number.isInteger(home.lastMeetingYear) ? home.lastMeetingYear : state.year - 1;
    home.history = Array.isArray(home.history) ? home.history.slice(-12) : [];
    Game.people.all(state).forEach(ensurePerson);
    return home;
  }

  function setPolicy(state, policy) {
    const home = ensure(state);
    if (!policies[policy]) return { ok: false, message: '没有这种家庭协作方式' };
    home.policy = policy;
    return { ok: true, message: `家庭协作方式调整为${policy}` };
  }

  function act(state, type, value) {
    const home = ensure(state);
    if (type === 'deposit') {
      const amount = Number(value);
      if (![1000, 5000].includes(amount)) return { ok: false, message: '共同预算金额无效' };
      Game.economy.spend(state, amount);
      home.sharedBudget += amount;
      home.cohesion = clamp(home.cohesion + 2);
      return { ok: true, message: Game.economy.message(state, `共同预算增加 ${Game.view.money(amount)}`) };
    }
    if (type === 'meeting') {
      if (home.lastMeetingYear === state.year) return { ok: false, message: '今年已经完成家庭沟通' };
      home.lastMeetingYear = state.year;
      home.cohesion = clamp(home.cohesion + 7);
      home.boundaries = clamp(home.boundaries + 4);
      home.conflict = clamp(home.conflict - 7);
      state.family.forEach((person) => { person.trust = clamp(person.trust + 3); });
      Game.lifeDirector.addLog(state, '家庭沟通', '家庭成员讨论了预算、照护安排与个人计划。', 'good');
      return { ok: true, message: '家庭沟通完成，协作状态得到改善' };
    }
    if (type === 'mediate') {
      const person = state.family.filter((item) => item.status === '健康')
        .sort((a, b) => (b.conflict || 0) - (a.conflict || 0))[0];
      if (!person || person.conflict < 8) return { ok: false, message: '当前没有明显的家庭矛盾' };
      Game.economy.spend(state, 500);
      person.conflict = clamp(person.conflict - 16);
      person.trust = clamp(person.trust + 5);
      home.conflict = clamp(home.conflict - 8);
      home.cohesion = clamp(home.cohesion + 4);
      return { ok: true, message: Game.economy.message(state, `与${person.name}完成了一次坦诚沟通`) };
    }
    if (type === 'support') {
      if (home.sharedBudget < 1000) return { ok: false, message: '共同预算至少需要1000' };
      const person = state.family.filter((item) => item.status === '健康')
        .sort((a, b) => (a.trust || 0) - (b.trust || 0))[0];
      if (!person) return { ok: false, message: '当前没有可支持的家庭成员' };
      home.sharedBudget -= 1000;
      person.trust = clamp(person.trust + 9);
      ensurePerson(person).favorDebt = clamp(person.socialState.favorDebt + 8);
      home.cohesion = clamp(home.cohesion + 3);
      return { ok: true, message: `共同预算为${person.name}提供了实际支持` };
    }
    return { ok: false, message: '未知的家庭行动' };
  }

  function annualAutonomy(state, home) {
    const adults = state.family.filter((person) => (
      person.status === '健康' && Game.content.personAge(state, person) >= 18
    ));
    if (!adults.length) return '';
    const person = adults[(state.year + state.generation) % adults.length];
    const social = ensurePerson(person);
    if (social.lifeGoal === '事业发展') {
      person.careerRank = Math.min(4, (person.careerRank || 0) + 1);
      social.respect = clamp(social.respect + 4);
      return `${person.name}把更多精力投入了事业发展`;
    }
    if (social.lifeGoal === '独立生活') {
      social.dependence = clamp(social.dependence - 8);
      home.boundaries = clamp(home.boundaries + 3);
      return `${person.name}开始建立更独立的生活安排`;
    }
    if (social.lifeGoal === '亲密关系') {
      person.affection = clamp(person.affection + 4);
      return `${person.name}开始认真经营自己的亲密关系`;
    }
    if (social.lifeGoal === '照护家人') {
      home.careBalance = clamp(home.careBalance + 5);
      person.trust = clamp(person.trust + 4);
      return `${person.name}主动承担了一部分家庭照护`;
    }
    home.sharedBudget += 500;
    social.favorDebt = clamp(social.favorDebt - 3);
    return `${person.name}向共同预算补充了 ${Game.view.money(500)}`;
  }

  function monthly(state) {
    const home = ensure(state);
    if (state.month !== 1 || home.lastReviewYear === state.year) return;
    home.lastReviewYear = state.year;
    const effect = policies[home.policy];
    home.cohesion = clamp(home.cohesion + effect.cohesion);
    home.boundaries = clamp(home.boundaries + effect.boundaries);
    home.careBalance = clamp(home.careBalance + effect.care);
    home.educationSupport = clamp(home.educationSupport + effect.education);
    const living = state.family.filter((person) => person.status === '健康');
    const conflict = living.length
      ? living.reduce((sum, person) => sum + (person.conflict || 0), 0) / living.length : 0;
    home.conflict = clamp(home.conflict * 0.7 + conflict * 0.3);
    home.cohesion = clamp(home.cohesion - Math.max(0, home.conflict - 45) / 10);
    const note = annualAutonomy(state, home);
    home.history.push({ year: state.year, policy: home.policy, note });
    home.history = home.history.slice(-12);
    if (note) Game.lifeDirector.addLog(state, '家庭年度动态', note, 'normal');
  }

  function render(state) {
    const home = ensure(state);
    const members = state.family.filter((person) => person.status === '健康').slice(0, 8);
    return `<section class="household-dashboard"><header><div><span>现代家庭协作</span>
      <strong>${home.policy}</strong></div><b>${Game.view.money(home.sharedBudget)}</b></header>
      <div class="household-metrics"><div><span>凝聚</span><b>${Math.round(home.cohesion)}</b></div>
      <div><span>边界</span><b>${Math.round(home.boundaries)}</b></div>
      <div><span>照护</span><b>${Math.round(home.careBalance)}</b></div>
      <div><span>教育</span><b>${Math.round(home.educationSupport)}</b></div>
      <div><span>矛盾</span><b>${Math.round(home.conflict)}</b></div></div>
      <nav class="household-policies">${Object.keys(policies).map((policy) => (
        `<button class="${home.policy === policy ? 'active' : ''}" data-household-policy="${policy}">${policy}</button>`
      )).join('')}</nav><div class="household-actions">
      <button data-household-action="meeting">家庭沟通</button>
      <button data-household-action="mediate">协调矛盾</button>
      <button data-household-action="support">共同支持</button>
      <button data-household-action="deposit" data-household-value="1000">存入1千</button>
      <button data-household-action="deposit" data-household-value="5000">存入5千</button></div>
      <div class="household-goals">${members.map((person) => (
        `<span><b>${person.name}</b>${ensurePerson(person).lifeGoal}</span>`
      )).join('')}</div>${Game.relationshipSecretsView.summary(state)}${Game.familyConflict?.render(state) || ''}${Game.relationshipPanel?.render(state) || ''}</section>`;
  }

  Game.householdSystem = Object.freeze({ ensure, ensurePerson, setPolicy, act, monthly, render });
}(window));
