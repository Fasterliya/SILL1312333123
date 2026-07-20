(function initExamSystem(root) {
  'use strict';
  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function ensure(state) {
    state.examState = state.examState && typeof state.examState === 'object' ? state.examState : { active: false, type: '', startDay: 0, revealedDay: 0, result: null };
    return state.examState;
  }

  function conductExam(state, type, result) {
    var es = ensure(state);
    es.active = true;
    es.type = type;
    es.startDay = state.day || 1;
    es.revealedDay = es.startDay + 3 + Math.floor(Math.random()*3); // 3-5 days
    es.result = result;
    es.partialRevealed = false;
    Game.lifeDirector.addLog(state, type, type+'考试结束。成绩将在3-5天后公布。心情-5(焦虑等待)。', 'normal');
    state.stats.心情 = U.clamp(state.stats.心情 - 5, 0, 100);
  }

  function checkReveal(state) {
    var es = ensure(state);
    if (!es.active) return null;
    var currentDay = state.day || 1;

    // Partial reveal on day 1-2 (one subject per day)
    if (!es.partialRevealed && currentDay >= es.startDay + 1) {
      es.partialRevealed = true;
      var scores = es.result.scores || {};
      var keys = Object.keys(scores);
      if (keys.length > 0) {
        var mid = Math.ceil(keys.length/2);
        var firstHalf = keys.slice(0, mid).map(function(k){return k+scores[k]+'分';}).join('、');
        Game.lifeDirector.addLog(state, '成绩公布(部分)', '今日公布: '+firstHalf+'。剩余科目明天公布。', 'normal');
      }
    }

    if (currentDay >= es.revealedDay) {
      es.active = false;
      var total = es.result.total || 0;
      var max = es.result.maximum || 0;
      Game.lifeDirector.addLog(state, '成绩公布(全部)', es.type+'总分 '+total+'/'+max + (total/max>=0.78?' 考得很好！':' 还有进步空间。'), total/max>=0.78?'good':'normal');
      state.stats.心情 = U.clamp(state.stats.心情 + 10, 0, 100);
      return es.result;
    }
    return null;
  }

  function duringExam(state) {
    return (ensure(state).active);
  }

  Game.examSystem = Object.freeze({ ensure, conductExam, checkReveal, duringExam });
}(window));
