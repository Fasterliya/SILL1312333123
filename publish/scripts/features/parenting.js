(function initParenting(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const styles = {
    均衡陪伴: [2, 2, 1, 1],
    重视学业: [0, 4, 0, -1],
    自主成长: [0, 1, 4, 0],
    健康优先: [1, 0, 1, 4],
  };
  const focuses = ['学识', '交涉', '管理', '心计', '体能'];
  const actions = {
    accompany: [0, 8, 2, 1, 2, '认真陪伴了一段时间'],
    read: [80, 3, 8, 1, 0, '一起阅读并讨论了新的知识'],
    exercise: [60, 3, 1, 2, 8, '一起进行适龄运动'],
    explore: [120, 2, 2, 8, 2, '鼓励孩子独立探索'],
    education: [1000, 1, 7, 1, 0, '为未来教育增加了储备'],
  };
  const clamp = (value) => U.clamp(value, 0, 100);
  const children = (state) => state.family.filter((person) => ['儿子', '女儿'].includes(person.relation));
  function ensureState(state) {
    state.parenting.focus = focuses.includes(state.parenting.focus) ? state.parenting.focus : '学识';
    return state.parenting;
  }

  function act(state, childId, type) {
    const child = children(state).find((person) => person.id === childId);
    const action = actions[type];
    if (!child || !action || child.status !== '健康') return { ok: false, message: '当前无法进行这项养育行动' };
    Game.economy.spend(state, action[0]);
    const up = child.upbringing;
    up.care = clamp(up.care + action[1]);
    up.education = clamp(up.education + action[2]);
    up.independence = clamp(up.independence + action[3]);
    up.health = clamp(up.health + action[4]);
    Game.characterAttributes.ensurePerson(child);
    const growth = { read: ['学识', 1.5], exercise: ['体能', 1.5], explore: ['心计', 1] }[type];
    if (growth) Game.characterAttributes.gainPerson(child, growth[0], growth[1], `养育:${type}`);
    Game.stressSystem.reduce(state, type === 'accompany' ? 4 : 2, '陪伴子女');
    child.affection = clamp(child.affection + 4);
    if (type === 'education') state.parenting.educationFund += action[0];
    Game.relationshipMemory.record(state, child, '养育', action[5], 5, -2);
    Game.lifeDirector.addLog(state, `陪伴${child.name}`, action[5], 'good');
    return { ok: true, message: Game.economy.message(state, `${child.name}的成长状态得到提升`) };
  }

  function setStyle(state, style) {
    if (!styles[style]) return { ok: false, message: '没有这种养育方式' };
    state.parenting.style = style;
    return { ok: true, message: `家庭养育方式调整为${style}` };
  }

  function setFocus(state, focus) {
    if (!focuses.includes(focus)) return { ok: false, message: '没有这个教育方向' };
    ensureState(state).focus = focus;
    return { ok: true, message: `子女教育方向调整为${focus}` };
  }

  function tendencyBonus(tendency, focus) {
    const matches = {
      好奇: ['学识'], 活跃: ['体能'], 合群: ['交涉'], 谨慎: ['管理', '心计'],
    };
    return matches[tendency]?.includes(focus) ? 12 : -3;
  }

  function annualEducation(state, child, age) {
    const focus = ensureState(state).focus;
    const tendency = Game.structuredTraits.childhood(child);
    const matching = Game.characterAttributes.playerValue(state, focus);
    const learning = Game.characterAttributes.playerValue(state, '学识');
    const stress = Game.stressSystem.ensure(state).level || 0;
    const funded = state.parenting.educationFund >= 10000 ? 8 : 0;
    const quality = clamp(matching * 0.55 + learning * 0.15
      + child.upbringing.education * 0.2 + tendencyBonus(tendency, focus) + funded - stress * 4);
    child.educationProgress ||= { focus, points: 0, years: 0 };
    child.educationProgress.focus = focus;
    child.educationProgress.points += quality / 10;
    child.educationProgress.years += 1;
    Game.characterAttributes.gainPerson(child, focus, quality / 8, `年度${focus}教育`);
    if (age === 18) {
      const points = child.educationProgress.points;
      const level = points >= 92 ? 4 : (points >= 72 ? 3 : (points >= 50 ? 2 : 1));
      Game.structuredTraits.setEducation(child, focus, level);
      child.educationLevel = level;
    }
    return quality;
  }

  function monthly(state) {
    ensureState(state);
    const gains = styles[state.parenting.style] || styles.均衡陪伴;
    children(state).forEach((child) => {
      const age = U.personAge(state, child);
      if (child.status !== '健康' || age > 18) return;
      if (age === 18 && (state.totalMonths - child.birthMonth) % 12 !== 0) return;
      const up = child.upbringing;
      Game.characterAttributes.ensurePerson(child);
      ['care', 'education', 'independence', 'health'].forEach((key, index) => {
        up[key] = clamp(up[key] + gains[index] / 12);
      });
      if (up.care < 25 && state.totalMonths % 6 === 0) child.affection = clamp(child.affection - 2);
      if (up.health >= 70) child.status = '健康';
      if ((state.totalMonths - child.birthMonth) % 12 !== 0) return;
      const educationQuality = age >= 6 ? annualEducation(state, child, age) : 0;
      Game.characterAttributes.gainPerson(child, '体能', up.health / 55, '健康养育');
      if (age === 12) {
        child.personality = up.independence >= 65 ? '自律' : (up.care >= 70 ? '温柔' : child.personality);
        Game.lifeDirector.addLog(state, `${child.name}进入青春期`, '长期养育方式开始塑造性格与独立能力。', 'milestone');
      } else if (age === 18) {
        const funded = state.parenting.educationFund >= 10000;
        if (up.education + (funded ? 12 : 0) >= 68) {
          child.educationName = U.random(Game.config.universities.slice(3)).name;
          child.educationStage = 'university';
          if (funded) state.parenting.educationFund -= 10000;
        } else {
          child.educationName = '职业技能教育';
          child.educationStage = 'vocational';
        }
        child.trait = up.health >= 70 ? '自律' : (up.independence >= 65 ? '勇敢' : child.trait);
        const educationTrait = Game.structuredTraits.display(child).education;
        Game.lifeDirector.addLog(state, `${child.name}成年`,
          `${child.name}开始了${child.educationName}阶段，形成${educationTrait}（教育质量${Math.round(educationQuality)}）。`, 'milestone');
      }
    });
  }

  function detailActions(person) {
    return [
      ['parent-accompany', '陪伴'], ['parent-read', '共读'], ['parent-exercise', '运动'],
      ['parent-explore', '探索'], ['parent-education', '教育储备'],
    ];
  }

  function render(state) {
    ensureState(state);
    const styleButtons = Object.keys(styles).map((style) => (
      `<button class="${state.parenting.style === style ? 'active' : ''}" data-parenting-style="${style}">${style}</button>`
    )).join('');
    const focusButtons = focuses.map((focus) => (
      `<button class="${state.parenting.focus === focus ? 'active' : ''}" data-parenting-focus="${focus}">${focus}</button>`
    )).join('');
    const cards = children(state).map((child) => {
      const up = child.upbringing;
      const traits = Game.structuredTraits.display(child);
      const education = child.educationProgress;
      return `<article class="growth-card"><button class="person-avatar" type="button"
        data-character-id="${child.id}" aria-label="查看${child.name}详情">${Game.portraitSystem.avatar(child)}</button>
        <div class="growth-main"><strong>${child.name} · ${U.personAge(state, child)}岁</strong>
        <span>关爱 ${Math.round(up.care)} · 学业 ${Math.round(up.education)} · 自主 ${Math.round(up.independence)} · 健康 ${Math.round(up.health)}</span>
        <small>儿童倾向 ${traits.childhood || '6岁形成'} · ${traits.education}${education ? ` · 教育积累 ${Math.round(education.points)}` : ''}</small></div>
        <div class="growth-actions">${detailActions(child).map(([type, label]) => (
          `<button data-parenting-child="${child.id}" data-parenting-action="${type.slice(7)}">${label}</button>`
        )).join('')}</div></article>`;
    }).join('');
    return `<section class="list-guide"><strong>当前方式：${state.parenting.style} · ${state.parenting.focus}教育</strong>
      <span>教育储备 ${Game.view.money(state.parenting.educationFund)}；每年按儿童倾向、监护人能力与压力结算。</span></section>
      <nav class="filter-chips">${styleButtons}</nav><nav class="filter-chips">${focusButtons}</nav>
      ${cards || '<p class="empty-state">家庭中还没有需要养育的子女。</p>'}
      ${children(state).length ? Game.schoolLines.render(state) : ''}`;
  }

  Game.parenting = Object.freeze({ act, setStyle, setFocus, monthly, detailActions, render });
}(window));
