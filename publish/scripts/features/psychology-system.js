(function initPsychology(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- ensure ---- */
  function ensure(state) {
    state.psychology = state.psychology && typeof state.psychology === 'object' ? state.psychology : {};
    const p = state.psychology;
    p.sexAddiction = U.clamp(Number(p.sexAddiction) || 0, 0, 100);
    p.lastSexMonth = Number.isFinite(p.lastSexMonth) ? p.lastSexMonth : -1;
    p.withdrawalMonths = Number.isFinite(p.withdrawalMonths) ? p.withdrawalMonths : 0;
    p.guilt = U.clamp(Number(p.guilt) || 0, 0, 100);
    p.corruption = U.clamp(Number(p.corruption) || 0, 0, 100);
    p.trauma = U.clamp(Number(p.trauma) || 0, 0, 100);
    p.breakdowns = Array.isArray(p.breakdowns) ? p.breakdowns.slice(-8) : [];
    p.lastTraumaMonth = Number.isFinite(p.lastTraumaMonth) ? p.lastTraumaMonth : -1;
    return p;
  }

  function ensureNpc(npc) {
    npc.psychology = npc.psychology && typeof npc.psychology === 'object' ? npc.psychology : {};
    const p = npc.psychology;
    p.trauma = U.clamp(Number(p.trauma) || 0, 0, 100);
    p.sexAddiction = U.clamp(Number(p.sexAddiction) || 0, 0, 100);
    p.rapedBy = Array.isArray(p.rapedBy) ? p.rapedBy : [];
    p.lastSexMonth = Number.isFinite(p.lastSexMonth) ? p.lastSexMonth : -1;
    return p;
  }

  /* ---- addiction ---- */
  function addAddiction(state, amount) {
    ensure(state);
    if (amount > 0) {
      state.psychology.lastSexMonth = state.totalMonths;
      state.psychology.withdrawalMonths = 0;
    }
    state.psychology.sexAddiction = U.clamp(state.psychology.sexAddiction + amount, 0, 100);
  }

  /* ---- guilt ---- */
  function addGuilt(state, amount) {
    ensure(state);
    state.psychology.guilt = U.clamp(state.psychology.guilt + amount, 0, 100);
  }

  /* ---- corruption ---- */
  function addCorruption(state, amount) {
    ensure(state);
    state.psychology.corruption = U.clamp(state.psychology.corruption + amount, 0, 100);
  }

  function addTrauma(state, amount, source) {
    ensure(state);
    state.psychology.trauma = U.clamp(state.psychology.trauma + amount, 0, 100);
    state.psychology.lastTraumaMonth = state.totalMonths;
    if (amount >= 10) {
      Game.lifeDirector.addLog(state, '心理创伤',
        (source || '近期经历') + '在你心中留下了深深的伤痕。', 'normal');
      Game.stressSystem.add(state, Math.round(amount * 1.5), '心理创伤');
    }
  }

  function reduceTrauma(state, amount, method) {
    ensure(state);
    state.psychology.trauma = U.clamp(state.psychology.trauma - amount, 0, 100);
    Game.lifeDirector.addLog(state, '创伤愈合',
      (method || '时间') + '让伤口开始慢慢愈合。', 'good');
  }

  /* ---- rehab ---- */
  function rehab(state) {
    ensure(state);
    const countryCost = { '华夏': 5000, '日本': 8000, '美国': 15000, '新加坡': 12000 };
    const cost = countryCost[state.location?.country] || 5000;
    if (state.money < cost) return { ok: false, message: `康复中心需要${Game.view.money(cost)}，资金不足` };
    Game.economy.spend(state, cost);
    Game.lifeDirector.advance(state, 3);
    const reduction = 40 + Math.floor(Math.random() * 21);
    state.psychology.sexAddiction = U.clamp(state.psychology.sexAddiction - reduction, 0, 100);
    state.psychology.withdrawalMonths = 0;
    state.psychology.lastSexMonth = state.totalMonths;
    Game.lifeDirector.addLog(state, '康复治疗',
      '三个月后，你站在阳光下深深呼吸。体内的冲动终于平息了。', 'good');
    return { ok: true, message: '完成三个月康复治疗，性瘾大幅降低' };
  }

  /* ---- reduce guilt ---- */
  function reduceGuilt(state, method) {
    ensure(state);
    switch (method) {
      case 'donate': {
        if (state.money < 5000) return { ok: false, message: '捐款需要5000元' };
        Game.economy.spend(state, 5000);
        state.psychology.guilt = U.clamp(state.psychology.guilt - 15, 0, 100);
        Game.lifeDirector.addLog(state, '赎罪捐款',
          '你匿名捐出一笔钱。虽然无法改变过去，但至少稍微减轻了内心的负担。', 'good');
        return { ok: true, message: '捐款5000元，愧疚感减轻15点' };
      }
      case 'confess': {
        state.psychology.guilt = U.clamp(state.psychology.guilt - 30, 0, 100);
        if (Game.familyConflict) {
          Game.familyConflict.addSuspicion(state, 50, '你的坦白让伴侣震惊，信任瞬间崩塌');
        }
        Game.lifeDirector.addLog(state, '坦白',
          '你终于说出了压在心底的话。沉默比指责更让你痛苦。但至少，秘密不再吞噬你。', 'normal');
        return { ok: true, message: '坦白让愧疚大幅减轻，但配偶怀疑度急剧上升' };
      }
      case 'temple': {
        state.psychology.guilt = U.clamp(state.psychology.guilt - 3, 0, 100);
        Game.lifeDirector.addLog(state, '寺庙祈福',
          '在寺庙的香火中静坐了一下午。袅袅青烟带走了些许不安。', 'good');
        return { ok: true, message: '在寺庙静心，愧疚感减轻3点' };
      }
      default:
        return { ok: false, message: '未知的赎罪方式' };
    }
  }

  /* ---- NPC narrative ---- */
  function npcSexAddictionText(npc) {
    ensureNpc(npc);
    const name = npc.name || '她';
    const rapedByPlayer = (npc.psychology.rapedBy || []).includes('player-profile');
    if (rapedByPlayer) {
      return `自从那晚之后，${name}变了。她不再去原来的公司。你听说她现在每晚出现在红灯区附近...矛盾的是她有时会发消息给你："我恨你但我需要你。"`;
    }
    return `自从那件事之后，${name}像是变了一个人。她不再去原来的公司。听说她现在每晚出现在红灯区附近。曾经的纯真，已经被彻底摧毁。`;
  }

  /* ---- monthly ---- */
  function monthly(state) {
    const p = ensure(state);

    /* withdrawal decay: no sex for 3+ months */
    const monthsSinceSex = p.lastSexMonth >= 0 ? state.totalMonths - p.lastSexMonth : 0;
    if (monthsSinceSex >= 3) {
      p.withdrawalMonths = monthsSinceSex;
      if (state.totalMonths - (p._lastWithdrawalMonth || 0) >= 1) {
        p.sexAddiction = U.clamp(p.sexAddiction - 1, 0, 100);
        p._lastWithdrawalMonth = state.totalMonths;
      }
    }

    /* sex addiction tier effects */
    if (p.sexAddiction >= 85) {
      state.stats.心情 = U.clamp(state.stats.心情 - 15, 0, 100);
      state.career.performance = Math.max(0, (state.career.performance || 0) - 30);
      state.stats.魅力 = U.clamp(state.stats.魅力 - 10, 0, 100);
      /* impulse spending */
      if (Math.random() < 0.15) {
        const impulseAmount = Math.min(state.money, Math.round(state.money * 0.05 + 500));
        if (impulseAmount > 0) {
          Game.economy.spend(state, impulseAmount);
          Game.lifeDirector.addLog(state, '冲动失控',
            `无法压制的欲望让你在深夜挥霍了${Game.view.money(impulseAmount)}。性瘾正在吞噬你的生活。`, 'normal');
        }
      }
    } else if (p.sexAddiction >= 70) {
      state.stats.心情 = U.clamp(state.stats.心情 - 8, 0, 100);
      state.career.performance = Math.max(0, (state.career.performance || 0) - 12);
      state.stats.智力 = U.clamp(state.stats.智力 - 5, 0, 100);
      /* random auto-trigger red-light visit */
      if (!state.pendingDecision && Math.random() < 0.10 && Game.brothelSystem) {
        const result = Game.brothelSystem.start(state);
        if (result.ok) {
          Game.lifeDirector.addLog(state, '欲望驱使',
            '体内的瘾让你无法专注。等你回过神来，发现自己已站在红灯区的巷口。', 'normal');
        }
      }
    } else if (p.sexAddiction >= 50) {
      state.stats.心情 = U.clamp(state.stats.心情 - 3, 0, 100);
      state.career.performance = Math.max(0, (state.career.performance || 0) - 5);
      if (state.romance.married && Game.familyConflict) {
        Game.familyConflict.addSuspicion(state, 1, '你频繁的异常行为让配偶隐隐不安');
      }
    } else if (p.sexAddiction >= 30) {
      state.stats.心情 = U.clamp(state.stats.心情 - 1, 0, 100);
      state.stats.智力 = U.clamp(state.stats.智力 - 2, 0, 100);
    }

    /* guilt effects */
    if (p.guilt >= 80) {
      /* auto-confess: set pending decision */
      if (state.romance.married && !state.pendingDecision) {
        state.pendingDecision = { type: 'psychology', subtype: 'autoConfess' };
      }
    } else if (p.guilt >= 50) {
      state.stats.心情 = U.clamp(state.stats.心情 - 3, 0, 100);
      if (state.romance.married && Game.familyConflict) {
        Game.familyConflict.addSuspicion(state, 2, '你反常的沉默和回避让配偶心生疑窦');
      }
    } else if (p.guilt >= 20) {
      /* interaction text — log once per year the avoidance behaviour */
      if (state.month === 1 && state.romance.married) {
        Game.lifeDirector.addLog(state, '内心愧疚',
          '你发现自己无法直视伴侣的眼睛。那些秘密在心里翻滚，像一块沉重的石头。', 'normal');
      }
    }

    /* corruption effects */
    if (p.corruption > 50) {
      /* normal sex arousal halved — manifested as mood dampening */
      if (state.month === 6) {
        Game.lifeDirector.addLog(state, '冷漠之心',
          '普通的亲密已无法让你兴奋。只有更极端的方式才能让你感受到波澜。', 'normal');
      }
    }
    if (p.corruption > 80) {
      state.stats.魅力 = U.clamp(state.stats.魅力 - 15, 0, 100);
      if (state.month === 1) {
        Game.lifeDirector.addLog(state, '黑暗气息',
          '周围的人开始不自觉地避开你的目光。一股沉重的气息从你身上散发出来。', 'normal');
      }
    }

    /* player trauma effects */
    if (p.trauma >= 90) {
      state.stats.智力 = U.clamp(state.stats.智力 - 15, 0, 100);
      if (!state.pendingDecision && Math.random() < 0.06) {
        state.pendingDecision = { type: 'psychology', subtype: 'playerSuicidal' };
        Game.lifeDirector.addLog(state, '深渊边缘',
          '你站在阳台边，看着下面的街道。跳下去就都结束了，不是吗？', 'milestone');
      }
    } else if (p.trauma >= 70) {
      state.stats.魅力 = U.clamp(state.stats.魅力 - 10, 0, 100);
      state.stats.交涉 = U.clamp(state.stats.交涉 - 8, 0, 100);
      if (state.month === 1) {
        Game.lifeDirector.addLog(state, 'PTSD症状',
          '即使是日常的场景，也会突然把你拉回那个时刻。手心出汗，呼吸急促。', 'normal');
      }
    } else if (p.trauma >= 45) {
      state.stats.交涉 = U.clamp(state.stats.交涉 - 5, 0, 100);
      if (Math.random() < 0.08) {
        Game.stressSystem.add(state, 4, 'PTSD闪回');
        Game.lifeDirector.addLog(state, '闪回',
          '毫无预兆的，那段记忆又浮现在眼前。你的身体不受控制地颤抖起来。', 'normal');
      }
    } else if (p.trauma >= 20) {
      if (state.month === 6 && Math.random() < 0.5) {
        Game.lifeDirector.addLog(state, '隐隐作痛',
          '有些事情虽然过去了，但留下的痕迹不会轻易消失。你偶尔仍会想起那段经历。', 'normal');
      }
    }

    /* player trauma natural decay */
    if (p.trauma > 0) {
      var decayRate = p.trauma >= 60 ? 0.6 : p.trauma >= 30 ? 0.8 : 1.0;
      var hasSupport = state.romance.married || (state.family || []).some(function (f) {
        return (f.relation === '朋友' || f.relation === '恋人') && (f.affection || 0) >= 70;
      });
      if (hasSupport) decayRate *= 1.4;
      var monthsSinceTrauma = state.totalMonths - (p.lastTraumaMonth || state.totalMonths);
      if (monthsSinceTrauma >= 6) decayRate *= 1.3;
      p.trauma = Math.max(0, p.trauma - decayRate);
    }

    /* NPC monthly processing */
    const allPeople = Game.people ? Game.people.all(state) : [];
    allPeople.forEach((npc) => {
      if (!npc || npc.status !== '健康') return;
      const np = ensureNpc(npc);

      /* NPC trauma decay */
      if (np.trauma > 0) {
        np.trauma = U.clamp(np.trauma - 1, 0, 100);
      }

      /* 高创伤NPC不再自杀，而是变得极易被幽诡寄生 */
      if (np.trauma >= 80 && Math.random() < 0.12 && !state.pendingDecision) {
        npc.status = '健康';
        npc.specterVulnerable = true;
        Game.lifeDirector.addLog(state, '精神崩溃边缘',
          npc.name + '的精神创伤已经深到几乎无法承载自我。她的眼神空洞，像是在邀请什么东西来取代她。', 'danger');
      }

      if (npc.specterVulnerable && np.trauma < 80) {
        np.trauma = Math.min(100, np.trauma + U.between(2, 5));
      }

      /* NPC sex addiction -> become prostitute */
      if (np.sexAddiction >= 50 && npc.gender === '女') {
        npc.sexWork = npc.sexWork && typeof npc.sexWork === 'object' ? npc.sexWork : {};
        if (!npc.sexWork.isProstitute && Math.random() < 0.05) {
          npc.sexWork.isProstitute = true;
          if (!npc.job || npc.job === '无') npc.job = '妓女';
          Game.lifeDirector.addLog(state, '堕落之路',
            `你注意到${npc.name}频繁出现在红灯区附近。她似乎走上了一条无法回头的路。`, 'normal');
        }
      }
    });
  }

  /* ---- decision resolution ---- */
  function resolve(state, choiceId) {
    const d = state.pendingDecision;
    if (!d || d.type !== 'psychology') return { ok: false, message: '没有待处理的心理决策' };

    if (d.subtype === 'autoConfess') {
      return resolveAutoConfess(state, choiceId);
    }
    if (d.subtype === 'suicideCall') {
      return resolveSuicideCall(state, choiceId);
    }
    if (d.subtype === 'playerSuicidal') {
      return resolvePlayerSuicidal(state, choiceId);
    }
    return { ok: false, message: '未知的心理决策类型' };
  }

  function resolveAutoConfess(state, choiceId) {
    const p = ensure(state);
    if (choiceId === 'confess') {
      p.guilt = U.clamp(p.guilt - 50, 0, 100);
      if (state.romance.married && Game.familyConflict) {
        Game.familyConflict.addSuspicion(state, 45, '你的坦白让伴侣的世界崩塌');
      }
      const partner = Game.people ? Game.people.find(state, state.romance.partnerId) : null;
      const partnerName = partner ? partner.name : '伴侣';
      Game.lifeDirector.addLog(state, '痛苦的坦白',
        `你跪在${partnerName}面前，将一切和盘托出。泪水模糊了视线，但那些压在心底的石头终于落地了。`, 'milestone');
      state.pendingDecision = null;
      return { ok: true, message: '你坦白了一切。愧疚大幅减轻，但关系已无法回到从前。' };
    }
    if (choiceId === 'silence') {
      p.guilt = U.clamp(p.guilt + 5, 0, 100);
      Game.lifeDirector.addLog(state, '继续隐瞒',
        '你选择继续沉默。伴侣似乎察觉到了什么，但没有追问。秘密像毒药一样在心底发酵。', 'normal');
      state.pendingDecision = null;
      return { ok: true, message: '你选择了沉默。愧疚感仍在侵蚀内心。' };
    }
    return { ok: false, message: '无效的选择' };
  }

  function resolveSuicideCall(state, choiceId) {
    const d = state.pendingDecision;
    const npc = Game.people ? Game.people.find(state, d.npcId) : null;
    if (!npc) {
      state.pendingDecision = null;
      return { ok: false, message: '该人物已不在人世' };
    }
    const np = ensureNpc(npc);
    const name = npc.name;

    if (choiceId === 'save') {
      if (Math.random() < 0.60) {
        np.trauma = U.clamp(np.trauma - 30, 0, 100);
        Game.lifeDirector.addLog(state, '挽救',
          '你赶到' + name + '身边，将她从崩溃的边缘拉了回来。她抱着你哭了很久很久。', 'milestone');
        state.pendingDecision = null;
        return { ok: true, message: '你救了' + name + '。她的创伤减轻了。' };
      }
      np.trauma = U.clamp(np.trauma + 10, 0, 100);
      npc.specterVulnerable = true;
      Game.lifeDirector.addLog(state, '精神失守',
        '你赶到' + name + '的住处，但她已经把自己锁在了房间里。她的眼睛是空的——像是灵魂已经离开，留下了一具等待被占据的空壳。', 'danger');
      addGuilt(state, 20);
      state.pendingDecision = null;
      return { ok: true, message: name + '的精神防线彻底崩溃，她变得极易被幽诡寄生。' };
    }

    if (choiceId === 'family') {
      if (Math.random() < 0.40) {
        np.trauma = U.clamp(np.trauma - 20, 0, 100);
        Game.lifeDirector.addLog(state, '家人介入',
          '你联系了' + name + '的家人。他们及时赶到将她从深渊边缘拉了回来。', 'good');
        state.pendingDecision = null;
        return { ok: true, message: name + '的家人及时介入，她的创伤有所缓解。' };
      }
      np.trauma = U.clamp(np.trauma + 8, 0, 100);
      npc.specterVulnerable = true;
      Game.lifeDirector.addLog(state, '迟来的消息',
        '你联系了' + name + '的家人，但他们赶到时发现她蜷缩在角落，对着墙壁用不属于自己的声音低语。', 'danger');
      addGuilt(state, 15);
      state.pendingDecision = null;
      return { ok: true, message: name + '的精神已经不再完全属于她自己了。' };
    }

    if (choiceId === 'ignore') {
      np.trauma = Math.min(100, np.trauma + 15);
      npc.specterVulnerable = true;
      Game.lifeDirector.addLog(state, '被遗弃的灵魂',
        '你没有理会那个电话。几天后，你在街角看到了' + name + '——她独自站着，对着空气说话，声音是一个你不认识的音色。', 'danger');
      addGuilt(state, 30);
      state.pendingDecision = null;
      return { ok: true, message: '你选择了忽略。' + name + '的精神崩溃了，她的身体变成了一具等待被占据的空壳。' };
    }

    return { ok: false, message: '无效的选择' };
  }

  function resolvePlayerSuicidal(state, choiceId) {
    var p = ensure(state);
    if (choiceId === 'call_hotline') {
      p.trauma = U.clamp(p.trauma - 35, 0, 100);
      Game.stressSystem.reduce(state, 40, '心理咨询热线');
      Game.lifeDirector.addLog(state, '求救',
        '你颤抖着拨通了热线电话。对面的声音温柔而坚定，陪你度过了最难熬的两个小时。', 'milestone');
      state.pendingDecision = null;
      return { ok: true, message: '热线救了你。创伤大幅减轻。' };
    }
    if (choiceId === 'reach_out') {
      var supporter = (state.family || []).find(function (f) {
        return (f.affection || 0) >= 60 && (f.relation === '朋友' || f.relation === '恋人');
      });
      if (supporter) {
        p.trauma = U.clamp(p.trauma - 25, 0, 100);
        Game.stressSystem.reduce(state, 25, '朋友支持');
        supporter.affection = U.clamp((supporter.affection || 0) + 8, 0, 100);
        Game.lifeDirector.addLog(state, '倾诉',
          supporter.name + '听你说完了一切，什么都没说，只是紧紧地抱住了你。', 'milestone');
        state.pendingDecision = null;
        return { ok: true, message: '朋友的陪伴让你重新看到了希望。' };
      }
      p.trauma = U.clamp(p.trauma - 8, 0, 100);
      Game.lifeDirector.addLog(state, '独白',
        '你对着空荡荡的房间说了很久。没有人回应，但说出来本身就已经是一种释放。', 'normal');
      state.pendingDecision = null;
      return { ok: true, message: '说出来让你稍微好受了一些。' };
    }
    if (choiceId === 'shut_down') {
      p.trauma = U.clamp(p.trauma + 8, 0, 100);
      Game.stressSystem.add(state, 20, '自我封闭');
      state.stats.心情 = U.clamp((state.stats.心情 || 0) - 25, 0, 100);
      Game.lifeDirector.addLog(state, '封闭',
        '你把自己锁在房间里，拉上所有窗帘。黑暗中，只有自己的呼吸声。', 'normal');
      state.pendingDecision = null;
      return { ok: true, message: '你选择独自承受。黑暗暂时给了你安全感，但阴影仍在加深。' };
    }
    return { ok: false, message: '无效的选择' };
  }

  /* ---- decision render ---- */
  function renderDecision(state) {
    const d = state.pendingDecision;
    if (!d || d.type !== 'psychology') return null;

    if (d.subtype === 'autoConfess') {
      return {
        title: '内心的煎熬',
        text: '愧疚感压得你喘不过气。你再也无法对伴侣隐瞒那些秘密。每一个回避的眼神，每一次欲言又止，都像是在凌迟你的灵魂。',
        options: [
          { value: 'confess', label: '坦白一切 · 愧疚大幅减轻但关系受损' },
          { value: 'silence', label: '继续隐瞒 · 愧疚持续折磨' },
        ],
      };
    }

    if (d.subtype === 'suicideCall') {
      const npc = Game.people ? Game.people.find(state, d.npcId) : null;
      const name = npc ? npc.name : '她';
      return {
        title: '最后的电话',
        text: `${name}的声音异常平静。"只是想最后听听你的声音。"电话那头是长久的沉默。你听出了平静背后的绝望。`,
        options: [
          { value: 'save', label: '立即赶过去 · 60%成功挽救' },
          { value: 'family', label: '通知其家人 · 40%成功介入' },
          { value: 'ignore', label: '忽略这个电话 · 愧疚+40' },
        ],
      };
    }

    if (d.subtype === 'playerSuicidal') {
      return {
        title: '深渊边缘',
        text: '你已经很久没有真正笑过了。每一天醒来都是一场战斗。站在高处往下看的时候，跳下去的想法越来越清晰、越来越诱人。',
        options: [
          { value: 'call_hotline', label: '拨打心理援助热线 · 创伤-35，压力-40' },
          { value: 'reach_out', label: '联系最亲近的人 · 创伤-25，需要好感≥60的朋友' },
          { value: 'shut_down', label: '独自承受 · 创伤+8，压力+20' },
        ],
      };
    }

    return null;
  }

  /* ---- UI render ---- */
  function barHtml(value, level, label, note) {
    const bar = value > 0
      ? `<i class="bar-track"><b style="width:${value}%" class="${value > 60 ? 'critical' : ''}"></b></i>`
      : '';
    return `<div class="psych-bar">
      <span>${label} <strong>${value}</strong> <small>${level}</small></span>
      ${bar}
    </div>`;
  }

  function render(state) {
    const p = ensure(state);

    /* if there is a pending psychology decision, return null (handled by renderDecision) */
    if (state.pendingDecision?.type === 'psychology') return '';

    const sexLevel = p.sexAddiction < 20 ? '正常'
      : (p.sexAddiction < 50 ? '轻度依赖'
      : (p.sexAddiction < 70 ? '中度成瘾'
      : (p.sexAddiction < 85 ? '严重成瘾' : '失控')));
    const guiltLevel = p.guilt < 20 ? '平静'
      : (p.guilt < 50 ? '轻度不安'
      : (p.guilt < 80 ? '中度愧疚' : '重度煎熬'));
    const corruptionLevel = p.corruption < 30 ? '纯净'
      : (p.corruption < 50 ? '微妙'
      : (p.corruption < 80 ? '堕落' : '黑暗'));
    const traumaLevel = p.trauma < 20 ? '平稳'
      : (p.trauma < 45 ? '轻微创伤'
      : (p.trauma < 70 ? '中度PTSD' : (p.trauma < 90 ? '重度PTSD' : '崩溃边缘')));

    const rehabCost = (() => {
      const countryCost = { '华夏': 5000, '日本': 8000, '美国': 15000, '新加坡': 12000 };
      return countryCost[state.location?.country] || 5000;
    })();

    const rehabBtn = p.sexAddiction >= 30
      ? `<button class="wide-action" data-psych-action="rehab">进入康复中心 · ${Game.view.money(rehabCost)}</button>`
      : '';

    const guiltActions = p.guilt >= 20
      ? `<div class="system-actions">
        <button data-psych-action="guilt" data-psych-method="donate">慈善捐款 · ${Game.view.money(5000)}</button>
        <button data-psych-action="guilt" data-psych-method="confess">向伴侣坦白</button>
        <button data-psych-action="guilt" data-psych-method="temple">寺庙祈福 · 免费</button>
      </div>`
      : '';

    const traumaBtn = p.trauma >= 30
      ? `<button class="wide-action" data-psych-action="trauma-therapy">接受心理咨询 · ${Game.view.money(3000)}</button>`
      : '';

    return `<section class="panel">
      <div class="panel-title"><h2>心理状态</h2><span>成瘾 · 愧疚 · 腐化 · 创伤</span></div>
      ${barHtml(p.sexAddiction, sexLevel, '性瘾',
        p.sexAddiction >= 85 ? '性瘾已失控，生活和工作全面崩坏'
        : (p.sexAddiction >= 70 ? '性瘾严重，偶尔不受控制前往红灯区'
        : (p.sexAddiction >= 30 ? '性需求开始影响日常生活' : '')))}
      ${rehabBtn}
      ${barHtml(p.guilt, guiltLevel, '愧疚',
        p.guilt >= 80 ? '内心的罪恶感几乎要将你压垮'
        : (p.guilt >= 20 ? '无法摆脱的愧疚在侵蚀内心' : ''))}
      ${guiltActions}
      ${barHtml(p.corruption, corruptionLevel, '腐化',
        p.corruption >= 80 ? '黑暗的气息让周围人感到不安'
        : (p.corruption > 50 ? '普通的亲密已无法让你感到兴奋' : ''))}
      ${barHtml(p.trauma, traumaLevel, '创伤',
        p.trauma >= 90 ? '你站在深渊边缘，每时每刻都在与自杀念头搏斗'
        : (p.trauma >= 70 ? '严重的PTSD症状：闪回、噩梦、社交回避'
        : (p.trauma >= 45 ? '中度创伤反应：对特定场景的强烈焦虑'
        : (p.trauma >= 20 ? '轻微创伤，偶尔的情绪波动和不安' : ''))))}
      ${traumaBtn}
    </section>`;
  }

  /* ---- click handler ---- */
  function handleClick(event) {
    const btn = event.target.closest('[data-psych-action]');
    if (!btn) return false;
    const state = Game._getState ? Game._getState() : null;
    if (!state) return false;

    const action = btn.dataset.psychAction;
    if (action === 'rehab') {
      const result = rehab(state);
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }
    if (action === 'guilt') {
      const method = btn.dataset.psychMethod;
      const result = reduceGuilt(state, method);
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }
    if (action === 'trauma-therapy') {
      if (state.money < 3000) {
        Game.view.showToast('心理咨询需要3000元', 'warning');
        return true;
      }
      Game.economy.spend(state, 3000);
      var reduction = 15 + Math.floor(Math.random() * 11);
      state.psychology.trauma = U.clamp(state.psychology.trauma - reduction, 0, 100);
      Game.stressSystem.reduce(state, 15, '心理咨询');
      Game.lifeDirector.addLog(state, '心理咨询',
        '咨询师没有评判你，只是安静地倾听。当你说出那些埋藏已久的话时，眼泪终于流了下来。', 'good');
      Game._refresh();
      Game.view.showToast('创伤减轻' + reduction + '点，压力缓解', 'good');
      return true;
    }
    return false;
  }

  Game.psychology = Object.freeze({
    ensure, addAddiction, addGuilt, addCorruption, addTrauma, reduceTrauma,
    monthly, rehab, reduceGuilt, npcSexAddictionText,
    render, renderDecision, resolve, handleClick,
  });
}(window));
