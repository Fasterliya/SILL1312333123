(function initStudyEvents(root) {
  'use strict';
  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var EVENTS = [
    { id: 'library', text: '同学约你一起去图书馆学习。两人互相督促，效率加倍。', subjectBonus: 10, affectionBonus: 3, moodBonus: 2, chance: 0.08 },
    { id: 'praise', text: '老师当着全班表扬了你的进步。你感到更有信心了。', subjectBonus: 5, moodBonus: 5, chance: 0.05 },
    { id: 'method', text: '你偶然发现了一种高效学习法，事半功倍！', subjectBonus: 15, chance: 0.03 },
    { id: 'insomnia', text: '考前焦虑让你辗转难眠。今晚的睡眠质量很差——考试表现可能受到影响。', sleepPenalty: 2, examDebuff: 0.03, chance: 0.10, examOnly: true },
    { id: 'burnout', text: '连续学习让你精疲力尽。或许该休息一下了。', moodPenalty: -3, burnoutExtra: 5, chance: 0.06 },
  ];

  function maybeTrigger(state, subject) {
    var daysBeforeExam = examDaysAway(state);
    var events = EVENTS.filter(function(e) {
      if (e.examOnly && daysBeforeExam > 7) return false;
      return true;
    });
    if (!events.length) return null;

    var roll = Math.random();
    var cumulative = 0;
    var picked = null;
    for (var i = 0; i < events.length; i++) {
      cumulative += events[i].chance;
      if (roll < cumulative) { picked = events[i]; break; }
    }
    if (!picked) return null;

    // Apply effects
    if (picked.subjectBonus && state.education.subjects && state.education.subjects[subject]) {
      state.education.subjects[subject].studyHours += picked.subjectBonus;
    }
    if (picked.moodBonus) state.stats.心情 = U.clamp(state.stats.心情 + picked.moodBonus, 0, 100);
    if (picked.moodPenalty) state.stats.心情 = U.clamp(state.stats.心情 + picked.moodPenalty, 0, 100);
    if (picked.sleepPenalty) state.health.sleep = Math.max(4, (state.health.sleep||7) - picked.sleepPenalty);
    if (picked.burnoutExtra) state.education.burnout = U.clamp((state.education.burnout||0) + picked.burnoutExtra, 0, 100);
    if (picked.examDebuff) state.education._examDebuff = (state.education._examDebuff||0) + picked.examDebuff;
    if (picked.affectionBonus) {
      // Find a classmate to give affection to
      var classmates = (state.contacts||[]).filter(function(c){return c.school===state.education.school&&c.status==='健康';});
      if (classmates.length) {
        var friend = classmates[Math.floor(Math.random()*classmates.length)];
        friend.affection = U.clamp(friend.affection + picked.affectionBonus, 0, 100);
      }
    }

    Game.lifeDirector.addLog(state, '学习插曲', picked.text, 'good');
    Game.taskCenter?.add(state, {
      key: `study-${picked.id}-${state.totalMonths}`,
      type: 'notice',
      title: '学习插曲',
      text: picked.text,
    });
    return picked;
  }

  function examDaysAway(state) {
    var age = U.age(state);
    var targetAge = state.education.schoolStage === 'middle' ? 15 : (state.education.schoolStage === 'high' || state.education.schoolStage === 'vocational' ? 18 : -1);
    if (targetAge < 0) return 999;
    var targetMonth = targetAge * 12 + 6; // June of target year
    var currentMonth = state.totalMonths;
    return Math.max(0, targetMonth - currentMonth) / 12 * 365;
  }

  Game.studyEvents = Object.freeze({ maybeTrigger });
}(window));
