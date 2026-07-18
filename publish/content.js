(function initContent(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const random = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const makeName = (surname) => (surname || random(C.surnames)) + random(C.givenNames);

  function traitFromLegacy(interests) {
    if (!interests || typeof interests !== 'object') return random(C.traits);
    const strongest = Object.entries(interests).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      科学: '好奇', 文学: '敏感', 艺术: '浪漫',
      运动: '勇敢', 社交: '随和', 商业: '务实',
    }[strongest] || random(C.traits);
  }

  function clothing(top) {
    return { top: top || '品质日常', socks: '短棉袜', shoes: '白色运动鞋' };
  }

  function person(relation, surname, age, gender) {
    return {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: makeName(surname),
      relation,
      gender: gender || random(['男', '女']),
      baseAge: age,
      bornAt: 0,
      affection: between(48, 78),
      personality: random(C.personalities),
      trait: random(C.traits),
      hairColor: random(C.appearance.hairColor.slice(0, 4)),
      temperament: random(C.appearance.temperament.slice(4)),
      bodyType: random(C.appearance.bodyType.slice(1)),
      hairstyle: random(C.appearance.hairstyle.slice(2, 9)),
      clothing: clothing(random(C.appearance.top.slice(3, 10))),
      interactions: 0,
      lastInteractionMonth: -1,
      phoneUnlocked: false,
      school: '',
      job: ['父亲', '母亲'].includes(relation) ? random(C.parentJobs) : '',
      status: '健康',
    };
  }

  function log(title, text, tone, month) {
    return {
      id: `e-${month}-${Math.random().toString(36).slice(2, 6)}`,
      title, text, tone: tone || 'normal', month,
    };
  }

  function profile() {
    return {
      height: 50,
      weight: 3.4,
      growthSeed: between(-4, 4),
      hairColor: '黑色',
      temperament: random(C.appearance.temperament),
      bodyType: '匀称',
      hairstyle: '胎毛短发',
      clothing: { top: '婴儿连体衣', socks: '婴儿袜', shoes: '婴儿软底鞋' },
      personality: random(C.personalities),
      trait: random(C.traits),
      styleStage: -1,
      portraitUrl: null,
      portraitTaskId: null,
    };
  }

  function stockState() {
    return Object.fromEntries(Object.entries(C.stocks).map(([name, price]) => (
      [name, { price, shares: 0, previous: price }]
    )));
  }

  function createState() {
    const surname = random(C.surnames);
    const location = random(C.locations);
    const gender = random(['男', '女']);
    const father = person('父亲', surname, between(25, 38), '男');
    const mother = person('母亲', random(C.surnames), between(23, 36), '女');
    const family = [father, mother];
    if (Math.random() < 0.28) {
      const relation = random(['哥哥', '姐姐']);
      family.push(person(relation, surname, between(2, 8), relation === '哥哥' ? '男' : '女'));
    }
    return {
      version: 3,
      updatedAt: new Date().toISOString(),
      name: makeName(surname),
      surname,
      gender,
      location: { province: location[0], city: location[1] },
      hometown: { province: location[0], city: location[1] },
      year: C.startYear,
      month: C.startMonth,
      totalMonths: 0,
      profile: profile(),
      stats: { 健康: between(72, 94), 心情: between(68, 90), 智力: between(46, 66), 魅力: between(42, 68) },
      money: between(300, 1800),
      familyWealth: between(90000, 850000),
      family,
      contacts: [],
      education: {
        study: 0, track: null, electives: [], school: '家中', schoolStage: 'home',
        university: null, universityType: null, major: null, graduated: false, exams: [],
      },
      career: { job: null, jobId: null, salary: 0, level: 0, exp: 0, applications: [] },
      romance: { partnerId: null, married: false, pendingBirth: 0 },
      assets: { house: null, mortgage: 0, stocks: stockState() },
      pendingDecision: null,
      monthActionTaken: false,
      gameOver: false,
      logs: [log('呱呱坠地', `你出生在${location[0]}${location[1]}，父母为你取名${surname}家新生命。`, 'milestone', 0)],
    };
  }

  function fillPerson(item) {
    item.personality ||= random(C.personalities);
    item.trait ||= traitFromLegacy(item.interests);
    delete item.interests;
    item.hairColor ||= random(C.appearance.hairColor.slice(0, 4));
    item.temperament ||= random(C.appearance.temperament.slice(4));
    item.bodyType ||= random(C.appearance.bodyType.slice(1));
    item.hairstyle ||= random(C.appearance.hairstyle.slice(2, 9));
    item.clothing ||= clothing(item.outfit);
    delete item.outfit;
    item.interactions ||= 0;
    item.lastInteractionMonth ??= -1;
    item.phoneUnlocked ??= false;
    item.school ||= '';
    return item;
  }

  function upgradeState(state) {
    if (!state) return createState();
    state.version = 3;
    state.hometown ||= { ...state.location };
    state.profile ||= profile();
    state.profile.trait ||= traitFromLegacy(state.profile.interests);
    delete state.profile.interests;
    state.profile.clothing ||= clothing(state.profile.outfit);
    state.profile.clothing.top ||= state.profile.outfit || '品质日常';
    state.profile.clothing.socks ||= '短棉袜';
    state.profile.clothing.shoes ||= '白色运动鞋';
    delete state.profile.outfit;
    delete state.stats.体魄;
    state.profile.portraitUrl ??= null;
    state.profile.portraitTaskId ??= null;
    state.family = (state.family || []).map(fillPerson);
    state.contacts = (state.contacts || []).map(fillPerson);
    state.education.schoolStage ||= 'home';
    state.education.universityType ??= null;
    state.education.graduated ??= false;
    state.career.jobId ??= null;
    state.career.applications ||= [];
    state.assets.stocks ||= stockState();
    return state;
  }

  const age = (state) => Math.floor(state.totalMonths / 12);
  const stage = (years) => C.stages.find((item) => years <= item.max) || C.stages.at(-1);

  function personAge(state, item) {
    if (['儿子', '女儿'].includes(item.relation)) {
      return Math.max(0, Math.floor((state.totalMonths - item.bornAt) / 12));
    }
    return item.baseAge + age(state);
  }

  function gradeLabel(state) {
    const years = age(state);
    if (years >= 6 && years <= 11) return `小学${years - 5}年级`;
    if (years >= 12 && years <= 14) return `初中${years - 11}年级`;
    if (years >= 15 && years <= 17) return `高中${years - 14}年级`;
    if (years >= 18 && years <= 21 && state.education.university) return `大学${years - 17}年级`;
    return stage(years).name;
  }

  Game.content = Object.freeze({
    random, between, clamp, makeName, traitFromLegacy, person, log,
    createState, upgradeState, age, stage, personAge, gradeLabel,
  });
}(window));
