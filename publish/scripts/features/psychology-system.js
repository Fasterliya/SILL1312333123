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

    /* NPC monthly processing */
    const allPeople = Game.people ? Game.people.all(state) : [];
    allPeople.forEach((npc) => {
      if (!npc || npc.status !== '健康') return;
      const np = ensureNpc(npc);

      /* NPC trauma decay */
      if (np.trauma > 0) {
        np.trauma = U.clamp(np.trauma - 1, 0, 100);
      }

      /* NPC suicide check */
      if (np.trauma >= 80 && Math.random() < 0.08 && !state.pendingDecision) {
        state.pendingDecision = {
          type: 'psychology', subtype: 'suicideCall', npcId: npc.id,
        };
        Game.lifeDirector.addLog(state, '求救信号',
          `${npc.name}给你打来一个电话，声音异常平静。"只是想最后听听你的声音……"`, 'normal');
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
        Game.lifeDirector.addLog(state, '挽救生命',
          `你赶到${name}的住处，砸开门将她从死亡边缘拉了回来。她抱着你哭了很久很久。`, 'milestone');
        state.pendingDecision = null;
        return { ok: true, message: `你救了${name}。她的创伤减轻了。` };
      }
      /* save failed */
      npc.status = '已故';
      Game.lifeDirector.addLog(state, '无力回天',
        `你赶到${name}的住处，但已经太晚了。她就那样安静地躺着，像睡着了一样。`, 'milestone');
      addGuilt(state, 30);
      state.pendingDecision = null;
      return { ok: true, message: `${name}已经离开了人世。愧疚感涌上心头。` };
    }

    if (choiceId === 'family') {
      if (Math.random() < 0.40) {
        np.trauma = U.clamp(np.trauma - 20, 0, 100);
        Game.lifeDirector.addLog(state, '家人介入',
          `你联系了${name}的家人。他们及时赶到，阻止了悲剧的发生。`, 'good');
        state.pendingDecision = null;
        return { ok: true, message: `${name}的家人及时介入，她的创伤有所缓解。` };
      }
      /* family intervention failed */
      npc.status = '已故';
      Game.lifeDirector.addLog(state, '迟来的消息',
        `你联系了${name}的家人，但他们赶到时已经太晚。一个生命就这样消逝了。`, 'milestone');
      addGuilt(state, 20);
      state.pendingDecision = null;
      return { ok: true, message: `${name}的家人没能及时赶到。你感到一阵深深的无力感。` };
    }

    if (choiceId === 'ignore') {
      npc.status = '已故';
      Game.lifeDirector.addLog(state, '沉默的代价',
        `你没有理会那个电话。几天后，${name}的死讯传来。那个平静的声音成了她最后的告别。`, 'milestone');
      addGuilt(state, 40);
      state.pendingDecision = null;
      return { ok: true, message: `你选择了忽略。${name}离开了，沉重的愧疚压在你心头。` };
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

    return `<section class="panel">
      <div class="panel-title"><h2>心理状态</h2><span>成瘾 · 愧疚 · 腐化</span></div>
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
    return false;
  }

  Game.psychology = Object.freeze({
    ensure, addAddiction, addGuilt, addCorruption,
    monthly, rehab, reduceGuilt, npcSexAddictionText,
    render, renderDecision, resolve, handleClick,
  });
}(window));
