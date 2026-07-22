(function initCradleNetworkView(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var filter = 'active';
  var currentState = null;
  var groupOpen = new Map([
    ['监禁改造中', true],
    ['待转运', true],
    ['已完成', false],
  ]);

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function remember(host) {
    host.querySelectorAll('[data-cradle-group]').forEach(function (item) {
      groupOpen.set(item.dataset.cradleGroup, item.open);
    });
  }

  function matches(task) {
    if (filter === 'active') return task.status !== '已完成';
    if (filter === 'anime') return task.reformType === '舞台角色重塑';
    if (filter === 'japanese') return Boolean(task.japaneseName || task.mindProgress >= 60);
    if (filter === 'completed') return task.status === '已完成';
    return true;
  }

  function portraitTarget(state, task) {
    if (!task.player) return Game.people.find(state, task.characterId || task.targetId);
    var identity = Game.hunterMode.identity(state);
    return Object.assign({ name: identity.name, status: '健康' }, identity.profile);
  }

  function progressRow(label, value, stage, tone) {
    return '<div class="cradle-reform-row"><header><span>' + label + '</span><b>'
      + escape(stage) + ' · ' + Math.round(value) + '%</b></header>'
      + '<i><span class="' + tone + '" style="width:' + value + '%"></span></i></div>';
  }

  function taskCard(state, task) {
    var C = Game.cradleNetworkCharacters;
    var target = portraitTarget(state, task) || {
      name: task.name,
      status: '健康',
      portraitUrl: null,
    };
    var detailAttrs = task.player
      ? 'data-open-module="roleArchive" data-module-title="角色档案"'
      : 'data-character-id="' + escape(task.characterId || task.targetId) + '"';
    var former = task.originalName && task.originalName !== task.name
      ? '<small>曾用名：' + escape(task.originalName) + '</small>' : '';
    var anime = task.reformType === '舞台角色重塑'
      ? '<div class="cradle-anime-order"><b>动漫角色订单</b><span>'
        + escape(task.orderSeries || '作品待定') + ' · '
        + escape(task.orderCharacter || '角色待定') + '</span></div>' : '';
    var months = Math.max(0, state.totalMonths - task.startedMonth);
    return '<details class="cradle-task' + (task.status === '已完成' ? ' done' : '') + '">'
      + '<summary><span class="cradle-task-portrait">' + Game.portraitSystem.avatar(target) + '</span>'
      + '<span class="cradle-task-heading"><b>' + escape(task.name) + '</b>' + former
      + '<em>' + escape(task.city) + ' · 收容时' + task.ageAtCapture + '岁 · '
      + escape(task.reformType) + '</em></span><strong>' + Math.round(task.progress)
      + '%</strong></summary><div class="cradle-task-body">'
      + '<p class="cradle-task-code">' + escape(task.id) + ' · 已执行' + months
      + '个月 · ' + escape(task.status) + '</p>' + anime
      + progressRow('身体改造', task.bodyProgress, C.bodyStage(task.bodyProgress), 'body')
      + progressRow('意识改造', task.mindProgress, C.mindStage(task.mindProgress), 'mind')
      + '<button type="button" class="cradle-file-button" ' + detailAttrs
      + '>查看角色立绘与完整档案</button></div></details>';
  }

  function group(state, status, tasks) {
    if (!tasks.length) return '';
    var open = groupOpen.get(status) ? ' open' : '';
    return '<details class="cradle-task-group" data-cradle-group="' + status + '"' + open
      + '><summary><span><b>' + status + '</b><small>'
      + (status === '已完成' ? '保留历史角色档案' : '点击展开人物册')
      + '</small></span><strong>' + tasks.length + '人</strong></summary>'
      + '<div class="cradle-task-list">' + tasks.map(function (task) {
        return taskCard(state, task);
      }).join('') + '</div></details>';
  }

  function bind(host) {
    if (host.dataset.cradleBound === '1') return;
    host.dataset.cradleBound = '1';
    host.addEventListener('click', function (event) {
      var button = event.target.closest('[data-cradle-filter]');
      if (!button) return;
      filter = button.dataset.cradleFilter;
      render(currentState, host);
    });
  }

  function render(state, host) {
    currentState = state;
    var entry = document.getElementById('cradleNetworkEntry');
    var visible = Boolean(state && state.location.city === '上海');
    if (entry) entry.hidden = !visible;
    if (!host) return;
    bind(host);
    if (!visible) {
      host.innerHTML = '';
      return;
    }
    remember(host);
    var all = Game.cradleNetwork.tasks(state).sort(function (left, right) {
      return Game.cradleNetwork.statuses.indexOf(left.status)
        - Game.cradleNetwork.statuses.indexOf(right.status)
        || right.progress - left.progress;
    });
    var selected = all.filter(matches);
    var active = all.filter(function (task) { return task.status !== '已完成'; });
    var average = active.length ? Math.round(active.reduce(function (sum, task) {
      return sum + task.progress;
    }, 0) / active.length) : 0;
    var filters = [
      ['active', '执行中'], ['all', '全部'], ['anime', '动漫订单'],
      ['japanese', '日本名'], ['completed', '已完成'],
    ];
    host.innerHTML = '<section class="cradle-network-summary">'
      + '<div><strong>' + active.length + '</strong><span>执行中</span></div>'
      + '<div><strong>' + all.filter(function (task) {
        return task.reformType === '舞台角色重塑';
      }).length + '</strong><span>动漫订单</span></div>'
      + '<div><strong>' + average + '%</strong><span>平均进度</span></div></section>'
      + '<nav class="cradle-filter-nav" aria-label="摇篮人物册筛选">'
      + filters.map(function (item) {
        return '<button type="button" data-cradle-filter="' + item[0] + '" class="'
          + (filter === item[0] ? 'active' : '') + '">' + item[1] + '</button>';
      }).join('') + '</nav><section class="cradle-directory">'
      + (selected.length ? Game.cradleNetwork.statuses.map(function (status) {
        return group(state, status, selected.filter(function (task) {
          return task.status === status;
        }));
      }).join('') : '<p class="empty-state">当前筛选没有匹配的监禁档案。</p>')
      + '</section>';
  }

  Game.cradleNetworkView = Object.freeze({ render: render });
}(window));
