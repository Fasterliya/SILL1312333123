(function initLifeDirector(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function addLog(state, title, text, tone) {
    const entry = U.log(title, text, tone, state.totalMonths);
    Object.assign(entry, { generation: state.generation, ageMonth: state.totalMonths - state.playerBornAt });
    state.logs.unshift(entry);
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
    return Game.educationSystem.exam(state, label, subjects(state));
  }

  function schoolMilestones(state) {
    const years = U.age(state);
    const stage = state.education.schoolStage;
    if (stage === 'university'
      && Game.timeSystem.educationElapsed(state) >= state.education.durationMonths) {
      Game.social.archiveSchool(state);
      addLog(state, '大学毕业', `你从${state.education.university}毕业，获得${state.education.major}专业学历。`, 'milestone');
      state.education.graduated = true;
      state.education.school = '已毕业';
      state.education.schoolStage = 'graduate';
    } else if (years >= 18 && ['high', 'vocational'].includes(stage)) {
      if (stage === 'vocational') state.pendingDecision = { type: 'vocationalExit' };
      else {
        if (!state.education.track) {
          state.education.track = '物理';
          state.education.electives = ['化学', '生物'];
        }
        const result = exam(state, '高考');
        state.pendingDecision = { type: 'volunteer', score: result.total };
      }
    } else if (years >= 16 && stage === 'high' && !state.education.track) {
      state.pendingDecision = { type: 'track' };
    } else if (years >= 15 && ['home', 'primary', 'middle'].includes(stage)) {
      if (stage !== 'middle') {
        state.education.school = `${state.location.city}新城初级中学`;
        state.education.schoolStage = 'middle';
      }
      const result = exam(state, '中考');
      state.pendingDecision = { type: 'highSchool', score: result.total };
    } else if (years >= 12 && ['home', 'primary'].includes(stage)) {
      const school = `${state.location.city}新城初级中学`;
      Game.social.enterSchool(state, school, 'middle', 32);
      addLog(state, '小学毕业', `你告别小学，升入${school}。`, 'milestone');
    } else if (years >= 6 && stage === 'home') {
      const school = `${state.location.city}启明小学`;
      Game.social.enterSchool(state, school, 'primary', 32);
      addLog(state, '小学入学', `你背上新书包，走进${school}，班里有了新的同窗。`, 'milestone');
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
        addLog(state, '年度工作评价', '长期经验让你的绩效积累有所提升，可以申请加薪或职级提拔。', 'good');
      }
    } else if (['primary', 'middle', 'high', 'vocational', 'university']
      .includes(state.education.schoolStage)) {
      const allowance = { primary: 30, middle: 120, high: 120, vocational: 120, university: 500 };
      state.money += allowance[state.education.schoolStage];
    }
    if (state.assets.mortgage > 0) {
      state.money -= state.assets.mortgage;
    }
  }

  function relationships(state) {
    const years = U.age(state);
    const hasFriend = state.family.some((person) => person.relation === '朋友');
    const guaranteedMeeting = years === 20 && state.totalMonths % 12 === 0;
    if (years >= 18 && !state.romance.partnerId && !hasFriend
      && (guaranteedMeeting || Math.random() < 0.035)) {
      const person = U.person('朋友', U.random(Game.nameSystem.surnames()), U.between(-2, 3), null, state.playerBornAt);
      person.affection = 52;
      Game.npcLife.syncGrowth(state, person);
      state.family.push(person);
      addLog(state, '新的相遇', `你在一次活动中认识了${person.name}，彼此留下不错的印象。`, 'good');
    }
    if (state.romance.pendingBirth > 0) {
      state.romance.pendingBirth -= 1;
      if (state.romance.pendingBirth === 0) {
        Game.demography.deliver(state);
      }
      return;
    }
    const conception = Game.demography.rollMonthlyConception(state);
    if (conception) {
      addLog(state, conception.babies === 2 ? '怀上双胞胎' : '自然受孕',
        `本月自然受孕，月受孕率为${conception.monthlyPercent}%。`, 'milestone');
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
    const previousYear = state.year;
    state.totalMonths += 1;
    Game.timeSystem.syncCalendar(state);
    if (state.year !== previousYear) {
      state.stats.健康 = U.clamp(state.stats.健康 - (U.age(state) > 55 ? 2 : 0), 0, 100);
    }
    Game.mortality.monthly(state);
    Game.profile.updateGrowth(state);
    Game.npcLife.update(state);
    schoolMilestones(state);
    finances(state);
    relationships(state);
    if (!state.pendingDecision) regularExam(state);
    randomEvent(state);
    Game.monthlySystems.run(state);
  }

  function advance(state, months) {
    let advanced = 0;
    while (advanced < months && !state.pendingDecision && !state.gameOver) {
      tick(state);
      advanced += 1;
    }
    return { state, requested: months, advanced, interrupted: advanced < months };
  }

  Game.lifeDirector = Object.freeze({ addLog, advance, subjects });
}(window));
