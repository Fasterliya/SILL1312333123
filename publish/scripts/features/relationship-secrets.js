(function initRelationshipSecrets(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const playerId = 'player-profile';
  const kin = new Set(['父亲', '母亲', '祖父', '祖母', '哥哥', '姐姐', '弟弟', '妹妹', '儿子', '女儿', '秘密子女']);
  function ensure(state) {
    state.relationshipSecrets = state.relationshipSecrets && typeof state.relationshipSecrets === 'object'
      ? state.relationshipSecrets : {};
    const data = state.relationshipSecrets;
    data.records = Array.isArray(data.records) ? data.records.slice(-60) : [];
    data.pregnancies = Array.isArray(data.pregnancies) ? data.pregnancies.slice(-12) : [];
    data.lastNpcCheck = Number.isFinite(data.lastNpcCheck) ? data.lastNpcCheck : -12;
    return data;
  }
  const personAge = (state, person) => person === state.profile ? U.age(state) : U.personAge(state, person);

  function playerRelated(state, person) {
    if (!person || state.family.some((item) => item.id === person.id)) return true;
    if (kin.has(person.relation)) return true;
    return (person.parentIds || []).includes(playerId) || (person.childIds || []).includes(playerId);
  }

  function peopleRelated(left, right) {
    if (!left || !right || left.id === right.id) return true;
    if (left.spouseId === right.id || right.spouseId === left.id) return true;
    if ((left.parentIds || []).includes(right.id) || (right.parentIds || []).includes(left.id)) return true;
    if ((left.childIds || []).includes(right.id) || (right.childIds || []).includes(left.id)) return true;
    return (left.parentIds || []).some((id) => (right.parentIds || []).includes(id));
  }

  function available(state, person) {
    return Boolean(person && person.status === '健康'
      && U.age(state) >= 20 && personAge(state, person) >= 20
      && !playerRelated(state, person) && state.romance.partnerId !== person.id
      && person.affection >= 58);
  }

  function addRecord(state, input) {
    const data = ensure(state);
    const record = {
      id: `secret-${state.totalMonths}-${Math.random().toString(36).slice(2, 7)}`,
      kind: input.kind, participants: input.participants, startedAt: state.totalMonths,
      known: Boolean(input.known), exposed: false, note: input.note || '',
    };
    data.records.push(record);
    data.records = data.records.slice(-60);
    return record;
  }

  function schedulePregnancy(state, first, second, record) {
    if (first.gender === second.gender) return false;
    const woman = first.gender === '女' ? first : second;
    if (ensure(state).pregnancies.some((item) => item.motherId === woman.id)) return false;
    const fertility = woman.id === playerId
      ? Game.demography.fertility(state, state.profile)
      : Game.demography.fertility(state, woman);
    const chance = U.clamp(fertility / 260, 0.01, 0.12);
    if (Math.random() >= chance) return false;
    const man = woman === first ? second : first;
    ensure(state).pregnancies.push({
      due: state.totalMonths + 9, motherId: woman.id, fatherId: man.id, recordId: record.id,
    });
    record.note = '这段关系可能留下尚未公开的子女';
    return true;
  }

  function start(state, person) {
    if (!available(state, person)) return { ok: false, message: '只允许与无亲属关系的成年人发展隐秘关系' };
    const data = ensure(state);
    const existing = data.records.find((record) => (
      !record.exposed && record.participants.includes(playerId) && record.participants.includes(person.id)
    ));
    if (existing) return { ok: false, message: '你们已经维持着一段隐秘关系' };
    const chance = U.clamp(0.2 + (person.affection - 55) / 80 + (person.trust || 0) / 500, 0.2, 0.9);
    if (Math.random() >= chance) {
      person.affection = Math.max(0, person.affection - 5);
      person.conflict = U.clamp((person.conflict || 0) + 6, 0, 100);
      return { ok: false, message: `${person.name}拒绝了这次隐秘邀约` };
    }
    const kind = state.romance.married || person.npcMarried ? '婚外隐情' : '隐秘关系';
    const record = addRecord(state, {
      kind, participants: [playerId, person.id], known: true,
      note: `你与${person.name}保持着未公开的私人关系`,
    });
    person.affection = U.clamp(person.affection + 5, 0, 100);
    person.trust = U.clamp((person.trust || 0) + 7, 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + 6, 0, 100);
    const player = { ...state.profile, id: playerId, name: state.name, gender: state.gender };
    schedulePregnancy(state, player, person, record);
    state.romance.affairCount = Math.max(0, Number(state.romance.affairCount) || 0) + 1;
    Game.familyConflict?.addSuspicion(state, 8, `与${person.name}的亲密关系让配偶感到不安`);
    Game.lifeDirector.addLog(state, '未公开的关系', `你与${person.name}开始保持低调往来。`, 'normal');
    return { ok: true, message: `你与${person.name}建立了隐秘关系` };
  }

  function parentObject(state, id) {
    if (id === playerId) return {
      ...state.profile, id: playerId, name: state.name, surname: state.surname,
      gender: state.gender, culture: state.location.country,
    };
    return Game.people.find(state, id);
  }

  function deliver(state, pregnancy) {
    const mother = parentObject(state, pregnancy.motherId);
    const father = parentObject(state, pregnancy.fatherId);
    if (!mother || !father) return;
    const gender = U.random(['男', '女']);
    const hasPlayer = [pregnancy.motherId, pregnancy.fatherId].includes(playerId);
    const relation = hasPlayer ? (gender === '男' ? '儿子' : '女儿') : '角色子女';
    const identity = Game.familyNaming.forParents(state, father, mother);
    const child = U.person(relation, identity.surname, 0, gender, state.totalMonths);
    Game.familyNaming.assign(state, child, identity);
    Object.assign(child, {
      bornAt: state.totalMonths, birthMonth: state.totalMonths, affection: 68,
      currentCity: state.location.city, homeCity: state.location.city,
      parentIds: [pregnancy.motherId, pregnancy.fatherId], secretParentage: true,
      secretRecordId: pregnancy.recordId,
    });
    Game.genetics.inheritInto(child, gender, father, mother, `secret-child-${child.id}`);
    Game.systemsState.ensurePerson(state, child);
    if (hasPlayer) state.family.push(child);
    else state.worldPeople.push(child);
    [mother, father].forEach((parent) => {
      if (parent.id === playerId) return;
      parent.childrenCount = Math.max(0, Number(parent.childrenCount) || 0) + 1;
      parent.childIds = [...new Set([...(parent.childIds || []), child.id])].slice(0, 3);
    });
    const record = ensure(state).records.find((item) => item.id === pregnancy.recordId);
    if (record) record.note = `${child.name}是这段关系留下的秘密子女`;
    if (hasPlayer) Game.lifeDirector.addLog(state, '秘密子女出生',
      `${child.name}出生了，亲子关系暂未向其他人公开。`, 'milestone');
  }

  function npcAffair(state) {
    const data = ensure(state);
    if (state.totalMonths - data.lastNpcCheck < 12) return;
    data.lastNpcCheck = state.totalMonths;
    if (Math.random() > 0.1) return;
    const people = Game.people.all(state).filter((person) => (
      person.status === '健康' && !person.skinCaptured && U.personAge(state, person) >= 20
    ));
    const women = people.filter((person) => person.gender === '女' && U.personAge(state, person) <= 45);
    const men = people.filter((person) => person.gender === '男' && U.personAge(state, person) <= 60);
    const woman = U.random(women);
    const man = U.random(men.filter((person) => !peopleRelated(person, woman)));
    if (!woman || !man || (!woman.npcMarried && !man.npcMarried)) return;
    const record = addRecord(state, {
      kind: 'NPC婚外隐情', participants: [woman.id, man.id], known: false,
      note: `${woman.name}与${man.name}保持着未公开的关系`,
    });
    schedulePregnancy(state, woman, man, record);
  }

  function expose(state) {
    if (state.month !== 1) return;
    ensure(state).records.forEach((record) => {
      if (record.exposed || Math.random() >= 0.08) return;
      record.exposed = true;
      record.known = true;
      if (!record.participants.includes(playerId)) return;
      const partner = Game.people.find(state, state.romance.partnerId);
      if (partner) {
        partner.conflict = U.clamp((partner.conflict || 0) + 24, 0, 100);
        partner.trust = U.clamp((partner.trust || 0) - 18, 0, 100);
      }
      const home = Game.householdSystem.ensure(state);
      home.conflict = U.clamp(home.conflict + 18, 0, 100);
      home.cohesion = U.clamp(home.cohesion - 12, 0, 100);
      Game.lifeDirector.addLog(state, '秘密曝光', '一段未公开的关系被身边人发现，家庭信任受到冲击。', 'normal');
    });
  }

  function monthly(state) {
    const data = ensure(state);
    data.pregnancies.filter((item) => item.due <= state.totalMonths).forEach((item) => deliver(state, item));
    data.pregnancies = data.pregnancies.filter((item) => item.due > state.totalMonths);
    npcAffair(state);
    expose(state);
  }

  function brothelEncounter(state, player, woman) {
    const data = ensure(state);
    const record = {
      id: `brothel-${state.totalMonths}-${Math.random().toString(36).slice(2, 7)}`,
      kind: '青楼寻欢', participants: [player.id, woman.id], startedAt: state.totalMonths,
      known: false, exposed: false, note: `你在红灯区与${woman.name}有了一段露水情缘`,
    };
    data.records.push(record);
    data.records = data.records.slice(-60);
    schedulePregnancy(state, player, woman, record);
    return record;
  }

  function addHookRecord(state, sponsor, kind) {
    const data = ensure(state);
    const record = {
      id: `hookup-${state.totalMonths}-${Math.random().toString(36).slice(2, 7)}`,
      kind, participants: [playerId, sponsor.id], startedAt: state.totalMonths,
      known: true, exposed: false, note: `你与金主${sponsor.name}保持着未公开的关系`,
    };
    data.records.push(record);
    data.records = data.records.slice(-60);
    return record;
  }

  function addEncounterRecord(state, partner, mode, spermAmount) {
    const data = ensure(state);
    const kind = mode === 'brothel' ? '青楼寻欢' : (mode === 'hookup' ? '私密约会' : '奇遇交欢');
    const record = {
      id: `encounter-${state.totalMonths}-${Math.random().toString(36).slice(2, 7)}`,
      kind, participants: ['player-profile', partner.id], startedAt: state.totalMonths,
      known: mode === 'hookup', exposed: false,
      note: `一次${kind}留下了${spermAmount}%的精液量`,
    };
    data.records.push(record);
    data.records = data.records.slice(-60);
    return record;
  }

  function addPlayerSecret(state, kind, note) {
    return addRecord(state, { kind, participants: [playerId], known: true, note });
  }
  function archivePlayer(state, replacementId) {
    const data = ensure(state);
    data.records.forEach((record) => {
      record.participants = record.participants.map((id) => id === playerId ? replacementId : id);
    });
    data.pregnancies.forEach((item) => {
      if (item.motherId === playerId) item.motherId = replacementId;
      if (item.fatherId === playerId) item.fatherId = replacementId;
    });
  }

  Game.relationshipSecrets = Object.freeze(
    { ensure, available, start, monthly, addPlayerSecret, archivePlayer,
      brothelEncounter, addHookRecord, addEncounterRecord, schedulePregnancy },
  );
}(window));
