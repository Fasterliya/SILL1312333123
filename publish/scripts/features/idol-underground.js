(function initUndergroundIdol(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- constants ---- */
  const STAGE_LABELS = { trainee: '地下练习生', debuted: '地下偶像' };
  const FELL_LABELS = { welfare: '福利姬', prostitute: '妓女' };

  /* ---- ensure ---- */
  function ensure(state) {
    state.undergroundIdol = state.undergroundIdol && typeof state.undergroundIdol === 'object' ? state.undergroundIdol : {
      active: false,
      stage: 'trainee',
      fans: 0,
      trainingMonths: 0,
      skills: { dance: 0, vocal: 0, expression: 0 },
      lastShowMonth: -1,
      lastSpecialShowMonth: -3,
      lastProducerMonth: -3,
      producerAbuse: 0,
      corruptionFromForced: 0,
      fallBufferMonths: 0,
      fellTo: '',
      careerExtended: false,
    };
    if (typeof state.undergroundIdol.consecutivePoor === 'undefined') {
      state.undergroundIdol.consecutivePoor = 0;
    }
    if (typeof state.undergroundIdol.lastIncomeMonth === 'undefined') {
      state.undergroundIdol.lastIncomeMonth = 0;
    }
    if (typeof state.undergroundIdol.agencyName === 'undefined') {
      state.undergroundIdol.agencyName = '';
    }
    return state.undergroundIdol;
  }

  /* ---- isUndergroundIdol ---- */
  function isUndergroundIdol(state) {
    const ug = state.undergroundIdol || {};
    return ug.active === true || state.career?.jobId === 'idol-underground';
  }

  /* ---- train ---- */
  function train(state, skill) {
    if (!isUndergroundIdol(state)) return { ok: false, message: '只有地下偶像才能进行专项训练' };
    const ug = ensure(state);
    const key = skill === 'dance' ? '舞蹈' : (skill === 'vocal' ? '声乐' : '表情管理');

    /* 30% less efficient than regular idol training (regular: 5-12) */
    const gain = Math.round(U.between(5, 12) * 0.7);
    ug.skills[skill] = U.clamp(ug.skills[skill] + gain, 0, 100);
    state.stats.健康 = U.clamp(state.stats.健康 - 1, 0, 100);
    ug.trainingMonths += 1;

    Game.lifeDirector.addLog(state, '地下偶像训练',
      `你进行了${key}训练（地下条件有限，效率仅70%），${key}能力 ${ug.skills[skill]}。`, 'good');
    return { ok: true, message: `${key}训练完成，当前 ${ug.skills[skill]}（效率70%）` };
  }

  /* ---- monthlyShow ---- */
  function monthlyShow(state) {
    if (!isUndergroundIdol(state)) return { ok: false, message: '只有地下偶像才能登台演出' };
    const ug = ensure(state);

    const charm = state.stats.魅力 || 30;
    const ticketPrice = ug.stage === 'trainee' ? 15 : 30;
    const charmFactor = U.clamp(charm / 80, 0.4, 1.8);
    const income = Math.round(ug.fans * ticketPrice * charmFactor);

    /* Performance quality based on skills */
    const totalSkill = ug.skills.dance + ug.skills.vocal + ug.skills.expression;
    const qualityFactor = U.clamp(totalSkill / 150, 0.4, 1.5);
    const baseFanGain = Math.round(ug.fans * 0.03 * qualityFactor + U.between(-10, 40) * qualityFactor);
    const fanGain = Math.max(Math.round(baseFanGain), -Math.round(ug.fans * 0.02));

    ug.fans = Math.max(0, ug.fans + fanGain);
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 3, 0, 100);
    ug.lastShowMonth = state.totalMonths;

    /* Track income for fall check */
    ug.lastIncomeMonth = income;

    /* Narrative text by fan tiers */
    let narrative;
    if (ug.fans < 1000) {
      narrative = 'Livehouse里稀稀落落坐了几十个人，但你依然卖力表演。台下偶尔有零星的掌声，你知道每一个粉丝都来之不易。';
    } else if (ug.fans < 5000) {
      narrative = 'Livehouse的观众多了起来，前排的粉丝挥舞着应援棒，呼喊着你的名字。虽然场地不大，但气氛热烈。';
    } else {
      narrative = '今晚的Livehouse爆满！粉丝们整齐地喊着口号，安可声此起彼伏。在这个地下世界，你已经是小有名气的存在。';
    }

    Game.lifeDirector.addLog(state, '地下Livehouse演出',
      `${narrative} 收入${Game.view.money(income)}，粉丝${fanGain >= 0 ? '+' : ''}${fanGain}。`, 'good');
    return { ok: true, message: `Livehouse演出完成，收入${Game.view.money(income)}，粉丝${fanGain >= 0 ? '+' : ''}${fanGain}` };
  }

  /* ---- specialShow ---- */
  function specialShow(state) {
    if (!isUndergroundIdol(state)) return { ok: false, message: '只有地下偶像才能举办特殊公演' };
    const ug = ensure(state);

    if (state.totalMonths - ug.lastSpecialShowMonth < 3) {
      return { ok: false, message: '距离上次特殊公演不足3个月，身体需要休息' };
    }
    if (state.stats.健康 < 25) {
      return { ok: false, message: '健康不足，无法承受特殊公演的强度' };
    }

    state.stats.健康 = U.clamp(state.stats.健康 - 20, 0, 100);

    const charm = state.stats.魅力 || 30;
    const ticketPrice = ug.stage === 'trainee' ? 25 : 50;
    const charmFactor = U.clamp(charm / 80, 0.4, 1.8);
    const income = Math.round(ug.fans * ticketPrice * charmFactor * 2);

    const totalSkill = ug.skills.dance + ug.skills.vocal + ug.skills.expression;
    const qualityFactor = U.clamp(totalSkill / 120, 0.5, 1.6);
    const fanGain = Math.round(ug.fans * 0.05 * qualityFactor + U.between(20, 80) * qualityFactor);

    ug.fans += fanGain;
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
    ug.lastSpecialShowMonth = state.totalMonths;
    ug.lastIncomeMonth = Math.max(ug.lastIncomeMonth || 0, income);

    Game.lifeDirector.addLog(state, '地下偶像特殊公演',
      `三个小时的超长公演让你筋疲力尽，但粉丝们热情高涨。健康-20，收入${Game.view.money(income)}（双倍），新增${fanGain}粉丝。`, 'good');
    return { ok: true, message: `特殊公演完成！收入${Game.view.money(income)}，粉丝+${fanGain}，健康-20` };
  }

  /* ---- castingCouch ---- */
  function castingCouch(state) {
    if (!isUndergroundIdol(state)) return { ok: false, message: '只有地下偶像才会面对业内的暗面' };
    const ug = ensure(state);

    if (state.totalMonths - ug.lastProducerMonth < 3) {
      return { ok: false, message: '上次的邀约还历历在目，暂时没有人来找你' };
    }

    /* Monthly probability event */
    const baseChance = 0.25 + ug.producerAbuse * 0.05;
    const chance = U.clamp(baseChance, 0.15, 0.75);
    if (Math.random() > chance) {
      ug.lastProducerMonth = state.totalMonths;
      return { ok: false, message: '这个月没有人来找你。地下偶像的处境暂时平静。' };
    }

    /* Determine who approaches — 3 types */
    const sourceType = U.random(['producer', 'patron', 'broker']);
    const sourceTexts = {
      producer: {
        title: '制作人的暗示',
        intro: '制作人把你叫到办公室，说着"地下偶像出头很难"之类的话，手若有若无地搭在了你的肩上。',
        accept: '你答应了制作人的要求。他满意地笑了笑，承诺会给你更多资源和演出机会。',
      },
      patron: {
        title: '金主的邀约',
        intro: '一位经常来看你演出的中年金主托人传话，说想请你吃顿饭"谈谈合作"。你知道这顿饭意味着什么。',
        accept: '你赴约了。金主很满意你的"配合"，当场转了一笔不小的"赞助费"。',
      },
      broker: {
        title: '经纪人的牵线',
        intro: '你的经纪人神色暧昧地告诉你，有位业内大佬对你的表演很"欣赏"，想私下见一面。他暗示这对你的发展很有帮助。',
        accept: '你去了见面。大佬很"欣赏"你的才艺，承诺会帮你扩展人脉和资源。',
      },
    };

    const info = sourceTexts[sourceType];

    /* The player must decide: accept or reject. We present a pending decision. */
    const income = Math.round(10000 + ug.fans * 0.03 + U.between(2000, 8000));
    const fanBoost = Math.round(ug.fans * 0.06 + U.between(50, 200));

    /* Store pending decision on state for UI */
    ug._pendingDecision = {
      type: sourceType,
      title: info.title,
      intro: info.intro,
      income: income,
      fanBoost: fanBoost,
      month: state.totalMonths,
    };

    ug.lastProducerMonth = state.totalMonths;

    Game.lifeDirector.addLog(state, info.title,
      `${info.intro} 你需要做出选择。`, 'normal');
    return { ok: true, message: `${info.title}——你需要做出选择`, pendingDecision: true, decision: ug._pendingDecision };
  }

  /* ---- resolveDecision ---- */
  function resolveDecision(state, accept) {
    const ug = ensure(state);
    const decision = ug._pendingDecision;
    if (!decision) return { ok: false, message: '没有待处理的邀约' };

    const info = {
      producer: {
        title: '制作人的暗示',
        acceptText: '你答应了制作人的要求。他满意地笑了笑，承诺会给你更多资源和演出机会。',
        rejectText: '你婉拒了制作人。他的脸色立刻沉了下来，冷冷地说了句"那你自求多福吧"。',
      },
      patron: {
        title: '金主的邀约',
        acceptText: '你赴约了。金主很满意你的"配合"，当场转了一笔不小的"赞助费"。',
        rejectText: '你拒绝了金主的邀约。他耸耸肩表示无所谓，但你感觉他以后不会再来看你的演出了。',
      },
      broker: {
        title: '经纪人的牵线',
        acceptText: '你去了见面。大佬很"欣赏"你的才艺，承诺会帮你扩展人脉和资源。',
        rejectText: '你拒绝了这次见面。经纪人叹了口气，说你太天真了，地下偶像不靠这些怎么出头。',
      },
    };

    const src = info[decision.type];
    ug._pendingDecision = null;

    if (accept) {
      /* Accept: fans and income boost, possible pregnancy */
      ug.fans += decision.fanBoost;
      state.money += decision.income;
      state.stats.心情 = U.clamp(state.stats.心情 - 5, 0, 100);
      ug.producerAbuse += 1;
      ug.careerExtended = true;

      /* Possible pregnancy */
      if (Math.random() < 0.35) {
        const record = Game.relationshipSecrets.addHookRecord(state,
          { ...state.profile, id: 'player-profile', name: state.name, gender: state.gender }, '地下偶像潜规则');
        const patron = U.person('金主', U.random(Game.nameSystem.surnames()), U.between(38, 58), '男', state.totalMonths);
        patron.metCity = state.location.city;
        patron.currentCity = state.location.city;
        patron.wealth = U.between(1000000, 8000000);
        if (!state.worldPeople.some((p) => p.id === patron.id)) state.worldPeople.push(patron);
        Game.relationshipSecrets.schedulePregnancy(state,
          { ...state.profile, id: 'player-profile', name: state.name, gender: state.gender, culture: state.location.country },
          patron, record);
      }

      Game.lifeDirector.addLog(state, src.title + '·接受',
        `${src.acceptText} 获得${Game.view.money(decision.income)}，新增${decision.fanBoost}粉丝。`, 'normal');
      return { ok: true, message: `你接受了邀约，获得${Game.view.money(decision.income)}，粉丝+${decision.fanBoost}` };
    } else {
      /* Reject: resources halved, possible aggressive reaction */
      const fanPenalty = Math.round(ug.fans * 0.04);
      ug.fans = Math.max(0, ug.fans - fanPenalty);
      ug.fallBufferMonths = Math.max(0, ug.fallBufferMonths + 1);

      /* Aggressive producer may trigger sexual harassment/rape */
      const isAggressive = decision.type === 'producer' && ug.producerAbuse >= 2 && Math.random() < 0.45;
      let extraLog = '';
      if (isAggressive) {
        /* Rape encounter */
        state.stats.健康 = U.clamp(state.stats.健康 - U.between(10, 25), 0, 100);
        state.stats.心情 = U.clamp(state.stats.心情 - U.between(15, 35), 0, 100);
        ug.producerAbuse += 1;
        ug.corruptionFromForced += 1;

        /* Trigger negative encounter */
        const attacker = U.person('制作人', U.random(Game.nameSystem.surnames()), U.between(38, 55), '男', state.totalMonths);
        attacker.metCity = state.location.city;
        attacker.currentCity = state.location.city;
        if (!state.worldPeople.some((p) => p.id === attacker.id)) state.worldPeople.push(attacker);

        /* Log rape event */
        Game.lifeDirector.addLog(state, '制作人的暴行',
          '拒绝制作人后，他在某天收工后堵住了你。挣扎无济于事，你遭受了难以启齿的伤害。', 'normal');

        /* Possible pregnancy from rape */
        if (Math.random() < 0.4) {
          const record = Game.relationshipSecrets.addHookRecord(state,
            { ...state.profile, id: 'player-profile', name: state.name, gender: state.gender }, '强迫关系');
          Game.relationshipSecrets.schedulePregnancy(state,
            { ...state.profile, id: 'player-profile', name: state.name, gender: state.gender, culture: state.location.country },
            attacker, record);
        }

        extraLog = ' 更糟糕的是，制作人恼羞成怒……';
      }

      Game.lifeDirector.addLog(state, src.title + '·拒绝',
        `${src.rejectText}${extraLog} 事务所对你的态度明显冷淡了。`, 'normal');
      return { ok: true, message: `你拒绝了邀约。事务所态度冷淡，资源减半。${isAggressive ? '制作人恼羞成怒……' : ''}` };
    }
  }

  /* ---- fallCheck ---- */
  function fallCheck(state) {
    const ug = ensure(state);
    if (!ug.active) return;
    if (ug.fellTo) return; /* Already fell */

    const monthlyExpenses = (state.property?.rent || 1500) + (state.livingExpenses || 2000);
    const monthIncome = ug.lastIncomeMonth || (state.career?.salary || 0);

    if (ug.fans < 5000 && monthIncome < monthlyExpenses) {
      ug.consecutivePoor += 1;
    } else {
      ug.consecutivePoor = Math.max(0, ug.consecutivePoor - 1);
    }

    /* Trigger 3-month buffer after 2 consecutive poor months */
    if (ug.consecutivePoor >= 2 && ug.fallBufferMonths === 0) {
      ug.fallBufferMonths = 1;
      Game.lifeDirector.addLog(state, '地下偶像·危机',
        '老板委婉地找到你，说最近票房不太够，让你想办法提升人气。你的心里隐约有些不安。', 'normal');
      return;
    }

    if (ug.fallBufferMonths > 0 && ug.fallBufferMonths < 4) {
      /* Still in buffer */
      if (ug.fallBufferMonths === 1 && ug.consecutivePoor >= 3) {
        ug.fallBufferMonths = 2;
        Game.lifeDirector.addLog(state, '地下偶像·危机加深',
          '你开始收到一些"不体面的邀请"——有人在后台递纸条，问你愿不愿意参加一些"特殊"的拍摄。', 'warning');
      } else if (ug.fallBufferMonths === 2 && ug.consecutivePoor >= 4) {
        ug.fallBufferMonths = 3;
        Game.lifeDirector.addLog(state, '地下偶像·绝境',
          '房东开始催租了。与此同时，你收到了两条截然不同的消息：一条来自某位金主的"包养提议"，另一条是红灯区的招聘传单。', 'warning');
      }

      /* Check if recovered during buffer */
      if (ug.fans >= 5000 || monthIncome >= monthlyExpenses) {
        ug.fallBufferMonths = 0;
        ug.consecutivePoor = 0;
        Game.lifeDirector.addLog(state, '地下偶像·转机',
          '你的努力终于有了回报，人气和收入开始回升。地下偶像的生涯暂时保住了。', 'good');
        return;
      }
    }

    /* Buffer expired → fall */
    if (ug.fallBufferMonths >= 3 && ug.consecutivePoor >= 4) {
      /* Determine fall destination */
      const age = U.age(state);
      const charm = state.stats.魅力 || 30;

      if (charm >= 40 && age <= 30 && Math.random() < 0.55) {
        /* Fall to welfare (福利姬) */
        ug.fellTo = 'welfare';
        ug.fans = Math.round(ug.fans * 0.3);
        ug.active = false;
        ug.stage = 'trainee';

        const welfareJob = Game.config.jobs.find((j) => j.id === 'welfare');
        if (welfareJob) {
          state.career.job = welfareJob.name;
          state.career.jobId = welfareJob.id;
          state.career.salary = welfareJob.salary;
          state.career.company = welfareJob.company;
        }

        state.money += Math.round(ug.fans * 2);
        Game.lifeDirector.addLog(state, '坠落·福利姬',
          '地下偶像的梦碎了。一位金主在你最困难的时候伸出了手——但代价是你需要为他拍摄私密内容。你保留了一部分粉丝，但已经不再是舞台上的偶像了。', 'milestone');
      } else {
        /* Fall to prostitute (妓女) */
        ug.fellTo = 'prostitute';
        ug.fans = 0;
        ug.active = false;
        ug.stage = 'trainee';

        const prostituteJob = Game.config.jobs.find((j) => j.id === 'prostitute');
        if (prostituteJob) {
          state.career.job = prostituteJob.name;
          state.career.jobId = prostituteJob.id;
          state.career.salary = prostituteJob.salary;
          state.career.company = prostituteJob.company;
        }

        Game.lifeDirector.addLog(state, '坠落·风俗业',
          '地下偶像彻底崩塌了。在生存的压力下，你走进了那家闪烁着粉色霓虹灯的店面。从舞台到风月场，不过一步之遥。', 'milestone');
      }
    }
  }

  /* ---- tryPromotion ---- */
  function tryPromotion(state) {
    if (!isUndergroundIdol(state)) return { ok: false, message: '只有地下偶像才能寻求出道机会' };
    const ug = ensure(state);
    const charm = state.stats.魅力 || 0;

    /* Check requirements */
    if (ug.fans < 20000) {
      return { ok: false, message: `粉丝数不足（需要20000，当前${ug.fans.toLocaleString()}），人气还不足以让事务所重视你` };
    }
    if (charm < 55) {
      return { ok: false, message: `魅力不足（需要55，当前${Math.round(charm)}），你需要更精致的包装和形象管理` };
    }

    /* 两者条件都必须满足 */
    const agencyBuyCost = Math.round(30000 + ug.producerAbuse * 5000);
    if (state.money < agencyBuyCost) {
      return { ok: false, message: `资金不足（需要${Game.view.money(agencyBuyCost)}），购买事务所关系和宣发资源需要钱` };
    }

    /* All conditions met — success! */
    Game.economy.spend(state, agencyBuyCost);

    const inheritedFans = Math.round(ug.fans * 0.6);

    /* Switch career to regular idol */
    const idolJob = Game.config.jobs.find((j) => j.id === 'idol');
    if (idolJob) {
      state.career.job = idolJob.name;
      state.career.jobId = idolJob.id;
      state.career.salary = idolJob.salary;
      state.career.company = ug.agencyName || '偶像事务所';
    }

    /* Transfer state to regular idol system */
    if (Game.idolSystem) {
      const regularIdol = Game.idolSystem.ensure(state);
      regularIdol.active = true;
      regularIdol.stage = 'trainee';
      regularIdol.fans = inheritedFans;
      regularIdol.trainingMonths = ug.trainingMonths;
      regularIdol.skills = { ...ug.skills };
      regularIdol.agencyName = ug.agencyName || '偶像事务所';
      regularIdol.producerTrust = Math.max(30, 50 - ug.producerAbuse * 5);
      regularIdol.producerAbuse = ug.producerAbuse;
    }

    /* Deactivate underground idol */
    ug.active = false;
    ug.stage = 'trainee';

    /* Write resume entry */
    if (state.resume && Array.isArray(state.resume)) {
      state.resume.push({
        type: 'career',
        title: '地下偶像出道',
        detail: `从地下Livehouse到正规事务所，累计${ug.fans.toLocaleString()}粉丝基础。花费${Game.view.money(agencyBuyCost)}打通关系。`,
        month: state.totalMonths,
        year: state.year,
      });
    }

    Game.lifeDirector.addLog(state, '地下偶像·出道！',
      `经过不懈努力，你终于从地下走进了正规偶像事务所！${inheritedFans.toLocaleString()}粉丝（60%）随你而来。花费${Game.view.money(agencyBuyCost)}。`, 'milestone');

    return { ok: true, message: `恭喜出道！${inheritedFans.toLocaleString()}粉丝继承到正规偶像生涯。` };
  }

  /* ---- monthly tick ---- */
  function monthly(state) {
    const ug = ensure(state);
    if (!ug.active || ug.fellTo) return;

    /* Natural charm growth (slow, +0.5/month) */
    state.stats.魅力 = U.clamp((state.stats.魅力 || 0) + 0.5, 0, 100);

    /* Auto monthly show */
    if (state.totalMonths > ug.lastShowMonth) {
      const show = monthlyShow(state);
      if (!show.ok) {
        /* If can't perform, still decay */
        ug.fans = Math.max(0, Math.round(ug.fans * 0.95));
        ug.consecutivePoor += 0.5;
      }
    }

    /* Fan natural decay/growth */
    if (ug.fans > 100) {
      const decayRate = ug.producerAbuse > 3 ? 0.03 : 0.01;
      const naturalDecay = Math.round(ug.fans * decayRate);
      ug.fans = Math.max(0, ug.fans - naturalDecay);
    }

    /* Casting couch probability check (in monthly, no pending decision exists) */
    if (!ug._pendingDecision && state.totalMonths - ug.lastProducerMonth >= 3 && Math.random() < 0.2) {
      castingCouch(state);
    }

    /* Fall check */
    fallCheck(state);

    /* Decline at older age */
    const age = U.age(state);
    if (age >= 26 && ug.stage !== 'fell') {
      if (ug.careerExtended && age < 30) {
        ug.fans = Math.max(0, Math.round(ug.fans * 0.97));
      } else {
        ug.fans = Math.max(0, Math.round(ug.fans * 0.92));
      }
    }

    /* Income from shows is handled in monthlyShow; base salary if any */
    if (state.career?.salary > 0) {
      state.money += state.career.salary;
    }
  }

  /* ---- render ---- */
  function render(state) {
    if (!isUndergroundIdol(state) && !state.undergroundIdol?.fellTo) return '';
    const ug = ensure(state);
    const totalSkill = ug.skills.dance + ug.skills.vocal + ug.skills.expression;

    /* If fallen, show brief status */
    if (ug.fellTo) {
      const label = FELL_LABELS[ug.fellTo] || '未知';
      return `<section class="creator-card idol-card underground-fallen">
        <header><div><span>地下偶像生涯已终结</span>
        <strong>坠落为${label}</strong></div>
        <b>曾拥有${ug.fans.toLocaleString()}粉丝 · ${ug.producerAbuse}次潜规则</b></header>
        <p class="empty-state" style="padding:12px;color:var(--text-muted)">从舞台到尘埃，地下偶像的梦已经碎了。但生活还在继续。</p>
      </section>`;
    }

    /* Tab-based layout */
    const tab = state._ugTab || 'show';
    const tabs = [
      { id: 'show', label: '演出' },
      { id: 'train', label: '训练' },
      { id: 'group', label: '团体' },
      { id: 'career', label: '职业规划' },
    ];

    const tabNav = tabs.map((t) =>
      `<button class="tab-btn${tab === t.id ? ' active' : ''}" data-ug-tab="${t.id}">${t.label}</button>`
    ).join('');

    let tabContent = '';
    switch (tab) {
      case 'show':
        tabContent = renderShowTab(state, ug);
        break;
      case 'train':
        tabContent = renderTrainTab(state, ug, totalSkill);
        break;
      case 'group':
        tabContent = renderGroupTab(state, ug);
        break;
      case 'career':
        tabContent = renderCareerTab(state, ug);
        break;
    }

    return `<section class="creator-card idol-card underground-idol-card">
      <header><div><span>${ug.agencyName || '地下Livehouse'} · ${STAGE_LABELS[ug.stage] || ''}</span>
      <strong>${ug.fans.toLocaleString()} 粉丝</strong></div>
      <b>训练${ug.trainingMonths}月 · ${ug.producerAbuse}次潜规则${ug.fallBufferMonths > 0 ? ' · 坠落倒计时' + ug.fallBufferMonths + '/3月' : ''}</b></header>
      <div class="creator-metrics"><span>舞蹈 <b>${ug.skills.dance}</b></span>
      <span>声乐 <b>${ug.skills.vocal}</b></span>
      <span>表情 <b>${ug.skills.expression}</b></span>
      <span>综合 <b>${totalSkill}</b></span></div>
      <nav class="tab-nav" style="display:flex;gap:4px;padding:8px 0;border-bottom:1px solid var(--border)">${tabNav}</nav>
      ${tabContent}
      ${ug._pendingDecision ? renderPendingDecision(ug) : ''}
    </section>`;
  }

  function renderShowTab(state, ug) {
    const canSpecial = state.totalMonths - ug.lastSpecialShowMonth >= 3 && state.stats.健康 >= 25;
    const canShow = state.totalMonths > ug.lastShowMonth;
    return `<div class="creator-actions" style="padding:8px 0">
      <button data-ug-action="monthlyShow"${canShow ? '' : ' disabled'}>Livehouse演出 · ${canShow ? '本月可演' : '已演过'}</button>
      <button data-ug-action="specialShow"${canSpecial ? '' : ' disabled'}>
        特殊公演${canSpecial ? ' · 健康-20 · 收入x2' : ' · 冷却中或健康不足'}
      </button>
    </div>
    <p class="empty-state" style="padding:8px 12px;font-size:13px;color:var(--text-muted)">
      提示：特殊公演每3个月可办一次，收入翻倍但消耗20健康。Livehouse演出每月自动进行，也可手动触发。
    </p>`;
  }

  function renderTrainTab(state, ug, totalSkill) {
    return `<div class="creator-actions" style="padding:8px 0">
      <button data-ug-action="train" data-ug-skill="dance">训练舞蹈 · ${ug.skills.dance}</button>
      <button data-ug-action="train" data-ug-skill="vocal">训练声乐 · ${ug.skills.vocal}</button>
      <button data-ug-action="train" data-ug-skill="expression">训练表情 · ${ug.skills.expression}</button>
    </div>
    <p class="empty-state" style="padding:8px 12px;font-size:13px;color:var(--text-muted);line-height:1.6">
      地下偶像训练条件有限，效率仅为正规偶像的70%。<br>
      综合技能：${totalSkill}/300（舞蹈+声乐+表情）<br>
      训练总月数：${ug.trainingMonths}个月
    </p>`;
  }

  function renderGroupTab(state, ug) {
    const charm = Math.round(state.stats.魅力 || 0);
    return `<div style="padding:12px">
      <p style="margin:0 0 8px;font-size:14px"><b>所属团体：</b>${ug.agencyName || '地下Livehouse独立偶像'}</p>
      <p style="margin:0 0 8px;font-size:14px"><b>阶段：</b>${STAGE_LABELS[ug.stage] || '未知'}</p>
      <p style="margin:0 0 8px;font-size:14px"><b>魅力：</b>${charm}（每月自然+0.5）</p>
      <p style="margin:0 0 8px;font-size:14px"><b>潜在规则次数：</b>${ug.producerAbuse}</p>
      <p style="margin:0 0 8px;font-size:14px"><b>强迫堕落次数：</b>${ug.corruptionFromForced}</p>
      ${ug.careerExtended ? '<p style="margin:0;font-size:14px;color:var(--text-muted)">通过潜规则延长了地下偶像生涯</p>' : ''}
    </div>`;
  }

  function renderCareerTab(state, ug) {
    const charm = Math.round(state.stats.魅力 || 0);
    const agencyBuyCost = Math.round(30000 + ug.producerAbuse * 5000);
    const canPromote = ug.fans >= 20000 && charm >= 55 && state.money >= agencyBuyCost;
    const conditions = [];
    if (ug.fans >= 20000) conditions.push(`粉丝达标(${ug.fans.toLocaleString()}/20000)`);
    else conditions.push(`粉丝不足(${ug.fans.toLocaleString()}/20000)`);
    if (charm >= 55) conditions.push(`魅力达标(${charm}/55)`);
    else conditions.push(`魅力不足(${charm}/55)`);
    if (state.money >= agencyBuyCost) conditions.push(`资金充足(${Game.view.money(state.money)}/${Game.view.money(agencyBuyCost)})`);
    else conditions.push(`资金不足(${Game.view.money(state.money)}/${Game.view.money(agencyBuyCost)})`);

    return `<div style="padding:12px">
      <p style="margin:0 0 8px;font-size:14px;font-weight:bold">出道条件（缺一不可）：</p>
      <ul style="margin:0 0 12px;padding-left:18px;font-size:13px;color:var(--text-muted)">
        ${conditions.map((c) => `<li>${c}</li>`).join('')}
      </ul>
      <button data-ug-action="tryPromotion"${canPromote ? '' : ' disabled'} style="width:100%;margin-bottom:8px">
        ${canPromote ? `寻求出道 · ${Game.view.money(agencyBuyCost)}` : '条件不足，无法出道'}
      </button>
      ${ug.fallBufferMonths > 0 ? `<p style="margin:0;font-size:13px;color:#e74c3c;font-weight:bold">
        坠落危机中！倒计时 ${ug.fallBufferMonths}/3 月。尽快提升人气和收入！
      </p>` : ''}
      <p class="empty-state" style="padding:8px 12px;font-size:13px;color:var(--text-muted);line-height:1.6;margin-top:8px">
        出道后将继承60%粉丝到正规偶像生涯。需要足够的粉丝、魅力和资金来打通事务所关系。
      </p>
    </div>`;
  }

  function renderPendingDecision(ug) {
    const d = ug._pendingDecision;
    return `<div style="padding:12px;background:var(--card-bg, #1a1a2e);border:1px solid var(--border);border-radius:8px;margin-top:8px">
      <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#f0a500">待决定：${d.title}</p>
      <p style="margin:0 0 12px;font-size:13px;color:var(--text-muted)">${d.intro}</p>
      <div style="display:flex;gap:8px">
        <button data-ug-action="acceptDecision" style="flex:1;background:var(--accent, #e74c3c)">
          接受 · ${Game.view.money(d.income)} · +${d.fanBoost}粉
        </button>
        <button data-ug-action="rejectDecision" style="flex:1;background:var(--border)">
          拒绝（资源减半，可能遭报复）
        </button>
      </div>
      <p style="margin:8px 0 0;font-size:12px;color:var(--text-muted)">
        接受：获得资源和收入，但有35%概率怀孕。拒绝：事务所冷淡，但保持尊严。
      </p>
    </div>`;
  }

  /* ---- handleClick ---- */
  function handleClick(event) {
    const btn = event.target.closest('[data-ug-action], [data-ug-tab], [data-ug-skill]');
    if (!btn) return false;
    const state = Game._getState ? Game._getState() : null;
    if (!state) return false;

    /* Tab switching */
    if (btn.dataset.ugTab) {
      state._ugTab = btn.dataset.ugTab;
      Game._refresh();
      return true;
    }

    const action = btn.dataset.ugAction;
    let result;

    if (action === 'train') {
      result = train(state, btn.dataset.ugSkill);
    } else if (action === 'monthlyShow') {
      result = monthlyShow(state);
    } else if (action === 'specialShow') {
      result = specialShow(state);
    } else if (action === 'castingCouch') {
      result = castingCouch(state);
    } else if (action === 'acceptDecision') {
      result = resolveDecision(state, true);
    } else if (action === 'rejectDecision') {
      result = resolveDecision(state, false);
    } else if (action === 'tryPromotion') {
      result = tryPromotion(state);
    }

    if (result) {
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  Game.undergroundIdol = Object.freeze({
    ensure,
    isUndergroundIdol,
    train,
    monthlyShow,
    specialShow,
    castingCouch,
    resolveDecision,
    fallCheck,
    tryPromotion,
    monthly,
    render,
    handleClick,
  });
}(window));
