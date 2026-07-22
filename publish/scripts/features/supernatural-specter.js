(function initSupernaturalSpecter(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var SPECTER_TYPES = ['怨灵', '恶煞', '魅妖'];
  var STAGES = ['潜伏', '显形', '掠食'];
  var MAX_SPECTERS = 5;
  var SPAWN_CHANCE = 0.02;
  var COMBAT_PLAYER_MAX_HP = 100;

  function specterHpByType(type) {
    if (type === '恶煞') return 280;
    if (type === '魅妖') return 160;
    return 200;
  }

  function specterAtkByType(type) {
    if (type === '恶煞') return 42;
    if (type === '魅妖') return 22;
    return 32;
  }

  function randomSpecterType() {
    var roll = Math.random();
    if (roll < 0.55) return '怨灵';
    if (roll < 0.85) return '魅妖';
    return '恶煞';
  }

  function ensure(state) {
    var current = state.supernatural;
    if (!current || typeof current !== 'object') {
      state.supernatural = { enabled: true, specters: [], playerAwareness: 0, spiritCorruption: 0, lastAttackMonth: -12, combat: { active: false, specterIndex: -1, specterHp: 0, playerHp: COMBAT_PLAYER_MAX_HP, playerMaxHp: COMBAT_PLAYER_MAX_HP, round: 0, log: [] } };
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

  function selectHostTarget(state, candidates) {
    if (!candidates.length) return null;

    var familyPool = candidates.filter(function (p) {
      return state.family.some(function (f) { return f.id === p.id; });
    });
    var spouseInFamily = familyPool.filter(function (p) { return state.romance && p.id === state.romance.partnerId; });
    var rankedFamily = spouseInFamily.concat(familyPool.filter(function (p) { return !spouseInFamily.includes(p); }));
    rankedFamily.sort(function (a, b) { return (b.affection || 0) - (a.affection || 0); });

    var contactPool = candidates.filter(function (p) {
      return state.contacts.some(function (c) { return c.id === p.id; }) && !familyPool.includes(p);
    });
    var specialPool = candidates.filter(function (p) { return p.specialCharacter; });
    var citizenPool = candidates.filter(function (p) {
      return !rankedFamily.includes(p) && !contactPool.includes(p) && !specialPool.includes(p);
    });

    var roll = Math.random();
    var pool;
    if (roll < 0.45 && rankedFamily.length) pool = rankedFamily;
    else if (roll < 0.75 && contactPool.length) pool = contactPool;
    else if (roll < 0.90 && specialPool.length) pool = specialPool;
    else if (citizenPool.length) pool = citizenPool;
    else if (rankedFamily.length) pool = rankedFamily;
    else if (contactPool.length) pool = contactPool;
    else pool = candidates;

    return pool[0] || null;
  }

  function possessTarget(state, person, origin) {
    if (!person) return false;
    person.specterPossessed = true;
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
    if (Math.random() > SPAWN_CHANCE) return;
    var candidates = validHostCandidates(state);
    if (!candidates.length) return;
    var target = selectHostTarget(state, candidates);
    if (target && possessTarget(state, target)) {
      var rel = hostRelation(state, { hostId: target.id });
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
      host.hairstyle = U.random(Game.config ? Game.config.appearance.hairstyle.slice(4, 9) : ['齐肩直发', '自然卷发', '层次碎发']);
      host.stats = host.stats || {};
      host.stats['魅力'] = Math.max(host.stats['魅力'] || 50, U.between(70, 90));
      if (host.clothing) {
        host.clothing.top = U.random(Game.config ? Game.config.appearance.top.slice(4, 10) : ['通勤正装', '文艺穿搭', '品质日常']);
        host.clothing.socks = U.random(['白色连裤袜', '黑色连裤袜', '船袜']);
        host.clothing.shoes = U.random(['乐福鞋', '白色运动鞋']);
      }
      if (!host.job || host.job === '无') host.job = '妓女';
      host.sexWork.brothelVisits = (host.sexWork.brothelVisits || 0) + 1;
      host.sexWork.lastBrothelMonth = 0;
      if (host.temperament) host.temperament = U.random(Game.config ? Game.config.appearance.temperament.slice(4) : ['清冷', '文雅', '灵动']);
    }
    if (specter.stage === '掠食') {
      host.stats = host.stats || {};
      host.stats['魅力'] = Math.min(100, (host.stats['魅力'] || 50) + U.between(3, 8));
      host.bodyType = U.random(['丰满', '匀称', '娇小纤细']);
      if (host.clothing) {
        host.clothing.top = U.random(Game.config ? Game.config.appearance.top.slice(6, 12) : ['品质日常', '针织开衫', '工装外套', '轻便羽绒服']);
        host.clothing.socks = U.random(['黑色连裤袜', '白色连裤袜']);
        host.clothing.shoes = U.random(['乐福鞋', '皮鞋']);
      }
      if (!host.job || host.job === '无') host.job = '妓女';
    }
  }

  function corruptFamilyInRedLight(state, specter) {
    if (specter.stage !== '掠食') return;
    if (Math.random() > 0.18) return;
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
  ];

  function triggerAttackEvent(state, specter) {
    if (state.supernatural.lastAttackMonth >= state.totalMonths - 1) return;
    var host = hostPerson(state, specter);
    if (!host) return;

    var available = ATTACK_EVENTS.filter(function (ev) {
      if (ev.requireExposed && !specter.exposed) return false;
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
    state.stats['健康'] = Math.max(5, state.stats['健康'] - Math.floor((event.effect.trauma || 0) / 5));
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
      if (Game.magicalGirlCore && Game.magicalGirlCore.isMagicalGirl(state)) {
        Game.magicalGirlCore.onKill(state);
      }
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
      Game.lifeDirector.addLog(state, '幽诡击杀', '你成功击杀了寄生于' + hostName + '身上的' + specter.type + '。宿主的躯体也随之崩解，无法挽回。', 'milestone');
      if (host) {
        host.status = '死亡';
        host.deceasedAt = state.totalMonths;
      }
      state.supernatural.specters.splice(idx, 1);
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + 10);
    } else if (!killed) {
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

      var host = hostPerson(state, specter);
      if (!host || host.status === '死亡' || host.status === '失踪') {
        supernatural.specters.splice(i, 1);
        if (specter.exposed) {
          Game.lifeDirector.addLog(state, '宿主消亡', '幽诡的宿主已经不存在了。幽诡也随之消失——抑或已经找到了新的目标。', 'warning');
        }
        continue;
      }

      if (specter.stage === '掠食') {
        corruptFamilyInRedLight(state, specter);
        feedOnVictim(state, specter);
      }
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
        if (Math.random() < 0.12) {
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
