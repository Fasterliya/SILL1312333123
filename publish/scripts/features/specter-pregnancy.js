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
        person.name + '生下了一个孩子——当脐带被剪断的瞬间，护士们看到了婴儿睁开眼睛。那双眼没有人类的瞳孔反光。',
        'danger',
      );
      var child = Game.people.all(state).find(function (p) {
        return p && p.status === '健康' && !p.deceasedAt
          && (p.motherId === person.id || p.parentIds?.includes(person.id))
          && Math.abs(state.totalMonths - (p.birthMonth || p.bornAt || 0)) <= 1;
      });
      if (child && !child.specterPossessed) {
        child.specterPossessed = true;
        child.specterPossessedAtMonth = state.totalMonths;
        child.specterPossessedAtAge = 0;
        if (!child.psychology || typeof child.psychology !== 'object') child.psychology = {};
        child.psychology.sexAddiction = 0;
        child.psychology.corruption = Game.content.between(15, 30);
        Game.lifeDirector.addLog(state, '幽诡之子',
          child.name + '从出生起就被幽诡寄生。这张婴儿的脸偶尔会做出不属于婴儿的表情——那种表情像是在回忆什么。', 'danger');
      }
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
