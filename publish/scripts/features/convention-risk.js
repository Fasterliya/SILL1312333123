(function initConventionRisk(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function isFemale(state) {
    return Game.hunterMode.identity(state).profile.gender === '女';
  }

  function roll(state, ts) {
    ts.riskCount = (ts.riskCount || 0) + 1;
    if (ts.riskCount >= 4) return null;
    var rollValue = Math.random();
    var health = state.stats.健康 || 50;
    var sleep = state.health.sleep || 7;
    var crowdScale = ts.eventScale === '大型' ? 0.14 : ts.eventScale === '标准' ? 0.09 : 0.05;
    var exhaustionChance = sleep < 6 ? 0.30 : sleep < 7 ? 0.18 : 0.08;
    var mishapChance = ts.role === 'coser' || ts.role === 'contestant'
      ? 0.06 : 0.01;
    var fraudChance = ts.node === 'market' || /market/.test(ts.node)
      ? 0.05 : 0.01;
    var safetyChance = crowdScale * (ts.safety < 40 ? 2.0 : ts.safety < 60 ? 1.0 : 0.4);
    var isFemaleChar = isFemale(state);
    var coserRisk = (ts.role === 'coser' || ts.role === 'contestant' || ts.intent === 'showcase') ? 1.5 : 1;
    var molestChance = isFemaleChar ? 0.02 * (ts.safety < 40 ? 2.2 : ts.safety < 60 ? 1.4 : 0.6) * coserRisk : 0;

    var totalChance = exhaustionChance + mishapChance + fraudChance + safetyChance + molestChance;
    if (rollValue < totalChance) {
      return pickRisk(state, ts, rollValue / totalChance);
    }
    return null;
  }

  function generateMolester(state, ts) {
    var age = U.between(22, 48);
    var person = U.person('漫展骚扰者', '', age, null, state.totalMonths);
    person.gender = '男';
    person.metCity = ts.hostCity;
    person.currentCity = ts.hostCity;
    Game.worldCulture.applyPerson(person, ts.hostCountry);
    U.setUniqueName(state, person, Game.worldCulture.profile(ts.hostCountry).locale);
    person.affection = U.between(0, 10);
    person.psychology = { sexAddiction: U.between(60, 95), trauma: U.between(10, 30) };
    state.travel.encounters.push(person);
    return person;
  }

  function pickRisk(state, ts, weighted) {
    var pool = [];
    var exhaustionWeight = ts.intent === 'compete' ? 0.55 : 0.45;
    pool.push({ type: 'exhaustion', title: '体力透支', weight: exhaustionWeight,
      text: '连续逛展让你的腰背酸痛，眼前开始发花。你找了个角落坐下，深呼吸了好一阵。',
      effect: function () { state.stats.健康 = U.clamp((state.stats.健康 || 0) - 12, 0, 100);
        state.health.sleep = U.clamp((state.health.sleep || 0) - 1, 3, 12);
        return '体力大幅消耗，接下来需要节制活动。'; } });

    if (ts.role === 'coser' || ts.role === 'contestant' || ts.intent === 'showcase') {
      var cosfailWeight = ts.intent === 'showcase' ? 0.35 : 0.25;
      pool.push({ type: 'cosfail', title: '服装意外', weight: cosfailWeight,
        text: '假发固定夹突然崩开，裙摆的暗扣也松了两颗。你狼狈地躲进洗手间紧急修理。',
        effect: function () { state.stats.心情 = U.clamp((state.stats.心情 || 0) - 18, 0, 100);
          ts.score = Math.max(0, (ts.score || 0) - 2);
          return '服装意外打击了你的信心，心情和展评都受到了影响。'; } });
    }

    if (ts.node === 'market' || /market/.test(ts.node || '')) {
      var fraudWeight = ts.intent === 'collect' ? 0.26 : 0.18;
      pool.push({ type: 'fraud', title: '遇骗', weight: fraudWeight,
        text: '你在摊位看到一款"限定绝版"手办，付款后发现是做工粗糙的盗版。摊主已经收摊离开了。',
        effect: function () {
          var loss = U.between(300, 1800);
          state.money = Math.max(0, (state.money || 0) - loss);
          state.stats.心情 = U.clamp((state.stats.心情 || 0) - 10, 0, 100);
          return `你损失了${Game.view.money(loss)}，心情也变得低落。`; } });
    }

    pool.push({ type: 'safety', title: '现场事故', weight: 0.12,
      text: '主舞台区突然发生推挤，几名观众被压倒在地。安保迅速介入，但你也受了些磕碰。',
      effect: function () { state.stats.健康 = U.clamp((state.stats.健康 || 0) - 8, 0, 100);
        state.stats.心情 = U.clamp((state.stats.心情 || 0) - 8, 0, 100);
        return '虽然没有大碍，但安全事件让你心有余悸。'; } });

    if (isFemale(state) && !state.pendingDecision) {
      pool.push({ type: 'molestation', title: '痴汉骚扰', weight: 0.14,
        text: '拥挤的人流中，你感到一双手从身后贴了上来。回头看去，一个中年男人正用身体紧贴着你，脸上挂着猥琐的笑容。',
        effect: function () {
          state.stats.心情 = U.clamp((state.stats.心情 || 0) - 20, 0, 100);
          ts.score = Math.max(0, (ts.score || 0) - 1);
          Game.psychology.addGuilt(state, 4);
          Game.stressSystem.add(state, 8, '漫展痴汉骚扰');
          var molester = generateMolester(state, ts);
          if (Game.encounterSystem && !state.pendingDecision) {
            Game.encounterSystem.init(state, molester, 'rape');
            return '那个男人趁乱抓住你的手腕，把你拖向消防通道……';
          }
          return '你用力挣脱，钻入了人群之中。但那种恶心的触感久久挥之不去。'; } });
    }

    var totalW = pool.reduce(function (s, r) { return s + r.weight; }, 0);
    var cursor = weighted * totalW;
    var chosen = null;
    for (var i = 0; i < pool.length; i += 1) {
      cursor -= pool[i].weight;
      if (cursor <= 0 || i === pool.length - 1) { chosen = pool[i]; break; }
    }
    return chosen;
  }

  function applyRisk(state, ts, risk) {
    if (!risk) return;
    var desc = risk.effect();
    ts.path.push('risk:' + risk.type);
    ts.feedback = risk.text + ' ' + desc;
    if (risk.type !== 'molestation') {
      Game.lifeDirector.addLog(state, '漫展' + risk.title, risk.text, 'normal');
    } else {
      Game.lifeDirector.addLog(state, '漫展骚扰事件', risk.text, 'milestone');
      Game.psychology.addCorruption(state, 3);
    }
  }

  function checkHealthAfterConvention(state, ts) {
    var health = state.stats.健康 || 0;
    var sleep = state.health.sleep || 7;
    if (sleep < 5) {
      state.stats.健康 = U.clamp(health - 8, 0, 100);
      Game.lifeDirector.addLog(state, '展后病', '连续熬夜加奔波让你在返程后发起了低烧。好好休息几天吧。', 'normal');
      return true;
    }
    if (health < 30) {
      Game.lifeDirector.addLog(state, '身体预警', '你的身体状况已经亮起红灯，建议减少外出休养一段时间。', 'normal');
      return true;
    }
    return false;
  }

  function rollStalking(state, ts) {
    if (!isFemale(state) || state.pendingDecision) return;
    if (ts.score < 13) return;
    var base = 0.03;
    if (ts.eventScale === '大型') base *= 2;
    if ((state.cityLife?.reputation || 0) > 40) base *= 1.5;
    if (ts.role === 'coser' || ts.role === 'contestant') base *= 1.4;
    if (Math.random() > base) return;
    state.pendingDecision = {
      type: 'stalking',
      city: ts.hostCity,
      scale: ts.eventScale || '标准',
      score: ts.score,
    };
  }

  function resolveStalking(state, choiceId) {
    var d = state.pendingDecision;
    if (!d || d.type !== 'stalking') return { ok: false, message: '没有待处理的尾随事件' };
    if (choiceId === 'call_out') {
      var negotiateOk = Game.characterAttributes.playerValue(state, '交涉') >= 25;
      if (negotiateOk || Math.random() < 0.55) {
        state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + 2, 0, 100);
        Game.lifeDirector.addLog(state, '脱险',
          '你大声呼喊引来路人的注意。那个跟踪你的人慌张地消失在夜色中。', 'good');
        state.pendingDecision = null;
        return { ok: true, message: '你成功呼救，跟踪者逃离了。' };
      }
      return enterMolestation(state, d);
    }
    if (choiceId === 'hide') {
      var physiqueOk = Game.characterAttributes.playerValue(state, '体能') >= 22;
      if (physiqueOk || Math.random() < 0.5) {
        Game.lifeDirector.addLog(state, '甩脱',
          '你拐进拥挤的商业街，利用人流和地形甩掉了身后的影子。回到家时已经气喘吁吁。', 'normal');
        Game.stressSystem.add(state, 6, '被尾随的恐惧');
        Game.psychology.addTrauma(state, 3, '被跟踪');
        state.pendingDecision = null;
        return { ok: true, message: '你甩掉了跟踪者，但心里留下了阴影。' };
      }
      return enterMolestation(state, d);
    }
    if (choiceId === 'confront') {
      var cunningOk = Game.characterAttributes.playerValue(state, '心计') >= 28;
      if (cunningOk || Math.random() < 0.40) {
        Game.lifeDirector.addLog(state, '对峙',
          '你猛地转身，直视那个人的眼睛。"别再跟着我了。"你的声音冷得像冰。他愣了一下，讪讪地转身离开。', 'good');
        state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + 1, 0, 100);
        state.pendingDecision = null;
        return { ok: true, message: '你正面震慑住了对方。' };
      }
      return enterMolestation(state, d);
    }
    return { ok: false, message: '无效的选择' };
  }

  function enterMolestation(state, d) {
    var person = U.person('尾随者', '', U.between(25, 45), null, state.totalMonths);
    person.gender = '男';
    person.metCity = d.city;
    person.currentCity = d.city;
    Game.worldCulture.applyPerson(person, '华夏');
    U.setUniqueName(state, person, (Game.worldCulture.profile('华夏') || {}).locale || 'zh');
    person.psychology = { sexAddiction: U.between(70, 98), trauma: 0 };
    state.travel.encounters.push(person);
    Game.psychology.addTrauma(state, 8, '被跟踪');
    Game.stressSystem.add(state, 15, '被尾随侵犯');
    if (Game.encounterSystem) {
      Game.encounterSystem.init(state, person, 'rape');
    }
    state.pendingDecision = null;
    Game.lifeDirector.addLog(state, '尾随袭击',
      '那个人突然加快脚步从背后冲了上来，一只手捂住你的嘴，另一只手把你拖进了旁边的暗巷……', 'milestone');
    return { ok: true, message: '你没能逃脱……' };
  }

  function renderStalkingDecision(state) {
    var d = state.pendingDecision;
    if (!d || d.type !== 'stalking') return null;
    return {
      title: '回家的路上',
      text: '漫展结束后，你独自走向地铁站。身后似乎有脚步声一直跟随——在无人的街角，那个影子越来越近。',
      options: [
        { value: 'call_out', label: '大声呼救 · 交涉检定' },
        { value: 'hide', label: '躲入人流 · 体能检定' },
        { value: 'confront', label: '正面质问 · 心计检定' },
      ],
    };
  }

  function resolve(state, choiceId) {
    return resolveStalking(state, choiceId);
  }

  function renderDecision(state) {
    return renderStalkingDecision(state);
  }

  Game.conventionRisk = Object.freeze({ roll, applyRisk, checkHealthAfterConvention, isFemale,
    rollStalking, resolve, renderDecision,
  });
}(window));
