(function initSubjectPanel(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[char];
    });
  }

  var STAGE_SUBJECTS = {
    primary: { '语文': 100, '数学': 100, '英语': 100, '科学': 100 },
    middle: { '语文': 130, '数学': 130, '英语': 130, '政治': 50, '历史': 50, '物理': 100, '化学': 100 },
    high: { '语文': 150, '数学': 150, '英语': 150 },
    vocational: { '语文': 100, '数学': 100, '英语': 100, '专业技能': 150 },
    university: { '专业核心': 100, '通识课程': 100, '外语': 100, '毕业论文': 100 },
  };

  function isStudent(state) {
    return ['primary', 'middle', 'high', 'vocational', 'university']
      .includes(state.education.schoolStage);
  }

  function getStageSubjects(state) {
    var stage = state.education.schoolStage;
    var map = Object.assign({}, STAGE_SUBJECTS[stage] || {});
    if (stage === 'high') {
      var track = state.education.track;
      if (track === '物理' || track === '历史') map[track] = 100;
      var electives = state.education.electives || [];
      electives.forEach(function (sub) {
        if (sub) map[sub] = 100;
      });
    }
    return map;
  }

  function subjectHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i += 1) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function calcAptitude(name, subject) {
    return 34 + (subjectHash(subject + name) % 54);
  }

  function ensureSubjects(state) {
    if (!state.education.subjects) state.education.subjects = {};
    var subjects = state.education.subjects;
    var map = getStageSubjects(state);
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i += 1) {
      var sub = keys[i];
      if (!subjects[sub]) {
        subjects[sub] = { studyHours: 0, examScore: 0, aptitude: 0 };
      }
      if (subjects[sub].aptitude === 0) {
        subjects[sub].aptitude = calcAptitude(state.name, sub);
      }
    }
  }

  function learnSubject(state, subject) {
    if (!isStudent(state)) return { ok: false, message: '当前不在学生阶段' };
    var staminaResult = Game.staminaSystem && Game.staminaSystem.spend
      ? Game.staminaSystem.spend(state, 15)
      : null;
    if (staminaResult && !staminaResult.ok) return staminaResult;

    ensureSubjects(state);
    var subData = state.education.subjects[subject];
    if (!subData) {
      state.education.subjects[subject] = { studyHours: 0, examScore: 0, aptitude: 0 };
      subData = state.education.subjects[subject];
    }
    if (subData.aptitude === 0) {
      subData.aptitude = calcAptitude(state.name, subject);
    }

    var stats = state.stats || {};
    var efficiency = subData.aptitude / 100 * 0.6 + (stats.智力 || 0) / 100 * 0.3 + 0.1;
    var baseGain = U.between(8, 15);
    var gain = Math.round(baseGain * efficiency);

    var burnout = state.education.burnout || 0;
    if (burnout >= 50) gain = Math.round(gain * 0.7);
    if (burnout >= 80) gain = Math.round(gain * 0.3);

    subData.studyHours = Math.min(240, subData.studyHours + gain);
    state.education.burnout = U.clamp(burnout + U.between(3, 8), 0, 100);

    return { ok: true, message: subject + ' +' + gain + 'h' };
  }

  function render(state) {
    if (!isStudent(state)) return '';
    ensureSubjects(state);
    var map = getStageSubjects(state);
    var subjects = state.education.subjects;
    var keys = Object.keys(map);
    var targetSubjects = Game.educationStudyPlan
      ? Game.educationStudyPlan.targets(state) : [];
    var html = '<div class="subject-grid">';
    for (var i = 0; i < keys.length; i += 1) {
      var sub = keys[i];
      var maxScore = map[sub];
      var data = subjects[sub] || { studyHours: 0, examScore: 0, aptitude: 0 };
      var apt = data.aptitude || 0;
      var hours = data.studyHours || 0;
      var pct = Math.min(100, Math.round((hours / 200) * 100));
      var examScore = data.examScore || 0;
      var focused = targetSubjects.indexOf(sub) >= 0;

      html += '<article class="subject-card' + (focused ? ' plan-focus' : '') + '">'
        + '<div class="subject-copy"><div class="subject-name">' + escape(sub)
        + '<span class="subject-max">' + maxScore + '分</span></div>'
        + '<small>' + (focused ? '策略重点 · ' : '') + '擅长度 ' + apt + '</small></div>'
        + '<button class="btn-learn" data-learn-subject="' + escape(sub)
        + '" aria-label="加练' + escape(sub) + '" title="加练' + escape(sub) + '">＋</button>'
        + '<div class="progress-bar"><i style="width:' + pct + '%"></i>'
        + '<span>' + hours + 'h · 上次 ' + examScore + '分</span></div></article>';
    }
    html += '</div>';
    return html;
  }

  function renderQuick(state) {
    if (!isStudent(state)) return '';
    var burnout = Math.round(state.education.burnout || 0);
    var plan = Game.educationStudyPlan
      ? Game.educationStudyPlan.status(state)
      : { plan: 'balanced', label: '均衡', text: '下月自动执行' };
    var buttons = Object.keys(Game.educationStudyPlan?.plans || { balanced: '均衡' })
      .map(function (id) {
        var label = Game.educationStudyPlan.plans[id];
        return '<button data-study-plan="' + id + '" class="'
          + (plan.plan === id ? 'active' : '') + '">' + label + '</button>';
      }).join('');
    return '<div class="quick-study subject-study"><header><div><strong>学习计划</strong>'
      + '<small>' + plan.text + '</small></div><span>疲劳 ' + burnout + '/100</span></header>'
      + '<div class="study-plan" role="group" aria-label="每月自动学习策略">' + buttons + '</div>'
      + render(state) + '</div>';
  }

  function restoreControl(target, scrollTop) {
    root.requestAnimationFrame(function () {
      var grid = document.querySelector('#quickStudyPanel .subject-grid');
      if (grid) grid.scrollTop = scrollTop;
      var selector = target.dataset.learnSubject ? '[data-learn-subject]' : '[data-study-plan]';
      var key = target.dataset.learnSubject || target.dataset.studyPlan;
      var next = Array.from(document.querySelectorAll(selector)).find(function (item) {
        return (item.dataset.learnSubject || item.dataset.studyPlan) === key;
      });
      if (next) next.focus({ preventScroll: true });
    });
  }

  function handleClick(event) {
    var target = event.target.closest('[data-learn-subject], [data-study-plan]');
    if (!target) return false;
    var state = Game._getState ? Game._getState() : null;
    if (!state) return false;
    var grid = target.closest('.subject-study')?.querySelector('.subject-grid');
    var scrollTop = grid?.scrollTop || 0;
    var subject = target.dataset.learnSubject;
    var result = subject
      ? learnSubject(state, subject)
      : Game.educationStudyPlan.set(state, target.dataset.studyPlan);
    if (subject && result.ok && Game.studyEvents) Game.studyEvents.maybeTrigger(state, subject);
    Game._refresh && Game._refresh();
    Game._save && Game._save();
    Game.view && Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    restoreControl(target, scrollTop);
    return true;
  }

  Game.subjectPanel = Object.freeze({
    getStageSubjects: getStageSubjects,
    isStudent: isStudent,
    ensureSubjects: ensureSubjects,
    learnSubject: learnSubject,
    render: render,
    renderQuick: renderQuick,
    handleClick: handleClick,
  });

}(window));
