(function initCosplaySuitEvolution(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var COMPULSION_THRESHOLD = 65;
  var ESSENCE_PER_LEVEL = 100;
  var MAX_LEVEL = 5;

  function ensure(state) {
    var c = state.cradle;
    if (!c) return;
    c.cosplayLevel = Math.max(0, Math.min(MAX_LEVEL, Number(c.cosplayLevel) || 0));
    c.cosplayEssence = Math.max(0, Number(c.cosplayEssence) || 0);
    c.cosplayCompulsion = Math.max(0, Number(c.cosplayCompulsion) || 0);
    c.cosplayResistCount = Math.max(0, Number(c.cosplayResistCount) || 0);
    c.cosplaySubmitCount = Math.max(0, Number(c.cosplaySubmitCount) || 0);
    c.cosplayLastAbsorbMonth = Number.isFinite(c.cosplayLastAbsorbMonth) ? c.cosplayLastAbsorbMonth : -1;
    c.cosplayEvolutionLog = Array.isArray(c.cosplayEvolutionLog) ? c.cosplayEvolutionLog.slice(-10) : [];
  }

  function levelLabel(level) {
    var labels = ['休眠', '觉醒', '吸精', '幻变', '融核', '完型'];
    return labels[level] || '休眠';
  }

  function heightByLevel(level) {
    var heights = [0, 158, 155, 150, 145, 140];
    return heights[level] || 0;
  }

  function bodyDescByLevel(level) {
    var descs = [
      '身体尚未开始变化。',
      '皮肤开始变得柔软，毛孔几乎不可见了。你摸自己的手腕时，触感像在摸一块被体温捂暖的硅胶。',
      '身高已经锁定在155cm以下。身体比例开始自动调整——腰更细了，四肢更纤细了，面部轮廓在向着某种"可爱"的方向收窄。',
      '镜子里的你已经不像成年人了。身高150cm，身体比例接近年少时的你——但比那时候更柔软、更光滑。你的声音开始变尖。',
      '你的身体已经彻底变成了一个女孩——145cm的身高、幼态的四肢比例、光滑如瓷的皮肤。你穿上任何衣服都像是穿着过大的戏服。你的声音听不出原来的任何痕迹。',
      '你的身体不再完全由固体构成——皮肤下的组织开始呈现一种半透明的凝胶质感。你的四肢可以轻微变形后又复原。140cm的身体在光线下会投射出一种不自然的虹彩。你已经变成了幻梦Cos服的终极作品——一具活着的、完美的少萝容器。',
    ];
    return descs[level] || '';
  }

  function essencePerEncounter(state, c) {
    var base = U.between(10, 25);
    if (c.cosplayLevel >= 3) base += U.between(5, 10);
    if (c.cosplayLevel >= 4) base = Math.floor(base * 1.3);
    return base;
  }

  function monthly(state) {
    var c = state.cradle;
    if (!c) return;
    ensure(state);
    if (c.cosplayBonded < 1) return;
    if (c.cosplayLevel >= MAX_LEVEL) return;

    if (!state.psychology || typeof state.psychology !== 'object') state.psychology = {};
    var sexAdd = c.cosplayLevel >= 3 ? 5 : (c.cosplayLevel >= 2 ? 4 : 3);
    state.psychology.sexAddiction = Math.min(100, (state.psychology.sexAddiction || 0) + sexAdd);

    c.cosplayCompulsion = state.psychology.sexAddiction;
    if (state.profile) {
      state.profile.cosplayLevel = c.cosplayLevel;
      if (c.cosplayLevel >= 2) {
        state.profile.height = heightByLevel(c.cosplayLevel);
        state.profile.bodyType = c.cosplayLevel >= 4 ? '凝胶少萝' : (c.cosplayLevel >= 3 ? '精致少女' : '纤细柔软');
      }
      Game.portraitStageRules?.apply(state.profile, state);
    }

    if (c.cosplayEssence >= ESSENCE_PER_LEVEL && c.cosplayLevel < MAX_LEVEL) {
      levelUp(state, c);
      Game.portraitStageRules?.apply(state.profile, state);
    }
  }

  function levelUp(state, c) {
    c.cosplayLevel += 1;
    c.cosplayEssence = 0;
    var evoText = '';
    switch (c.cosplayLevel) {
      case 1:
        evoText = '幻梦Cos服内部的纤维开始像神经末梢一样搏动。你感到一股不属于自己的欲望从皮肤表面渗透进来——它想要被触碰、被填充、被滋润。';
        break;
      case 2:
        evoText = 'Cos服的每一根纤维都在欢呼——它尝到了第一次真正的"养料"。你的身高开始缓慢而不可逆地收缩。镜中的你在微笑——但你不确定发出那个微笑的肌肉是不是你自己的。';
        break;
      case 3:
        evoText = '你的体型发生了剧烈的改变。一夜之间身高缩减到了150cm——四肢和躯干的比例自动调整到了一套不属于你原来基因的模板。镜中映出的是一张介于孩子和成人之间的脸——那张脸正在笑，你感到嘴角上扬但你并没有发出笑的指令。';
        break;
      case 4:
        evoText = 'Cos服已经不再区分"外面"和"里面"。你的皮肤本身就是幻梦织物的延伸。你的身体在145cm处锁定，四肢比例精确地符合某种非人审美的比例——可爱、柔软、易于操控。你的声音变成了童音。你的旧衣服穿在身上像披着别人的大衣。';
        break;
      case 5:
        evoText = '你已经完全变成了幻梦Cos服设计师的终极作品。140cm的凝胶般柔软的身体在月光下折射出虹彩——每一寸皮肤都像是活的化纤、每一根骨骼都可以按照需要调整弧度。你可以被塑造成任何形状——但你再也变不回那个"原来的自己"了。因为那个"自己"的模板在Cos服的数据库里已经被永久覆盖。';
        break;
    }
    c.cosplayEvolutionLog.unshift(evoText);
    Game.lifeDirector.addLog(state, 'Cos服进化：' + levelLabel(c.cosplayLevel),
      evoText, 'danger');
  }

  function absorb(state, c, partnerType) {
    ensure(state);
    if (c.cosplayBonded < 1 || c.cosplayLevel >= MAX_LEVEL) return;
    var gained = essencePerEncounter(state, c);
    if (partnerType === 'playerAction') gained += U.between(3, 8);
    c.cosplayEssence += gained;
    c.cosplayLastAbsorbMonth = state.totalMonths;
    c.cosplaySubmitCount += 1;

    if (c.cosplayEssence >= 80 && c.cosplayEssence < ESSENCE_PER_LEVEL) {
      c.cosplayEvolutionLog.unshift('Cos服在吸收养料后微微发光。你还差一点就能突破到下一阶段了。');
    }
  }

  function handleCompulsion(state) {
    var c = state.cradle;
    if (!c || c.cosplayBonded < 1) return null;
    ensure(state);
    if (state.psychology && (state.psychology.sexAddiction || 0) < COMPULSION_THRESHOLD) return null;
    if (c.cosplayLevel >= MAX_LEVEL && c.cosplayLevel > 0) return null;
    var isCompelled = (state.psychology?.sexAddiction || 0) >= COMPULSION_THRESHOLD;
    if (!isCompelled) return null;
    return {
      compelled: true,
      level: c.cosplayLevel,
      sexAddiction: state.psychology ? state.psychology.sexAddiction : 0,
      essence: c.cosplayEssence,
      resistCount: c.cosplayResistCount,
    };
  }

  function playerResist(state) {
    var c = state.cradle;
    if (!c) return { ok: false, message: '没有Cos服' };
    ensure(state);
    c.cosplayResistCount += 1;
    state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(5, 15));
    if (state.psychology && typeof state.psychology === 'object') {
      state.psychology.sexAddiction = Math.max(0, (state.psychology.sexAddiction || 0) - U.between(3, 8));
    }
    state.stats['健康'] = Math.max(10, state.stats['健康'] - U.between(2, 6));
    state.supernatural.spiritCorruption = Math.min(100, (state.supernatural?.spiritCorruption || 0) + U.between(2, 5));

    var resistTexts = [
      '你用冷水泼了自己的脸。下体的灼热感没有消退——Cos服的纤维在你的皮肤下蠕动着抗议。你咬破嘴唇用疼痛对抗欲望。今天你赢了。',
      '你把双手绑在床柱上——不是因为害怕伤害别人，而是害怕它们会背叛你。一整夜你的身体都在发抖，Cos服在无声地尖叫。天亮了，你还活着，还是你自己。',
      '你画了一整夜的画——疯狂地画你的父母、你的老家、你的名字的汉字。每画一笔，Cos服的蠕动就减弱一分。那些被涂满的纸张散落一地，像某种咒符。它们保护了你今晚。',
    ];
    c.cosplayEvolutionLog.unshift(resistTexts[Math.floor(Math.random() * resistTexts.length)]);
    return { ok: true, message: '你顶住了Cos服的驱使——但身体付出了代价。' };
  }

  function playerSubmit(state) {
    var c = state.cradle;
    if (!c) return { ok: false, message: '没有Cos服' };
    ensure(state);
    absorb(state, c, 'playerAction');
    if (state.psychology && typeof state.psychology === 'object') {
      state.psychology.sexAddiction = Math.max(0, (state.psychology.sexAddiction || 0) - U.between(15, 25));
    }

    var submitTexts = [
      '你放弃了抵抗。当你的手顺着Cos服指引的方向滑动时，一股温暖的酥麻从指尖蔓延到脊椎——那不是你自己的快感，是Cos服在进食。事后你感到一阵深入骨髓的空虚——但你确实暂时不再被那种痒感折磨了。',
      '你对着镜子完成了Cos服的要求。镜中的那个人——那个用你的脸做出不属于你表情的人——在结束后对你眨了眨眼。你不知道那是嘲讽还是感谢。',
      '你找了一个陌生人——Cos服不挑食。在那个昏暗的房间里，你感受着不属于自己的快感和不属于自己的羞耻在同时冲刷你。Cos服的纤维在微微发光——它在吸收、在成长、在变得更强大。而你正在变得更弱小。',
    ];
    c.cosplayEvolutionLog.unshift(submitTexts[Math.floor(Math.random() * submitTexts.length)]);
    return { ok: true, message: '你顺从了Cos服。快感淹没了一切——包括那个正在被一点点擦除的"自己"。' };
  }

  function renderCompulsion(state) {
    var comp = handleCompulsion(state);
    if (!comp) return '';

    var nextLevel = state.cradle.cosplayLevel + 1;
    var essencePct = state.cradle.cosplayEssence;
    var levelName = levelLabel(nextLevel);

    return '<div class="cosplay-compulsion panel" style="margin-top:10px;padding:12px;border:1px solid #d4869c;border-left:4px solid #c44d7a;border-radius:6px;background:#fef5f8">'
      + '<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:#c44d7a">Cos服的低语 · 欲求不満</h3>'
      + '<p style="font-size:10px;color:var(--ui-muted);margin:0 0 8px">'
      + '性冲动：' + comp.sexAddiction + '/100 · 吸精进度：' + essencePct + '/' + ESSENCE_PER_LEVEL + '（下一阶段：' + levelName + '）'
      + ' · 抵抗' + state.cradle.cosplayResistCount + '次 · 顺从' + state.cradle.cosplaySubmitCount + '次</p>'
      + '<div style="margin-bottom:8px"><progress value="' + comp.sexAddiction + '" max="100" style="width:100%;height:5px"></progress></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:0 0 8px">'
      + (state.cradle.cosplayLevel >= 2 ? '当前身高：' + heightByLevel(state.cradle.cosplayLevel) + 'cm · ' : '')
      + '身体状态：' + bodyDescByLevel(state.cradle.cosplayLevel) + '</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + '<button type="button" data-cosplay-action="resist" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px;font-weight:700;color:var(--ui-green,#315f58)">咬牙抵抗</button>'
      + '<button type="button" data-cosplay-action="submit" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px;font-weight:700;color:#c44d7a">放任顺从</button>'
      + '</div>'
      + (state.cradle.cosplayEvolutionLog.length > 0
        ? '<div style="max-height:100px;overflow-y:auto;font-size:9px;color:var(--ui-muted);line-height:1.4;border-top:1px solid var(--ui-line);padding-top:6px;margin-top:8px">'
          + state.cradle.cosplayEvolutionLog.slice(0, 4).map(function (l) { return '<p style="margin:2px 0">' + l + '</p>'; }).join('')
          + '</div>'
        : '')
      + '</div>';
  }

  function handleClick(event) {
    var state = Game._getState ? Game._getState() : null;
    if (!state || !state.cradle) return false;

    var resistBtn = event.target.closest('[data-cosplay-action="resist"]');
    if (resistBtn) {
      var result = playerResist(state);
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }
    var submitBtn = event.target.closest('[data-cosplay-action="submit"]');
    if (submitBtn) {
      var result2 = playerSubmit(state);
      Game.view.showToast(result2.message, result2.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }
    return false;
  }

  Game.cosplaySuitEvolution = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    absorb: absorb,
    handleCompulsion: handleCompulsion,
    playerResist: playerResist,
    playerSubmit: playerSubmit,
    renderCompulsion: renderCompulsion,
    handleClick: handleClick,
  });
}(window));
