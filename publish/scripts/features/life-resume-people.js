(function initLifeResumePeople(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function snapshot(person) {
    return {
      school: person.educationName || '',
      job: person.job || '',
      married: Boolean(person.npcMarried),
      children: Array.isArray(person.childIds) ? person.childIds.length : 0,
      status: person.status || '健康',
    };
  }

  function sync(state, person) {
    Game.lifeResume.backfillResume(state, person);
    const next = snapshot(person);
    const previous = person._resumeSnapshot;
    if (previous) {
      if (next.school && next.school !== previous.school) {
        Game.lifeResume.recordEvent(state, person, '入学', `进入${next.school}`);
      }
      if (next.job !== previous.job) {
        const detail = next.job
          ? `从${previous.job || '无业'}转为${next.job}`
          : `结束${previous.job || '原有'}工作`;
        Game.lifeResume.recordEvent(state, person, '职业变换', detail);
      }
      if (next.married && !previous.married) {
        Game.lifeResume.recordEvent(state, person, '结婚', `与${person.spouseName || '伴侣'}结婚`);
      }
      if (!next.married && previous.married) {
        Game.lifeResume.recordEvent(state, person, '离婚', '婚姻关系结束');
      }
      if (next.children > previous.children) {
        Game.lifeResume.recordEvent(
          state,
          person,
          '生育',
          `家庭新增${next.children - previous.children}名孩子`,
        );
      }
      if (next.status === '已故' && previous.status !== '已故') {
        Game.lifeResume.recordEvent(state, person, '去世', person.deathCause || '安详离世');
      }
    }
    person._resumeSnapshot = next;
  }

  function monthly(state) {
    Game.people.all(state).forEach((person) => sync(state, person));
  }

  Game.lifeResumePeople = Object.freeze({ monthly, sync });
}(window));
