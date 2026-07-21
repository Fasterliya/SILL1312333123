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
  const actions = {
    accompany: [0, 8, 2, 1, 2, '认真陪伴了一段时间'],
    read: [80, 3, 8, 1, 0, '一起阅读并讨论了新的知识'],
    exercise: [60, 3, 1, 2, 8, '一起进行适龄运动'],
    explore: [120, 2, 2, 8, 2, '鼓励孩子独立探索'],
    education: [1000, 1, 7, 1, 0, '为未来教育增加了储备'],
  };
  const clamp = (value) => U.clamp(value, 0, 100);
  const children = (state) => state.family.filter((person) => ['儿子', '女儿'].includes(person.relation));

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
    const growth = { read: ['智力', 1.5], exercise: ['力量', 1.5], explore: ['魅力', 1] }[type];
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

  function monthly(state) {
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
      Game.characterAttributes.gainPerson(child, '智力', up.education / 45, '家庭教育');
      Game.characterAttributes.gainPerson(child, '力量', up.health / 55, '健康养育');
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
        Game.lifeDirector.addLog(state, `${child.name}成年`, `${child.name}开始了${child.educationName}阶段。`, 'milestone');
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
    const styleButtons = Object.keys(styles).map((style) => (
      `<button class="${state.parenting.style === style ? 'active' : ''}" data-parenting-style="${style}">${style}</button>`
    )).join('');
    const cards = children(state).map((child) => {
      const up = child.upbringing;
      return `<article class="growth-card"><button class="person-avatar" type="button"
        data-character-id="${child.id}" aria-label="查看${child.name}详情">${Game.portraitSystem.avatar(child)}</button>
        <div class="growth-main"><strong>${child.name} · ${U.personAge(state, child)}岁</strong>
        <span>关爱 ${Math.round(up.care)} · 学业 ${Math.round(up.education)} · 自主 ${Math.round(up.independence)} · 健康 ${Math.round(up.health)}</span></div>
        <div class="growth-actions">${detailActions(child).map(([type, label]) => (
          `<button data-parenting-child="${child.id}" data-parenting-action="${type.slice(7)}">${label}</button>`
        )).join('')}</div></article>`;
    }).join('');
    return `<section class="list-guide"><strong>当前方式：${state.parenting.style}</strong>
      <span>教育储备 ${Game.view.money(state.parenting.educationFund)}，成长数值会随月份持续积累。</span></section>
      <nav class="filter-chips">${styleButtons}</nav>${cards || '<p class="empty-state">家庭中还没有需要养育的子女。</p>'}
      ${children(state).length ? Game.schoolLines.render(state) : ''}`;
  }

  Game.parenting = Object.freeze({ act, setStyle, monthly, detailActions, render });
}(window));
