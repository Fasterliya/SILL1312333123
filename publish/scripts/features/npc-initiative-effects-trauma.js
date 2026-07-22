(function initNpcInitiativeTraumaEffects(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.npcInitiativeCore;

  function therapy(state, person) {
    const cost = 1200;
    Game.economy.spend(state, cost);
    person.trauma = Core.clamp(person.trauma - 18);
    person.victimCorruption = Core.clamp(person.victimCorruption - 10);
    person.traumaDependency = Core.clamp(person.traumaDependency - 16);
    person.trust = Core.clamp((person.trust || 30) + 8);
    person.lastDependencyEventMonth = state.totalMonths;
    Game.lifeDirector.addLog(
      state,
      '创伤治疗',
      `你陪同${person.name}接受专业帮助，创伤依赖开始缓解。`,
      'good',
    );
    return {
      ok: true,
      message: `已花费${Game.view.money(cost)}陪同治疗，依赖与创伤下降`,
    };
  }

  function boundary(state, person) {
    person.trauma = Core.clamp(person.trauma - 6);
    person.traumaDependency = Core.clamp(person.traumaDependency - 12);
    person.affection = Core.clamp((person.affection || 50) - 5);
    person.trust = Core.clamp((person.trust || 30) + 3);
    person.lastDependencyEventMonth = state.totalMonths;
    Game.lifeDirector.addLog(
      state,
      '建立安全边界',
      `你与${person.name}停止模糊关系，并建议对方联系可信赖的支持者。`,
      'normal',
    );
    return { ok: true, message: '已建立安全边界，创伤依赖逐步下降' };
  }

  function exploit(state, person) {
    person.trauma = Core.clamp(person.trauma + 12);
    person.victimCorruption = Core.clamp(person.victimCorruption + 8);
    person.traumaDependency = Core.clamp(person.traumaDependency + 18);
    person.affection = Core.clamp((person.affection || 50) + 8);
    person.trust = Core.clamp((person.trust || 30) - 12);
    person.conflict = Core.clamp((person.conflict || 0) + 10);
    person.lastDependencyEventMonth = state.totalMonths;
    Game.psychology?.addGuilt(state, 12);
    Game.criminalSystem?.addRecord(state, 4);
    Game.lifeDirector.addLog(
      state,
      '利用创伤依赖',
      `你利用了${person.name}的心理依赖，短期控制增强，但创伤和法律风险上升。`,
      'warning',
    );
    return {
      ok: true,
      message: '依赖短期加深，但创伤、冲突、罪恶感与法律风险均上升',
    };
  }

  function resolve(state, event, action) {
    if (event.type !== 'trauma_dependency') return null;
    const person = Core.findPerson(state, event.data.personId);
    if (!person) return { ok: false, message: '该人物已经无法联系' };
    if (action === 'therapy') return therapy(state, person);
    if (action === 'boundary') return boundary(state, person);
    if (action === 'exploit') return exploit(state, person);
    return { ok: false, message: '选择已经失效' };
  }

  Game.npcInitiativeTraumaEffects = Object.freeze({ resolve });
}(window));
