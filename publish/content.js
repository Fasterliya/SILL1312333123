(function initContent(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;

  function random(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function between(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeName(surname) {
    return (surname || random(C.surnames)) + random(C.givenNames);
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
      job: relation === '父亲' || relation === '母亲' ? random(C.parentJobs) : '',
      status: '健康',
    };
  }

  function log(title, text, tone, month) {
    return {
      id: `e-${month}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      text,
      tone: tone || 'normal',
      month,
    };
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
      const sibling = person(relation, surname, between(2, 8), relation === '哥哥' ? '男' : '女');
      family.push(sibling);
    }
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      name: makeName(surname),
      surname,
      gender,
      location: { province: location[0], city: location[1] },
      year: C.startYear,
      month: between(1, 12),
      totalMonths: 0,
      stats: {
        健康: between(72, 94),
        心情: between(68, 90),
        智力: between(46, 66),
        魅力: between(42, 68),
        体魄: between(40, 64),
      },
      money: between(300, 1800),
      familyWealth: between(90000, 850000),
      family,
      education: {
        study: 0, track: null, electives: [], school: '家中',
        university: null, major: null, exams: [],
      },
      career: { job: null, salary: 0, level: 0, exp: 0 },
      romance: { partnerId: null, married: false, pendingBirth: 0 },
      assets: {
        house: null, mortgage: 0,
        stocks: Object.fromEntries(Object.entries(C.stocks).map(([name, price]) => (
          [name, { price, shares: 0, previous: price }]
        ))),
      },
      pendingDecision: null,
      monthActionTaken: false,
      gameOver: false,
      logs: [
        log('呱呱坠地', `你出生在${location[0]}${location[1]}，父母为你取名${surname}家新生命。`, 'milestone', 0),
      ],
    };
  }

  function age(state) {
    return Math.floor(state.totalMonths / 12);
  }

  function stage(ageYears) {
    return C.stages.find((item) => ageYears <= item.max) || C.stages[C.stages.length - 1];
  }

  function personAge(state, item) {
    if (item.relation === '儿子' || item.relation === '女儿') {
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
    random, between, clamp, person, log, createState, age, stage, personAge, gradeLabel,
  });
}(window));
