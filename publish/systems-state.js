(function initSystemsState(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function ensurePerson(state, person) {
    const child = ['儿子', '女儿'].includes(person.relation);
    if (!Number.isFinite(person.birthMonth)) {
      person.birthMonth = child && Number.isFinite(person.bornAt)
        ? person.bornAt : -(Number(person.baseAge) || 0) * 12;
    }
    person.memories = Array.isArray(person.memories) ? person.memories.slice(0, 12) : [];
    person.trust = Number.isFinite(person.trust) ? person.trust : Math.round(person.affection || 50);
    person.conflict = Number.isFinite(person.conflict) ? person.conflict : 0;
    person.lastInteractionMonth = Number.isFinite(person.lastInteractionMonth)
      ? person.lastInteractionMonth : state.totalMonths;
    person.spouseId = typeof person.spouseId === 'string' ? person.spouseId : null;
    person.childIds = Array.isArray(person.childIds) ? [...new Set(person.childIds)].slice(0, 3) : [];
    person.parentIds = Array.isArray(person.parentIds) ? [...new Set(person.parentIds)].slice(0, 2) : [];
    person.birthName ||= person.name;
    const culture = person.nameCulture || person.culture || state.hometown?.country;
    person.name = Game.nameSystem.normalizeName(person.name, person.gender, culture);
    person.birthName = Game.nameSystem.normalizeName(person.birthName, person.gender, culture);
    if (person.spouseName) person.spouseName = Game.nameSystem.normalizeName(
      person.spouseName, person.gender === '男' ? '女' : '男', culture,
    );
    person.nameHistory = Array.isArray(person.nameHistory) ? person.nameHistory.slice(-8).map((item) => ({
      ...item,
      from: Game.nameSystem.normalizeName(item.from, person.gender, culture),
      to: Game.nameSystem.normalizeName(item.to, person.gender, culture),
    })) : [];
    person.aiChat = person.aiChat && typeof person.aiChat === 'object' ? person.aiChat : {};
    person.aiChat.messages = Array.isArray(person.aiChat.messages) ? person.aiChat.messages.slice(-10) : [];
    person.aiChat.lastAction ||= '';
    Game.npcFashion.ensurePerson(state, person);
    person.surname ||= Game.familyNaming.surnameOf(person, '', person.culture || state.hometown?.country);
    if (child) {
      person.upbringing ||= { care: 50, education: 20, independence: 20, health: 60 };
      ['care', 'education', 'independence', 'health'].forEach((key) => {
        person.upbringing[key] = Math.max(0, Math.min(100, Number(person.upbringing[key]) || 0));
      });
    }
    return person;
  }

  function ensure(state) {
    const sourceVersion = Number(state.version) || 1;
    state.matchmaking ||= { candidates: [] };
    state.matchmaking.candidates = Array.isArray(state.matchmaking.candidates) ? state.matchmaking.candidates : [];
    state.travel ||= { activeId: null };
    state.travel.encounters = Array.isArray(state.travel.encounters) ? state.travel.encounters : [];
    state.travel.history = Array.isArray(state.travel.history) ? state.travel.history.slice(-20) : [];
    state.travel.localHistory = Array.isArray(state.travel.localHistory) ? state.travel.localHistory.slice(-20) : [];
    state.travel.journey ||= null;
    state.worldPeople = Array.isArray(state.worldPeople) ? state.worldPeople : [];
    Game.hunterMode.ensure(state);
    if (sourceVersion < 11) {
      const candidates = state.contacts.filter((person) => (
        person.relation === '相亲对象' && person.id !== state.romance?.partnerId
      ));
      candidates.forEach((person) => { person.phoneUnlocked = false; });
      state.matchmaking.candidates.push(...candidates);
      state.contacts = state.contacts.filter((person) => !candidates.includes(person));
    }
    state.version = 23;
    state.settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    if (typeof state.settings.drawModel !== 'string'
      || !/^[A-Za-z0-9._:-]{1,64}$/.test(state.settings.drawModel)) {
      state.settings.drawModel = 'anime';
    }
    state.playerBornAt = Number.isFinite(state.playerBornAt) ? state.playerBornAt : 0;
    state.generation = Math.max(1, Math.floor(Number(state.generation) || 1));
    state.profile.birthMonth = state.playerBornAt;
    state.legacy ||= { ancestors: [], inheritedMoney: 0 };
    state.legacy.ancestors = Array.isArray(state.legacy.ancestors) ? state.legacy.ancestors.slice(-12) : [];
    state.eventState ||= { seen: {}, lastMonth: -12, history: [] };
    state.eventState.seen ||= {};
    state.eventState.history = Array.isArray(state.eventState.history) ? state.eventState.history.slice(-30) : [];
    state.parenting ||= { style: '均衡陪伴', educationFund: 0 };
    state.health ||= {
      diet: '均衡饮食', sleep: 7, conditions: [], insurance: '基础医保',
      retirementFund: 0, pension: 0, retired: false, careLevel: 0,
    };
    state.health.conditions = Array.isArray(state.health.conditions) ? state.health.conditions : [];
    state.health.diet ||= '均衡饮食';
    state.health.sleep = Math.max(4, Math.min(10, Number(state.health.sleep) || 7));
    if (!['基础医保', '补充医疗', '高端医疗'].includes(state.health.insurance)) state.health.insurance = '基础医保';
    state.health.retirementFund = Math.max(0, Number(state.health.retirementFund) || 0);
    state.health.pension = Math.max(0, Number(state.health.pension) || 0);
    state.health.retired = Boolean(state.health.retired);
    state.health.careLevel = Math.max(0, Math.min(100, Number(state.health.careLevel) || 0));
    state.cityLife ||= { familiarity: {}, reputation: 0, residenceMonths: 0, lastCity: state.location.city };
    state.cityLife.familiarity ||= {};
    state.cityLife.reputation = Math.max(0, Math.min(100, Number(state.cityLife.reputation) || 0));
    state.cityLife.residenceMonths = Math.max(0, Number(state.cityLife.residenceMonths) || 0);
    state.career.specialty ||= '';
    state.career.skillPoints = Math.max(0, Number(state.career.skillPoints) || 0);
    state.career.skills ||= {};
    state.career.projects = Array.isArray(state.career.projects) ? state.career.projects.slice(-12) : [];
    state.career.burnout = Math.max(0, Math.min(100, Number(state.career.burnout) || 0));
    state.career.management = Boolean(state.career.management);
    state.career.titleTrack ||= state.career.management ? 'management' : 'staff';
    state.career.titleRank = Math.max(0, Number(state.career.titleRank) || 0);
    state.career.lastTitleMonth = Number(state.career.lastTitleMonth) || -12;
    state.career.lastRaiseMonth = Number(state.career.lastRaiseMonth) || -6;
    state.career.lastAutoRaiseMonth = Number(state.career.lastAutoRaiseMonth) || -12;
    state.workplace = state.workplace && typeof state.workplace === 'object' ? state.workplace
      : { companyId: null, departmentId: null, leaderId: null, rosterIds: [], reportIds: [] };
    state.workplace.rosterIds = Array.isArray(state.workplace.rosterIds) ? state.workplace.rosterIds : [];
    state.workplace.reportIds = Array.isArray(state.workplace.reportIds) ? state.workplace.reportIds : [];
    Game.companyMarket.ensure(state);
    Game.educationSystem.ensure(state);
    const university = Game.config.universities.find((item) => (
      item.id === state.education.universityId || item.name === state.education.university
    ));
    state.education.universityId ||= university?.id || null;
    state.education.durationMonths = Math.max(0, Number(state.education.durationMonths)
      || university?.durationMonths || (state.education.university ? 48 : 0));
    if (state.education.university && !Number.isFinite(state.education.enrolledAt)) {
      const studied = Math.min(state.education.durationMonths, Math.max(0, (Game.content.age(state) - 18) * 12));
      state.education.enrolledAt = state.totalMonths - studied;
    }
    if (!state.education.university) {
      state.education.universityId = null;
      state.education.enrolledAt = null;
      state.education.durationMonths = 0;
    }
    Game.timeSystem.syncCalendar(state);
    Game.people.all(state).forEach((person) => {
      ensurePerson(state, person);
      Game.educationSystem.ensurePerson(person);
    });
    if (sourceVersion < 22) Game.cityLife?.syncDependents(state);
    Game.demography.ensureState(state);
    Game.civicSystem.ensure(state);
    return state;
  }

  Game.systemsState = Object.freeze({ ensure, ensurePerson });
}(window));
