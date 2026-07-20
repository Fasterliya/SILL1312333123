(function initLifeResumeSync(root) {
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

  function monthly(state) {
    if (!Game.lifeResume) return;
    Game.people.all(state).forEach((person) => {
      Game.lifeResume.backfillResume(state, person);
      const next = snapshot(person);
      const prev = person._resumeSnapshot;
      if (prev) {
        if (next.school && next.school !== prev.school) {
          Game.lifeResume.recordEvent(state, person, '入学', `进入${next.school}`);
        }
        if (next.job && next.job !== prev.job) {
          Game.lifeResume.recordEvent(state, person, '就业', `开始从事${next.job}`);
        }
        if (next.married && !prev.married) {
          Game.lifeResume.recordEvent(state, person, '结婚', `与${person.spouseName || '伴侣'}结婚`);
        }
        if (next.children > prev.children) {
          Game.lifeResume.recordEvent(state, person, '生育', `家庭新增${next.children - prev.children}名孩子`);
        }
        if (next.status === '已故' && prev.status !== '已故') {
          Game.lifeResume.recordEvent(state, person, '去世', person.deathCause || '安详离世');
        }
      }
      person._resumeSnapshot = next;
    });
  }

  Game.lifeResumeSync = Object.freeze({ monthly });
}(window));
