(function initLifeDirector(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function addLog(state, title, text, tone) {
    state.logs.unshift(U.log(title, text, tone, state.totalMonths));
    state.logs = state.logs.slice(0, 60);
  }

  function subjects(state) {
    const years = U.age(state);
    if (years <= 11) return C.subjectCaps.primary;
    if (years <= 14) return C.subjectCaps.middle;
    if (state.education.schoolStage === 'vocational') {
      return { 语文: 150, 数学: 150, 英语: 150, 专业技能: 300 };
    }
    const selected = [state.education.track || '物理', ...(state.education.electives.length
      ? state.education.electives : ['化学', '生物'])];
    return Object.assign({}, C.subjectCaps.highBase,
      Object.fromEntries(selected.map((name) => [name, 100])));
  }

  function exam(state, label) {
    const scores = {};
    const effort = state.education.study;
    const fatiguePenalty = Game.lifeLoop.performancePenalty(state);
    Object.entries(subjects(state)).forEach(([name, cap]) => {
      const rate = U.clamp(0.46 + state.stats.智力 / 190 + effort / 210
        + U.between(-8, 8) / 100 - fatiguePenalty, 0.3, 0.98);
      scores[name] = Math.round(cap * rate);
    });
    const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const record = { label, age: U.age(state), scores, total, date: `${state.year}.${state.month}` };
    state.education.exams.unshift(record);
    state.education.exams = state.education.exams.slice(0, 12);
    state.education.study = Math.max(0, state.education.study - 12);
    state.stats.心情 = U.clamp(state.stats.心情 + (total > 500 ? 5 : -4), 0, 100);
    addLog(state, label, `总分 ${total}。${total > 560 ? '你的努力得到了回报。' : '这次成绩将成为下一段努力的起点。'}`, total > 560 ? 'good' : 'normal');
    return record;
  }

  function schoolMilestones(state) {
    const years = U.age(state);
    if (state.month !== 6) return;
    if (years === 6) {
      const school = `${state.location.city}启明小学`;
      Game.social.enterSchool(state, school, 'primary', 4);
      addLog(state, '小学入学', `你背上新书包，走进${school}，班里有了新的同窗。`, 'milestone');
    } else if (years === 12) {
      const school = `${state.location.city}新城初级中学`;
      Game.social.enterSchool(state, school, 'middle', 5);
      addLog(state, '小学毕业', `你告别童年教室，升入${school}。`, 'milestone');
    } else if (years === 15) {
      const result = exam(state, '中考');
      state.pendingDecision = { type: 'highSchool', score: result.total };
    } else if (years === 16 && !state.education.track && state.education.schoolStage !== 'vocational') {
      state.pendingDecision = { type: 'track' };
    } else if (years === 18 && !state.education.university) {
      if (state.education.schoolStage === 'vocational') {
        state.pendingDecision = { type: 'vocationalExit' };
      } else {
        if (!state.education.track) {
          state.education.track = '物理';
          state.education.electives = ['化学', '生物'];
        }
        const result = exam(state, '高考');
        state.pendingDecision = { type: 'volunteer', score: result.total };
      }
    } else if (years === 22 && state.education.university && !state.education.graduated) {
      Game.social.archiveSchool(state);
      addLog(state, '大学毕业', `你从${state.education.university}毕业，获得${state.education.major}专业学历。`, 'milestone');
      state.education.graduated = true;
      state.education.school = '已毕业';
      state.education.schoolStage = 'graduate';
    }
  }

  function regularExam(state) {
    const years = U.age(state);
    if (years < 6 || years > 17 || ![1, 6].includes(state.month)) return;
    if ((years === 15 || years === 18) && state.month === 6) return;
    exam(state, state.month === 1 ? '期末考试' : '期中考试');
  }

  function finances(state) {
    const years = U.age(state);
    state.money += Game.assetsSystem.monthlyIncome(state);
    if (state.career.job) {
      const taxRate = state.career.salary > 20000 ? 0.12 : 0.06;
      const net = Math.round(state.career.salary * (1 - taxRate));
      state.money += net;
      state.career.exp += 1;
      if (state.career.exp % 24 === 0) {
        state.career.performance = U.clamp(state.career.performance + 8, 0, 100);
        addLog(state, '年度工作评价', '长期经验让你的绩效积累有所提升，可以考虑申请晋升。', 'good');
      }
    } else if (years >= 6 && years < 22) {
      state.money += years < 12 ? 30 : (years < 18 ? 120 : 500);
    }
    if (state.assets.mortgage > 0) {
      state.money -= state.assets.mortgage;
    }
    Object.values(state.assets.stocks).forEach((stock) => {
      stock.previous = stock.price;
      stock.price = Math.max(2, Math.round(stock.price * (1 + U.between(-8, 9) / 100) * 100) / 100);
    });
  }

  function relationships(state) {
    const years = U.age(state);
    const hasFriend = state.family.some((person) => person.relation === '朋友');
    const guaranteedMeeting = years === 20 && state.totalMonths % 12 === 0;
    if (years >= 18 && !state.romance.partnerId && !hasFriend
      && (guaranteedMeeting || Math.random() < 0.035)) {
      const person = U.person('朋友', U.random(Game.nameSystem.surnames()), U.between(-2, 3));
      person.affection = 52;
      Game.npcLife.syncGrowth(state, person);
      state.family.push(person);
      addLog(state, '新的相遇', `你在一次活动中认识了${person.name}，彼此留下不错的印象。`, 'good');
    }
    if (state.month === 1) {
      state.family.forEach((person) => {
        const currentAge = U.personAge(state, person);
        if (person.status !== '健康' || ['儿子', '女儿'].includes(person.relation)) return;
        if (currentAge >= 75 && Math.random() < 0.04) {
          person.status = '已故';
          addLog(state, '亲人离世', `${person.name}走完了自己的人生，你会记得共同度过的时光。`, 'normal');
        } else if (currentAge >= 60 && person.job && !person.job.includes('退休')) {
          person.job = `退休${person.job}`;
        }
      });
    }
    if (state.romance.pendingBirth > 0) {
      state.romance.pendingBirth -= 1;
      if (state.romance.pendingBirth === 0) {
        const relation = U.random(['儿子', '女儿']);
        const child = U.person(relation, state.surname, 0, relation === '儿子' ? '男' : '女');
        child.bornAt = state.totalMonths;
        child.affection = 80;
        child.temperament = '懵懂';
        child.bodyType = '幼小';
        child.hairstyle = '胎毛短发';
        child.clothing = { top: '婴儿连体衣', socks: '婴儿袜', shoes: '婴儿软底鞋' };
        const partner = [...state.family, ...state.contacts].find((item) => item.id === state.romance.partnerId);
        if (partner) Game.genetics.inheritInto(child, child.gender, state.profile, partner, `child-${child.id}`);
        Game.geneticsGrowth.applyAppearance(child, child.gender, 0);
        Game.npcLife.syncGrowth(state, child);
        state.family.push(child);
        addLog(state, '新生命降临', `${child.name}出生了，你成为了${state.gender === '男' ? '父亲' : '母亲'}。`, 'milestone');
      }
    }
  }

  function randomEvent(state) {
    if (Math.random() > 0.12) return;
    const events = [
      ['平凡小确幸', '天气很好，你和家人一起吃了顿热腾腾的饭。', '心情', 4],
      ['偶感风寒', '换季时你有些不舒服，休息了几天。', '健康', -5],
      ['读到好书', '一本书让你对世界多了一层理解。', '智力', 3],
      ['运动时刻', '你坚持活动身体，状态比以前轻盈。', '健康', 3],
    ];
    const [title, text, stat, delta] = U.random(events);
    state.stats[stat] = U.clamp(state.stats[stat] + delta, 0, 100);
    addLog(state, title, text, delta > 0 ? 'good' : 'normal');
  }

  function tick(state) {
    if (state.gameOver || state.pendingDecision) return;
    state.totalMonths += 1;
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
      state.stats.健康 = U.clamp(state.stats.健康 - (U.age(state) > 55 ? 2 : 0), 0, 100);
    }
    Game.profile.updateGrowth(state);
    Game.npcLife.update(state);
    finances(state);
    relationships(state);
    schoolMilestones(state);
    regularExam(state);
    randomEvent(state);
    if (U.age(state) >= 88 && Math.random() < 0.035) {
      state.gameOver = true;
      addLog(state, '人生谢幕', `你走过了 ${U.age(state)} 年，留下了属于自己的故事。`, 'milestone');
    }
  }

  function advance(state, months) {
    for (let index = 0; index < months && !state.pendingDecision && !state.gameOver; index += 1) tick(state);
    return state;
  }

  Game.lifeDirector = Object.freeze({ addLog, advance, subjects });
}(window));
