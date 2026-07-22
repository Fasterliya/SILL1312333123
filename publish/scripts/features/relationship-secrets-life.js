(function initRelationshipSecretsLife(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.relationshipSecretsCore;

  function deliver(state, pregnancy) {
    const mother = Core.parentObject(state, pregnancy.motherId);
    const father = Core.parentObject(state, pregnancy.fatherId);
    if (!mother || !father) return;
    const gender = U.random(['男', '女']);
    const hasPlayer = [pregnancy.motherId, pregnancy.fatherId].includes(Core.playerId);
    const relation = hasPlayer ? (gender === '男' ? '儿子' : '女儿') : '角色子女';
    const identity = Game.familyNaming.forParents(state, father, mother);
    const child = U.person(relation, identity.surname, 0, gender, state.totalMonths);
    Game.familyNaming.assign(state, child, identity);
    Object.assign(child, {
      bornAt: state.totalMonths,
      birthMonth: state.totalMonths,
      affection: 68,
      currentCity: state.location.city,
      homeCity: state.location.city,
      parentIds: [pregnancy.motherId, pregnancy.fatherId],
      secretParentage: true,
      secretRecordId: pregnancy.recordId,
    });
    Game.genetics.inheritInto(child, gender, father, mother, `secret-child-${child.id}`);
    Game.systemsState.ensurePerson(state, child);
    if (hasPlayer) state.family.push(child);
    else state.worldPeople.push(child);
    [mother, father].forEach((parent) => {
      if (parent.id === Core.playerId) return;
      parent.childrenCount = Math.max(0, Number(parent.childrenCount) || 0) + 1;
      parent.childIds = [...new Set([...(parent.childIds || []), child.id])].slice(0, 3);
    });
    const record = Core.ensure(state).records.find((item) => item.id === pregnancy.recordId);
    if (record) {
      record.note = `${child.name}是这段关系留下的秘密子女`;
      record.clues += 2;
    }
    if (!hasPlayer) return;
    Game.familyConflict?.recordEvidence(state, {
      sourceId: `${pregnancy.recordId}-birth`,
      kind: '秘密子女',
      detail: `${child.name}的出生让隐瞒亲子关系变得更加困难。`,
      weight: 16,
    });
    Game.lifeDirector.addLog(
      state,
      '秘密子女出生',
      `${child.name}出生了，亲子关系暂未向其他人公开。`,
      'milestone',
    );
  }

  function npcAffair(state) {
    const data = Core.ensure(state);
    if (state.totalMonths - data.lastNpcCheck < 12) return;
    data.lastNpcCheck = state.totalMonths;
    if (Math.random() > 0.1) return;
    const people = Game.people.all(state).filter((person) => (
      person.status === '健康'
      && !person.skinCaptured
      && U.personAge(state, person) >= 20
    ));
    const woman = U.random(people.filter((person) => (
      person.gender === '女' && U.personAge(state, person) <= 45
    )));
    const man = U.random(people.filter((person) => (
      person.gender === '男'
      && U.personAge(state, person) <= 60
      && !Core.peopleRelated(person, woman)
    )));
    if (!woman || !man || (!woman.npcMarried && !man.npcMarried)) return;
    const record = Core.addRecord(state, {
      kind: 'NPC婚外隐情',
      participants: [woman.id, man.id],
      known: false,
      note: `${woman.name}与${man.name}保持着未公开的关系`,
    });
    Core.schedulePregnancy(state, woman, man, record);
  }

  function exposeRecord(state, record) {
    record.exposed = true;
    record.known = true;
    if (!record.participants.includes(Core.playerId)) return;
    const ids = Core.partnerIds(state).filter((id) => !record.participants.includes(id));
    record.discoveredBy = [...new Set([...record.discoveredBy, ...ids])];
    ids.forEach((id) => {
      const person = Game.people.find(state, id);
      if (!person) return;
      person.conflict = U.clamp((person.conflict || 0) + 24, 0, 100);
      person.trust = U.clamp((person.trust || 0) - 18, 0, 100);
    });
    Game.familyConflict?.recordEvidence(state, {
      partnerIds: ids,
      sourceId: `${record.id}-exposed`,
      kind: '确凿证据',
      detail: `${record.kind}被公开，聊天记录与行踪成为无法回避的证据。`,
      weight: 22,
      confirmed: true,
      title: '秘密曝光',
    });
    const home = Game.householdSystem?.ensure(state);
    if (home) {
      home.conflict = U.clamp(home.conflict + 18, 0, 100);
      home.cohesion = U.clamp(home.cohesion - 12, 0, 100);
    }
    if (!ids.length) {
      Game.lifeDirector.addLog(
        state,
        '秘密曝光',
        '一段未公开的关系被身边人发现，社会关系受到冲击。',
        'normal',
      );
    }
  }

  function accumulateClues(state) {
    Core.ensure(state).records.forEach((record) => {
      if (record.exposed
          || !record.participants.includes(Core.playerId)
          || record.lastClueMonth === state.totalMonths) return;
      const age = Math.max(0, state.totalMonths - record.startedAt);
      const chance = U.clamp(0.04 + age * 0.006 + record.clues * 0.025, 0.04, 0.28);
      if (Math.random() >= chance) return;
      record.lastClueMonth = state.totalMonths;
      record.clues += 1;
      const otherId = record.participants.find((id) => id !== Core.playerId);
      const other = Game.people.find(state, otherId);
      Game.familyConflict?.recordEvidence(state, {
        sourceId: `${record.id}-clue-${record.clues}`,
        kind: '秘密线索',
        detail: `${other?.name || '某人'}相关的消费、消息或行踪引起了伴侣注意。`,
        weight: 4 + Math.min(4, record.clues),
        log: record.clues >= 2,
      });
      if (record.clues >= 3 || Math.random() < 0.12 + record.clues * 0.08) {
        exposeRecord(state, record);
      }
    });
  }

  function monthly(state) {
    const data = Core.ensure(state);
    if (data.lastMonthly === state.totalMonths) return;
    data.lastMonthly = state.totalMonths;
    data.pregnancies.filter((item) => item.due <= state.totalMonths)
      .forEach((item) => deliver(state, item));
    data.pregnancies = data.pregnancies.filter((item) => item.due > state.totalMonths);
    npcAffair(state);
    accumulateClues(state);
  }

  Game.relationshipSecretsLife = Object.freeze({
    deliver,
    exposeRecord,
    monthly,
  });
}(window));
