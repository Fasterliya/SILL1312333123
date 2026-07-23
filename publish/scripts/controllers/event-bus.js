(function initEventBus(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  var _handlers = {};
  var _toastTimer = null;

  /* ===== 日志 (原 lifeDirector.addLog) ===== */
  function log(state, opts) {
    if (!state || !opts) return;
    var title = opts.title || '';
    var text = opts.text || '';
    var tone = opts.tone || 'normal';
    var channel = opts.channel || '';
    var month = state.totalMonths;

    var entry = {
      id: 'e-' + month + '-' + Math.random().toString(36).slice(2, 6),
      title: title, text: text, tone: tone, month: month,
      generation: state.generation,
      ageMonth: state.totalMonths - state.playerBornAt,
    };
    if (channel) entry.channel = channel;

    if (!Array.isArray(state.logs)) state.logs = [];
    state.logs.unshift(entry);
    state.logs = state.logs.slice(0, 80);

    if (channel === 'family') {
      if (!Array.isArray(state.familyEvents)) state.familyEvents = [];
      state.familyEvents.unshift({ title: title, text: text, tone: tone, month: month });
      state.familyEvents = state.familyEvents.slice(0, 30);
    }
  }

  /* ===== 提醒 (原 showToast) ===== */
  function notify(state, message, tone) {
    if (!root || !state) return;
    root.clearTimeout(_toastTimer);
    var el = root.document.getElementById('toast');
    if (!el) return;
    el.textContent = message || '';
    el.dataset.tone = tone || 'normal';
    el.hidden = false;
    _toastTimer = root.setTimeout(function () { el.hidden = true; }, 2400);
  }

  /* ===== 抉择 (原 state.pendingDecision) ===== */
  function decide(state, decision) {
    if (!state || !decision) return;
    if (!Array.isArray(state._decisionQueue)) state._decisionQueue = [];
    var priority = Number(decision.priority) || 0;
    decision._priority = priority;
    state._decisionQueue.push(decision);
    state._decisionQueue.sort(function (a, b) { return (b._priority || 0) - (a._priority || 0); });
    applyDecision(state);
  }

  function applyDecision(state) {
    if (!state._decisionQueue || !state._decisionQueue.length) return;
    if (state.pendingDecision) return;
    state.pendingDecision = state._decisionQueue.shift();
    state.timeSpeed = 0;
  }

  function resolveDecision(state, value) {
    if (!state || !state.pendingDecision) return null;
    var d = state.pendingDecision;
    var handler = _handlers[d.type];
    var result = null;
    if (handler && handler.resolve) {
      result = handler.resolve(state, value);
    } else if (d.options && value) {
      var opt = d.options.find(function (o) { return o.value === value; });
      result = opt ? { ok: true, message: opt.label || '已选择' } : { ok: false, message: '未知选项' };
    }
    state.pendingDecision = null;
    state.timeSpeed = 1;
    applyDecision(state);
    return result;
  }

  function hasPending(state) {
    return !!(state && ((state._decisionQueue && state._decisionQueue.length > 0) || state.pendingDecision));
  }

  /* ===== 抉择注册 ===== */
  function register(type, handler) {
    _handlers[type] = handler;
  }

  function getHandler(type) {
    return _handlers[type] || null;
  }

  /* ===== 抉择渲染 ===== */
  function renderDecision(state) {
    var d = state.pendingDecision;
    if (!d) return null;
    var handler = _handlers[d.type];
    if (handler && handler.render) {
      return handler.render(state, d);
    }
    if (d.title && d.options) {
      var optsHtml = d.options.map(function (o) {
        return '<button type="button" data-choice="' + o.value + '" style="display:block;width:100%;min-height:36px;padding:6px 10px;margin:4px 0;border:1px solid var(--ui-line);border-radius:4px;background:var(--ui-paper);font-size:10px;text-align:left;cursor:pointer">' + (o.label || o.value) + '</button>';
      }).join('');
      return { title: d.title, text: d.text || '', html: '<div class="decision-options">' + optsHtml + '</div>' };
    }
    return null;
  }

  Game.eventBus = Object.freeze({
    log: log,
    notify: notify,
    decide: decide,
    register: register,
    getHandler: getHandler,
    resolveDecision: resolveDecision,
    renderDecision: renderDecision,
    hasPending: hasPending,
    applyDecision: applyDecision,
  });
}(window));
