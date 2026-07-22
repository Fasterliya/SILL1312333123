(function initCradleNetwork(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var TYPES = ['语言与身份重塑', '行为规范重塑', '舞台角色重塑'];
  var STATUSES = ['监禁改造中', '待转运', '已完成'];

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function ensure(state) {
    var current = state.cradleNetwork;
    state.cradleNetwork = current && typeof current === 'object' ? current : {
      tasks: [], lastMonth: -1, serial: 1,
    };
    var data = state.cradleNetwork;
    data.tasks = Array.isArray(data.tasks) ? data.tasks.filter(Boolean).slice(-30) : [];
    data.lastMonth = Number.isFinite(data.lastMonth) ? data.lastMonth : -1;
    data.serial = Math.max(1, Math.floor(Number(data.serial) || 1));
    data.tasks.forEach(function (task) {
      task.progress = Math.max(0, Math.min(100, Number(task.progress) || 0));
      if (!STATUSES.includes(task.status)) task.status = task.progress >= 100 ? '待转运' : '监禁改造中';
      task.startedMonth = Number.isFinite(task.startedMonth) ? task.startedMonth : state.totalMonths;
      task.lastProgressMonth = Number.isFinite(task.lastProgressMonth)
        ? task.lastProgressMonth : task.startedMonth;
    });
    return data;
  }

  function candidates(state, data) {
    var archives = Game.cityPopulation.ensure(state);
    var used = new Set(data.tasks.map(function (task) { return task.targetId; }));
    var result = [];
    Game.config.cities.filter(function (city) {
      return city.country === '华夏';
    }).forEach(function (city) {
      (archives[city.city] || []).forEach(function (record) {
        var age = Math.floor((state.totalMonths - record.b) / 12);
        if (record.g === '女' && age >= 12 && age <= 17 && !used.has(record.i)) {
          result.push({ record: record, city: city.city, age: age });
        }
      });
    });
    return result;
  }

  function addTask(state, data, seeded) {
    var pool = candidates(state, data);
    if (!pool.length) return false;
    var selected = pool[Math.floor(Math.random() * pool.length)];
    var serial = String(data.serial++).padStart(4, '0');
    var started = seeded ? state.totalMonths - U.between(1, 10) : state.totalMonths;
    data.tasks.push({
      id: 'CR-SH-' + serial,
      targetId: selected.record.i,
      name: selected.record.n,
      ageAtCapture: selected.age,
      city: selected.city,
      reformType: U.random(TYPES),
      progress: seeded ? U.between(8, 78) : 0,
      status: '监禁改造中',
      startedMonth: started,
      lastProgressMonth: state.totalMonths,
      completedMonth: null,
    });
    return true;
  }

  function seed(state, data) {
    while (data.tasks.length < 8 && addTask(state, data, true)) {}
  }

  function monthly(state) {
    var data = ensure(state);
    seed(state, data);
    if (data.lastMonth === state.totalMonths) return;
    data.lastMonth = state.totalMonths;
    data.tasks.forEach(function (task) {
      if (task.status === '监禁改造中') {
        task.progress = Math.min(100, task.progress + U.between(3, 8));
        task.lastProgressMonth = state.totalMonths;
        if (task.progress >= 100) task.status = '待转运';
      } else if (task.status === '待转运'
        && state.totalMonths - task.lastProgressMonth >= 1) {
        task.status = '已完成';
        task.completedMonth = state.totalMonths;
      }
    });
    var active = data.tasks.filter(function (task) { return task.status !== '已完成'; }).length;
    if (active < 8 && Math.random() < 0.28) addTask(state, data, false);
    data.tasks = data.tasks.slice(-30);
  }

  function playerTask(state) {
    var cradle = state.cradle;
    if (!cradle?.imprisoned) return null;
    return {
      id: cradle.inmateId || 'PLAYER',
      name: state.name,
      ageAtCapture: Game.content.age(state),
      city: cradle.city || state.location.city,
      reformType: cradle.reformType === 'cosplay' ? '舞台角色重塑' : '语言与身份重塑',
      progress: cradle.reformProgress,
      status: '监禁改造中',
      startedMonth: cradle.imprisonedMonth,
      player: true,
    };
  }

  function taskHtml(state, task) {
    var months = Math.max(0, state.totalMonths - task.startedMonth);
    var done = task.status === '已完成';
    return '<article class="cradle-task' + (done ? ' done' : '') + '">'
      + '<header><span>' + escape(task.id) + ' · ' + escape(task.city) + '</span>'
      + '<b>' + escape(task.player ? '本人档案' : task.status) + '</b></header>'
      + '<h3>' + escape(task.name) + ' · 收容时' + task.ageAtCapture + '岁</h3>'
      + '<p class="cradle-task-meta">' + escape(task.reformType) + ' · 已执行' + months + '个月</p>'
      + '<div class="cradle-task-progress"><progress value="' + task.progress + '" max="100"></progress>'
      + '<strong>' + Math.round(task.progress) + '%</strong></div></article>';
  }

  function render(state, host) {
    var entry = document.getElementById('cradleNetworkEntry');
    var visible = state.location.city === '上海';
    if (entry) entry.hidden = !visible;
    if (!host) return;
    if (!visible) {
      host.innerHTML = '';
      return;
    }
    var data = ensure(state);
    seed(state, data);
    var player = playerTask(state);
    var tasks = data.tasks.slice().sort(function (left, right) {
      return STATUSES.indexOf(left.status) - STATUSES.indexOf(right.status)
        || right.progress - left.progress;
    });
    if (player) tasks.unshift(player);
    var active = tasks.filter(function (task) { return task.status !== '已完成'; });
    var completed = tasks.length - active.length;
    var average = active.length
      ? Math.round(active.reduce(function (sum, task) { return sum + task.progress; }, 0) / active.length) : 0;
    host.innerHTML = '<div class="cradle-network-summary">'
      + '<div><strong>' + active.length + '</strong><span>执行中任务</span></div>'
      + '<div><strong>' + completed + '</strong><span>已完成档案</span></div>'
      + '<div><strong>' + average + '%</strong><span>平均改造进度</span></div></div>'
      + '<div class="cradle-task-list">' + tasks.map(function (task) {
        return taskHtml(state, task);
      }).join('') + '</div>';
  }

  Game.cradleNetwork = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    render: render,
  });
}(window));
