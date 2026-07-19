(function initLifeLoop(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const el = {};

  const activityData = {
    study: { label: '学习', fatigue: 10, stats: { 智力: 2, 心情: -2 }, study: 7 },
    sport: { label: '锻炼', fatigue: 7, stats: { 健康: 3, 心情: 1 }, study: 0 },
    social: { label: '社交', fatigue: 5, stats: { 魅力: 2, 心情: 2 }, study: 0 },
    rest: { label: '休息', fatigue: -18, stats: { 心情: 5, 健康: 1 }, study: 0 },
  };

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function ensure(state) {
    state.routine ||= {};
    state.routine.actionMonth ??= state.totalMonths;
    state.routine.fatigue = U.clamp(Number(state.routine.fatigue) || 0, 0, 100);
    state.routine.actions ||= {};
    Object.keys(activityData).forEach((key) => { state.routine.actions[key] ||= 0; });
    delete state.routine.lastReport;
    if (state.routine.actionMonth !== state.totalMonths) {
      state.routine.actionMonth = state.totalMonths;
      state.routine.actions = { study: 0, sport: 0, social: 0, rest: 0 };
    }
    return state.routine;
  }

  function performActivity(state, type) {
    const data = activityData[type];
    if (!data || state.gameOver) return null;
    const routine = ensure(state);
    const repeated = routine.actions[type];
    const repeatFactor = Math.max(0.25, 1 - repeated * 0.2);
    const fatigueFactor = type === 'rest' ? 1 : Math.max(0.35, 1 - routine.fatigue / 130);
    const factor = repeatFactor * fatigueFactor;
    const gains = [];
    Object.entries(data.stats).forEach(([name, base]) => {
      const delta = base > 0 ? Math.max(1, Math.round(base * factor)) : base;
      state.stats[name] = U.clamp(state.stats[name] + delta, 0, 100);
      gains.push(`${name}${delta > 0 ? '+' : ''}${delta}`);
    });
    if (data.study) {
      const studyGain = Math.max(1, Math.round(data.study * factor));
      state.education.study += studyGain;
      gains.push(`学习积累+${studyGain}`);
    }
    const fatigueDelta = data.fatigue < 0
      ? Math.round(data.fatigue * Math.max(0.35, repeatFactor))
      : Math.round(data.fatigue * (1 + repeated * 0.12));
    routine.fatigue = U.clamp(routine.fatigue + fatigueDelta, 0, 100);
    routine.actions[type] += 1;
    const weaker = repeated > 0 ? ` · 第${repeated + 1}次收益递减` : '';
    return {
      ok: true,
      message: `${data.label}：${gains.join(' · ')} · 疲劳${fatigueDelta > 0 ? '+' : ''}${fatigueDelta}${weaker}`,
    };
  }

  function beforeAdvance(state) {
    const routine = ensure(state);
    return {
      totalMonths: state.totalMonths,
      fatigue: routine.fatigue,
    };
  }

  function settleAdvance(state, before) {
    const routine = ensure(state);
    const months = Math.max(0, state.totalMonths - before.totalMonths);
    routine.fatigue = U.clamp(before.fatigue - months * 35, 0, 100);
    routine.actionMonth = state.totalMonths;
    routine.actions = { study: 0, sport: 0, social: 0, rest: 0 };
  }

  function nextExam(state) {
    const month = state.month;
    const candidates = [1, 6].map((target) => {
      const distance = (target - month + 12) % 12;
      return { target, distance: distance || 12 };
    }).sort((a, b) => a.distance - b.distance);
    return candidates[0];
  }

  function goal(state) {
    const years = U.age(state);
    if (years < 3) return { title: '健康成长', detail: '保持健康达到80', value: state.stats.健康, target: 80 };
    if (years < 6) return { title: '探索世界', detail: '保持心情达到80', value: state.stats.心情, target: 80 };
    if (years < 18) {
      const exam = nextExam(state);
      const target = years < 12 ? 45 : (years < 15 ? 65 : 85);
      return {
        title: `${exam.distance}个月后${exam.target === 1 ? '期末考试' : '期中考试'}`,
        detail: `学习积累目标 ${target}`,
        value: state.education.study,
        target,
      };
    }
    if (state.education.university && !state.education.graduated) {
      return { title: '完成大学学业',
        detail: `${state.education.university} · ${state.education.major || '专业学习'}`,
        value: Math.max(0, years - 18), target: 4 };
    }
    if (!state.career.job) return { title: '寻找人生方向', detail: '进入求职菜单并获得一份工作', value: 0, target: 1 };
    if (state.career.performance < 70) {
      return { title: '积累职业表现', detail: '绩效达到70后申请晋升', value: state.career.performance, target: 70 };
    }
    return { title: '建立生活储备', detail: '现金达到10万元', value: state.money, target: 100000 };
  }

  function render(state) {
    const routine = ensure(state);
    const currentGoal = goal(state);
    const percent = U.clamp(Math.round(currentGoal.value / currentGoal.target * 100), 0, 100);
    el.goal.innerHTML = `<div><span>近期目标</span><strong>${escape(currentGoal.title)}</strong>
      <small>${escape(currentGoal.detail)}</small></div><b>${percent}%</b>
      <i><em style="width:${percent}%"></em></i>
      <p>本月疲劳 ${routine.fatigue}/100 · 行动不限次数，重复收益会递减</p>`;
  }

  function init() {
    el.goal = document.getElementById('goalPanel');
    if (!el.goal) throw new Error('人生循环界面结构不完整');
  }

  const performancePenalty = (state) => ensure(state).fatigue / 700;

  Game.lifeLoop = Object.freeze({
    init, ensure, performActivity, beforeAdvance, settleAdvance, render, performancePenalty,
  });
}(window));
