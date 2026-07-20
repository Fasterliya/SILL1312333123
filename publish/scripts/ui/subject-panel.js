(function initSubjectPanel(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var STAGE_SUBJECTS = {
    primary: { '语文': 100, '数学': 100, '英语': 100, '科学': 100 },
    middle: { '语文': 130, '数学': 130, '英语': 130, '政治': 50, '历史': 50, '物理': 100, '化学': 100 },
    high: { '语文': 150, '数学': 150, '英语': 150 },
    vocational: { '语文': 100, '数学': 100, '英语': 100, '专业技能': 150 },
  };

  function getStageSubjects(state) {
    var stage = state.education.stage;
    var map = Object.assign({}, STAGE_SUBJECTS[stage] || STAGE_SUBJECTS.primary);
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
    var staminaResult = Game.staminaSystem && Game.staminaSystem.spend
      ? Game.staminaSystem.spend(state, U.between(15, 20))
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

    subData.studyHours += gain;
    state.education.burnout = U.clamp(burnout + U.between(3, 8), 0, 100);

    var msg = subject + '学习+' + gain + 'h';
    U.log(msg);
    return { ok: true, message: subject + ' +' + gain + 'h' };
  }

  function render(state) {
    ensureSubjects(state);
    var map = getStageSubjects(state);
    var subjects = state.education.subjects;
    var keys = Object.keys(map);
    var html = '<div class="subject-grid">';
    for (var i = 0; i < keys.length; i += 1) {
      var sub = keys[i];
      var maxScore = map[sub];
      var data = subjects[sub] || { studyHours: 0, examScore: 0, aptitude: 0 };
      var apt = data.aptitude || 0;
      var stars;
      if (apt >= 80) stars = 5;
      else if (apt >= 65) stars = 4;
      else if (apt >= 50) stars = 3;
      else if (apt >= 35) stars = 2;
      else stars = 1;

      var starStr = '';
      for (var s = 0; s < 5; s += 1) {
        starStr += s < stars ? '★' : '☆';
      }

      var hours = data.studyHours || 0;
      var pct = Math.min(100, Math.round((hours / 200) * 100));
      var examScore = data.examScore || 0;

      html += '<div class="subject-card">'
        + '<div class="subject-name">' + sub + ' <span class="subject-max">' + U.safe(maxScore) + '分</span></div>'
        + '<div class="subject-stars">' + starStr + '</div>'
        + '<div class="progress-bar"><i style="width:' + pct + '%"></i><span>' + hours + '/200h</span></div>'
        + '<div class="subject-exam">上次考试: ' + examScore + '分</div>'
        + '<button class="btn-learn" data-learn-subject="' + U.safe(sub) + '">学习 -15体</button>'
        + '</div>';
    }
    html += '</div>';
    return html;
  }

  function handleClick(event) {
    var target = event.target;
    while (target && target !== event.currentTarget) {
      var subject = target.getAttribute && target.getAttribute('data-learn-subject');
      if (subject) {
        var state = Game.state;
        if (!state) return;
        var result = learnSubject(state, subject);
        if (result && result.message) {
          Game.toast && Game.toast.show(result.message);
        }
        Game.ui && Game.ui.refresh && Game.ui.refresh();
        return;
      }
      target = target.parentNode;
    }
  }

  Game.subjectPanel = Object.freeze({
    getStageSubjects: getStageSubjects,
    ensureSubjects: ensureSubjects,
    learnSubject: learnSubject,
    render: render,
    handleClick: handleClick,
  });

}(window));
