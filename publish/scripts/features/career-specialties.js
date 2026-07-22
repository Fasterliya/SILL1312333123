(function initCareerSpecialties(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const tracks = {
    科学: [['research', '研究攻坚', '复杂问题与技术突破'], ['engineering', '工程落地', '可靠交付与系统建设']],
    文学: [['analysis', '专业研判', '调查、写作与论证'], ['education', '知识传播', '教学、表达与公共沟通']],
    艺术: [['creation', '创意表达', '作品质量与个人风格'], ['commercial', '商业创作', '客户需求与市场转化']],
    运动: [['competition', '竞技突破', '训练、赛事与成绩'], ['coaching', '训练指导', '团队管理与教学']],
    社交: [['leadership', '团队领导', '协作、谈判与组织'], ['service', '客户服务', '关系维护与问题处理']],
    商业: [['strategy', '商业策略', '判断市场与配置资源'], ['operations', '经营管理', '流程、成本与稳定增长']],
  };

  function job(state) {
    return Game.config.jobs.find((item) => item.id === state.career.jobId) || null;
  }

  function available(state) {
    return tracks[job(state)?.category] || tracks.社交;
  }

  function choose(state, id) {
    if (!state.career.job) return { ok: false, message: '获得工作后才能选择职业专精' };
    const item = available(state).find((entry) => entry[0] === id);
    if (!item) return { ok: false, message: '当前职业没有这个专精方向' };
    state.career.specialty = id;
    state.career.skills[id] ||= 0;
    return { ok: true, message: `职业专精调整为${item[1]}` };
  }

  function act(state, type) {
    const id = state.career.specialty;
    if (!state.career.job || !id) return { ok: false, message: '请先选择职业专精' };
    const skill = Number(state.career.skills[id]) || 0;
    if (type === 'train') {
      Game.economy.spend(state, 500);
      state.career.skills[id] = U.clamp(skill + 8, 0, 100);
      state.career.exp += 4;
      state.career.burnout = U.clamp(state.career.burnout + 3, 0, 100);
      return { ok: true, message: Game.economy.message(state, `专项能力提升到 ${state.career.skills[id]}`) };
    }
    if (type === 'mentor') {
      Game.economy.spend(state, 1200);
      state.career.skills[id] = U.clamp(skill + 12, 0, 100);
      Game.characterAttributes.gain(state, '交涉', 1.2, '行业导师');
      return { ok: true, message: Game.economy.message(state, '导师反馈让你的专业路径更清晰') };
    }
    const chance = U.clamp(0.35 + skill / 160 + state.career.performance / 260, 0.35, 0.92);
    state.career.burnout = U.clamp(state.career.burnout + 12, 0, 100);
    state.career.exp += 6;
    const success = Math.random() < chance;
    const reward = success ? Math.round(state.career.salary * 0.45) : 0;
    state.money += reward;
    state.career.performance = U.clamp(state.career.performance + (success ? 10 : -4), 0, 100);
    state.career.skills[id] = U.clamp(skill + (success ? 6 : 3), 0, 100);
    state.career.projects.push({ month: state.totalMonths, specialty: id, success, reward });
    state.career.projects = state.career.projects.slice(-12);
    Game.lifeDirector.addLog(state, success ? '专项项目完成' : '专项项目受挫',
      success ? `项目获得认可，并带来 ${Game.view.money(reward)} 奖励。` : '项目没有达到预期，但积累了经验。', success ? 'good' : 'normal');
    return { ok: success, message: success ? `项目成功，获得 ${Game.view.money(reward)}` : '项目未达预期，专业能力仍有提升' };
  }

  function afterWork(state, type) {
    const stress = { focus: 5, network: 2, train: 3, overtime: 12, create: 7, stream: 8, sponsor: 9, convention: 10 };
    state.career.burnout = U.clamp(state.career.burnout + (stress[type] || 0), 0, 100);
  }

  function monthly(state) {
    if (!state.career.job) return;
    state.career.burnout = U.clamp(state.career.burnout - 1, 0, 100);
    if (state.career.burnout >= 75 && state.totalMonths % 2 === 0) {
      state.stats.健康 = U.clamp(state.stats.健康 - 1, 0, 100);
      state.stats.心情 = U.clamp(state.stats.心情 - 2, 0, 100);
    }
  }

  function render(state) {
    if (!state.career.job) return '';
    const options = available(state);
    const current = options.find((item) => item[0] === state.career.specialty);
    const skill = current ? Math.round(state.career.skills[current[0]] || 0) : 0;
    const choices = options.map(([id, name, desc]) => (
      `<button class="${state.career.specialty === id ? 'active' : ''}" data-career-specialty="${id}">
      <strong>${name}</strong><small>${desc}</small></button>`
    )).join('');
    const actions = current ? `<div class="system-actions">
      <button data-career-action="train">专项培训</button><button data-career-action="mentor">行业导师</button>
      <button data-career-action="project">挑战项目</button></div>` : '';
    return `<details class="system-fold" open><summary>职业专精 · ${current ? `${current[1]} ${skill}` : '待选择'}</summary>
      <div class="specialty-grid">${choices}</div>${actions}
      <p class="system-note">职业倦怠 ${Math.round(state.career.burnout)}/100 · 项目记录 ${state.career.projects.length} 条</p></details>`;
  }

  Game.careerSpecialties = Object.freeze({ choose, act, afterWork, monthly, render });
}(window));
