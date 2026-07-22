(function initCradleNetwork(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var TYPES = ['语言与身份重塑', '行为规范重塑', '舞台角色重塑'];
  var STATUSES = ['监禁改造中', '待转运', '已完成'];

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
      Game.cradleNetworkCharacters.ensureTask(state, task);
      Game.cradleNetworkCharacters.syncTask(state, task);
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
    var progress = seeded ? U.between(8, 78) : 0;
    var task = {
      id: 'CR-SH-' + String(data.serial++).padStart(4, '0'),
      targetId: selected.record.i,
      originalName: selected.record.n,
      name: selected.record.n,
      birthMonth: selected.record.b,
      culture: selected.record.c || '华夏',
      personality: selected.record.p || '',
      trait: selected.record.t || '',
      ageAtCapture: selected.age,
      city: selected.city,
      reformType: U.random(TYPES),
      progress: progress,
      bodyProgress: Math.max(0, progress + U.between(-5, 8)),
      mindProgress: Math.max(0, progress + U.between(-8, 4)),
      status: '监禁改造中',
      startedMonth: seeded ? state.totalMonths - U.between(1, 10) : state.totalMonths,
      lastProgressMonth: state.totalMonths,
      completedMonth: null,
    };
    data.tasks.push(task);
    Game.cradleNetworkCharacters.ensureTask(state, task);
    Game.cradleNetworkCharacters.syncTask(state, task);
    return true;
  }

  function seed(state, data) {
    while (data.tasks.length < 8 && addTask(state, data, true)) {}
  }

  function advanceTask(state, task) {
    if (task.status === '监禁改造中') {
      task.bodyProgress = Math.min(100, task.bodyProgress + U.between(3, 7));
      task.mindProgress = Math.min(100, task.mindProgress + U.between(2, 6));
      task.progress = Math.round((task.bodyProgress + task.mindProgress) / 2);
      task.lastProgressMonth = state.totalMonths;
      if (task.progress >= 100) task.status = '待转运';
    } else if (task.status === '待转运'
      && state.totalMonths - task.lastProgressMonth >= 1) {
      task.status = '已完成';
      task.completedMonth = state.totalMonths;
    }
    Game.cradleNetworkCharacters.syncTask(state, task);
  }

  function playerTask(state) {
    var cradle = state.cradle;
    if (!cradle?.imprisoned) return null;
    var progress = Math.max(0, Number(cradle.reformProgress) || 0);
    var task = {
      id: cradle.inmateId || 'PLAYER',
      originalName: cradle.originalName || state.profile.cradleFormerName || state.name,
      name: state.name,
      ageAtCapture: Number.isFinite(cradle.captureAge) ? cradle.captureAge : Game.content.age(state),
      city: cradle.city || state.location.city,
      reformType: cradle.reformType === 'cosplay' ? '舞台角色重塑' : '语言与身份重塑',
      orderSeries: cradle.orderSeries || '',
      orderCharacter: cradle.orderCharacter || '',
      progress: progress,
      bodyProgress: progress,
      mindProgress: Math.max(progress, 100 - (Number(cradle.mental) || 100)),
      status: '监禁改造中',
      startedMonth: cradle.imprisonedMonth,
      player: true,
    };
    Game.cradleNetworkCharacters.ensureTask(state, task);
    Game.cradleNetworkCharacters.syncPlayer(state, task);
    return task;
  }

  function monthly(state) {
    var data = ensure(state);
    seed(state, data);
    if (data.lastMonth === state.totalMonths) return;
    data.lastMonth = state.totalMonths;
    data.tasks.forEach(function (task) { advanceTask(state, task); });
    var active = data.tasks.filter(function (task) { return task.status !== '已完成'; }).length;
    if (active < 8 && Math.random() < 0.28) addTask(state, data, false);
    data.tasks = data.tasks.slice(-30);
    playerTask(state);
  }

  function tasks(state) {
    var data = ensure(state);
    seed(state, data);
    var result = data.tasks.slice();
    var player = playerTask(state);
    if (player) result.unshift(player);
    return result;
  }

  Game.cradleNetwork = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    playerTask: playerTask,
    tasks: tasks,
    statuses: STATUSES,
  });
}(window));
