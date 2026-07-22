(function initMentalBreakdown(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function ensure(state) {
    state.mental = state.mental && typeof state.mental === 'object' ? state.mental : {};
    var m = state.mental;
    m.breakdownCount = Number.isFinite(m.breakdownCount) ? Math.max(0, m.breakdownCount) : 0;
    m.lastBreakdown = Number.isFinite(m.lastBreakdown) ? m.lastBreakdown : -24;
    m.breakdownThreshold = U.clamp(Number(m.breakdownThreshold) || 300, 200, 380);
    m.recoveryBuffs = Array.isArray(m.recoveryBuffs) ? m.recoveryBuffs.slice(-4) : [];
    return m;
  }

  function breakdownEvents() {
    return [
      {
        id: 'public_outburst', title: '情绪失控',
        text: '你在公开场合突然情绪爆发。周围的人用惊恐的眼神看着你——那个平时温和克制的你，此刻面目全非。',
        effect: function (state) {
          state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) - 15, 0, 100);
          state.stats.心情 = U.clamp((state.stats.心情 || 0) - 20, 0, 100);
          state.stats.交涉 = U.clamp((state.stats.交涉 || 0) - 4, 0, 100);
          Game.stressSystem.reduce(state, 80, '情绪宣泄');
          Game.psychology.addTrauma(state, 5, '公开失控');
          state.mental.recoveryBuffs.push({ id: 'shame', name: '羞耻阴影', months: 6,
            effect: { negotiation: -6, charm: -4 } });
          state.mental.recoveryBuffs = state.mental.recoveryBuffs.slice(-4);
        },
      },
      {
        id: 'isolation', title: '自我封锁',
        text: '你取消了所有社交活动，把自己锁在房间里。窗帘紧闭，手机静音。外面的世界太吵了，你只想一个人待着。',
        effect: function (state) {
          state.stats.心情 = U.clamp((state.stats.心情 || 0) - 10, 0, 100);
          state.career.performance = Math.max(0, (state.career.performance || 0) - 20);
          Game.stressSystem.reduce(state, 60, '自我隔离');
          Game.psychology.addTrauma(state, 3, '长期封闭');
          state.mental.recoveryBuffs.push({ id: 'isolated', name: '社交回避', months: 6,
            effect: { social: -8, negotiation: -4 } });
          state.mental.recoveryBuffs = state.mental.recoveryBuffs.slice(-4);
        },
      },
      {
        id: 'seek_help', title: '求助之门',
        text: '你终于意识到独自支撑的极限。你预约了心理咨询师，开始正视那些一直在逃避的情绪。',
        effect: function (state) {
          Game.stressSystem.reduce(state, 100, '专业治疗');
          Game.psychology.reduceTrauma(state, 20, '系统治疗');
          state.stats.心情 = U.clamp((state.stats.心情 || 0) + 5, 0, 100);
          Game.psychology.addGuilt(state, -8);
          state.mental.recoveryBuffs.push({ id: 'healing', name: '正在疗愈', months: 6,
            effect: { stressDecay: 3, charm: -2 } });
          state.mental.recoveryBuffs = state.mental.recoveryBuffs.slice(-4);
        },
        cost: 5000,
      },
      {
        id: 'addiction_escape', title: '堕落逃避',
        text: '你用酒精和欲望麻痹自己。红灯区的霓虹灯成了你最熟悉的颜色。每次清醒时，加倍的罪恶感又逼着你继续沉沦。',
        effect: function (state) {
          Game.stressSystem.reduce(state, 70, '放纵麻醉');
          Game.psychology.addAddiction(state, 15);
          Game.psychology.addCorruption(state, 12);
          Game.psychology.addGuilt(state, 18);
          state.stats.健康 = U.clamp((state.stats.健康 || 0) - 15, 0, 100);
          state.mental.recoveryBuffs.push({ id: 'spiraling', name: '恶性循环', months: 8,
            effect: { addictionGain: 1.5, health: -8 } });
          state.mental.recoveryBuffs = state.mental.recoveryBuffs.slice(-4);
        },
      },
    ];
  }

  function trigger(state) {
    var m = ensure(state);
    var stress = Game.stressSystem.ensure(state);
    if (stress.level < 3 || stress.value < m.breakdownThreshold) return null;
    if (state.pendingDecision) return null;
    var monthsSince = state.totalMonths - m.lastBreakdown;
    if (monthsSince < 12) return null;
    m.lastBreakdown = state.totalMonths;
    m.breakdownCount += 1;
    m.breakdownThreshold = Math.max(200, m.breakdownThreshold - 10);
    Game.lifeDirector.addLog(state, '精神崩坏',
      '积压已久的压力终于冲破了最后的防线。你感觉自己正在分崩离析。', 'milestone');
    state.pendingDecision = { type: 'mental_breakdown' };
    return m;
  }

  function resolve(state, choiceId) {
    var d = state.pendingDecision;
    if (!d || d.type !== 'mental_breakdown') return { ok: false, message: '没有待处理的崩坏事件' };
    var event = breakdownEvents().find(function (ev) { return ev.id === choiceId; });
    if (!event) return { ok: false, message: '这个应对方式已经失效' };
    if (event.cost && state.money < event.cost) {
      return { ok: false, message: '需要' + Game.view.money(event.cost) + '资金' };
    }
    if (event.cost) Game.economy.spend(state, event.cost);
    event.effect(state);
    state.pendingDecision = null;
    return { ok: true, message: event.text };
  }

  function renderDecision(state) {
    var d = state.pendingDecision;
    if (!d || d.type !== 'mental_breakdown') return null;
    var events = breakdownEvents();
    return {
      title: '精神崩坏',
      text: '你已经无法继续忽视精神负担。选择一种应对方式，它将永久改变你的生活轨迹。',
      options: events.map(function (ev) {
        return {
          value: ev.id,
          label: ev.title + (ev.cost ? ' · ' + Game.view.money(ev.cost) : ''),
        };
      }),
    };
  }

  function monthly(state) {
    var m = ensure(state);
    m.recoveryBuffs = m.recoveryBuffs.filter(function (buff) {
      buff.months -= 1;
      return buff.months > 0;
    });
    var buffs = m.recoveryBuffs;
    for (var i = 0; i < buffs.length; i += 1) {
      var b = buffs[i];
      if (b.effect && b.effect.health) state.stats.健康 = U.clamp((state.stats.健康 || 0) + b.effect.health, 0, 100);
      if (b.effect && b.effect.stressDecay) Game.stressSystem.reduce(state, b.effect.stressDecay, '疗愈进程');
      if (b.effect && b.effect.addictionGain && state.totalMonths % 2 === 0) {
        Game.psychology.addAddiction(state, 1);
      }
    }
    trigger(state);
  }

  Game.mentalBreakdown = Object.freeze({
    ensure, trigger, resolve, renderDecision, monthly, breakdownEvents,
  });
}(window));
