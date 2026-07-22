(function initSpecterPregnancy(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var GESTATION_MONTHS = 9;
  var BIRTH_COOLDOWN = 6;

  function eligible(state, host) {
    return Boolean(
      host
      && host.specterPossessed
      && host.gender === '女'
      && host.status === '健康'
      && Number(host.specterPossessedAtAge) >= 18
      && state.totalMonths >= Number(host.specterBirthCooldownUntil || 0)
    );
  }

  function activePregnancy(state, host) {
    return Game.relationshipSecretsCore.ensure(state).pregnancies.find(function (item) {
      return item.motherId === host.id;
    }) || null;
  }

  function fatherCandidates(state, host) {
    var city = host.currentCity || state.location.city;
    return Game.people.all(state).filter(function (person) {
      return person && person.id !== host.id
        && person.gender === '男'
        && person.status === '健康'
        && !person.deceasedAt
        && !person.specterPossessed
        && !person.skinCaptured
        && (person.currentCity || state.location.city) === city
        && Game.content.personAge(state, person) >= 18
        && !Game.relationshipSecretsCore.peopleRelated(host, person);
    });
  }

  function schedule(state, host) {
    if (!eligible(state, host) || activePregnancy(state, host)) return false;
    var fertility = Game.demography.fertility(state, host);
    var chance = U.clamp(fertility / 260, 0.01, 0.12);
    if (Math.random() >= chance) return false;
    var candidates = fatherCandidates(state, host);
    if (!candidates.length) return false;
    var father = candidates[Math.floor(Math.random() * candidates.length)];
    var core = Game.relationshipSecretsCore;
    var record = core.addRecord(state, {
      kind: '幽诡宿主怀孕',
      participants: [host.id, father.id],
      known: false,
      note: host.name + '在寄生期间怀上了普通孩子',
    });
    var due = state.totalMonths + GESTATION_MONTHS;
    core.ensure(state).pregnancies.push({
      due: due,
      motherId: host.id,
      fatherId: father.id,
      recordId: record.id,
    });
    host.specterPregnantDue = due;
    Game.lifeDirector.addLog(
      state,
      '幽诡宿主怀孕',
      host.name + '在女性化后怀孕了，孩子仍是普通人类。',
      'warning',
    );
    return true;
  }

  function finishBirths(state) {
    Game.people.all(state).forEach(function (person) {
      if (!Number.isFinite(person.specterPregnantDue)
        || person.specterPregnantDue > state.totalMonths) return;
      person.specterPregnantDue = null;
      person.specterBirthCooldownUntil = state.totalMonths + BIRTH_COOLDOWN;
      Game.lifeDirector.addLog(
        state,
        '宿主子女出生',
        person.name + '生下了一个普通孩子，孩子没有幽诡寄生迹象。',
        'milestone',
      );
    });
  }

  function monthly(state) {
    finishBirths(state);
    (state.supernatural?.specters || []).forEach(function (specter) {
      schedule(state, Game.people.find(state, specter.hostId));
    });
  }

  Game.specterPregnancy = Object.freeze({
    eligible: eligible,
    schedule: schedule,
    monthly: monthly,
  });
}(window));
