(function initLifeEvents(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const events = [
    {
      id: 'curious_child', min: 4, max: 11, once: true,
      title: '窗外的新世界', text: '你对一件陌生事物产生了强烈兴趣，家人愿意陪你尝试。',
      options: [
        ['read', '先去图书馆查资料', '学习积累提高', { study: 8 }],
        ['play', '直接动手探索', '健康提高并缓解压力', { stats: { 健康: 3 }, stress: -4 }],
      ],
    },
    {
      id: 'school_club', min: 8, max: 17, once: true,
      title: '社团招新', text: '学校开放了社团招新，你只能把主要精力投入一个方向。',
      options: [
        ['science', '加入科技社', '学习积累提高，学习压力增加', { stress: 2, study: 10 }],
        ['arts', '加入文艺社', '交涉经验提高并缓解压力', { stats: { 魅力: 5 }, stress: -4 }],
        ['sport', '加入运动队', '健康与体能经验提高，学习积累略降', { stats: { 健康: 7, 力量: 5 }, study: -4 }],
      ],
    },
    {
      id: 'health_warning', min: 35, max: 100, once: true,
      title: '体检提醒', text: '近期容易疲惫，社区医生建议你重新安排生活习惯。',
      options: [
        ['check', '接受完整检查', '花费资金，降低健康风险', { money: -900, healthCare: 8 }],
        ['sleep', '优先改善睡眠', '缓解压力并提高健康', { stats: { 健康: 4 }, stress: -3, sleep: 1 }],
        ['ignore', '暂时不处理', '保留资金，但健康承受风险', { stats: { 健康: -5 } }],
      ],
    },
    {
      id: 'elder_community', min: 60, max: 120, once: true,
      title: '新的晚年生活', text: '社区邀请你参加长期活动，为退休后的生活建立新的节奏。',
      options: [
        ['volunteer', '参加社区志愿服务', '缓解压力并提高交涉经验和城市声望', { stats: { 魅力: 3 }, stress: -6, city: 8 }],
        ['family', '把时间留给家人', '家庭信任明显提高', { familyTrust: 10 }],
        ['quiet', '保持安静的个人生活', '健康提高', { stats: { 健康: 5 } }],
      ],
    },
  ];

  const clamp = (value) => Math.max(0, Math.min(100, value));

  function apply(state, effects) {
    Object.entries(effects.stats || {}).forEach(([key, value]) => {
      const ability = Game.characterAttributes.normalize(key);
      if (value > 0 && ability) {
        Game.characterAttributes.gain(state, ability, value, '人生事件');
      } else state.stats[key] = clamp((state.stats[key] || 0) + value);
    });
    if (effects.stress > 0) Game.stressSystem.add(state, effects.stress, '人生事件');
    else if (effects.stress < 0) Game.stressSystem.reduce(state, -effects.stress, '人生事件');
    state.money += effects.money || 0;
    if (effects.study) Game.educationSystem.addPreparation(state, effects.study);
    state.cityLife.reputation = clamp(state.cityLife.reputation + (effects.city || 0));
    state.career.burnout = clamp(state.career.burnout + (effects.burnout || 0));
    Object.entries(effects.career || {}).forEach(([key, value]) => {
      state.career[key] = Math.max(0, (state.career[key] || 0) + value);
    });
    if (effects.sleep) state.health.sleep = Math.max(4, Math.min(10, state.health.sleep + effects.sleep));
    if (effects.healthCare) state.health.careLevel = clamp(state.health.careLevel + effects.healthCare);
    if (effects.familyTrust || effects.familyConflict) {
      state.family.filter((person) => person.status === '健康').forEach((person) => {
        person.trust = clamp(person.trust + (effects.familyTrust || 0));
        person.conflict = clamp(person.conflict + (effects.familyConflict || 0));
      });
    }
  }

  function maybeTrigger(state) {
    if (state.pendingDecision || state.gameOver || state.totalMonths - state.eventState.lastMonth < 4) return;
    if (Math.random() > 0.16) return;
    const age = Game.content.age(state);
    const available = events.filter((event) => age >= event.min && age <= event.max
      && (!event.once || !state.eventState.seen[event.id])
      && (!event.condition || event.condition(state)));
    if (!available.length) return;
    const event = available[Math.floor(Math.random() * available.length)];
    state.pendingDecision = { type: 'lifeEvent', eventId: event.id };
  }

  function resolve(state, optionId) {
    const event = events.find((item) => item.id === state.pendingDecision?.eventId);
    const option = event?.options.find((item) => item[0] === optionId);
    if (!event || !option) return { ok: false, message: '这项人生选择已经失效' };
    apply(state, option[3]);
    state.eventState.seen[event.id] = (state.eventState.seen[event.id] || 0) + 1;
    state.eventState.lastMonth = state.totalMonths;
    state.eventState.history.push({ id: event.id, choice: optionId, month: state.totalMonths });
    state.eventState.history = state.eventState.history.slice(-30);
    Game.lifeDirector.addLog(state, event.title, `${option[1]}。${option[2]}。`, 'milestone');
    return { ok: true, message: option[2] };
  }

  function render(state) {
    const event = events.find((item) => item.id === state.pendingDecision?.eventId);
    if (!event) return null;
    return {
      title: event.title,
      text: event.text,
      options: event.options.map(([value, label, hint]) => ({ value, label: `${label} · ${hint}` })),
    };
  }

  Game.lifeEvents = Object.freeze({ maybeTrigger, resolve, render });
}(window));
