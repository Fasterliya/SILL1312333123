(function initSupernaturalSpecter(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var SPECTER_TYPES = ['怨灵', '恶煞', '魅妖', '淫妖', '梦魇', '情缚', '欲母'];
  var STAGES = ['潜伏', '显形', '掠食'];
  var MAX_SPECTERS = 7;
  var SPAWN_CHANCE = 0.05;
  var COMBAT_PLAYER_MAX_HP = 100;

  function specterHpByType(type) {
    if (type === '恶煞') return 280;
    if (type === '欲母') return 260;
    if (type === '情缚') return 180;
    if (type === '淫妖') return 170;
    if (type === '魅妖') return 160;
    if (type === '梦魇') return 140;
    return 200;
  }

  function specterAtkByType(type) {
    if (type === '恶煞') return 42;
    if (type === '欲母') return 38;
    if (type === '淫妖') return 28;
    if (type === '情缚') return 26;
    if (type === '魅妖') return 22;
    if (type === '梦魇') return 18;
    return 32;
  }

  function randomSpecterType() {
    var roll = Math.random();
    if (roll < 0.38) return '怨灵';
    if (roll < 0.58) return '魅妖';
    if (roll < 0.72) return '淫妖';
    if (roll < 0.82) return '恶煞';
    if (roll < 0.90) return '梦魇';
    if (roll < 0.96) return '情缚';
    return '欲母';
  }

  function ensure(state) {
    var current = state.supernatural;
    if (!current || typeof current !== 'object') {
      state.supernatural = { enabled: true, specters: [], playerAwareness: 0, spiritCorruption: 0, specterKills: 0, specterDefeats: 0, lastAttackMonth: -12, combat: { active: false, specterIndex: -1, specterHp: 0, playerHp: COMBAT_PLAYER_MAX_HP, playerMaxHp: COMBAT_PLAYER_MAX_HP, round: 0, log: [] } };
      return;
    }
    current.enabled = current.enabled !== false;
    current.specters = Array.isArray(current.specters) ? current.specters : [];
    current.specters.forEach(function (s) {
      if (!s.type || !SPECTER_TYPES.includes(s.type)) s.type = '怨灵';
      if (!s.stage || !STAGES.includes(s.stage)) s.stage = '潜伏';
      s.monthsActive = Math.max(0, Number(s.monthsActive) || 0);
      s.exposed = !!s.exposed;
      s.lastFeedMonth = Number.isFinite(s.lastFeedMonth) ? s.lastFeedMonth : state.totalMonths - Math.min(3, s.monthsActive);
      s.victims = Array.isArray(s.victims) ? s.victims : [];
      s.alertLevel = Math.max(0, Math.min(100, Number(s.alertLevel) || 0));
      s.hp = Number.isFinite(s.hp) ? s.hp : specterHpByType(s.type);
      s.lastBreedMonth = Number.isFinite(s.lastBreedMonth) ? s.lastBreedMonth : state.totalMonths - U.between(24, 48);
      Game.specterEcology?.ensureSpecter(state, s);
    });
    current.playerAwareness = Math.max(0, Math.min(100, Number(current.playerAwareness) || 0));
    current.spiritCorruption = Math.max(0, Math.min(100, Number(current.spiritCorruption) || 0));
    current.lastAttackMonth = Number.isFinite(current.lastAttackMonth) ? current.lastAttackMonth : -12;
    current.combat = current.combat && typeof current.combat === 'object' ? current.combat : { active: false, specterIndex: -1, specterHp: 0, playerHp: COMBAT_PLAYER_MAX_HP, playerMaxHp: COMBAT_PLAYER_MAX_HP, round: 0, log: [] };
    current.combat.active = !!current.combat.active;
    current.combat.specterIndex = Number.isFinite(current.combat.specterIndex) ? current.combat.specterIndex : -1;
    current.combat.specterHp = Math.max(0, Number(current.combat.specterHp) || 0);
    current.combat.playerHp = Math.max(0, Math.min(COMBAT_PLAYER_MAX_HP, Number(current.combat.playerHp) || COMBAT_PLAYER_MAX_HP));
    current.combat.playerMaxHp = Number.isFinite(current.combat.playerMaxHp) ? current.combat.playerMaxHp : COMBAT_PLAYER_MAX_HP;
    current.combat.round = Math.max(0, Number(current.combat.round) || 0);
    current.combat.log = Array.isArray(current.combat.log) ? current.combat.log.slice(-12) : [];
  }

  function hostPerson(state, specter) {
    return Game.people.find(state, specter.hostId);
  }

  function hostRelation(state, specter) {
    var person = hostPerson(state, specter);
    if (!person) return '未知';
    if (state.family.some(function (f) { return f.id === person.id; })) {
      var rel = person.relation;
      if (['父亲', '母亲', '哥哥', '姐姐', '弟弟', '妹妹', '儿子', '女儿'].includes(rel)) return rel;
      if (state.romance && person.id === state.romance.partnerId) return '配偶';
      return '亲属';
    }
    if (state.contacts.some(function (c) { return c.id === person.id; })) return '熟人';
    if (state.workplace && person.id === state.workplace.leaderId) return '上司';
    if (state.workplace && state.workplace.rosterIds && state.workplace.rosterIds.includes(person.id)) return '同事';
    return '市民';
  }

  function validHostCandidates(state) {
    var specterIds = (state.supernatural && state.supernatural.specters || []).map(function (s) { return s.hostId; });
    var allPeople = Game.people.all(state);
    return allPeople.filter(function (p) {
      if (!p || !p.id || p.id === 'player-profile') return false;
      if (specterIds.includes(p.id)) return false;
      if (p.specterPossessed) return false;
      if (p.skinCaptured) return false;
      if (p.status === '死亡' || p.status === '失踪' || p.deceasedAt) return false;
      return true;
    });
  }

  function hostTraumaScore(p) {
    var t = (p.psychology && p.psychology.trauma) ? p.psychology.trauma : (p.trauma || 0);
    if (t >= 80) return 10;
    if (t >= 60) return 6;
    if (t >= 40) return 3;
    if (t >= 20) return 1;
    return 0;
  }

  function selectHostTarget(state, candidates) {
    if (!candidates.length) return null;

    var familyPool = candidates.filter(function (p) {
      return state.family.some(function (f) { return f.id === p.id; });
    });
    var spouseInFamily = familyPool.filter(function (p) { return state.romance && p.id === state.romance.partnerId; });
    var rankedFamily = spouseInFamily.concat(familyPool.filter(function (p) { return !spouseInFamily.includes(p); }));
    rankedFamily.sort(function (a, b) {
      var ta = hostTraumaScore(a); var tb = hostTraumaScore(b);
      if (ta !== tb) return tb - ta;
      return (b.affection || 0) - (a.affection || 0);
    });

    var contactPool = candidates.filter(function (p) {
      return state.contacts.some(function (c) { return c.id === p.id; }) && !familyPool.includes(p);
    });
    contactPool.sort(function (a, b) { return hostTraumaScore(b) - hostTraumaScore(a); });

    var specialPool = candidates.filter(function (p) { return p.specialCharacter; });
    specialPool.sort(function (a, b) { return hostTraumaScore(b) - hostTraumaScore(a); });

    var citizenPool = candidates.filter(function (p) {
      return !rankedFamily.includes(p) && !contactPool.includes(p) && !specialPool.includes(p);
    });
    citizenPool.sort(function (a, b) { return hostTraumaScore(b) - hostTraumaScore(a); });

    var anyHighTrauma = candidates.some(function (p) { return hostTraumaScore(p) >= 6; });
    var roll = Math.random();
    var pool;
    if (anyHighTrauma) {
      if (roll < 0.55 && rankedFamily.length) pool = rankedFamily;
      else if (roll < 0.80 && contactPool.length) pool = contactPool;
      else if (roll < 0.92 && specialPool.length) pool = specialPool;
      else if (citizenPool.length) pool = citizenPool;
      else pool = rankedFamily.length ? rankedFamily : (contactPool.length ? contactPool : candidates);
    } else {
      if (roll < 0.45 && rankedFamily.length) pool = rankedFamily;
      else if (roll < 0.75 && contactPool.length) pool = contactPool;
      else if (roll < 0.90 && specialPool.length) pool = specialPool;
      else if (citizenPool.length) pool = citizenPool;
      else if (rankedFamily.length) pool = rankedFamily;
      else if (contactPool.length) pool = contactPool;
      else pool = candidates;
    }

    return pool[0] || null;
  }

  function possessTarget(state, person, origin) {
    if (!person) return false;
    person.specterPossessed = true;
    person.portraitAgeStage = 'stage1';
    person.specterOrigin = '';
    person.specterOriginalGender = person.gender;
    person.specterOriginalBodyType = person.bodyType;
    person.specterOriginalHairstyle = person.hairstyle;
    person.specterOriginalClothing = person.clothing ? {
      top: person.clothing.top,
      socks: person.clothing.socks,
      shoes: person.clothing.shoes,
    } : null;
    var type = randomSpecterType();
    var specter = {
      hostId: person.id,
      type: type,
      monthsActive: 0,
      stage: '潜伏',
      exposed: false,
      lastFeedMonth: state.totalMonths,
      victims: [],
      alertLevel: 0,
      hp: specterHpByType(type),
      parentHostId: origin && origin.sourceHostId || '',
      generation: Math.max(1, Number(origin && origin.generation) || 1),
      lastBreedMonth: state.totalMonths,
    };
    state.supernatural.specters.push(specter);
    Game.specterEcology?.recordPossession(state, person, specter);
    if (!person.psychology || typeof person.psychology !== 'object') person.psychology = {};
    person.psychology.sexAddiction = U.between(65, 85);
    person.psychology.corruption = U.between(55, 75);
    person.psychology.trauma = 0;
    person.sexWork = person.sexWork && typeof person.sexWork === 'object' ? person.sexWork : {};
    person.sexWork.isProstitute = true;
    person.sexWork.brothelVisits = (person.sexWork.brothelVisits || 0) + 1;
    person.sexWork.lastBrothelMonth = state.totalMonths;
    return true;
  }

  function trySpawnSpecter(state) {
    var supernatural = state.supernatural;
    if (!supernatural.enabled) return;
    if (supernatural.specters.length >= MAX_SPECTERS) return;
    var count = supernatural.specters.length;
    if (!count) {
      var fallback = Math.min(24, Math.max(0, Number(state.totalMonths) || 0));
      supernatural.spawnDryMonths = Number.isFinite(supernatural.spawnDryMonths)
        ? Math.max(0, supernatural.spawnDryMonths + 1) : fallback + 1;
    } else supernatural.spawnDryMonths = 0;
    var chance = count ? 0.02
      : Math.min(0.25, SPAWN_CHANCE + supernatural.spawnDryMonths * 0.006);
    var persistent = !count && state.totalMonths >= 72;
    if (!persistent && Math.random() > chance) return;
    var candidates = validHostCandidates(state);
    if (!candidates.length) return;
    var target = selectHostTarget(state, candidates);
    if (target && possessTarget(state, target)) {
      supernatural.spawnDryMonths = 0;
      if (supernatural.playerAwareness >= 50) {
        Game.lifeDirector.addLog(state, '不祥之兆', '直觉告诉你，' + target.name + '似乎有什么与往日不同。', 'warning');
      }
    }
  }

  function advanceStage(specter) {
    if (specter.stage === '潜伏' && specter.monthsActive >= 3) specter.stage = '显形';
    else if (specter.stage === '显形' && specter.monthsActive >= 8) specter.stage = '掠食';
  }

  function applyHostSexBehavior(state, specter) {
    if (specter.stage === '潜伏') return;
    var host = hostPerson(state, specter);
    if (!host) return;
    if (!host.psychology || typeof host.psychology !== 'object') host.psychology = {};
    host.psychology.sexAddiction = Math.min(100, (host.psychology.sexAddiction || 0) + U.between(2, 5));
    host.psychology.corruption = Math.min(100, (host.psychology.corruption || 0) + U.between(1, 3));
    host.psychology.lastSexMonth = state.totalMonths;
    if (specter.stage === '掠食') {
      host.psychology.sexAddiction = Math.min(100, host.psychology.sexAddiction + U.between(3, 7));
    }

    host.sexWork = host.sexWork && typeof host.sexWork === 'object' ? host.sexWork : {};
    host.sexWork.isProstitute = true;
    if (host.gender === '女') {
      host.sexWork.brothelVisits = (host.sexWork.brothelVisits || 0) + 1;
      host.sexWork.lastBrothelMonth = state.totalMonths;
      if (!host.job || host.job === '无') host.job = '妓女';
    }

    if (host.specterOriginalGender === '男') {
      feminizeMaleHost(host, specter);
    }
  }

  function feminizeMaleHost(host, specter) {
    if (specter.stage === '显形' && specter.monthsActive >= 5) {
      host.gender = '女';
      host.bodyType = U.random(['小胸', '丰满', '匀称', '娇小纤细']);
      host.stats = host.stats || {};
      host.stats['魅力'] = Math.max(host.stats['魅力'] || 50, U.between(70, 90));
      if (!host.job || host.job === '无') host.job = '妓女';
      host.sexWork.brothelVisits = (host.sexWork.brothelVisits || 0) + 1;
      host.sexWork.lastBrothelMonth = 0;
      Game.appearancePipeline?.apply(state, host, 'specter');
    }
    if (specter.stage === '掠食') {
      host.stats = host.stats || {};
      host.stats['魅力'] = Math.min(100, (host.stats['魅力'] || 50) + U.between(3, 8));
      host.bodyType = U.random(['丰满', '匀称', '娇小纤细']);
      if (!host.job || host.job === '无') host.job = '妓女';
    }
  }

  function applyTypeSpecificBehavior(state, specter) {
    var host = hostPerson(state, specter);
    if (!host) return;
    var type = specter.type;

    if (type === '淫妖' && specter.stage !== '潜伏') {
      applyLustDemonBehavior(state, specter, host);
    } else if (type === '梦魇') {
      applyNightmareBehavior(state, specter, host);
    } else if (type === '情缚' && specter.stage === '掠食') {
      applyBondageBehavior(state, specter, host);
    } else if (type === '欲母' && specter.stage !== '潜伏') {
      applyBreederBehavior(state, specter, host);
    }
  }

  function applyLustDemonBehavior(state, specter, host) {
    if (specter.stage === '掠食' && Math.random() < 0.35) {
      var candidates = Game.people.all(state).filter(function (p) {
        return p && p.id !== 'player-profile' && p.id !== host.id
          && !p.specterPossessed && !p.skinCaptured
          && p.status === '健康' && !p.deceasedAt
          && (p.currentCity || '') === (host.currentCity || state.location.city);
      });
      if (candidates.length) {
        var target = candidates[Math.floor(Math.random() * candidates.length)];
        if (!target.psychology || typeof target.psychology !== 'object') target.psychology = {};
        target.psychology.sexAddiction = Math.min(100, (target.psychology.sexAddiction || 0) + U.between(15, 30));
        target.psychology.corruption = Math.min(100, (target.psychology.corruption || 0) + U.between(10, 20));
        target.psychology.lastSexMonth = state.totalMonths;
        target.lustMarkedBy = specter.hostId;
        target.lustMarkedAt = state.totalMonths;
        Game.lifeDirector.addLog(state, '淫毒蔓延',
          host.name + '在交欢中将淫妖的种子注入了' + target.name + '的体内。'
          + target.name + '开始出现无法自控的性冲动。', 'danger');
        if (target.gender === '女') {
          target.sexWork = target.sexWork && typeof target.sexWork === 'object' ? target.sexWork : {};
          target.sexWork.isProstitute = true;
          target.sexWork.brothelVisits = (target.sexWork.brothelVisits || 0) + 1;
          if (!target.job || target.job === '无') target.job = '妓女';
        }
      }
    }
  }

  function applyNightmareBehavior(state, specter, host) {
    if (!host.psychology || typeof host.psychology !== 'object') host.psychology = {};
    if (specter.stage === '潜伏') {
      host.psychology.trauma = Math.min(100, (host.psychology.trauma || 0) + U.between(2, 5));
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + U.between(1, 2));
    } else if (specter.stage === '显形') {
      host.psychology.trauma = Math.min(100, (host.psychology.trauma || 0) + U.between(4, 8));
      state.stats['健康'] = Math.max(10, state.stats['健康'] - U.between(1, 3));
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + U.between(2, 4));
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(1, 2));
      if (Math.random() < 0.30) {
        Game.lifeDirector.addLog(state, '不眠之夜',
          '你连续几天做着相同的梦——梦里' + host.name
          + '站在你床边，低头看着你，嘴角挂着不属于人类的微笑。你醒来时发现自己的指甲在枕头上抓出了痕迹。',
          'warning');
      }
    } else if (specter.stage === '掠食') {
      host.psychology.trauma = Math.min(100, (host.psychology.trauma || 0) + U.between(6, 12));
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(2, 4));
      nightmareCorruptDreams(state, specter, host);
      nightmareIncestBreeding(state, specter, host);
    }
  }

  function nightmareCorruptDreams(state, specter, host) {
    if (Math.random() > 0.35) return;
    var feedTarget = Game.people.all(state).find(function (p) {
      return p && p.id !== 'player-profile' && p.id !== host.id
        && !p.specterPossessed && p.status === '健康' && !p.deceasedAt
        && (p.currentCity || '') === (host.currentCity || state.location.city)
        && state.family.some(function (f) { return f.id === p.id; });
    });
    if (feedTarget) {
      if (!feedTarget.psychology || typeof feedTarget.psychology !== 'object') feedTarget.psychology = {};
      feedTarget.psychology.sexAddiction = Math.min(100, (feedTarget.psychology.sexAddiction || 0) + U.between(12, 25));
      feedTarget.psychology.trauma = Math.min(100, (feedTarget.psychology.trauma || 0) + U.between(8, 18));
      feedTarget.psychology.inNightmare = true;
      Game.lifeDirector.addLog(state, '噩梦侵染',
        host.name + '的噩梦开始蔓延——' + feedTarget.name
        + '醒来时发现自己做了不该做的梦。梦的内容让他不敢对任何人说。',
        'warning');
    }
  }

  var INCEST_ARCHETYPES = ['噩梦引诱', '酒后乱性', '浴室越界', '病态共依', '献祭觉醒'];
  var PLAYER_INCEST_TEXT = {
    '父女': {
      '噩梦引诱': '你做了一个梦——梦里父亲走进了你的房间。他的眼神不像父亲，像一个陌生人。你醒来时身上有不属于梦的痕迹，而父亲在早餐时躲避着你的目光。',
      '酒后乱性': '父亲今晚喝醉了。他跌跌撞撞地敲你的房门，嘴里喊着母亲的名字——但当他看到你时，那个名字变成了你的。他的手指在你肩膀上停留了很久。',
      '浴室越界': '你在浴室里，水汽氤氲中门被推开了——父亲说"我以为没人"。他没有立即退出去。你的眼睛不知道该看哪里，而他的目光你知道不该落向哪里。',
      '病态共依': '自从母亲离开后，父亲和你之间的边界越来越模糊。今晚他抓着你的手说"我不能失去你"——他的脸离你太近了。那种近，比父亲应该保持的距离近得多。',
      '献祭觉醒': '你在父亲的房里发现了一本日记——里面记录着一种古老的"净化"仪式。"以亲子之血重写家族命运"。日期写着今晚。',
    },
    '母子': {
      '噩梦引诱': '你被梦魇驱使着推开了母亲的房门。她半梦半醒间没有认出是你——或者认出了，但没有阻止。天亮后你们都没有说话，但每次对视都让空气凝固。',
      '酒后乱性': '母亲今天喝了太多——自从父亲走后她总是这样。她在你怀里哭，然后她的手开始移动。你不知道该推开她还是该抱紧她。你什么都没做。所以你什么都做了。',
      '浴室越界': '母亲今天在洗澡的时候叫你的名字——让你帮她拿毛巾。她站在门后面伸手接毛巾的时候，你不小心看到了不该看到的东西。她没有遮。',
      '病态共依': '母亲说"你是家里唯一的男人了"。她说这话的时候手放在你的大腿上。你感到一阵不属于儿子的反应——你还年轻，但你不敢告诉任何人。',
      '献祭觉醒': '母亲在月圆的晚上叫醒你，带你步入后院。地上用盐画着一个你从未见过的纹章。她说"只有你能完成这个仪式"——她的手指解开你的扣子。',
    },
    '兄妹': {
      '噩梦引诱': '你和妹妹被同一个梦境牵引——在梦里你们不是兄妹。醒来后妹妹钻进你的被窝说"我又做了那个梦"。她身上只穿了一件你的旧T恤。',
      '酒后乱性': '妹妹第一次偷喝了你藏在柜子里的酒。她满脸通红地笑着倒在你身上，手指在你的胸口画圈——她说"哥，为什么你不是别人？"',
      '浴室越界': '你洗澡的时候忘了锁门——妹妹习惯性地推门进来拿东西。她看到你的时候发出一声短促的尖叫，但她没有跑开。你们对视了大概两秒——像是两个陌生人第一次见面。',
      '病态共依': '自从父母离婚后，妹妹只对你一个人说话。今晚她哭着说她梦到你和别人结婚了。她抱你抱得太紧了——你感觉到了紧贴着你胸膛的、不该感觉到的温度。',
      '献祭觉醒': '妹妹在她的日记本上画满了同一个符号——一个被交缠的线条围绕的眼睛。她在最后一页写着："只要我和哥哥完成仪式，我们就再也不会分开了。"',
    },
    '姐弟': {
      '噩梦引诱': '姐姐在梦魇中看到了你——不是作为弟弟，而是作为一个男人。她醒来后在餐桌上看你的眼神和以前不一样了。你不知道原因，但你觉得她的腿在桌下碰到了你的。',
      '酒后乱性': '姐姐失恋了，你陪她喝酒。她靠在你肩膀上哭，然后吻了你——不是脸，是嘴。你呆住了。她收回嘴唇后说"对不起"，但语气里没有歉意。',
      '浴室越界': '你听到浴室里有水声——门没关严。你经过时姐姐叫你帮她搓背。你说"不好吧"。她笑了一声说"你小时候我不是天天给你洗澡？"但你已经不小了。她也不是小时候的那个姐姐了。',
      '病态共依': '姐姐说如果你交了女朋友她就会死。她说这话的时候在笑——但你从她的眼神里读到了一种让你害怕的认真。她今晚穿了一条比平时短很多的裙子——她从来不穿的。',
      '献祭觉醒': '姐姐说她在旧书店找到了一本"姻缘之书"——她让你把手放在书页中间，她覆着你的手。书本开始发热——你感觉到一种不属于世俗范畴的联结在你和姐姐之间成形。',
    },
    '父（女体化）+子': {
      '噩梦引诱': '你在梦里看到了父亲——不是记忆中那个中年男人的样子，而是他现在那具女性的、年轻的身体。他站在你面前，用父亲的声音叫你的名字，但嘴唇涂着不属于他的口红。你醒来时身下已经湿了一片。',
      '酒后乱性': '你父亲——现在顶着女性身体的他——今晚喝多了。他靠在你怀里，你感觉到了那具不属于父亲的身体轮廓。他抬头看你的眼神让你分不清——他是醉了，还是清醒？他是你的父亲，还是一个陌生的女人？',
      '浴室越界': '你在浴室里，水声遮住了门把转动的声音。父亲推门进来——他用那具女性的身体靠在门框上，用父亲的口吻说"小时候都是我帮你洗的"。但这次不一样——因为他的手和你的手都到了不该到的地方。',
      '病态共依': '父亲被寄生后变得越来越依赖你——身体上的变化让他开始用不同于父亲的方式靠近你。今晚他说"对不起"——然后做了比任何他需要道歉的事都更过分的事。你觉得恶心。但你也觉得——某种东西在下面隐隐地同意了。',
      '献祭觉醒': '父亲说他找到了完成女性化的最终仪式。他把你的手放在他新长出的乳房上——用父亲的声音说"帮帮我"。你感受到的不是父亲的体温——是那具女性身体里不属于人世的、蠕动的、饥渴的东西。',
    },
    '兄（女体化）+弟': {
      '噩梦引诱': '你在梦里看到了哥哥现在的样子——女性化的身体，柔软的线条，但脸还是哥哥的脸。梦里的他没有说话，只是看着你。醒来时你的身体已经做出了不该有的反应。你在卫生间里待了很久。',
      '酒后乱性': '哥哥今晚喝醉了——现在"她"的身体软软地倒在你身上。你感觉到那具被幽诡改造过的身体贴着你——不是哥哥的身体，是一个女人的。但她开口叫的是你的小名。你把她推开的时候手指不小心碰到了她胸前不该有的柔软。',
      '浴室越界': '你听到浴室里的水声停了。哥哥用毛巾裹着身体出来——毛巾太小了，遮不住那些被强行塞进他身体里的曲线。他看到了你的表情。"别那样看我，"他说，"我也不想变成这样的。"但他说这话的时候没有往后退。',
      '病态共依': '哥哥女性化后变得比以前更粘你了。她说你是唯一一个"还把她当家人"的人——但你自己都不确定你是不是还把她当家人。她靠近的时候你的呼吸会变快。她注意到了。她没有拉开距离。',
      '献祭觉醒': '哥哥/弟弟说幽诡告诉她有一个方法可以让你共享她的身体——"我们把界限打破，以后就是一个人了"。她把你的手放在自己新生的身体上，那个纹章开始发光。你的手掌感觉到的不只是体温——还有某种正在把你吸进她体内的引力。',
    },
  };

  function nightmareIncestBreeding(state, specter, host) {
    if (Math.random() > 0.15) return;
    var familyMembers = state.family.filter(function (p) {
      return p && p.status === '健康' && !p.deceasedAt && !p.specterPossessed;
    });
    if (familyMembers.length < 2) return;

    var incestPairs = [];
    familyMembers.forEach(function (a) {
      familyMembers.forEach(function (b) {
        if (a.id >= b.id) return;
        var ra = a.relation || '';
        var rb = b.relation || '';
        var aIsFem = a.gender === '女' && a.specterOriginalGender === '男';
        var bIsFem = b.gender === '女' && b.specterOriginalGender === '男';
        if (a.gender === b.gender) {
          if (!aIsFem && !bIsFem) return;
        }
        if (ra === '父亲' && rb === '女儿') incestPairs.push({ male: a, female: b, label: '父女', playerInvolved: a.id === 'player-profile' || b.id === 'player-profile', feminized: aIsFem });
        else if (ra === '父亲' && rb === '儿子' && aIsFem) incestPairs.push({ male: b, female: a, label: '父（女体化）+子', playerInvolved: a.id === 'player-profile' || b.id === 'player-profile', feminized: true });
        else if (ra === '母亲' && rb === '儿子') incestPairs.push({ male: b, female: a, label: '母子', playerInvolved: a.id === 'player-profile' || b.id === 'player-profile', feminized: false });
        else if (ra === '哥哥' && rb === '妹妹') incestPairs.push({ male: a, female: b, label: '兄妹', playerInvolved: a.id === 'player-profile' || b.id === 'player-profile', feminized: bIsFem });
        else if (ra === '弟弟' && rb === '姐姐') incestPairs.push({ male: a, female: b, label: '姐弟', playerInvolved: a.id === 'player-profile' || b.id === 'player-profile', feminized: aIsFem });
        else if (ra === '弟弟' && rb === '哥哥' && aIsFem) incestPairs.push({ male: b, female: a, label: '兄（女体化）+弟', playerInvolved: a.id === 'player-profile' || b.id === 'player-profile', feminized: true });
      });
    });

    var uniquePairs = incestPairs.filter(function (pair, index, self) {
      return self.findIndex(function (p) { return p.male.id === pair.male.id && p.female.id === pair.female.id; }) === index;
    });
    if (!uniquePairs.length) return;

    var playerPairs = uniquePairs.filter(function (p) { return p.playerInvolved; });
    var chosenPool = playerPairs.length > 0 && Math.random() < 0.40 ? playerPairs : uniquePairs;
    var chosen = chosenPool[Math.floor(Math.random() * chosenPool.length)];
    var male = chosen.male;
    var female = chosen.female;
    var isPlayer = male.id === 'player-profile' || female.id === 'player-profile';

    var archetype = INCEST_ARCHETYPES[Math.floor(Math.random() * INCEST_ARCHETYPES.length)];
    var relationLabel = chosen.label;

    if (!male.psychology || typeof male.psychology !== 'object') male.psychology = {};
    if (!female.psychology || typeof female.psychology !== 'object') female.psychology = {};
    male.psychology.sexAddiction = Math.min(100, (male.psychology.sexAddiction || 0) + U.between(20, 35));
    male.psychology.corruption = Math.min(100, (male.psychology.corruption || 0) + U.between(25, 40));
    male.psychology.trauma = Math.min(100, (male.psychology.trauma || 0) + U.between(15, 25));
    female.psychology.sexAddiction = Math.min(100, (female.psychology.sexAddiction || 0) + U.between(20, 35));
    female.psychology.corruption = Math.min(100, (female.psychology.corruption || 0) + U.between(25, 40));
    female.psychology.trauma = Math.min(100, (female.psychology.trauma || 0) + U.between(15, 25));
    male.psychology.inNightmare = true;
    female.psychology.inNightmare = true;
    if (!male.psychology.nightmareIncestLabel) male.psychology.nightmareIncestLabel = [];
    if (!female.psychology.nightmareIncestLabel) female.psychology.nightmareIncestLabel = [];
    male.psychology.nightmareIncestLabel.push(archetype + ':' + relationLabel);
    female.psychology.nightmareIncestLabel.push(archetype + ':' + relationLabel);

    var eventLogText;
    if (isPlayer) {
      var playerTextMap = PLAYER_INCEST_TEXT[relationLabel];
      eventLogText = playerTextMap ? (playerTextMap[archetype] || playerTextMap['噩梦引诱']) : '你感到了不属于这个世界的力量正在撕裂家族间的禁忌。';
    } else {
      eventLogText = npcIncestText(archetype, relationLabel, male.name, female.name, host.name, chosen.feminized);
    }

    Game.lifeDirector.addLog(state, archetype,
      host.name + '的梦魇撕裂了' + male.name + '和' + female.name + '（' + relationLabel + '）之间的禁忌之墙。'
      + eventLogText, 'danger');

    if (isPlayer) {
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(10, 20));
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + U.between(8, 15));
      state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(18, 30));
      state.stats['健康'] = Math.max(10, state.stats['健康'] - U.between(3, 8));
      state.supernatural._lastIncestFamily = { maleId: male.id, femaleId: female.id, label: relationLabel, archetype: archetype };
      if (!state.pendingDecision) {
        var otherPerson = male.id === 'player-profile' ? female : male;
        state.pendingDecision = {
          type: 'nightmare_incest',
          title: archetype,
          text: host.name + '的梦魇正在撕裂你和' + otherPerson.name + '（' + relationLabel + '）之间的禁忌。' + eventLogText + '\n\n你的身体正在做出反应——你分不清这反应是来自你自己，还是来自那股不属于这个世界的力量。',
          options: [
            { value: 'resist', label: '咬破嘴唇 · 用疼痛抵抗' },
            { value: 'submit', label: '放弃抵抗 · 沉入梦魇' },
          ],
        };
        state.timeSpeed = 0;
      }
    }

    Game.familyConflict?.addSuspicion?.(state, 18, familyConflictLabel(male, female) + '之间出现了不可修复的裂痕');

    if (Game.relationshipSecretsCore) {
      var record = Game.relationshipSecretsCore.addRecord(state, {
        kind: '梦魇引诱乱伦（' + archetype + '）',
        participants: [male.id, female.id],
        known: isPlayer,
        note: male.name + '与' + female.name + '（' + relationLabel + '）在' + archetype + '下跨越了乱伦禁忌',
      });
      var pregnant = Game.relationshipSecretsCore.schedulePregnancy(state, female, male, record);
      if (pregnant && isPlayer) {
        state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(5, 10));
      }
    }
  }

  function familyConflictLabel(a, b) {
    var rA = a.relation || '';
    var rB = b.relation || '';
    if ((rA === '父亲' && rB === '女儿') || (rA === '女儿' && rB === '父亲')) return '父女';
    if ((rA === '母亲' && rB === '儿子') || (rA === '儿子' && rB === '母亲')) return '母子';
    if ((rA === '哥哥' && rB === '妹妹') || (rA === '妹妹' && rB === '哥哥')) return '兄妹';
    if ((rA === '姐姐' && rB === '弟弟') || (rA === '弟弟' && rB === '姐姐')) return '姐弟';
    return '家人';
  }

  function applyBondageBehavior(state, specter, host) {
    if (specter.bondTarget && specter.bondTarget !== host.id) {
      var bonded = Game.people.find(state, specter.bondTarget);
      if (bonded && bonded.status === '健康' && !bonded.deceasedAt) {
        if (!bonded.psychology || typeof bonded.psychology !== 'object') bonded.psychology = {};
        bonded.psychology.sexAddiction = Math.min(100, (bonded.psychology.sexAddiction || 0) + U.between(5, 10));
        bonded.psychology.corruption = Math.min(100, (bonded.psychology.corruption || 0) + U.between(4, 8));
        bonded.psychology.trauma = Math.min(100, (bonded.psychology.trauma || 0) + U.between(3, 7));
        host.stats['健康'] = Math.max(10, (host.stats['健康'] || 50) + U.between(2, 5));
        bonded.stats['健康'] = Math.max(10, (bonded.stats['健康'] || 50) - U.between(5, 12));
        if (bonded.stats['健康'] <= 10 && !bonded.specterPossessed) {
          Game.lifeDirector.addLog(state, '情缚噬命',
            host.name + '与' + bonded.name + '之间的情缚已经吸干了后者的生命力。'
            + bonded.name + '在最后的高潮中断了气，而' + host.name + '的皮肤变得更加光滑。',
            'danger');
        }
      } else {
        specter.bondTarget = '';
      }
    }
    if (!specter.bondTarget && Math.random() < 0.25) {
      var bondCandidate = Game.people.all(state).find(function (p) {
        return p && p.id !== 'player-profile' && p.id !== host.id
          && !p.specterPossessed && !p.skinCaptured
          && p.status === '健康' && !p.deceasedAt
          && (p.currentCity || '') === (host.currentCity || state.location.city);
      });
      if (bondCandidate) {
        specter.bondTarget = bondCandidate.id;
        host.psychology.sexAddiction = Math.min(100, (host.psychology.sexAddiction || 0) + U.between(20, 35));
        bondCandidate.psychology = bondCandidate.psychology || {};
        bondCandidate.psychology.sexAddiction = Math.min(100, (bondCandidate.psychology.sexAddiction || 0) + U.between(20, 35));
        Game.lifeDirector.addLog(state, '情缚缠绕',
          host.name + '的目光锁定了' + bondCandidate.name
          + '。一种不属于这个世界的渴望正在将他们捆绑在一起——被缚者将在无尽的亲密中被慢慢吸干。',
          'danger');
      }
    }
  }

  function applyBreederBehavior(state, specter, host) {
    if (host.gender === '男' && specter.stage === '显形') {
      host.gender = '女';
      host.bodyType = U.random(['丰满', '丰腴', '匀称']);
      host.stats = host.stats || {};
      host.stats['魅力'] = Math.max(host.stats['魅力'] || 50, U.between(75, 95));
      if (!host.job || host.job === '无') host.job = '妓女';
      host.sexWork = host.sexWork && typeof host.sexWork === 'object' ? host.sexWork : {};
      host.sexWork.isProstitute = true;
      host.psychology = host.psychology || {};
      host.psychology.breederMarked = true;
      Game.appearancePipeline?.apply(state, host, 'specter');
      Game.lifeDirector.addLog(state, '育母降临',
        host.name + '的身体在欲母的影响下发生了可怕的变化——无论原本的性别是什么，一具为孕育幽诡之种而改造的容器正在成型。',
        'danger');
    }
    if (specter.stage === '掠食' && host.gender === '女' && Math.random() < 0.22) {
      if (!host.specterPregnantDue || host.specterPregnantDue < state.totalMonths) {
        host.specterPregnantDue = state.totalMonths + 3;
        host.specterSpawnType = U.random(['怨灵', '魅妖', '淫妖']);
        Game.lifeDirector.addLog(state, '育母孕种',
          host.name + '的腹部开始不正常地隆起。那不是人类的孩子——那是欲母在她体内种下的下一代幽诡。三个月后，一只新的'
          + host.specterSpawnType + '将破体而出，宿主也将随之死去。',
          'danger');
      }
    }
    if (host.specterPregnantDue && state.totalMonths >= host.specterPregnantDue) {
      host.status = '死亡';
      host.deceasedAt = state.totalMonths;
      host.specterPregnantDue = null;
      var spawnedType = host.specterSpawnType || '怨灵';
      host.specterSpawnType = null;
      Game.lifeDirector.addLog(state, '宿主崩解',
        host.name + '的身体在惨叫声中绽裂——一只新生的' + spawnedType
        + '从她的残骸中蠕动着爬了出来。它立刻消失在夜色中，寻找着下一个宿主。',
        'danger');
      if (state.supernatural.specters.length < MAX_SPECTERS) {
        var spawnCandidates = validHostCandidates(state);
        if (spawnCandidates.length) {
          var spawnTarget = spawnCandidates[Math.floor(Math.random() * spawnCandidates.length)];
          spawnTarget.specterPossessed = true;
          var newSpecter = {
            hostId: spawnTarget.id,
            type: spawnedType,
            monthsActive: 0,
            stage: '潜伏',
            exposed: false,
            lastFeedMonth: state.totalMonths,
            lastBreedMonth: state.totalMonths,
            victims: [],
            alertLevel: 0,
            hp: specterHpByType(spawnedType),
            generation: Math.max(1, Number(specter.generation) || 1) + 1,
          };
          state.supernatural.specters.push(newSpecter);
          Game.specterEcology?.recordPossession(state, spawnTarget, newSpecter);
        }
      }
    }
  }

  function tryBreedSpecter(state, specter, host) {
    if (specter.stage === '潜伏') return;
    var hostTrauma = (host.psychology && host.psychology.trauma) ? host.psychology.trauma : (host.trauma || 0);
    var breedInterval = specter.type === '欲母' ? 18 : 36;
    var traumaMult = 1;
    if (hostTrauma >= 80) { breedInterval = 3; traumaMult = 4; }
    else if (hostTrauma >= 60) { breedInterval = 6; traumaMult = 2.5; }
    else if (hostTrauma >= 40) { breedInterval = 12; traumaMult = 1.8; }
    var monthsSince = state.totalMonths - (specter.lastBreedMonth || state.totalMonths - breedInterval);
    if (monthsSince < breedInterval) return;
    var chance = (specter.stage === '掠食' ? 0.30 : 0.15) * traumaMult;
    if (Math.random() > chance) return;
    specter.lastBreedMonth = state.totalMonths;
    if (state.supernatural.specters.length >= MAX_SPECTERS) return;
    var candidates = validHostCandidates(state);
    if (!candidates.length) return;
    var target = candidates[Math.floor(Math.random() * candidates.length)];
    if (!target) return;
    target.specterPossessed = true;
    target.specterPossessedAtMonth = state.totalMonths;
    var childType = specter.type === '欲母' ? randomSpecterType() : specter.type;
    var childSpecter = {
      hostId: target.id,
      type: childType,
      monthsActive: 0,
      stage: '潜伏',
      exposed: false,
      lastFeedMonth: state.totalMonths,
      lastBreedMonth: state.totalMonths,
      victims: [],
      alertLevel: 0,
      hp: specterHpByType(childType),
      parentHostId: specter.hostId,
      generation: Math.max(1, Number(specter.generation) || 1) + 1,
      bredFrom: host.id,
    };
    state.supernatural.specters.push(childSpecter);
    Game.specterEcology?.recordPossession(state, target, childSpecter);
    if (!target.psychology || typeof target.psychology !== 'object') target.psychology = {};
    target.psychology.sexAddiction = Game.content.between(50, 75);
    target.psychology.corruption = Game.content.between(40, 60);
    target.sexWork = target.sexWork && typeof target.sexWork === 'object' ? target.sexWork : {};
    target.sexWork.isProstitute = true;
    if (!target.job || target.job === '无') target.job = '妓女';
    Game.lifeDirector.addLog(state, hostTrauma >= 60 ? '创伤繁殖' : '幽诡繁殖',
      host.name + '身上的' + specter.type + '在宿主' + (hostTrauma >= 60 ? '崩溃的精神裂隙' : '身体') + '中产下了新的幽诡之种，寄生了' + target.name + '。'
      + (hostTrauma >= 80 ? '宿主的创伤已经深到让幽诡几乎不受限制地增殖。' : ''),
      'danger');
  }

  function npcIncestText(archetype, label, maleName, femaleName, hostName, feminized) {
    var isFem = label.indexOf('女体化') >= 0 || feminized;
    if (isFem) {
      var femTexts = {
        '噩梦引诱': maleName + '在梦魇中看到了' + femaleName + '——那个曾经是他父亲/哥哥的人，如今顶着一具女性的身体站在他面前。梦境里没有父子/兄弟的界限。醒来后两人对视，' + femaleName + '的脸是红的。',
        '酒后乱性': maleName + '和' + femaleName + '都喝了很多。' + femaleName + '——曾经被称为父亲/哥哥的人——如今的身体让' + maleName + '无法移开视线。酒劲上来后，有人主动了。没人记得是谁先开始的。',
        '浴室越界': '浴室的雾气中，' + femaleName + '——那个曾经的男性家人——现在的身体曲线在水汽中若隐若现。' + maleName + '在门口站了很久才敲了门。里面传来的女声说"进来"。',
        '病态共依': femaleName + '自从变成女性后，越来越依赖' + maleName + '——那种依赖渐渐越过了亲情的边界。' + maleName + '发现自己无法拒绝这个曾经是父亲/哥哥的人的任何请求。任何请求。',
        '献祭觉醒': femaleName + '在地下室找到了一个古老的仪式——用亲子/兄弟的血缘之力来完成"女性化"的最终阶段。仪式需要' + maleName + '的参与——不是作为儿子/弟弟，而是作为配偶。',
      };
      return femTexts[archetype] || femTexts['噩梦引诱'];
    }
    var texts = {
      '父女': {
        '噩梦引诱': maleName + '在梦魇的驱使下走进了女儿' + femaleName + '的房间。第二天早上，' + femaleName + '醒来时发现自己身上有不明痕迹——她记得那些梦的内容，但她不敢告诉任何人。',
        '酒后乱性': maleName + '今晚喝醉了，他的眼神不像父亲——像在看一个女人。' + femaleName + '扶他回房间的时候，他的手指在她手腕上停留得太久了。',
        '浴室越界': femaleName + '洗澡时浴室门被推开了——父亲' + maleName + '说他"不知道有人在里面"。但他没有立即退出去。' + femaleName + '用浴巾遮住了身体。他的目光没有离开。',
        '病态共依': '自从母亲离开后，' + maleName + '和' + femaleName + '之间的距离越来越近。他叫她"小公主"，而她发现自己在挑睡衣的时候开始考虑——父亲今天会不会看到。',
        '献祭觉醒': maleName + '在书房里翻出了一本写满拉丁文的旧书。书上说"以亲子之血重写血脉"。他叫来了' + femaleName + '——他唯一的孩子。',
      },
      '母子': {
        '噩梦引诱': femaleName + '在睡梦中被梦魇操纵着推开了儿子' + maleName + '的房门。' + maleName + '在半梦半醒间分不清现实与噩梦的界限——当他彻底清醒时，一切已经太晚了。',
        '酒后乱性': femaleName + '借着酒劲对' + maleName + '说了很多不该说的话——关于孤独、关于她从丈夫那里得不到的东西。她的眼泪滴在' + maleName + '的手背上。他擦掉了。然后一切都变了。',
        '浴室越界': femaleName + '让' + maleName + '帮她拿毛巾——她说自己忘了带。' + maleName + '递过去的时候，她没有完全躲在门后面。他看到了——看到了不该看到的东西。她没有遮。',
        '病态共依': femaleName + '失去了丈夫后把全部情感都转移到了' + maleName + '身上。她说"你是家里唯一的男人"——然后她的手指开始解开他的扣子。',
        '献祭觉醒': femaleName + '在月圆之夜叫醒' + maleName + '。后院的地上画着盐线构成的纹章。"只有你能完成这个仪式，"她说，"我的儿子。我的伴侣。"',
      },
      '兄妹': {
        '噩梦引诱': maleName + '和' + femaleName + '在同一夜被同一个梦境召唤——梦中的他们不受任何禁忌的约束。醒来后的对视里多了一些此前从未有过的、沉甸甸的东西。',
        '酒后乱性': femaleName + '第一次偷喝了' + maleName + '的酒。她满脸通红地靠在他身上，手指在他胸口画圈。"为什么你不是别人？"——但她的语气听起来并不遗憾。',
        '浴室越界': maleName + '洗澡时' + femaleName + '推门进来拿东西。她发出了短促的尖叫但没有跑开。他们对视了两秒。' + maleName + '第一个移开了视线——因为他感觉到了身体的反应。',
        '病态共依': '父母离婚后' + femaleName + '只和' + maleName + '说话。今晚她哭着说她梦到了哥哥和别人结婚了。她抱得太紧了。他感觉到了。',
        '献祭觉醒': femaleName + '的日记本上画满了同一个符号——被交缠的线条围绕的眼睛。最后一页写着：必须和哥哥完成仪式。',
      },
      '姐弟': {
        '噩梦引诱': maleName + '醒来时发现姐姐' + femaleName + '正蜷缩在床的另一边发抖。两个人都没有说话，因为他们都记得那个梦。那个他们同时参与的、不能提的梦。',
        '酒后乱性': femaleName + '失恋了。' + maleName + '陪她喝酒。她靠在他肩膀上哭，然后吻了他——不是脸颊，是嘴唇。她说"对不起"，但语气里没有歉意。',
        '浴室越界': maleName + '经过浴室时' + femaleName + '叫他帮忙搓背。他说这不太好吧。她笑了一声说你小时候我不是天天给你洗——但他们都长大了。',
        '病态共依': femaleName + '说如果' + maleName + '交了女朋友她就会死。她说这话的时候在笑，眼神却很认真。今晚她穿了一条比以前短很多的裙子。',
        '献祭觉醒': femaleName + '在旧书店找到了一本姻缘之书。她让' + maleName + '把手放在书页中间，自己覆着他的手。书本开始发热——一种不属于世俗范畴的联结在他们之间成形。',
      },
    };
    var relTexts = texts[label];
    if (!relTexts) return maleName + '和' + femaleName + '在' + hostName + '的梦魇中跨越了本不该被跨越的界线。';
    return relTexts[archetype] || relTexts['噩梦引诱'];
  }

  function corruptFamilyInRedLight(state, specter) {
    if (specter.stage !== '掠食') return;
    if (Math.random() > 0.28) return;
    var host = hostPerson(state, specter);
    if (!host) return;

    var familyMembers = state.family.filter(function (p) {
      return p.id !== host.id && p.id !== 'player-profile' && p.status !== '死亡';
    });
    if (!familyMembers.length) return;

    var target = familyMembers[Math.floor(Math.random() * familyMembers.length)];
    if (!target.psychology || typeof target.psychology !== 'object') target.psychology = {};
    target.psychology.corruption = Math.min(100, (target.psychology.corruption || 0) + U.between(10, 20));
    target.psychology.trauma = Math.min(100, (target.psychology.trauma || 0) + U.between(12, 25));

    if (target.gender === '女') {
      target.sexWork = target.sexWork && typeof target.sexWork === 'object' ? target.sexWork : {};
      target.sexWork.isProstitute = true;
      target.sexWork.brothelVisits = (target.sexWork.brothelVisits || 0) + 1;
      target.sexWork.lastBrothelMonth = state.totalMonths;
      if (!target.job || target.job === '无') target.job = '妓女';
    }

    var eventText = '';
    if (target.relation === '母亲') {
      eventText = '你在红灯区瞥见了一个熟悉的身影——那是' + host.name + '推着你的母亲走进了一场交易。';
    } else if (target.relation === '父亲') {
      eventText = host.name + '深夜不归，你偶然发现' + target.name + '竟与' + host.name + '一同出入风月场所。';
    } else if (target.relation === '姐姐' || target.relation === '妹妹') {
      eventText = host.name + '带' + target.name + '出入红灯区，你听到风声时简直不敢相信。';
    } else if (target.relation === '儿子' || target.relation === '女儿') {
      eventText = '你收到了令人不安的消息：' + host.name + '竟将自己的孩子卷入见不得光的交易。';
    } else {
      eventText = host.name + '正在将身边亲密的人一个个拖入深渊，' + target.name + '也未能幸免。';
    }
    Game.lifeDirector.addLog(state, '家族的哭声', eventText, 'warning');
    state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + 15);
    if (Game.familyConflict && Game.familyConflict.addSuspicion) {
      Game.familyConflict.addSuspicion(state, 12, '你的亲人卷入风化场所，家庭裂痕加深');
    }
  }

  var ATTACK_EVENTS = [
    {
      name: '夜间尾随', requireExposed: false,
      text: function (name) { return '深夜的街头，你总觉得有一股视线追随在后。回头时，街角的' + name + '正静静站着，对你微笑。'; },
      effect: { trauma: 5, awareness: 8, hp: 0 },
    },
    {
      name: '午夜敲门', requireExposed: true,
      text: function (name) { return '凌晨三点的敲门声急促而持续。你在猫眼中看到了' + name + '那张惨白的脸紧贴在门上。'; },
      effect: { trauma: 10, awareness: 12, hp: 0 },
    },
    {
      name: '黑暗中的人影', requireExposed: false,
      text: function (name) { return '停电的浴室里，镜中映出一个不属于你的影子。那个轮廓逐渐变得像' + name + '。'; },
      effect: { trauma: 8, awareness: 10, hp: 0 },
    },
    {
      name: '枕边人', requireExposed: false,
      text: function (name) { return '你从迷蒙中睁开眼，' + name + '直直坐在床沿注视着你，瞳孔中没有任何光线反射。在你惊叫之前，那双眼又恢复了正常。'; },
      effect: { trauma: 12, awareness: 15, hp: 0 },
    },
    {
      name: '镜中的脸', requireExposed: false,
      text: function (name) { return '清晨洗漱时，镜面上短暂映出了一张不属于这个世界的脸。它对你无声地咧开了嘴。'; },
      effect: { trauma: 6, awareness: 5, hp: 0 },
    },
    {
      name: '家族的哭声', requireExposed: false,
      text: function (name) { return '路过' + name + '的家门口，你隐约听到了不属于活人的哭泣声从紧闭的门后传来。'; },
      effect: { trauma: 4, awareness: 8, hp: 0 },
    },
    {
      name: '袭击', requireExposed: true,
      text: function (name) { return name + '的嘴角裂到了耳根，满口都是不属于人类的利齿。它朝你扑了过来。'; },
      effect: { trauma: 20, awareness: 20, hp: 0, combat: true },
    },
    {
      name: '血色晚宴', requireExposed: false,
      text: function (name) { return '你收到' + name + '家人的聚餐邀请。在推门进去的瞬间，你看到了此生最不该看到的画面——一家人围坐在桌边，每个人的脸都是' + name + '。'; },
      effect: { trauma: 25, awareness: 30, hp: 0 },
    },
    /* ===== 淫妖专属 ===== */
    {
      name: '体液之触', requireExposed: false, specterType: '淫妖',
      text: function (name) { return '你在公交车上被人群挤到了' + name + '身边。你感觉到有什么温热的东西滴在了你的大腿上——不是水，它在你皮肤上蠕动。'; },
      effect: { trauma: 11, awareness: 12, hp: 0 },
    },
    {
      name: '媚香', requireExposed: false, specterType: '淫妖',
      text: function (name) { return '你闻到了一股甜腻的花香，源头是' + name + '。你的身体开始发烫，呼吸变得急促——你意识到这是一种不属于人类的荷尔蒙。你咬破嘴唇强迫自己保持清醒。'; },
      effect: { trauma: 8, awareness: 10, hp: 0 },
    },
    {
      name: '淫梦中的手', requireExposed: true, specterType: '淫妖',
      text: function (name) { return '你做了一个梦——梦里' + name + '的双手在你身上游走，而你在梦中无法拒绝。你尖叫着醒来，发现被子上有不属于你的湿痕。'; },
      effect: { trauma: 15, awareness: 14, hp: 0 },
    },
    /* ===== 梦魇专属 ===== */
    {
      name: '鬼压床', requireExposed: false, specterType: '梦魇',
      text: function (name) { return '你清醒地躺在床上，但身体完全不能动。你看到一个黑影——轮廓很像' + name + '——正从天花板倒垂下来，脸离你越来越近。它的头发扫过你的嘴唇。'; },
      effect: { trauma: 10, awareness: 10, hp: 0 },
    },
    {
      name: '梦中交合', requireExposed: true, specterType: '梦魇',
      text: function (name) { return '你在梦中与一个看不清面孔的人交合。醒来时你记得那个梦的每一个细节——包括那个人的手指、嘴唇、和在你耳边说的那声属于' + name + '的低语。你分不清是梦还是真的发生过。'; },
      effect: { trauma: 14, awareness: 15, hp: 0 },
    },
    {
      name: '无眠之夜', requireExposed: false, specterType: '梦魇',
      text: function (name) { return '连续三天你无法入睡。每当你闭上眼睛，' + name + '的脸就会出现在你脑海中最私密的幻想里。你害怕睡着——不是因为噩梦，而是因为你知道你在梦里会自愿回应它。'; },
      effect: { trauma: 12, awareness: 12, hp: 0 },
    },
    /* ===== 情缚专属 ===== */
    {
      name: '被凝视的脖子', requireExposed: false, specterType: '情缚',
      text: function (name) { return '你感到后颈一阵发麻。回头时' + name + '正盯着你的脖子看——那眼神不像猎人看猎物，更像情人看情人的咽喉。你下意识地用手遮住了脖子，但那股灼热感仍然留在皮肤上。'; },
      effect: { trauma: 9, awareness: 10, hp: 0 },
    },
    {
      name: '无法割断的红线', requireExposed: true, specterType: '情缚',
      text: function (name) { return name + '走到你面前，把那根不存在于肉眼可见世界的红线的一端塞进了你的掌心——尽管你没有握住任何东西，但你感觉到了：有什么正在紧紧地、无法挣脱地缠绕着你的无名指。'; },
      effect: { trauma: 13, awareness: 15, hp: 0 },
    },
    /* ===== 欲母专属 ===== */
    {
      name: '隆起的谎言', requireExposed: false, specterType: '欲母',
      text: function (name) { return name + '的腹部不正常地隆起着，但她对你微笑的时候，那个弧度看上去甚至像一种邀请——她走过来的时候，你发现自己的手不由自主地伸向了她的肚子。你猛地缩回手，指尖已经碰到了那层紧绷的皮肤。'; },
      effect: { trauma: 11, awareness: 12, hp: 0 },
    },
    {
      name: '奶水的香气', requireExposed: true, specterType: '欲母',
      text: function (name) { return '房间里弥漫着一股甜腥的奶香。' + name + '半敞着衣襟坐在角落，怀里抱着什么——起初你以为是个婴儿，走近了才发现那是一个蜷缩着的人形大小的肉茧。它正在蠕动。'; },
      effect: { trauma: 18, awareness: 18, hp: 0 },
    },
    {
      name: '欲母之诱', requireExposed: false, specterType: '欲母',
      text: function (name) { return name + '拉着你坐下，温柔地说起"孩子"的事情。她的声音里有一种不属于人类的母性，让你的身体产生了违背意志的反应——你的子宫/腹部在隐隐作痛，仿佛正在回应她的邀请。'; },
      effect: { trauma: 14, awareness: 14, hp: 0 },
    },
  ];

  function triggerAttackEvent(state, specter) {
    if (state.supernatural.lastAttackMonth >= state.totalMonths - 1) return;
    var host = hostPerson(state, specter);
    if (!host) return;

    var available = ATTACK_EVENTS.filter(function (ev) {
      if (ev.requireExposed && !specter.exposed) return false;
      if (ev.specterType && ev.specterType !== specter.type) return false;
      return true;
    });
    if (!available.length) return;

    var event = available[Math.floor(Math.random() * available.length)];

    if (event.name === '袭击') {
      state.supernatural.lastAttackMonth = state.totalMonths;
      startCombat(state, specter);
      return;
    }

    state.supernatural.lastAttackMonth = state.totalMonths;
    Game.lifeDirector.addLog(state, event.name, event.text(host.name), 'danger');
    state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + Math.floor((event.effect.trauma || 0) / 2));
    state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + (event.effect.awareness || 0));
    state.stats['健康'] = Math.max(10, state.stats['健康'] - Math.floor((event.effect.trauma || 0) / 5));
    specter.exposed = true;
  }

  function feedOnVictim(state, specter) {
    Game.specterEcology?.feed(state, specter);
  }

  function startCombat(state, specter) {
    var idx = state.supernatural.specters.indexOf(specter);
    var mgBonus = Game.magicalGirlCore ? Game.magicalGirlCore.combatBonus(state) : { hp: 0 };
    var playerMaxHp = COMBAT_PLAYER_MAX_HP + (mgBonus.hp || 0);
    state.supernatural.combat.active = true;
    state.supernatural.combat.specterIndex = idx;
    state.supernatural.combat.specterHp = specter.hp;
    state.supernatural.combat.playerHp = playerMaxHp;
    state.supernatural.combat.playerMaxHp = playerMaxHp;
    state.supernatural.combat.round = 0;
    state.supernatural.combat.log = ['幽诡露出了真身——' + specter.type + '。战斗开始。' + (mgBonus.hp > 0 ? '魔法少女变身！HP上限提升至 ' + playerMaxHp + '。' : '')];
    state.timeSpeed = 0;
  }

  function combatPlayerAttack(state) {
    var c = state.supernatural.combat;
    var idx = c.specterIndex;
    if (idx < 0 || idx >= state.supernatural.specters.length) return endCombat(state, false);
    var specter = state.supernatural.specters[idx];
    c.round += 1;

    var dmg = U.between(10, 18);
    var mgBonus = Game.magicalGirlCore ? Game.magicalGirlCore.combatBonus(state) : { atk: 0 };
    if (mgBonus.atk > 0) dmg += mgBonus.atk;
    if (state.supernatural.playerAwareness >= 80) dmg = Math.max(dmg, U.between(18, 28));
    c.specterHp = Math.max(0, c.specterHp - dmg);
    c.log.push('第' + c.round + '回合：你造成了 ' + dmg + ' 点伤害。（幽诡 HP: ' + c.specterHp + '）');

    if (c.specterHp <= 0) {
      c.log.push('幽诡在你最后一击下发出了非人的惨叫，躯体崩塌成黑烟消散。');
      return endCombat(state, true);
    }

    var atk = specterAtkByType(specter.type);
    var enemyDmg = U.between(Math.floor(atk * 0.7), atk);
    c.playerHp = Math.max(0, c.playerHp - enemyDmg);
    c.log.push('幽诡反击造成了 ' + enemyDmg + ' 点伤害。（你的 HP: ' + c.playerHp + '）');

    if (c.playerHp <= 0) {
      c.log.push('你被击倒在地。在失去意识之前，你看到幽诡的人形面孔正在龟裂剥落。');
      return endCombat(state, false);
    }

    specter.hp = c.specterHp;
  }

  function combatPlayerFlee(state) {
    var c = state.supernatural.combat;
    var roll = Math.random();
    if (roll < 0.6) {
      c.log.push('你趁幽诡露出破绽的瞬间转身飞奔。身后的嘶吼声越来越远，你成功逃脱了。');
      return endCombat(state, false);
    }
    c.log.push('你试图逃跑，但幽诡的速度远超你想象。它挡住了你的去路。');
    var idx = c.specterIndex;
    if (idx >= 0 && idx < state.supernatural.specters.length) {
      var specter = state.supernatural.specters[idx];
      var atk = specterAtkByType(specter.type);
      c.playerHp = Math.max(0, c.playerHp - Math.floor(atk * 0.5));
      c.log.push('逃跑失败，幽诡趁机反击，造成 ' + Math.floor(atk * 0.5) + ' 点伤害。（你的 HP: ' + c.playerHp + '）');
    }
  }

  function endCombat(state, killed) {
    var c = state.supernatural.combat;
    var idx = c.specterIndex;
    if (killed && idx >= 0 && idx < state.supernatural.specters.length) {
      var specter = state.supernatural.specters[idx];
      var host = hostPerson(state, specter);
      var hostName = host ? host.name : '某个被寄生的人';
      var magical = Game.magicalGirlCore?.isMagicalGirl(state);
      if (magical && Game.specterEcology) {
        Game.specterEcology.purify(state, specter, {
          name: state.name, player: true, consumeMagic: false,
        }, '正面决战');
      } else {
        Game.specterEcology?.clearFeeding(state, specter);
        Game.lifeDirector.addLog(state, '幽诡击杀', '你成功击杀了寄生于' + hostName + '身上的' + specter.type + '。宿主的躯体也随之崩解，无法挽回。', 'milestone');
        if (host) {
          host.specterPossessed = false;
          host.specterDestroyedAtMonth = state.totalMonths;
          host.status = '死亡';
          host.deceasedAt = state.totalMonths;
        }
        state.supernatural.specters.splice(idx, 1);
      }
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + 10);
      state.supernatural.specterKills = (Number(state.supernatural.specterKills) || 0) + 1;
    } else if (!killed) {
      state.supernatural.specterDefeats = (Number(state.supernatural.specterDefeats) || 0) + 1;
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(5, 10));
      if (c.playerHp <= 0) {
        Game.lifeDirector.addLog(state, '重伤', '你在幽诡面前几乎丧命。醒来后，你发现自己倒在街头，衣服被冷汗浸透。', 'danger');
        state.stats['健康'] = Math.max(10, state.stats['健康'] - U.between(15, 25));
      }
    }
    c.active = false;
    c.specterIndex = -1;
    c.specterHp = 0;
    c.playerHp = COMBAT_PLAYER_MAX_HP;
    c.playerMaxHp = COMBAT_PLAYER_MAX_HP;
    c.round = 0;
    c.log = [];
  }

  function confrontSpecter(state, specter) {
    specter.exposed = true;
    specter.alertLevel = Math.min(100, specter.alertLevel + 30);
    var host = hostPerson(state, specter);
    var hostName = host ? host.name : '它';
    var roll = Math.random();
    if (roll < 0.35) {
      Game.lifeDirector.addLog(state, '正面质问', '你直视' + hostName + '的眼睛，一字一顿地揭穿了它的伪装。它沉默了许久，然后对你露出了一个不属于人类的笑。', 'warning');
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + 20);
      specter.alertLevel = Math.min(100, specter.alertLevel + 20);
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(1, 4));
      return { ok: true, message: '你揭穿了幽诡的伪装，但它只是对你微笑。' };
    }
    if (roll < 0.65) {
      startCombat(state, specter);
      return { ok: true, message: '质问激怒了幽诡——它露出了真身！' };
    }
    Game.lifeDirector.addLog(state, '质问无效', hostName + '困惑地看着你，似乎完全不明白你在说什么。它的伪装滴水不漏。', 'normal');
    specter.alertLevel = Math.min(100, specter.alertLevel + 10);
    return { ok: false, message: hostName + '完全否认了你的指控，周围的人都觉得你多疑了。' };
  }

  function monthly(state) {
    ensure(state);
    var supernatural = state.supernatural;
    if (!supernatural.enabled) return;

    trySpawnSpecter(state);

    var i = supernatural.specters.length - 1;
    for (; i >= 0; i--) {
      var specter = supernatural.specters[i];
      specter.monthsActive += 1;
      advanceStage(specter);
      applyHostSexBehavior(state, specter);
      applyTypeSpecificBehavior(state, specter);

      var host = hostPerson(state, specter);
      if (!host || host.status === '死亡' || host.status === '失踪') {
        supernatural.specters.splice(i, 1);
        if (specter.exposed) {
          Game.lifeDirector.addLog(state, '宿主消亡', '幽诡的宿主已经不存在了。幽诡也随之消失——抑或已经找到了新的目标。', 'warning');
        }
        continue;
      }
      Game.specterHostRecovery?.advance(state, host, specter);

      if (specter.stage === '掠食') {
        corruptFamilyInRedLight(state, specter);
        feedOnVictim(state, specter);
      }

      tryBreedSpecter(state, specter, host);
    }

    if (state.totalMonths >= 72 && supernatural.specters.length === 0) {
      trySpawnSpecter(state);
    }

    if (supernatural.specters.length > 0) {
      var awareGain = supernatural.specters.reduce(function (sum, s) { return sum + (s.exposed ? 3 : 1); }, 0);
      supernatural.playerAwareness = Math.min(100, supernatural.playerAwareness + awareGain);
      if (supernatural.playerAwareness >= 40) {
        var exposedCount = supernatural.specters.filter(function (s) { return s.exposed; }).length;
        if (exposedCount > 0) supernatural.spiritCorruption = Math.min(100, supernatural.spiritCorruption + exposedCount);
      }
    } else {
      supernatural.playerAwareness = Math.max(0, supernatural.playerAwareness - 1);
    }

    if (Game.npcInitiative && supernatural.specters.length > 0) {
      var exposedSpecters = supernatural.specters.filter(function (s) { return s.exposed || supernatural.playerAwareness >= 60; });
      for (var j = 0; j < exposedSpecters.length; j++) {
        if (Math.random() < 0.25) {
          triggerAttackEvent(state, exposedSpecters[j]);
        }
      }
    }
  }

  function handleClick(event) {
    var state = Game._getState ? Game._getState() : null;
    if (!state || !state.supernatural) return false;

    var confrontBtn = event.target.closest('[data-specter-confront]');
    if (confrontBtn) {
      var sid = confrontBtn.dataset.specterConfront;
      var specter = state.supernatural.specters.find(function (s) { return s.hostId === sid; });
      if (specter && getCombatActive(state)) return true;
      if (specter) {
        var result = confrontSpecter(state, specter);
        if (Game._refresh) Game._refresh();
        if (Game._save) Game._save();
      }
      return true;
    }

    var fleeBtn = event.target.closest('[data-specter-flee]');
    if (fleeBtn && getCombatActive(state)) {
      combatPlayerFlee(state);
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }

    var attackBtn = event.target.closest('[data-specter-attack]');
    if (attackBtn && getCombatActive(state)) {
      combatPlayerAttack(state);
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }

    return false;
  }

  function getCombatActive(state) {
    return !!(state.supernatural && state.supernatural.combat && state.supernatural.combat.active);
  }

  function getSpecters(state) {
    ensure(state);
    return state.supernatural.specters;
  }

  function renderCombat(state) {
    if (!getCombatActive(state)) return '';
    var c = state.supernatural.combat;
    var idx = c.specterIndex;
    var specterName = '';
    if (idx >= 0 && idx < state.supernatural.specters.length) {
      var specter = state.supernatural.specters[idx];
      var host = hostPerson(state, specter);
      specterName = (host ? host.name : '未知') + '（' + specter.type + '）';
    }
    var logHtml = c.log.map(function (l) { return '<p>' + l + '</p>'; }).join('');
    var maxHp = Number.isFinite(c.playerMaxHp) ? c.playerMaxHp : COMBAT_PLAYER_MAX_HP;
    return '<div class="specter-combat panel"><h2>幽诡之战 — ' + specterName + '</h2>'
      + '<div class="combat-bars"><p>幽诡 HP: <b>' + c.specterHp + '</b></p><progress value="' + c.specterHp + '" max="' + (idx >= 0 && idx < state.supernatural.specters.length ? state.supernatural.specters[idx].hp : 200) + '"></progress>'
      + '<p>你的 HP: <b>' + c.playerHp + '</b></p><progress value="' + c.playerHp + '" max="' + maxHp + '"></progress></div>'
      + '<div class="combat-actions"><button type="button" data-specter-attack>⚔ 攻击</button><button type="button" data-specter-flee>🏃 逃跑（60%）</button></div>'
      + '<div class="combat-log">' + logHtml + '</div>'
      + '</div>';
  }

  function renderSpecterClues(state) {
    ensure(state);
    var specters = state.supernatural.specters;
    if (!specters.length) return '';
    var threshold = (Game.magicalGirlCore && Game.magicalGirlCore.isMagicalGirl(state)) ? 30 : 40;
    if (state.supernatural.playerAwareness < threshold) return '<p class="hint">你隐约觉得有些不对劲，但说不上来是什么。</p>';
    var lines = specters.map(function (s) {
      var host = hostPerson(state, s);
      var name = host ? host.name : '未知';
      var rel = hostRelation(state, s);
      var stageText = s.stage;
      var clueText = '';
      if (s.stage === '潜伏') clueText = '行为完全正常，毫无破绽';
      else if (s.stage === '显形') clueText = '体温偏低，夜晚行踪诡异，性欲异常旺盛';
      else {
        var feeding = s.feeding && s.feeding.victimId
          ? ' · 当前吞噬进度 ' + Math.round(s.feeding.progress || 0) + '%' : '';
        clueText = '皮相溃烂，已猎食 ' + s.victims.length + ' 名无辜者' + feeding;
      }
      var btn = s.exposed ? '' : '<button type="button" class="btn-small" data-specter-confront="' + s.hostId + '">当面质问</button>';
      return '<div class="specter-clue"><p><b>' + name + '</b> · ' + rel + ' · 阶段：' + stageText + '</p><p class="hint">' + clueText + '</p>' + btn + '</div>';
    }).join('');
    return '<details class="fold-section"><summary><span>异常线索</span><small>' + specters.length + ' 处异常</small></summary><div class="fold-content">' + lines + '</div></details>';
  }

  Game.supernaturalSpecter = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    handleClick: handleClick,
    getCombatActive: getCombatActive,
    getSpecters: getSpecters,
    renderCombat: renderCombat,
    renderSpecterClues: renderSpecterClues,
    startCombat: startCombat,
    possessTarget: possessTarget,
  });
}(window));
