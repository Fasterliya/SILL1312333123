(function initContent(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const random = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const makeName = (surname, gender, culture) => Game.nameSystem.makeName(surname, gender, culture);
  const setUniqueName = (state, person, culture) => Game.nameSystem.setUnique(state, person, culture);

  function clothing(top) {
    return { top: top || '品质日常', socks: '短棉袜', shoes: '白色运动鞋' };
  }

  function person(relation, surname, age, gender, anchorMonth) {
    const resolvedGender = gender || random(['男', '女']);
    const bodyTypes = resolvedGender === '女'
      ? (age < 7 ? ['幼小'] : ['小胸', '丰满', '匀称', '娇小纤细'])
      : (age < 7 ? ['幼小'] : ['清瘦', '匀称', '健壮']);
    const created = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: makeName(surname, resolvedGender),
      relation,
      gender: resolvedGender,
      baseAge: age,
      bornAt: 0,
      birthMonth: (Number(anchorMonth) || 0) - age * 12,
      growthSeed: between(-4, 4),
      height: 0,
      weight: 0,
      affection: between(48, 78),
      personality: random(C.personalities),
      trait: random(C.traits),
      hairColor: random(C.appearance.hairColor.slice(0, 4)),
      temperament: random(C.appearance.temperament.slice(4)),
      bodyType: random(bodyTypes),
      hairstyle: random(C.appearance.hairstyle.slice(2, 9)),
      cosplay: '无',
      clothing: clothing(random(C.appearance.top.slice(3, 10))),
      portraitUrl: null,
      portraitTaskId: null,
      portraitGallery: [],
      customPrompt: '',
      metCity: '', currentCity: '', homeCity: '',
      interactions: 0,
      phoneUnlocked: false,
      school: '', schoolHistory: [],
      educationName: '',
      educationStage: 'home',
      job: ['父亲', '母亲'].includes(relation) ? random(C.parentJobs) : '',
      company: '', companyId: '', departmentId: '', departmentName: '',
      careerCity: '', careerRank: 0, managerId: null, reportIds: [],
      npcMarried: false,
      npcMarriedAtAge: null,
      spouseName: '', spouseId: null,
      childrenCount: 0, childIds: [], parentIds: [],
      lastLifeUpdateAge: null,
      status: '健康',
    };
    Game.genetics.founder(created, resolvedGender, `${created.id}-${created.name}`, false);
    return created;
  }

  function log(title, text, tone, month) {
    return {
      id: `e-${month}-${Math.random().toString(36).slice(2, 6)}`,
      title, text, tone: tone || 'normal', month,
    };
  }

  function profile(gender, father, mother) {
    const created = {
      id: 'player-profile',
      height: 50,
      weight: 3.4,
      growthSeed: between(-4, 4),
      hairColor: '黑色',
      temperament: random(C.appearance.temperament),
      bodyType: '匀称',
      hairstyle: '胎毛短发',
      cosplay: '无',
      clothing: { top: '婴儿连体衣', socks: '婴儿袜', shoes: '婴儿软底鞋' },
      personality: random(C.personalities),
      trait: random(C.traits),
      styleStage: -1,
      portraitUrl: null,
      portraitTaskId: null,
      portraitGallery: [],
      customPrompt: '',
    };
    if (father && mother) Game.genetics.inheritInto(created, gender, father, mother, 'player-founder');
    else Game.genetics.founder(created, gender, 'player-founder', false);
    return created;
  }

  function stockState() {
    return {};
  }

  function createState() {
    const surname = random(Game.nameSystem.surnames());
    const location = random(C.locations);
    const gender = random(['男', '女']);
    const father = person('父亲', surname, between(25, 38), '男');
    const mother = person('母亲', random(Game.nameSystem.surnames()), between(23, 36), '女');
    father.npcMarried = true;
    father.spouseName = mother.name;
    mother.npcMarried = true;
    mother.spouseName = father.name;
    const family = [father, mother];
    if (Math.random() < 0.28) {
      const relation = random(['哥哥', '姐姐']);
      const sibling = person(relation, surname, between(2, 8), relation === '哥哥' ? '男' : '女');
      sibling.temperament = '童真';
      sibling.bodyType = '幼小';
      sibling.hairstyle = '儿童短发';
      sibling.clothing = { top: '彩色童装', socks: '短棉袜', shoes: '魔术贴童鞋' };
      Game.genetics.inheritInto(sibling, sibling.gender, father, mother, `sibling-${sibling.id}`);
      family.push(sibling);
    }
    father.childrenCount = family.filter((item) => ['哥哥', '姐姐', '弟弟', '妹妹'].includes(item.relation)).length + 1;
    mother.childrenCount = father.childrenCount;
    return {
      version: 17,
      updatedAt: new Date().toISOString(),
      name: makeName(surname, gender),
      surname,
      gender,
      location: { province: location[0], city: location[1], country: '华夏' },
      hometown: { province: location[0], city: location[1], country: '华夏' },
      year: C.startYear,
      month: C.startMonth,
      totalMonths: 0,
      profile: profile(gender, father, mother),
      stats: { 健康: between(72, 94), 心情: between(68, 90), 智力: between(46, 66), 魅力: between(42, 68) },
      money: between(300, 1800),
      familyWealth: between(90000, 850000),
      family,
      contacts: [],
      worldPeople: [],
      socialWorld: { cityPools: {}, cityArchives: {}, activeCity: '', version: 2 },
      education: {
        study: 0, track: null, electives: [], school: '家中', schoolStage: 'home',
        highSchoolType: null, vocationalMajor: null, path: '基础教育',
        university: null, universityType: null, major: null, graduated: false, exams: [],
        universityId: null, enrolledAt: null, durationMonths: 0,
        preparation: 0, discipline: 48, examTechnique: 20, pressure: 0,
        focus: '均衡基础', lastStudyMonth: -1, aptitudes: {},
      },
      career: {
        job: null, jobId: null, company: null, salary: 0, level: 0, exp: 0,
        performance: 0, lastPromotionMonth: -12, applications: [], management: false,
        titleTrack: 'staff', titleRank: 0, lastTitleMonth: -12, lastRaiseMonth: -6, lastAutoRaiseMonth: -12,
      },
      workplace: { companyId: null, departmentId: null, leaderId: null, rosterIds: [], reportIds: [] },
      romance: { partnerId: null, married: false, pendingBirth: 0 },
      assets: { house: null, mortgage: 0, stocks: stockState(), dividends: 0, businesses: [], vehicles: [] },
      matchmaking: { candidates: [] },
      travel: { activeId: null, activeIds: [], encounters: [], journey: null, history: [] },
      settings: { drawModel: 'anime' },
      routine: { actionMonth: 0, fatigue: 0, actions: { study: 0, sport: 0, social: 0, rest: 0 } },
      pendingDecision: null,
      gameOver: false,
      logs: [log('呱呱坠地', `你出生在${location[0]}${location[1]}，父母为你取名${surname}家新生命。`, 'milestone', 0)],
    };
  }

  const age = (state) => Math.max(0, Math.floor((state.totalMonths - Number(state.playerBornAt || 0)) / 12));
  const stage = (years) => C.stages.find((item) => years <= item.max) || C.stages.at(-1);

  function personAge(state, item) {
    const birthMonth = Number.isFinite(item.birthMonth)
      ? item.birthMonth : (['儿子', '女儿'].includes(item.relation) ? item.bornAt : -(item.baseAge || 0) * 12);
    return Math.max(0, Math.floor((state.totalMonths - birthMonth) / 12));
  }

  function gradeLabel(state) {
    const years = age(state);
    if (state.education.schoolStage === 'workforce') return '职业起步';
    if (years >= 6 && years <= 11) return `小学${years - 5}年级`;
    if (years >= 12 && years <= 14) return `初中${years - 11}年级`;
    if (years >= 15 && years <= 17 && state.education.schoolStage === 'vocational') return `职高${years - 14}年级`;
    if (years >= 15 && years <= 17) return `高中${years - 14}年级`;
    if (state.education.university && !state.education.graduated) {
      return `大学${Math.min(4, Math.floor(Game.timeSystem.educationElapsed(state) / 12) + 1)}年级`;
    }
    return stage(years).name;
  }

  Game.content = Object.freeze({
    random, between, clamp, makeName, setUniqueName, clothing, stockState, person, log,
    createState, age, stage, personAge, gradeLabel,
  });
}(window));
