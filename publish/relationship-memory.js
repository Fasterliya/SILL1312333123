(function initRelationshipMemory(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(100, value));

  function ensure(state, person) {
    return Game.systemsState.ensurePerson(state, person);
  }

  function record(state, person, kind, text, trustDelta, conflictDelta) {
    ensure(state, person);
    person.trust = clamp(person.trust + (trustDelta || 0));
    person.conflict = clamp(person.conflict + (conflictDelta || 0));
    person.lastInteractionMonth = state.totalMonths;
    person.memories.unshift({
      kind, text, month: state.totalMonths, generation: state.generation,
    });
    person.memories = person.memories.slice(0, 12);
  }

  function monthly(state) {
    [...state.family, ...state.contacts].forEach((person) => {
      ensure(state, person);
      if (person.status !== '健康') return;
      const quietMonths = state.totalMonths - person.lastInteractionMonth;
      if (quietMonths > 12 && state.totalMonths % 6 === 0) {
        person.affection = clamp(person.affection - (person.relation === '好友' ? 1 : 2));
      }
      if (person.conflict >= 60 && state.totalMonths % 4 === 0) {
        person.affection = clamp(person.affection - 2);
      } else if (person.trust >= 80 && quietMonths < 6 && state.totalMonths % 6 === 0) {
        person.affection = clamp(person.affection + 1);
      }
    });
  }

  function render(person) {
    const memories = Array.isArray(person.memories) ? person.memories : [];
    const rows = memories.length ? memories.slice(0, 6).map((memory) => (
      `<div class="memory-row"><span>第${memory.generation || 1}代 · ${memory.kind}</span><strong>${memory.text}</strong></div>`
    )).join('') : '<p class="empty-state">继续互动后，这里会记录共同经历。</p>';
    return `<details class="record-section"><summary><span>关系记忆</span>
      <small>信任 ${person.trust || 0} · 矛盾 ${person.conflict || 0}</small></summary>
      <div class="memory-list">${rows}</div></details>`;
  }

  Game.relationshipMemory = Object.freeze({ ensure, record, monthly, render });
}(window));
