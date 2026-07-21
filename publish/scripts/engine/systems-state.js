(function initSystemsState(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  function ensureStats(person) {
    const sourceId = String(person.id || person.name || 'person');
    if (!person.stats || typeof person.stats !== 'object' || person.statSourceId !== sourceId) {
      let seed = 17;
      for (const char of sourceId) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
      person.stats = {
        健康: 58 + seed % 38,
        智力: 40 + (seed * 7) % 51,
        魅力: 35 + (seed * 11) % 56,
      };
      person.statSourceId = sourceId;
    }
    ['健康', '智力', '魅力'].forEach((key) => { person.stats[key] = clamp(person.stats[key]); });
  }

  function ensurePerson(state, person) {
    const child = ['儿子', '女儿'].includes(person.relation);
    if (!Number.isFinite(person.birthMonth)) {
      person.birthMonth = child && Number.isFinite(person.bornAt)
        ? person.bornAt : -(Number(person.baseAge) || 0) * 12;
    }
    ensureStats(person);
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
    person.sexWork = person.sexWork && typeof person.sexWork === 'object' ? person.sexWork : {};
    if (person.gender === '女') {
      person.prostitute = person.prostitute && typeof person.prostitute === 'object' ? person.prostitute : {};
      person.hookupHistory = Array.isArray(person.hookupHistory) ? person.hookupHistory.slice(-12) : [];
      person.hymenIntact = person.hymenIntact !== undefined ? person.hymenIntact : true;
      person.trauma = Number.isFinite(person.trauma) ? person.trauma : 0;
      person.victimCorruption = Number.isFinite(person.victimCorruption) ? person.victimCorruption : 0;
      person.lifeResume = Array.isArray(person.lifeResume) ? person.lifeResume.slice(-30) : [];
      person.cosmeticProcedures = Array.isArray(person.cosmeticProcedures) ? person.cosmeticProcedures.slice(-8) : [];
    }
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
    state.version = 27; state.day = Math.max(1, Math.min(30, Number(state.day) || 1)); state.timeSpeed = [0, 1, 5, 10].includes(state.timeSpeed) ? state.timeSpeed : 0; state.stamina = state.stamina && typeof state.stamina === 'object' ? state.stamina : { current: 100, max: 100 };
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
    state.health.diseases = Array.isArray(state.health.diseases) ? state.health.diseases : [];
    state.health.stdHistory = Array.isArray(state.health.stdHistory) ? state.health.stdHistory : [];
    state.health.lastCheckupMonth = Number.isFinite(state.health.lastCheckupMonth) ? state.health.lastCheckupMonth : -12;
    state.health.cosmeticProcedures = Array.isArray(state.health.cosmeticProcedures) ? state.health.cosmeticProcedures.slice(-8) : [];
    state.romance.suspicion = Number.isFinite(state.romance.suspicion) ? state.romance.suspicion : 0;
    state.romance.affairCount = Math.max(0, Number(state.romance.affairCount) || 0);
    state.idol = state.idol && typeof state.idol === 'object' ? state.idol : {
      active: false, stage: 'trainee', fans: 0, trainingMonths: 0,
      skills: { dance: 0, vocal: 0, expression: 0 },
      lastEvaluationMonth: -6, lastHandshakeMonth: -3, scandals: [],
      agencyName: '', producerTrust: 50, producerAbuse: 0, careerExtended: false,
    };
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
    Game.propertySystem.ensure(state);
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
    Game.householdSystem.ensure(state);
    Game.relationshipSecrets.ensure(state);
    Game.creatorCareer.ensure(state);
    state.encounter = state.encounter && typeof state.encounter === 'object' ? state.encounter : {
      active: false, mode: '', partnerId: null, playerRole: 'client',
      femaleStamina: 100, femaleStaminaMax: 100, arousal: 0, orgasmCount: 0,
      climaxThreshold: 75, semenGauge: 0, maxSemen: 100,
      position: '正常位', positionsTried: [], actionLog: [],
    };
    state.brothelStage = state.brothelStage && typeof state.brothelStage === 'object' ? state.brothelStage : {
      active: false, placeId: null, stage: 0, partnerId: null, score: 0,
    };
    state.hookupStage = state.hookupStage && typeof state.hookupStage === 'object' ? state.hookupStage : {
      active: false, stage: 0, sponsorId: null, style: '', score: 0,
    };
    /* Criminal system */
    state.criminal = state.criminal && typeof state.criminal === 'object' ? state.criminal : {
      record: 0, arrests: 0, jailMonths: 0, lastRaidMonth: -24,
      hideoutQuality: 0, evasionSkill: 0,
    };

    /* Psychology system */
    state.psychology = state.psychology && typeof state.psychology === 'object' ? state.psychology : {
      sexAddiction: 0, lastSexMonth: -1, withdrawalMonths: 0,
      guilt: 0, corruption: 0,
    };

    /* NPC events */
    state.npcEvents = state.npcEvents && typeof state.npcEvents === 'object' ? state.npcEvents : {
      queue: [], active: true, frequency: 'high',
    };

    /* Finance */
    state.finance = state.finance && typeof state.finance === 'object' ? state.finance : {
      creditScore: 50, loans: [],
    };

    /* Tax */
    state.tax = state.tax && typeof state.tax === 'object' ? state.tax : {
      lastFilingYear: -1, declaredIncome: 0, backTaxes: 0, charityDonations: 0,
    };

    /* Companies */
    state.companies = Array.isArray(state.companies) ? state.companies : [];

    /* Underground idol */
    state.undergroundIdol = state.undergroundIdol && typeof state.undergroundIdol === 'object' ? state.undergroundIdol : {
      active: false, stage: 'trainee', fans: 0, trainingMonths: 0,
      skills: {dance:0, vocal:0, expression:0},
      lastShowMonth: -1, lastSpecialShowMonth: -3, lastProducerMonth: -3,
      producerAbuse: 0, corruptionFromForced: 0,
      fallBufferMonths: 0, fellTo: '', careerExtended: false,
    };
    state.education.subjects = state.education.subjects && typeof state.education.subjects === 'object' ? state.education.subjects : {};
    state.education.burnout = Number.isFinite(state.education.burnout) ? state.education.burnout : 0;
    state.education.studyPlan = ['balanced', 'weakness', 'strength'].includes(state.education.studyPlan) ? state.education.studyPlan : 'balanced';
    return state;
  }

  Game.systemsState = Object.freeze({ ensure, ensurePerson });
}(window));
