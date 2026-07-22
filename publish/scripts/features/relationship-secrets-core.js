(function initRelationshipSecretsCore(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const playerId = 'player-profile';
  const kin = new Set([
    '父亲', '母亲', '祖父', '祖母', '哥哥', '姐姐', '弟弟', '妹妹',
    '儿子', '女儿', '秘密子女',
  ]);

  function ensure(state) {
    const current = state.relationshipSecrets;
    const data = current && typeof current === 'object' ? current : {};
    state.relationshipSecrets = data;
    data.records = Array.isArray(data.records) ? data.records.slice(-60) : [];
    data.pregnancies = Array.isArray(data.pregnancies) ? data.pregnancies.slice(-12) : [];
    data.lastNpcCheck = Number.isFinite(data.lastNpcCheck) ? data.lastNpcCheck : -12;
    data.lastMonthly = Number.isFinite(data.lastMonthly) ? data.lastMonthly : -1;
    data.records.forEach((record) => {
      record.clues = Math.max(0, Number(record.clues) || 0);
      record.lastClueMonth = Number.isFinite(record.lastClueMonth) ? record.lastClueMonth : -1;
      record.discoveredBy = Array.isArray(record.discoveredBy) ? record.discoveredBy : [];
    });
    return data;
  }

  function personAge(state, person) {
    return person === state.profile ? U.age(state) : U.personAge(state, person);
  }

  function partnerIds(state) {
    const ids = (Array.isArray(state.romance?.partners) ? state.romance.partners : [])
      .map((item) => item?.id)
      .filter(Boolean);
    if (state.romance?.partnerId) ids.push(state.romance.partnerId);
    return [...new Set(ids)];
  }

  function playerRelated(state, person) {
    if (!person || state.family.some((item) => item.id === person.id)) return true;
    if (kin.has(person.relation)) return true;
    return (person.parentIds || []).includes(playerId)
      || (person.childIds || []).includes(playerId);
  }

  function peopleRelated(left, right) {
    if (!left || !right || left.id === right.id) return true;
    if (left.spouseId === right.id || right.spouseId === left.id) return true;
    if ((left.parentIds || []).includes(right.id) || (right.parentIds || []).includes(left.id)) {
      return true;
    }
    if ((left.childIds || []).includes(right.id) || (right.childIds || []).includes(left.id)) {
      return true;
    }
    return (left.parentIds || []).some((id) => (right.parentIds || []).includes(id));
  }

  function available(state, person) {
    return Boolean(
      person
      && person.status === '健康'
      && U.age(state) >= 20
      && personAge(state, person) >= 20
      && !playerRelated(state, person)
      && !partnerIds(state).includes(person.id)
      && person.affection >= 58
    );
  }

  function addRecord(state, input) {
    const data = ensure(state);
    const record = {
      id: `secret-${state.totalMonths}-${Math.random().toString(36).slice(2, 7)}`,
      kind: input.kind,
      participants: input.participants,
      startedAt: state.totalMonths,
      known: Boolean(input.known),
      exposed: false,
      clues: 0,
      lastClueMonth: -1,
      discoveredBy: [],
      note: input.note || '',
    };
    data.records.push(record);
    data.records = data.records.slice(-60);
    return record;
  }

  function fertility(state, person) {
    return person.id === playerId
      ? Game.demography.fertility(state, state.profile)
      : Game.demography.fertility(state, person);
  }

  function schedulePregnancy(state, first, second, record) {
    if (first.gender === second.gender) return false;
    const woman = first.gender === '女' ? first : second;
    if (ensure(state).pregnancies.some((item) => item.motherId === woman.id)) return false;
    if (Math.random() >= U.clamp(fertility(state, woman) / 260, 0.01, 0.12)) return false;
    const man = woman === first ? second : first;
    ensure(state).pregnancies.push({
      due: state.totalMonths + 9,
      motherId: woman.id,
      fatherId: man.id,
      recordId: record.id,
    });
    record.note = '这段关系可能留下尚未公开的子女';
    return true;
  }

  function start(state, person) {
    if (!available(state, person)) {
      return { ok: false, message: '只允许与无亲属关系的成年人发展隐秘关系' };
    }
    const existing = ensure(state).records.find((record) => (
      !record.exposed
      && record.participants.includes(playerId)
      && record.participants.includes(person.id)
    ));
    if (existing) return { ok: false, message: '你们已经维持着一段隐秘关系' };
    const chance = U.clamp(
      0.2 + (person.affection - 55) / 80 + (person.trust || 0) / 500,
      0.2,
      0.9,
    );
    if (Math.random() >= chance) {
      person.affection = Math.max(0, person.affection - 5);
      person.conflict = U.clamp((person.conflict || 0) + 6, 0, 100);
      return { ok: false, message: `${person.name}拒绝了这次隐秘邀约` };
    }
    const kind = state.romance.married || person.npcMarried ? '婚外隐情' : '隐秘关系';
    const record = addRecord(state, {
      kind,
      participants: [playerId, person.id],
      known: true,
      note: `你与${person.name}保持着未公开的私人关系`,
    });
    person.affection = U.clamp(person.affection + 5, 0, 100);
    person.trust = U.clamp((person.trust || 0) + 7, 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + 6, 0, 100);
    const player = { ...state.profile, id: playerId, name: state.name, gender: state.gender };
    schedulePregnancy(state, player, person, record);
    state.romance.affairCount = Math.max(0, Number(state.romance.affairCount) || 0) + 1;
    Game.familyConflict?.recordEvidence(state, {
      sourceId: `${record.id}-start`,
      kind: '行踪异常',
      detail: `与${person.name}的秘密往来留下了可疑痕迹。`,
      weight: 8,
    });
    Game.lifeDirector.addLog(state, '未公开的关系', `你与${person.name}开始保持低调往来。`, 'normal');
    return { ok: true, message: `你与${person.name}建立了隐秘关系` };
  }

  function parentObject(state, id) {
    if (id !== playerId) return Game.people.find(state, id);
    return {
      ...state.profile,
      id: playerId,
      name: state.name,
      surname: state.surname,
      gender: state.gender,
      culture: state.location.country,
    };
  }

  Game.relationshipSecretsCore = Object.freeze({
    playerId,
    ensure,
    partnerIds,
    peopleRelated,
    available,
    addRecord,
    schedulePregnancy,
    start,
    parentObject,
  });
}(window));
