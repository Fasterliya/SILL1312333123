(function initSpecterHostRecovery(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var TARGET_AGE = 16;

  function begin(state, person, specter) {
    if (!person || !specter) return;
    if (!Number.isFinite(person.specterPhysicalAge)) {
      person.specterPhysicalAge = Math.max(
        TARGET_AGE,
        Game.content.personAge(state, person),
      );
    }
    person.specterAgeRegressionStartedMonth = Number.isFinite(
      person.specterAgeRegressionStartedMonth,
    ) ? person.specterAgeRegressionStartedMonth : state.totalMonths;
    specter.lastAgeShiftMonth = Number.isFinite(specter.lastAgeShiftMonth)
      ? specter.lastAgeShiftMonth : state.totalMonths;
  }

  function advance(state, person, specter) {
    begin(state, person, specter);
    if (specter.lastAgeShiftMonth === state.totalMonths) return false;
    var elapsed = Math.max(1, state.totalMonths - specter.lastAgeShiftMonth);
    var previous = person.specterPhysicalAge;
    person.specterPhysicalAge = Math.max(TARGET_AGE, previous - elapsed);
    specter.lastAgeShiftMonth = state.totalMonths;
    if (previous > TARGET_AGE && person.specterPhysicalAge === TARGET_AGE
      && !person.specterAgeLockedAtMonth) {
      person.specterAgeLockedAtMonth = state.totalMonths;
      Game.lifeDirector.addLog(
        state,
        '宿主年龄固化',
        person.name + '的生理年龄已经倒退至16岁，并停止继续变化。',
        'warning',
      );
    }
    return previous !== person.specterPhysicalAge;
  }

  function clearWorkLinks(state, person) {
    if (state.workplace) {
      state.workplace.rosterIds = (state.workplace.rosterIds || [])
        .filter(function (id) { return id !== person.id; });
      state.workplace.reportIds = (state.workplace.reportIds || [])
        .filter(function (id) { return id !== person.id; });
      if (state.workplace.leaderId === person.id) state.workplace.leaderId = null;
    }
    Game.people.all(state).forEach(function (other) {
      if (other.id === person.id) return;
      other.reportIds = (other.reportIds || [])
        .filter(function (id) { return id !== person.id; });
      if (other.managerId === person.id) other.managerId = null;
    });
    person.managerId = null;
    person.reportIds = [];
  }

  function clearCareer(person) {
    [
      'job', 'jobId', 'company', 'companyId', 'departmentId',
      'departmentName', 'careerCity',
    ].forEach(function (key) { person[key] = ''; });
    person.careerRank = 0;
    person.monthlyIncome = 0;
    person.npcCreator = null;
    person.npcIdol = null;
  }

  function clearMemory(state, person, school) {
    person.memories = [];
    person.interactions = 0;
    person.phoneUnlocked = false;
    person.lastInteractionMonth = state.totalMonths;
    person.affection = 50;
    person.trust = 0;
    person.conflict = 0;
    person.schoolHistory = [];
    var oldResume = Array.isArray(person.lifeResume) ? person.lifeResume.slice(-60) : [];
    oldResume.push({
      age: TARGET_AGE,
      event: '净化重生',
      detail: '被魔法少女净化后失去全部记忆，以16岁身份进入' + school + '重新生活。过去的人生经历虽已遗忘，但这份档案记录着她曾经存在过的痕迹。',
      month: state.totalMonths,
    });
    person.lifeResume = oldResume;
    person._resumeSnapshot = null;
    person.hookupHistory = [];
    person.cosmeticProcedures = [];
  }

  function resetSchool(state, person) {
    var city = person.currentCity || state.location.city;
    var school = city + '新区高级中学';
    person.currentCity = city;
    person.homeCity = person.homeCity || city;
    person.school = school;
    person.educationName = school;
    person.educationStage = 'high';
    person.educationLevel = 1;
    person.educationTrack = 'academic';
    person.educationBalanceVersion = 3;
    person.educationProgress = ['儿子', '女儿'].includes(person.relation)
      ? { focus: '学识', points: 0, years: 0 } : 120;
    person.academicScore = 30;
    person.droppedOut = false;
    person.dropoutAge = null;
    person.dropoutSchool = '';
    person.lastDropoutCheckAge = null;
    person.lastLifeUpdateAge = TARGET_AGE;
    person._lastEducationYear = state.year;
    person.clothing = {
      top: '简洁校服',
      socks: '白色中筒袜',
      shoes: '白色运动鞋',
    };
    return school;
  }

  function syncResidentRecord(state, person) {
    if (!person.populationResident) return;
    var records = state.socialWorld?.cityArchives?.[person.homeCity] || [];
    var record = records.find(function (item) {
      return item.i === (person.residentKey || person.id);
    });
    if (!record) return;
    record.b = person.birthMonth;
    record.g = '女';
    record.j = '';
  }

  function recover(state, person, specter) {
    clearWorkLinks(state, person);
    clearCareer(person);
    person.gender = '女';
    person.birthMonth = state.totalMonths - TARGET_AGE * 12;
    person.bornAt = person.birthMonth;
    person.baseAge = TARGET_AGE;
    person.specterPhysicalAge = TARGET_AGE;
    person.specterPossessed = false;
    person.specterPurifiedAtMonth = state.totalMonths;
    person.specterPurifiedType = specter?.type || '';
    person.specterAmnesia = true;
    person.status = '健康';
    person.deceasedAt = null;
    person.specterPrey = null;
    person.bodyType = '娇小纤细';
    person.hairstyle = '清爽中长发';
    person.cosplay = '无';
    person.portraitAgeStage = null;
    person.psychology = { sexAddiction: 0, corruption: 0, trauma: 0 };
    person.sexWork = { isProstitute: true, brothelVisits: 0, lastBrothelMonth: state.totalMonths };
    person.job = '妓女';
    person.jobId = 'prostitute';
    person.prostitute = {};
    person.trauma = 0;
    person.victimCorruption = 0;
    var school = resetSchool(state, person);
    clearMemory(state, person, school);
    syncResidentRecord(state, person);
    return person;
  }

  function monthly(state) {
    Game.people.all(state).forEach(function (person) {
      if (!Number.isFinite(person.specterPurifiedAtMonth)
        || person.specterPossessed || person.status !== '健康') return;
      var age = Game.content.personAge(state, person);
      if (person.lastLifeUpdateAge === age) return;
      Game.npcLife?.updatePerson(state, person);
    });
  }

  Game.specterHostRecovery = Object.freeze({
    begin: begin,
    advance: advance,
    recover: recover,
    monthly: monthly,
  });
}(window));
