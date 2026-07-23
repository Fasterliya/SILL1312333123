(function initCradleInstitution(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function ensure(state) {
    var current = state.cradle;
    state.cradle = current && typeof current === 'object' ? current : {
      imprisoned: false,
      reformType: '',
      reformProgress: 0,
      mental: 100,
      imprisonedMonth: 0,
      city: '',
      inmateId: '',
      dailyLog: [],
      lastEscapeAttempt: 0,
      escapeAttempts: 0,
      soldToJapan: false,
      orderCharacter: '',
      orderSeries: '',
      originalName: '',
      captureAge: null,
      cosplayBonded: 0,
      cosplayBondedAt: 0,
      underPatron: false,
      patronId: '',
      patronName: '',
      patronAge: 0,
      patronWealth: '',
      patronPersonality: '',
      patronPersonaType: '',
      patronAffection: 50,
      patronAbuse: 0,
      pregnantByPatron: false,
      pregnancyDueMonth: 0,
      childrenWithPatron: 0,
      patronMonthlyLog: [],
      patronEscapeProgress: 0,
      patronEscapeCooldown: 0,
      patronObserveCount: 0,
      patronPhase: '',
      patronPregnancyCooldown: 0,
      cosplayLevel: 0,
      cosplayEssence: 0,
      cosplayCompulsion: 0,
      cosplayResistCount: 0,
      cosplaySubmitCount: 0,
      cosplayLastAbsorbMonth: -1,
      cosplayEvolutionLog: [],
    };
    var c = state.cradle;
    c.imprisoned = !!c.imprisoned;
    c.reformType = typeof c.reformType === 'string' ? c.reformType : '';
    c.reformProgress = Math.max(0, Math.min(100, Number(c.reformProgress) || 0));
    c.mental = Math.max(0, Math.min(100, Number(c.mental) || 0));
    c.imprisonedMonth = Number.isFinite(c.imprisonedMonth) ? c.imprisonedMonth : 0;
    c.city = typeof c.city === 'string' ? c.city : '';
    c.inmateId = typeof c.inmateId === 'string' ? c.inmateId : '';
    c.dailyLog = Array.isArray(c.dailyLog) ? c.dailyLog.slice(-20) : [];
    c.lastEscapeAttempt = Number.isFinite(c.lastEscapeAttempt) ? c.lastEscapeAttempt : 0;
    c.escapeAttempts = Math.max(0, Number(c.escapeAttempts) || 0);
    c.soldToJapan = !!c.soldToJapan;
    c.orderCharacter = typeof c.orderCharacter === 'string' ? c.orderCharacter : '';
    c.orderSeries = typeof c.orderSeries === 'string' ? c.orderSeries : '';
    c.originalName = typeof c.originalName === 'string' ? c.originalName : '';
    c.captureAge = Number.isFinite(c.captureAge) ? c.captureAge : null;
    if (c.soldToJapan && c.imprisoned) c.imprisoned = false;
    c.cosplayBonded = Math.max(0, Math.min(3, Number(c.cosplayBonded) || 0));
    c.cosplayBondedAt = Number.isFinite(c.cosplayBondedAt) ? c.cosplayBondedAt : 0;
    c.underPatron = !!c.underPatron;
    c.patronId = typeof c.patronId === 'string' ? c.patronId : '';
    c.patronName = typeof c.patronName === 'string' ? c.patronName : '';
    c.patronAge = Math.max(25, Number(c.patronAge) || 0);
    c.patronWealth = typeof c.patronWealth === 'string' ? c.patronWealth : '';
    c.patronPersonality = typeof c.patronPersonality === 'string' ? c.patronPersonality : '';
    c.patronPersonaType = ['暴君', '温柔控制', '冷漠商人'].includes(c.patronPersonaType) ? c.patronPersonaType : '';
    c.patronAffection = Math.max(0, Math.min(100, Number(c.patronAffection) || 50));
    c.patronAbuse = Math.max(0, Math.min(100, Number(c.patronAbuse) || 0));
    c.pregnantByPatron = !!c.pregnantByPatron;
    c.pregnancyDueMonth = Number.isFinite(c.pregnancyDueMonth) ? c.pregnancyDueMonth : 0;
    c.childrenWithPatron = Math.max(0, Number(c.childrenWithPatron) || 0);
    c.patronMonthlyLog = Array.isArray(c.patronMonthlyLog) ? c.patronMonthlyLog.slice(-12) : [];
    c.patronEscapeProgress = Math.max(0, Math.min(100, Number(c.patronEscapeProgress) || 0));
    c.patronEscapeCooldown = Math.max(0, Number(c.patronEscapeCooldown) || 0);
    c.patronObserveCount = Math.max(0, Math.min(20, Number(c.patronObserveCount) || 0));
    c.patronPhase = typeof c.patronPhase === 'string' ? c.patronPhase : '';
    c.patronPregnancyCooldown = Math.max(0, Number(c.patronPregnancyCooldown) || 0);
    c.cosplayLevel = Math.max(0, Math.min(5, Number(c.cosplayLevel) || 0));
    c.cosplayEssence = Math.max(0, Number(c.cosplayEssence) || 0);
    c.cosplayCompulsion = Math.max(0, Number(c.cosplayCompulsion) || 0);
    c.cosplayResistCount = Math.max(0, Number(c.cosplayResistCount) || 0);
    c.cosplaySubmitCount = Math.max(0, Number(c.cosplaySubmitCount) || 0);
    c.cosplayLastAbsorbMonth = Number.isFinite(c.cosplayLastAbsorbMonth) ? c.cosplayLastAbsorbMonth : -1;
    c.cosplayEvolutionLog = Array.isArray(c.cosplayEvolutionLog) ? c.cosplayEvolutionLog.slice(-10) : [];
    if (c.underPatron && c.soldToJapan) c.soldToJapan = false;
    return c;
  }

  function isImprisoned(state) {
    ensure(state);
    return !!(state.cradle.imprisoned || state.cradle.underPatron);
  }

  function isUnderPatron(state) {
    ensure(state);
    return !!state.cradle.underPatron;
  }

  function tryCradleEntrap(state) {
    var c = ensure(state);
    if (c.imprisoned) return false;
    var age = U.age(state);
    if (state.gender !== '女' || age < 12 || age > 17) return false;
    var culture = state.location ? state.location.country : '华夏';
    if (culture !== '华夏') return false;

    var risk = 0;
    var father = state.family.find(function (p) { return p.relation === '父亲'; });
    var mother = state.family.find(function (p) { return p.relation === '母亲'; });
    var parentAffection = Math.min(
      father ? (father.affection || 50) : 50,
      mother ? (mother.affection || 50) : 50
    );
    if (parentAffection < 30) risk += 4;
    if (state.familyWealth < 50000) risk += 3;
    var studyScore = state.education.study || 0;
    if (studyScore < 40) risk += 3;
    if (state.career.jobId === 'idol-underground' || state.health.stdHistory && state.health.stdHistory.length > 0) risk += 2;

    if (risk <= 0 || Math.random() * 100 > risk) return false;

    c.imprisoned = true;
    c.imprisonedMonth = state.totalMonths;
    c.city = state.location.city;
    c.inmateId = 'CR-' + state.totalMonths + '-' + Math.random().toString(36).slice(2, 6);
    c.originalName = state.name;
    c.captureAge = age;
    c.mental = 100;
    c.reformProgress = 0;
    c.dailyLog = [];
    c.escapeAttempts = 0;
    c.soldToJapan = false;

    var roll = Math.random();
    if (roll < 0.55) {
      c.reformType = 'japanese';
      c.orderCharacter = '';
      c.orderSeries = '';
      Game.lifeDirector.addLog(state, '摇篮改造机构', '你的父母说送你去一所"全封闭特训学校"提高成绩。你走进那栋灰色建筑后，大门在你身后锁上了。这里不是学校。', 'danger');
    } else {
      c.reformType = 'cosplay';
      pickCosplayOrder(state, c);
      Game.lifeDirector.addLog(state, '摇篮改造机构', '一个自称"演艺培训中心"的人在学校门口找到了你。他们说发现了你的cosplay天赋——要带你去东京发展。你跟着他们走进了一辆没有窗户的面包车。', 'danger');
    }
    state.timeSpeed = 0;
    return true;
  }

  function pickCosplayOrder(state, c) {
    var catalog = Game.cosplayCatalog;
    if (!catalog || !catalog.items) {
      c.reformType = 'japanese';
      return;
    }
    var chars = catalog.items.filter(function (item) {
      return item.name !== '无' && item.character && item.series;
    });
    if (!chars.length) {
      c.reformType = 'japanese';
      return;
    }
    var picked = chars[Math.floor(Math.random() * chars.length)];
    c.orderCharacter = picked.character;
    c.orderSeries = picked.series;
    c.reformType = 'cosplay';
  }

  function applyJapaneseIdentity(state, c) {
    if (state.profile.nameCulture === '日本') return false;
    var formerName = c.originalName || state.name;
    var changedName = Game.nameSystem.makeName('', '女', 'ja-JP');
    state.profile.birthName = state.profile.birthName || formerName;
    state.profile.cradleFormerName = formerName;
    state.profile.nameHistory = Array.isArray(state.profile.nameHistory)
      ? state.profile.nameHistory : [];
    if (!state.profile.nameHistory.some(function (item) {
      return item.from === formerName && item.to === changedName;
    })) {
      state.profile.nameHistory.push({
        from: formerName,
        to: changedName,
        country: '日本',
        reason: '摇篮身份改造',
      });
    }
    state.name = changedName;
    state.profile.nameCulture = '日本';
    return true;
  }

  var COSPLAY_CHAR_TRAITS = {
    '傲娇': ['傲娇', '执着', '坚毅'],
    '温柔': ['安静', '温顺', '文雅'],
    '冷酷': ['清冷', '沉稳', '孤傲'],
    '元气': ['明快', '灵动', '阳光'],
    '天然呆': ['青涩', '单纯', '灵动'],
    '女王': ['清冷', '优雅', '坚毅'],
  };

  function cosplayBondingLabel(stage) {
    if (stage >= 3) return '融合完成——镜中的人是「' + '' + '」，不是你';
    if (stage >= 2) return '半身相融——皮肤与织物之间不再有界限';
    if (stage >= 1) return '初次黏合——Cos服开始吸附在你的皮肤上';
    return '';
  }

  function applyCosplayBonding(state, c) {
    if (c.reformType !== 'cosplay') return;
    var progress = c.reformProgress;
    var prevBonded = c.cosplayBonded;

    if (progress >= 90 && prevBonded < 3) {
      c.cosplayBonded = 3;
      c.cosplayBondedAt = state.totalMonths;
      c.dailyLog.unshift('你已经分不清自己和「' + c.orderCharacter + '」的区别了。Cos服的每一根纤维都长进了你的皮肤。你伸手摸自己的脸——指尖触到的不是原本的轮廓，而是角色的面部线条。');
      Game.lifeDirector.addLog(state, '身份覆写', '幻梦Cos服完成了最终融合。你的身体、面容和一部分记忆都变成了「' + c.orderCharacter + '」。你不知道自己是谁了。', 'danger');
    } else if (progress >= 70 && prevBonded < 2) {
      c.cosplayBonded = 2;
      c.cosplayBondedAt = state.totalMonths;
      state.profile.bodyType = c.orderCharacter.indexOf('少女') >= 0 ? '娇小纤细' : '匀称';
      state.profile.hairstyle = U.random(Game.config.appearance.hairstyle.slice(4, 9));
      state.profile.temperament = c.orderCharacter.indexOf('傲娇') >= 0 ? '清冷' : U.random(Game.config.appearance.temperament.slice(4));
      if (state.profile.clothing) {
        state.profile.clothing.top = c.orderSeries + ' · ' + c.orderCharacter;
      }
      state.stats['魅力'] = Math.min(100, (state.stats['魅力'] || 50) + U.between(10, 20));
      c.dailyLog.unshift('Cos服的材质正在渗入你的皮下。你想要找到拉链——但背部只有一片完整的、有温度的皮肤。镜中映出的脸已经不再完全是你自己。');
      Game.lifeDirector.addLog(state, '幻梦半融合', 'Cos服已经无法脱下——它正在融入你的身体。你的面部轮廓、体态开始倾向于「' + c.orderCharacter + '」。', 'danger');
    } else if (progress >= 40 && prevBonded < 1) {
      c.cosplayBonded = 1;
      c.cosplayBondedAt = state.totalMonths;
      if (state.profile.clothing) {
        state.profile.clothing.top = c.orderSeries + ' · ' + c.orderCharacter;
      }
      state.profile.cosplay = c.orderSeries + ' · ' + c.orderCharacter;
      c.dailyLog.unshift('你忽然意识到——这套Cos服找不到任何拉链或纽扣。它贴在你的皮肤上，温热的，像是另一层皮肤。你想撕开它，但指尖只摸到了完整的织物。');
      Game.lifeDirector.addLog(state, '幻梦黏合', 'Cos服开始吸附在你的身体表面。它不再是衣物——它正在变得像你身体的一部分。', 'warning');
    }

    if (c.cosplayBonded >= 2 && state.profile) {
      state.profile.cosplay = c.orderSeries + ' · ' + c.orderCharacter;
      state.profile.bodyType = c.orderCharacter.indexOf('少女') >= 0 ? '娇小纤细' : '匀称';
      state.profile.hairstyle = U.random(Game.config.appearance.hairstyle.slice(4, 9));
      if (state.profile.clothing) {
        state.profile.clothing.top = c.orderSeries + ' · ' + c.orderCharacter;
      }
    }

    if (c.cosplayBonded >= 3 && state.profile) {
      state.profile.temperament = U.random(Game.config.appearance.temperament.slice(4));
      state.profile.personality = U.random(Game.config.personalities);
      state.profile.cosplay = c.orderSeries + ' · ' + c.orderCharacter;
    }
  }

  function monthly(state) {
    var c = ensure(state);
    if (c.patronPhase === 'escaped' || c.patronPhase === 'fugitive') {
      monthlyFugitive(state, c);
      return;
    }
    if (c.underPatron) {
      monthlyPatron(state, c);
      return;
    }
    if (c.imprisoned) {
      monthlyPrison(state, c);
    } else {
      tryCradleEntrap(state);
    }
  }

  function monthlyPrison(state, c) {
    c.reformProgress = Math.min(100, c.reformProgress + U.between(5, 10));
    c.mental = Math.max(0, c.mental - U.between(3, 7));

    applyCosplayBonding(state, c);

    var roll = Math.random();
    if (roll < 0.35) {
      c.mental = Math.max(0, c.mental - U.between(5, 10));
      state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(2, 5));
      c.dailyLog.unshift('电击惩罚——你因为拒绝用日语回答问题被绑在电椅上。');
    } else if (roll < 0.60) {
      c.dailyLog.unshift('语言测试——看守用日语向你提问。你的回答让他们勉强满意。');
      c.reformProgress = Math.min(100, c.reformProgress + U.between(2, 4));
    } else if (roll < 0.78) {
      c.dailyLog.unshift('交欢调教——守卫强迫你对一个单向镜后的"观察员"进行表演。');
      c.mental = Math.max(0, c.mental - U.between(8, 15));
      state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(3, 8));
      if (state.psychology && typeof state.psychology === 'object') {
        state.psychology.sexAddiction = Math.min(100, (state.psychology.sexAddiction || 0) + U.between(2, 4));
      }
    } else if (roll < 0.88) {
      c.dailyLog.unshift('另一名囚徒偷偷递给你半块面包。她小声说："我叫' + U.random(['小月','阿希','玲子','美晴']) + '，也被关在这里。"');
      c.mental = Math.min(100, c.mental + U.between(1, 3));
    } else {
      c.dailyLog.unshift('禁闭室——你被关进了一个没有光的小房间。不知道过了多久。');
      c.mental = Math.max(0, c.mental - U.between(10, 18));
    }
    c.dailyLog = c.dailyLog.slice(0, 20);

    if (c.reformProgress >= 60) {
      if (applyJapaneseIdentity(state, c)) {
        c.dailyLog.unshift('改造第' + (state.totalMonths - c.imprisonedMonth) + '个月——你已经不记得自己的华夏名字了。现在你叫' + state.name + '。');
      }
    }

    if (c.reformProgress >= 100) {
      sellToJapan(state, c);
    }
  }

  function generatePatron(state, c) {
    var surnames = ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤'];
    var givenNames = ['健一', '太郎', '浩二', '誠', '大輔', '和彦', '直樹', '陽一', '隆', '正男'];
    var personalities = U.random(Game.config.personalities);
    var wealthLevel = Math.random() < 0.7 ? '富裕' : '富豪';
    var age = U.between(38, 58);
    var personaRoll = Math.random();
    var personaType = personaRoll < 0.40 ? '暴君' : (personaRoll < 0.75 ? '温柔控制' : '冷漠商人');

    var patron = {
      id: 'patron-' + state.totalMonths + '-' + Math.random().toString(36).slice(2, 7),
      name: U.random(surnames) + ' ' + U.random(givenNames),
      gender: '男',
      age: age,
      personality: U.random(Game.config.personalities),
      job: wealthLevel === '富豪' ? '财阀社长' : '企业高管',
      city: state.location.city,
      culture: '日本',
    };

    c.patronId = patron.id;
    c.patronName = patron.name;
    c.patronAge = age;
    c.patronWealth = wealthLevel;
    c.patronPersonality = patron.personality;
    c.patronPersonaType = personaType;
    c.patronAffection = 45 + U.between(0, 15);
    c.patronAbuse = 0;
    c.patronEscapeProgress = 0;
    c.patronObserveCount = 0;
    c.patronEscapeCooldown = 0;
    c.patronMonthlyLog = [];
    c.patronPregnancyCooldown = 0;
    c.patronPhase = 'new';
    c.childrenWithPatron = 0;
    c.pregnantByPatron = false;
    c.pregnancyDueMonth = 0;

    var jpCities = [
      { city: '东京', province: '东京都', country: '日本', tier: 1, cost: 0 },
      { city: '大阪', province: '大阪府', country: '日本', tier: 1, cost: 0 },
      { city: '京都', province: '京都府', country: '日本', tier: 2, cost: 0 },
      { city: '横滨', province: '神奈川县', country: '日本', tier: 2, cost: 0 },
    ];
    var target = jpCities[Math.floor(Math.random() * jpCities.length)];
    state.location = { province: target.province, city: target.city, country: target.country };

    if (!state.worldPeople.some(function (p) { return p.id === patron.id; })) {
      state.worldPeople.push(patron);
    }
    Game.systemsState.ensurePerson(state, patron);

    return patron;
  }

  function sellToJapan(state, c) {
    applyJapaneseIdentity(state, c);
    generatePatron(state, c);

    c.imprisoned = false;
    c.underPatron = true;
    c.soldToJapan = false;
    c.patronPhase = 'new';

    state.career.job = '无';
    state.career.jobId = '';
    state.career.company = '';
    state.career.salary = 0;
    state.career.level = 0;
    state.career.exp = 0;
    state.career.performance = 0;

    state.profile.nameCulture = '日本';

    var patronMonths = c.reformProgress >= 100
      ? (state.totalMonths - c.imprisonedMonth) : '未知';
    Game.lifeDirector.addLog(state, '卖到日本',
      '你在' + patronMonths + '个月的改造后被卖到了日本' + state.location.city + '。' +
      '一个名叫' + c.patronName + '的' + c.patronWealth + c.patronAge + '岁男性买下了你。' +
      '你被带进了一栋被高墙环绕的日式宅邸。大门在你身后关上——你已经是他的"家用情人"了。' +
      (c.reformType === 'cosplay' ? '你穿着「' + c.orderCharacter + '」的Cos服，而他正是为此支付了额外费用。' : ''),
      'milestone');
    state.timeSpeed = 1;
  }

  function playerAction(state, action) {
    var c = ensure(state);
    if (!c.imprisoned) return { ok: false, message: '你不在囚禁中' };

    switch (action) {
      case 'obey':
        c.reformProgress = Math.min(100, c.reformProgress + U.between(5, 10));
        c.mental = Math.max(0, c.mental - U.between(1, 3));
        c.dailyLog.unshift('你顺从地完成了今日的改造训练。守卫给了你一份额外的日式便当。');
        if (c.reformProgress >= 100) sellToJapan(state, c);
        return { ok: true, message: '你选择了顺从。改造进度加快了。' };
      case 'resist':
        c.reformProgress = Math.min(100, c.reformProgress + U.between(0, 2));
        c.mental = Math.max(0, c.mental - U.between(8, 15));
        c.dailyLog.unshift('你拼命反抗今天的训练。守卫用电棍让你安静了下来。你的手腕上多了新的淤青。');
        return { ok: true, message: '你选择了抵抗。身心都受到了惩罚。' };
      case 'observe':
        c.mental = Math.max(0, c.mental - U.between(2, 5));
        c.escapeAttempts = Math.min(10, c.escapeAttempts + 1);
        c.dailyLog.unshift('你假装顺从，暗中观察守卫的巡逻时间和门禁弱点。你记下了至少一处可能的漏洞。');
        return { ok: true, message: '你观察到了逃跑的机会。累计观察 ' + c.escapeAttempts + '/3 次。' };
      case 'feign':
        c.reformProgress = Math.min(100, c.reformProgress + U.between(3, 6));
        c.mental = Math.max(0, c.mental - U.between(0, 2));
        c.dailyLog.unshift('你假装已经完全被改造——说日语、行礼、微笑。看守认为你"进步很快"，放松了警惕。');
        return { ok: true, message: '你假装失忆。守卫放松了戒备。' };
      case 'escape':
        if (c.escapeAttempts < 3) return { ok: false, message: '你还没有观察到足够的逃跑机会（需要3次观察）' };
        var chance = 0.08;
        if (c.mental >= 60) chance += 0.10;
        if (c.reformProgress <= 30) chance += 0.08;
        if (c.soldToJapan) chance += 0.15;
        c.lastEscapeAttempt = state.totalMonths;
        if (Math.random() < chance) {
          c.imprisoned = false;
          c.mental = Math.max(0, c.mental - 20);
          if (state.psychology && typeof state.psychology === 'object') {
            state.psychology.trauma = Math.min(100, (state.psychology.trauma || 0) + U.between(20, 30));
          }
          var father2 = state.family.find(function (p) { return p.relation === '父亲'; });
          var mother2 = state.family.find(function (p) { return p.relation === '母亲'; });
          if (father2) father2.affection = Math.max(0, (father2.affection || 50) - 50);
          if (mother2) mother2.affection = Math.max(0, (mother2.affection || 50) - 50);
          Game.lifeDirector.addLog(state, '越狱成功', '你在一个雷雨夜从摇篮机构逃了出来。守卫的警报声在你背后响起，但你没有回头。你永远不会忘记那条走廊。', 'milestone');
          return { ok: true, message: '你成功逃出了摇篮机构！' };
        }
        c.reformProgress = Math.min(100, c.reformProgress + U.between(10, 20));
        c.mental = Math.max(0, c.mental - U.between(15, 25));
        c.dailyLog.unshift('逃跑失败——你被拖了回来。看守笑着说："还有' + (6 - Math.floor(c.reformProgress / 100 * 6)) + '个月就能把你卖掉。"');
        return { ok: false, message: '逃跑失败。改造进度被迫加速。' };
      default:
        return { ok: false, message: '未知行动' };
    }
  }

  function monthlyPatron(state, c) {
    if (c.patronEscapeCooldown > 0) c.patronEscapeCooldown -= 1;

    if (c.pregnantByPatron) {
      if (state.totalMonths >= c.pregnancyDueMonth) {
        c.pregnantByPatron = false;
        c.pregnancyDueMonth = 0;
        c.childrenWithPatron += 1;
        c.patronPregnancyCooldown = 4;
        state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(10, 20));
        state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(10, 18));
        c.patronMonthlyLog.unshift('你生下了一个孩子。' + c.patronName + '只看了一眼婴儿的性别，就让佣人抱走了。你没有机会抱一抱自己的孩子。');
        Game.lifeDirector.addLog(state, '金主的孩子', '你在' + c.patronName + '的宅邸中生下了第' + c.childrenWithPatron + '个孩子。孩子被立即抱走，你甚至没能听到他的第一声啼哭。', 'warning');
      } else {
        var pregMonth = 9 - (c.pregnancyDueMonth - state.totalMonths);
        if (pregMonth === 4 && !c.patronMonthlyLog.some(function (l) { return l.indexOf('腹部开始隆起') >= 0; })) {
          c.patronMonthlyLog.unshift(c.patronName + '注意到了你微微隆起的腹部。他的表情十分满意——这正是他买下你的目的之一。');
        }
        if (pregMonth === 8) {
          state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(3, 6));
        }
      }
    } else if (c.patronPregnancyCooldown <= 0 && Math.random() < 0.22 && state.totalMonths - (c.pregnancyDueMonth || c.imprisonedMonth) >= 4) {
      c.pregnantByPatron = true;
      c.pregnancyDueMonth = state.totalMonths + 9;
      c.patronMonthlyLog.unshift(c.patronName + '今晚没有采取任何措施。事后他拍了拍你的肚子说："希望这次能中。"你感到一阵寒意从脊椎蔓延到指尖。');
      Game.lifeDirector.addLog(state, '被强迫怀孕', c.patronName + '开始认真让你为他生育后代。今晚他没有采取任何避孕措施。', 'danger');
    }

    if (c.patronPregnancyCooldown > 0 && !c.pregnantByPatron) c.patronPregnancyCooldown -= 0.5;

    var event = (Game.cradlePatronEvents && Game.cradlePatronEvents.pickEvent)
      ? Game.cradlePatronEvents.pickEvent(state, c)
      : null;
    if (!event) return;

    var effects = event.e || { a: 0, b: 0, t: 0, h: 0, e: 0, m: 0 };
    c.patronMonthlyLog.unshift(event.t(c.patronName));
    c.patronMonthlyLog = c.patronMonthlyLog.slice(0, 12);

    c.patronAffection = Math.max(0, Math.min(100, c.patronAffection + (effects.a || 0)));
    c.patronAbuse = Math.max(0, Math.min(100, c.patronAbuse + (effects.b || 0)));
    state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + (effects.t || 0));
    state.stats['健康'] = Math.max(1, Math.min(100, state.stats['健康'] + (effects.h || 0)));
    c.patronEscapeProgress = Math.max(0, Math.min(100, c.patronEscapeProgress + (effects.e || 0)));
    if (effects.m && (effects.m > 0)) {
      if (!state.money) state.money = 0;
      state.money = Math.max(0, (state.money || 0) + effects.m);
    }

    if (c.patronAffection >= 70 && c.patronAbuse < 30 && c.patronPhase !== 'favored') {
      c.patronPhase = 'favored';
      c.patronMonthlyLog.unshift(c.patronName + '开始对你温柔了一些。他允许你在花园里散步——当然，仍然有守卫跟在身后。但这已经是难得的自由了。');
    }

    if (c.patronAbuse >= 80 && state.stats['健康'] <= 20 && Math.random() < 0.10) {
      state.stats['健康'] = Math.max(1, state.stats['健康'] - U.between(15, 25));
      Game.lifeDirector.addLog(state, '命悬一线', c.patronName + '今晚差点杀了你。你躺在血泊中，意识模糊，听到远处传来救护车的声音——也许是邻居报了警。', 'danger');
    }
  }

  function patronAction(state, action) {
    var c = ensure(state);
    if (!c.underPatron) return { ok: false, message: '你不在金主囚禁中' };

    switch (action) {
      case 'patron-endure':
        c.patronAbuse = Math.max(0, c.patronAbuse - U.between(2, 5));
        c.patronAffection = Math.min(100, c.patronAffection + U.between(1, 3));
        c.patronMonthlyLog.unshift('你默默忍耐了一切。' + c.patronName + '似乎对你的"乖巧"感到满意，今晚没有再为难你。');
        state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(2, 5));
        return { ok: true, message: '你选择了忍耐。暂时的安全以内心的麻木为代价。' };
      case 'patron-please':
        c.patronAffection = Math.min(100, c.patronAffection + U.between(5, 10));
        c.patronAbuse = Math.max(0, c.patronAbuse - U.between(3, 8));
        c.patronMonthlyLog.unshift('你主动讨好' + c.patronName + '——为他斟酒、按摩肩膀、用刚学会的日语说好听话。他很高兴，赏了你一枚金簪。');
        if (!state.money) state.money = 0;
        state.money += c.patronWealth === '富豪' ? U.between(500, 2000) : U.between(100, 500);
        return { ok: true, message: '讨好有了回报。金主心情好了，还给了你一些零花钱。' };
      case 'patron-observe':
        c.patronObserveCount = Math.min(20, c.patronObserveCount + 1);
        c.patronEscapeProgress = Math.min(100, c.patronEscapeProgress + U.between(4, 10));
        c.patronMonthlyLog.unshift('你假装顺从地熟悉宅邸的每一个角落。守卫换班的时间规律、后门锁的类型、围墙上最低的那一段——你全部记在心里。');
        return { ok: true, message: '你记下了宅邸的漏洞。逃离计划逐渐成形。（观察' + c.patronObserveCount + '次，进度' + c.patronEscapeProgress + '/100）' };
      case 'patron-befriend':
        if (Math.random() < 0.45) {
          c.patronEscapeProgress = Math.min(100, c.patronEscapeProgress + U.between(8, 15));
          c.patronMonthlyLog.unshift('你和那个同样被卖来的女仆成了朋友。她偷偷告诉你宅邸后门的钥匙放在守卫休息室第三个抽屉里。');
          return { ok: true, message: '你赢得了一个盟友。她给了你宝贵的情报。' };
        }
        c.patronAbuse = Math.max(0, c.patronAbuse + U.between(5, 10));
        c.patronMonthlyLog.unshift('你想接近一个看起来友善的守卫，但他把你的示好理解成了别的意思。' + c.patronName + '知道了这件事，非常愤怒。');
        return { ok: false, message: '你的示好被误解了。金主知道后大发雷霆。' };
      case 'patron-escape':
        if (c.patronEscapeProgress < 50) return { ok: false, message: '你对宅邸的了解还不够深入（需要逃脱进度50+，当前' + c.patronEscapeProgress + '）' };
        if (c.patronEscapeCooldown > 0) return { ok: false, message: '守卫的巡逻最近加强了许多，需要等待' + c.patronEscapeCooldown + '个月' };
        var escapeChance = 0.04 + (c.patronEscapeProgress - 50) * 0.005;
        if (c.patronPhase === 'favored') escapeChance += 0.06;
        if (c.patronAffection <= 30) escapeChance += 0.08;
        if (c.patronAbuse >= 70) escapeChance += 0.05;
        if (c.patronObserveCount >= 8) escapeChance += 0.05;
        if (c.pregnantByPatron) escapeChance -= 0.08;
        if (c.childrenWithPatron >= 2) escapeChance -= 0.04;

        if (Math.random() < escapeChance) {
          c.underPatron = false;
          c.patronPhase = 'escaped';
          state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(15, 25));
          state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(8, 15));
          state.career.job = '无';
          state.career.jobId = '';
          state.career.salary = 0;
          state.timeSpeed = 1;
          Game.lifeDirector.addLog(state, '金主逃离', '你在一个雨夜翻过了那座高墙。守卫的喊声被你甩在了身后。' + c.patronName + '的宅邸在你的视线中越变越小。你自由了——至少在身体上。', 'milestone');
          return { ok: true, message: '你成功逃离了金主的宅邸！' };
        }
        c.patronEscapeCooldown = 2;
        c.patronEscapeProgress = Math.max(0, c.patronEscapeProgress - U.between(20, 35));
        c.patronAbuse = Math.min(100, c.patronAbuse + U.between(10, 20));
        c.patronAffection = Math.max(0, c.patronAffection - U.between(10, 20));
        c.patronMonthlyLog.unshift('你试图逃跑，但在翻墙时被守卫发现了。' + c.patronName + '亲自审问了你。他不打你——只是说"下次我会把你关在地下室里"。你信了。');
        state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(5, 10));
        return { ok: false, message: '逃跑失败。金主的监视变得更加严密了。' };
      default:
        return { ok: false, message: '未知行动' };
    }
  }

  var FUGITIVE_EVENTS = [
    { text: '你在便利店买了一份便当和一瓶水——用最后剩下的零钱。收银员多看了你一眼，但什么都没问。', h: 0, m: -300, t: 1, e: 2 },
    { text: '你在网吧的角落里度过了一夜。隔壁包间的人在看成人影片，声音开得很大。你用华夏语在搜索栏里输入了"如何从日本偷渡回国"——然后迅速删除了浏览记录。', h: -2, t: 3, e: 5 },
    { text: '你今天找到了一个在中华料理店打黑工的机会。老板是福建人，他只问你"会洗碗吗"——没要任何证件。一天12小时，现金日结。', h: -3, m: 5000, t: 1, e: 2 },
    { text: '深夜的街道上，一辆黑色轿车在你旁边减速了。你的心跳加速——那是' + '' + '的人吗？车子开走了，但你站在原地很久没动。', h: 0, t: 8, e: -3 },
    { text: '你遇到了另一个逃亡者——一个菲律宾女人，也在躲避类似的东西。她给了你一个地址：一家收留无证外国女性的地下庇护所。你不知道这是陷阱还是救赎。', h: 0, t: 2, e: 12 },
    { text: '警察拦住了你——随机抽查证件。你装作听不懂日语，手心里全是汗。警察皱了一下眉，但最终挥挥手放你走了。你走远之后腿软得几乎站不住。', h: 0, t: 10, e: -5 },
    { text: '你在公园的长椅上过了一夜。凌晨时分有人给你披了一条毛毯——你惊醒后发现是一个晨练的老妇人。她什么都没说就继续慢跑去了。毛毯上有洗衣粉的味道。', h: 2, t: -2, e: 3 },
    { text: '你在公共浴室的镜子里看到了自己。Cos服仍然紧贴在身上——但左肩关节处出现了一道微不可见的裂痕，像是愈合中的伤口正在结痂。也许时间真的能松动化纤和皮肤的融合。', h: 0, t: 5, e: 5, cosBonded: 1 },
    { text: '庇护所里一个曾做过护士的女人看到你脖子后面那片融合的Cos服边缘。她说可以找一家接收无证患者的小诊所，用激光把化纤和真皮的交界烧开——"会很疼，但你可以把自己要回来。"', h: 0, t: 8, e: 12, cosBonded: 2 },
    { text: '地下医生对你身上那套Cos服的材料很感兴趣——他说如果他能分析出成分可以写一篇改变医学史的论文。作为交换他免费为你做了一次剥离手术。手术台上他在你左臂切开了一道口子，从里面剥离出了一片和皮肤不分彼此的化纤。痛得你几乎昏过去——但你看到的不是Cos服的残片，而是正在夺回来的、属于你自己的边界。', h: -8, t: 10, e: 20, cosBonded: 3 },
  ];

  function monthlyFugitive(state, c) {
    if (c.patronPhase === 'escaped') c.patronPhase = 'fugitive';
    var eligible = FUGITIVE_EVENTS.filter(function(ev) {
      if (ev.cosBonded && ev.cosBonded > (c.cosplayBonded || 0)) return false;
      return true;
    });
    var event = eligible[Math.floor(Math.random() * eligible.length)];
    var finalText = event.text.replace('\'\'', c.patronName);
    c.patronMonthlyLog.unshift(finalText);
    c.patronMonthlyLog = c.patronMonthlyLog.slice(0, 12);
    state.stats['健康'] = Math.max(5, Math.min(100, state.stats['健康'] + (event.h || 0)));
    if (!state.money) state.money = 0;
    state.money = Math.max(0, (state.money || 0) + (event.m || 0));
    state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + (event.t || 0));
    c.patronEscapeProgress = Math.max(0, Math.min(100, c.patronEscapeProgress + (event.e || 0)));

    if (Math.random() < 0.06 && c.patronEscapeProgress >= 0) {
      c.patronMonthlyLog.unshift('你看到了一个熟悉的面孔——' + c.patronName + '的司机。他正站在街对面抽烟，似乎没有看到你。但当他弹掉烟头的那个动作，那个姿势你记得太清楚了。他在找你。');
      state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + 10);
      c.patronEscapeProgress = Math.max(0, c.patronEscapeProgress - 10);
    }
  }

  function fugitiveAction(state, action) {
    var c = ensure(state);
    if (c.patronPhase !== 'fugitive' && c.patronPhase !== 'escaped') return { ok: false, message: '你不是逃亡者' };

    switch (action) {
      case 'fug-work':
        if (!state.money) state.money = 0;
        var earned = U.between(3000, 8000);
        state.money += earned;
        state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(2, 5));
        c.patronMonthlyLog.unshift('你在风俗店和中餐馆做了一天黑工。现金到手了，但身体在发出抗议。');
        return { ok: true, message: '赚了' + earned + '日元。勉强维持生存。' };
      case 'fug-hide':
        c.patronEscapeProgress = Math.min(100, c.patronEscapeProgress + U.between(3, 8));
        c.patronMonthlyLog.unshift('你换了藏身地点。这次是24小时漫画网咖——包间锁不了门。你把椅子抵在门后，一整夜都不敢睡。');
        state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(2, 4));
        return { ok: true, message: '找到了临时藏身之处。' };
      case 'fug-lawyer':
        if (state.money < 50000) return { ok: false, message: '付不起律师费（需要5万日元，当前' + (state.money || 0) + '日元）' };
        state.money -= 50000;
        c.patronEscapeProgress = Math.min(100, c.patronEscapeProgress + U.between(15, 30));
        c.patronMonthlyLog.unshift('你找到了人权律师。她看了你的伤疤和陈述，沉默许久说："我可以帮你申请保护令——但你需要出庭。"');
        return { ok: true, message: '律师受理了案件。庇护申请有了进展。' };
      case 'fug-shelter':
        var shelterChance = c.patronEscapeProgress >= 40 ? 0.55 : 0.25;
        if (Math.random() < shelterChance) {
          c.patronEscapeProgress = Math.min(100, c.patronEscapeProgress + U.between(20, 40));
          c.patronMonthlyLog.unshift('地下庇护所接纳了你。一个缅甸女人给你热茶说："欢迎来到家——虽然不是原来那个。"');
          state.stats['健康'] = Math.min(100, state.stats['健康'] + U.between(5, 10));
          return { ok: true, message: '庇护所接纳了你。你在其他幸存者中找到了安慰。' };
        }
        c.patronMonthlyLog.unshift('你找到了地址——那里已经人去楼空。门上贴着一张纸条："搬走了。不要再来了。"');
        return { ok: false, message: '庇护所不存在了。地址过期。' };
      case 'fug-return':
        if (c.patronEscapeProgress < 60) return { ok: false, message: '还不够安全，贸然回国会被抓住（需要安全度60+）' };
        if (state.money < 30000) return { ok: false, message: '需要3万日元才能买通蛇头（当前' + (state.money || 0) + '日元）' };
        state.money -= 30000;
        if (Math.random() < 0.55) {
          c.patronPhase = 'free';
          c.underPatron = false;
          c.patronMonthlyLog = [];
          var homeCity = c.city || '上海';
          state.location = { province: homeCity, city: homeCity, country: '华夏' };
          state.timeSpeed = 1;
          Game.lifeDirector.addLog(state, '偷渡回国',
            '你终于踏上了华夏的土地。码头的海风是咸的——和日本的咸味不同。第一句华夏语说出口时你哭了。'
            + '你自由了。但失去的那些——名字、身体、孩子——永远留在了海的另一边。', 'milestone');
          return { ok: true, message: '成功回到了华夏。你自由了。' };
        }
        c.patronEscapeProgress = Math.max(0, c.patronEscapeProgress - U.between(15, 25));
        c.patronMonthlyLog.unshift('蛇头收了钱就跑了。你被扔在偏僻码头。海风很冷。你蜷缩在集装箱阴影里，听着远处不知是哪国的警笛声。');
        return { ok: false, message: '偷渡失败。蛇头是骗子。失去了一笔钱。' };
      default:
        return { ok: false, message: '未知行动' };
    }
  }

  function renderFugitive(state) {
    var c = ensure(state);
    if (c.patronPhase !== 'fugitive' && c.patronPhase !== 'escaped') return '';

    var escapePct = c.patronEscapeProgress;
    var escapeColor = escapePct >= 70 ? 'var(--ui-green, #315f58)' : (escapePct >= 40 ? '#b88a35' : 'var(--ui-muted)');
    var money = state.money || 0;

    var html = '<div class="cradle-fugitive" style="margin-top:10px;padding:12px;border:1px solid #2d5a4b;border-left:4px solid #2d5a4b;border-radius:6px;background:#f2f8f4">'
      + '<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:#2d5a4b">逃亡者 · 日本境内</h3>'
      + '<p style="font-size:10px;color:var(--ui-muted);margin:0 0 10px">'
      + '城市：' + state.location.city + ' · 现金：' + money.toLocaleString() + '日元 · '
      + (state.profile.cosplay ? 'Cos服仍在身上' : '没有身份') + '</p>';

    html += '<div style="margin-bottom:10px">'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">安全度（逃离追捕进度）</p>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + '<progress value="' + escapePct + '" max="100" style="flex:1;height:6px"></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + escapeColor + '">' + escapePct + '/100</span></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:1px 0 0">安全度60+且持有3万日元可尝试偷渡回国</p></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">'
      + '<button type="button" data-cradle-action="fug-work" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px;font-weight:700">打黑工</button>'
      + '<button type="button" data-cradle-action="fug-hide" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px;font-weight:700">换藏身处</button>'
      + '<button type="button" data-cradle-action="fug-lawyer" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px;font-weight:700">找律师(5万)</button>'
      + '<button type="button" data-cradle-action="fug-shelter" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px;font-weight:700">找庇护所</button>'
      + '</div>';

    if (escapePct >= 60 && money >= 30000) {
      html += '<button type="button" data-cradle-action="fug-return" style="min-height:44px;padding:8px 12px;border:none;border-radius:5px;background:#2d5a4b;color:#fff;font-size:11px;font-weight:750;width:100%;margin-bottom:8px">偷 渡 回 国</button>';
    } else {
      html += '<button type="button" disabled style="min-height:44px;padding:8px 12px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-soft);color:var(--ui-muted);font-size:10px;width:100%;margin-bottom:8px;opacity:0.45">'
        + (escapePct < 60 ? '偷渡需要安全度60+（当前' + escapePct + '）' : '偷渡需要3万日元（当前' + money.toLocaleString() + '）') + '</button>';
    }

    if (c.patronMonthlyLog.length > 0) {
      html += '<div style="max-height:120px;overflow-y:auto;font-size:9px;color:var(--ui-muted);line-height:1.5;border-top:1px solid var(--ui-line);padding-top:8px">'
        + c.patronMonthlyLog.slice(0, 6).map(function (l) { return '<p style="margin:2px 0;padding:2px 0;border-bottom:1px solid var(--ui-line)">' + l + '</p>'; }).join('')
        + '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderPatron(state) {
    var c = ensure(state);
    if (!c.underPatron) return '';

    var monthsIn = state.totalMonths - (c.imprisonedMonth || state.totalMonths) + (c.soldToJapan ? 0 : Math.max(0, state.totalMonths - c.imprisonedMonth - c.reformProgress / 8));
    var pregText = c.pregnantByPatron
      ? (' · 怀孕中（预产期 ' + (c.pregnancyDueMonth - state.totalMonths) + ' 个月后）')
      : '';
    var childrenText = c.childrenWithPatron > 0 ? ' · 已育' + c.childrenWithPatron + '子' : '';
    var wealthColor = c.patronWealth === '富豪' ? '#b88a35' : 'var(--ui-ink)';
    var abuseColor = c.patronAbuse >= 70 ? '#c23b32' : (c.patronAbuse >= 40 ? '#b88a35' : 'var(--ui-green, #315f58)');
    var affectionColor = c.patronAffection >= 60 ? 'var(--ui-green, #315f58)' : (c.patronAffection >= 30 ? '#b88a35' : '#c23b32');
    var escapeColor = c.patronEscapeProgress >= 70 ? 'var(--ui-green, #315f58)' : (c.patronEscapeProgress >= 40 ? '#b88a35' : 'var(--ui-muted, #69736f)');

    var html = '<div class="cradle-patron" style="margin-top:10px;padding:12px;border:1px solid #6b4c3b;border-left:4px solid #6b4c3b;border-radius:6px;background:#faf5ef">'
      + '<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:#6b4c3b">金主宅邸 · 囚禁中</h3>'
      + '<p style="font-size:10px;color:var(--ui-muted, #69736f);margin:0 0 10px">'
      + c.patronName + ' · ' + c.patronAge + '岁 · '
      + '<span style="color:' + wealthColor + ';font-weight:700">' + c.patronWealth + '</span> · '
      + state.location.city + pregText + childrenText + '</p>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
      + '<div>'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">好感度</p>'
      + '<div style="display:flex;align-items:center;gap:4px">'
      + '<progress value="' + c.patronAffection + '" max="100" style="flex:1;height:5px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:10px;font-weight:750;color:' + affectionColor + '">' + c.patronAffection + '</span></div></div>'
      + '<div>'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">暴力程度</p>'
      + '<div style="display:flex;align-items:center;gap:4px">'
      + '<progress value="' + c.patronAbuse + '" max="100" style="flex:1;height:5px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:10px;font-weight:750;color:' + abuseColor + '">' + c.patronAbuse + '</span></div></div>'
      + '</div>';

    html += '<div style="margin-bottom:10px">'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">逃脱计划进度</p>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + '<progress value="' + c.patronEscapeProgress + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + escapeColor + ';white-space:nowrap">' + c.patronEscapeProgress + '/100</span></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:1px 0 0">观察' + c.patronObserveCount + '次 · '
      + (c.patronEscapeCooldown > 0 ? '守卫加强巡逻，' + c.patronEscapeCooldown + '个月后可再尝试' : '可尝试逃跑')
      + '</p></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">'
      + '<button type="button" data-cradle-action="patron-endure" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">默默忍耐</button>'
      + '<button type="button" data-cradle-action="patron-please" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">刻意讨好</button>'
      + '<button type="button" data-cradle-action="patron-observe" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">观察漏洞</button>'
      + '<button type="button" data-cradle-action="patron-befriend" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">结交盟友</button>'
      + '</div>';

    if (c.patronEscapeProgress >= 50 && c.patronEscapeCooldown <= 0) {
      html += '<button type="button" data-cradle-action="patron-escape" style="min-height:44px;padding:8px 12px;border:none;border-radius:5px;background:#6b4c3b;color:#fff;font-size:11px;font-weight:750;width:100%;margin-bottom:8px">逃 离 宅 邸（进度 ' + c.patronEscapeProgress + '）</button>';
    } else {
      html += '<button type="button" disabled style="min-height:44px;padding:8px 12px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-soft);color:var(--ui-muted);font-size:10px;width:100%;margin-bottom:8px;opacity:0.45">'
        + (c.patronEscapeCooldown > 0 ? '逃跑冷却中（' + c.patronEscapeCooldown + '个月）' : '逃跑需要进度50+（当前' + c.patronEscapeProgress + '）') + '</button>';
    }

    if (c.patronMonthlyLog.length > 0) {
      html += '<div style="max-height:120px;overflow-y:auto;font-size:9px;color:var(--ui-muted);line-height:1.5;border-top:1px solid var(--ui-line);padding-top:8px">'
        + c.patronMonthlyLog.slice(0, 6).map(function (l) { return '<p style="margin:2px 0;padding:2px 0;border-bottom:1px solid var(--ui-line)">' + l + '</p>'; }).join('')
        + '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderPrison(state) {
    var c = ensure(state);
    if (!c.imprisoned) return '';

    var monthsIn = state.totalMonths - c.imprisonedMonth;
    var reformPct = c.reformProgress;
    var mentalPct = c.mental;
    var reformColor = reformPct > 60 ? 'var(--ui-red, #a8453a)' : (reformPct > 30 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-green, #315f58)');
    var mentalColor = mentalPct > 50 ? 'var(--ui-green, #315f58)' : (mentalPct > 20 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-red, #a8453a)');

    var html = '<div class="cradle-prison" style="margin-top:10px;padding:12px;border:1px solid var(--ui-red, #a8453a);border-left:4px solid #c23b32;border-radius:6px;background:#fff8eb">'
      + '<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:#c23b32">摇篮改造机构 · 囚禁中</h3>'
      + '<p style="font-size:10px;color:var(--ui-muted, #69736f);margin:0 0 10px">编号 ' + c.inmateId + ' · 已关押 ' + monthsIn + ' 个月 · '
      + (c.reformType === 'japanese' ? '日本化改造' : ('幻梦Cos服 · ' + c.orderSeries + ' · ' + c.orderCharacter)) + '</p>';

    if (c.reformType === 'cosplay' && c.cosplayBonded >= 2) {
      var bondingLabel = c.cosplayBonded >= 3 ? '身份已覆写——你可以说出自己的名字吗？' : (c.cosplayBonded >= 2 ? 'Cos服与身体已融合——无法脱下' : '');
      html += '<div style="margin-bottom:10px;padding:6px 8px;background:rgba(194,59,50,0.06);border-radius:4px;border-left:3px solid #c23b32">'
        + '<p style="font-size:10px;font-weight:700;color:#c23b32;margin:0 0 2px">幻梦结合阶段 ' + c.cosplayBonded + '/3</p>'
        + '<p style="font-size:9px;color:var(--ui-muted);margin:0">' + bondingLabel + '</p></div>';
    } else if (c.reformType === 'cosplay' && c.cosplayBonded >= 1) {
      html += '<div style="margin-bottom:10px;padding:6px 8px;background:rgba(184,138,53,0.08);border-radius:4px;border-left:3px solid #b88a35">'
        + '<p style="font-size:10px;font-weight:700;color:#b88a35;margin:0 0 2px">幻梦黏合阶段 1/3</p>'
        + '<p style="font-size:9px;color:var(--ui-muted);margin:0">Cos服已吸附在皮肤上——你找不到任何可以脱下的缝隙</p></div>';
    }

    html += '<div style="margin-bottom:8px">'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">改造进度</p>'
      + '<div style="display:flex;align-items:center;gap:6px"><progress value="' + reformPct + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + reformColor + ';white-space:nowrap">' + reformPct + '/100</span></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:1px 0 0">改造完成度达100%后将被卖到日本</p></div>';

    html += '<div style="margin-bottom:10px">'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">精神抵抗</p>'
      + '<div style="display:flex;align-items:center;gap:6px"><progress value="' + mentalPct + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + mentalColor + ';white-space:nowrap">' + mentalPct + '/100</span></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:1px 0 0">精神归零将导致人格崩坏，改造强制完成</p></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">'
      + '<button type="button" data-cradle-action="obey" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">顺从配合</button>'
      + '<button type="button" data-cradle-action="resist" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">精神抵抗</button>'
      + '<button type="button" data-cradle-action="observe" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">观察弱点</button>'
      + '<button type="button" data-cradle-action="feign" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">假装失忆</button>'
      + '</div>';

    if (c.escapeAttempts >= 3) {
      html += '<button type="button" data-cradle-action="escape" style="min-height:44px;padding:8px 12px;border:none;border-radius:5px;background:#c23b32;color:#fff;font-size:11px;font-weight:750;width:100%;margin-bottom:8px">逃 跑（观察 ' + c.escapeAttempts + ' 次）</button>';
    } else {
      html += '<button type="button" disabled style="min-height:44px;padding:8px 12px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-soft);color:var(--ui-muted);font-size:10px;width:100%;margin-bottom:8px;opacity:0.45">逃跑需要3次观察（当前 ' + c.escapeAttempts + '/3）</button>';
    }

    if (c.dailyLog.length > 0) {
      html += '<div style="max-height:120px;overflow-y:auto;font-size:9px;color:var(--ui-muted);line-height:1.5;border-top:1px solid var(--ui-line);padding-top:8px">'
        + c.dailyLog.slice(0, 6).map(function (l) { return '<p style="margin:2px 0;padding:2px 0;border-bottom:1px solid var(--ui-line)">' + l + '</p>'; }).join('')
        + '</div>';
    }

    html += '</div>';
    return html;
  }

  function handleClick(event) {
    var state = Game._getState ? Game._getState() : null;
    if (!state || !state.cradle) return false;

    var actionBtn = event.target.closest('[data-cradle-action]');
    if (actionBtn) {
      var action = actionBtn.dataset.cradleAction;
      var result;
      if (action.indexOf('patron-') === 0) {
        result = patronAction(state, action);
      } else if (action.indexOf('fug-') === 0) {
        result = fugitiveAction(state, action);
      } else {
        result = playerAction(state, action);
      }
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }

    return false;
  }

  Game.cradleInstitution = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    isImprisoned: isImprisoned,
    isUnderPatron: isUnderPatron,
    renderPrison: renderPrison,
    renderPatron: renderPatron,
    renderFugitive: renderFugitive,
    handleClick: handleClick,
  });
}(window));
