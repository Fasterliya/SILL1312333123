(function initMagicalGirlSystem(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var MISSION_STAGES = [
    {
      stage: 1,
      title: '线索追踪',
      text: '使魔「{familiar}」感知到了这座城市中幽诡残留的魔力痕迹。你需要选择一个区域开始搜索。',
      choices: [
        { value: 'patrol-school', label: '前往学校', detail: '学生聚集之地，也是幽诡最喜欢潜伏的地方。', bonus: { awareness: 4 }, result: '你在校园的旧教学楼走廊尽头察觉到了异常冰冷的空气。墙壁上隐约有抓痕——不是人类留下的。' },
        { value: 'patrol-commercial', label: '巡逻商业区', detail: '人群密集的环境掩盖了幽诡的气息，但也有更高的概率撞见它的行踪。', bonus: { atk: 2 }, result: '商业街的人流让你难以聚焦。但在地铁站角落，你看到了被啃食一半的动物尸体——幽诡不久前在这里进食。' },
        { value: 'patrol-residential', label: '守候住宅区', detail: '需要消耗更多魔力维持结界，但住宅区是幽诡藏匿宿主的最佳地点。', bonus: { awareness: 6 }, cost: { magicPower: 8 }, result: '深夜的住宅区静得可怕。你的使魔在某个窗口感应到了不属于人世的魔力波动。你记下了那个地址。' },
      ],
    },
    {
      stage: 2,
      title: '锁定目标',
      text: '你已将搜索范围缩小。现在需要从几个疑似被寄生者中找出真正的幽诡宿主。',
      choices: [
        { value: 'target-question', label: '直接质询', detail: '走近那个可疑的人，用言语试探。可能打草惊蛇但最快获得答案。', bonus: {}, result: '你直视对方的眼睛，问了一个只有原主人才能回答的问题。那人的回答完美无缺——但回答时瞳孔没有对焦。幽诡露出了第一个破绽。' },
        { value: 'target-observe', label: '暗中观察', detail: '花时间跟踪这个人的日常行踪，收集更多证据。', bonus: { awareness: 4 }, result: '你跟踪了三天三夜。这个人从不吃饭、不睡觉，深夜独自外出时行走速度远超人类极限。你在其住所外找到了被丢弃的人类衣物——原主人的遗物。' },
        { value: 'target-familiar', label: '使魔追踪', detail: '消耗魔力让使魔直接追踪魔力源头，精准定位但会消耗不少魔力。', bonus: { atk: 4 }, cost: { magicPower: 10 }, result: '使魔「{familiar}」化为一缕银光钻入夜空。三分钟后归来，在你掌心画出了精确的定位——幽诡的魔力核心就在那个人的胸腔深处。' },
      ],
    },
    {
      stage: 3,
      title: '对质',
      text: '你找到了幽诡的宿主——{hostName}。它还维持着人类的外貌，但你能感觉到那张面孔下的东西正在躁动。',
      choices: [
        { value: 'confront-transform', label: '立即变身', detail: '直接变身进入战斗状态，获得先手优势。', bonus: { atk: 8 }, result: '你在对方反应过来之前完成变身。魔法光芒照亮了整条街巷，那人形的轮廓在光辉下剧烈扭曲——它已经藏不住了。' },
        { value: 'confront-probe', label: '试探身份', detail: '试图唤醒宿主残存的意识，了解原主人的信息。可能激怒幽诡。', bonus: { awareness: 8 }, result: '你轻声叫出那个被遗忘的名字。那一瞬间，幽诡的面具裂开了一道缝隙——你看到了一张悲伤的、属于真正宿主的脸。他/她的嘴唇无声地动了动，然后幽诡重新夺回了控制权。' },
        { value: 'confront-support', label: '使魔支援', detail: '召唤使魔为你附加守护结界，获得额外防御加成。', bonus: { atk: 5, awareness: 5 }, cost: { magicPower: 12 }, result: '使魔「{familiar}」化为六角屏障环绕在你周身。幽诡发出了愤怒的嘶吼——它认出了你的使魔，也知道了你今天是认真的。' },
      ],
    },
    {
      stage: 4,
      title: '揭露',
      text: '幽诡的伪装已经无法维持。{hostName}的皮肤开始龟裂，裂缝中渗出黑色的烟雾。它终于露出了真面目。',
      choices: [
        { value: 'reveal-attack', label: '直接攻击', detail: '趁幽诡还未完全显形，发动先发制人的一击。', bonus: { atk: 10 }, result: '你的魔力凝聚成利刃，在幽诡完全变形之前刺入了它的核心。黑色的血溅了一地。幽诡发出了一声混合着人类和怪物双重音色的惨叫。' },
        { value: 'reveal-purify', label: '驱散结界', detail: '展开净化结界，削弱幽诡的力量后再进行战斗。', bonus: { atk: 4, awareness: 6 }, cost: { magicPower: 15 }, result: '你在地上画出六芒星阵，银色的光芒从地面升起。幽诡被困在结界中，力量被大幅压制。它的皮相彻底崩解，露出了那具丑陋的、扭曲的本体。' },
        { value: 'reveal-banish', label: '净化尝试', detail: '不进入战斗，直接尝试用魔力净化幽诡本体——高风险高回报。', bonus: {}, purify: true, cost: { magicPower: 20 }, result: '你将全部魔力注入灵魂宝石，一道纯净的白色光束射向幽诡。光芒中夹杂着你愿望的共鸣——如果运气够好，也许不需要战斗……' },
      ],
    },
    {
      stage: 5,
      title: '决战',
      text: '这是最后的战斗。{hostName}体内的幽诡已经完全显形——{specterType}。它曾经是{hostName}，但现在只是一个嗜血的怪物。',
      choices: [
        { value: 'final-fight', label: '⚔ 进入最终决战', detail: '握紧你的灵魂宝石，这是无法逃避的一战。', combat: true },
      ],
    },
  ];

  function monthly(state) {
    var core = Game.magicalGirlCore;
    core.ensure(state);
    core.monthlyDecay(state);

    var contract = Game.magicalGirlContract;
    if (contract.checkContractTrigger(state)) {
      var generated = contract.generateContract(state);
      if (generated) {
        state.pendingDecision = {
          type: 'mgContract',
          title: '未知存在的契约',
          text: generated.approach + '<br><br>' + generated.offer + '<br><br><small>' + generated.wishHint + '</small>',
          options: [
            { value: 'accept-mg', label: '签订契约（成为魔法少女）' },
            { value: 'decline-mg', label: '拒绝' },
          ],
          data: generated,
          month: state.totalMonths,
        };
        state.timeSpeed = 0;
      }
    }
    if (!state.pendingDecision) Game.specterEcology?.monthlyProtection(state);
  }

  function startPatrol(state) {
    var mg = Game.magicalGirlCore.ensure(state);
    if (!mg.active) return { ok: false, message: '你不是魔法少女' };
    if (mg.magicPower <= 0) return { ok: false, message: '魔力已枯竭，无法进行巡逻' };
    if (mg.activeMission) return { ok: false, message: '你已经在执行猎杀任务中' };
    var specters = Game.specterEcology
      ? Game.specterEcology.localSpecters(state)
      : (state.supernatural ? state.supernatural.specters : []);
    if (!specters.length) return { ok: false, message: '当前城市感知不到幽诡的气息' };

    var target = specters.find(function (s) { return s.exposed || state.supernatural.playerAwareness >= 30; }) || U.random(specters);
    var host = Game.people.find(state, target.hostId);
    var hostName = host ? host.name : '未知';
    var rel = '';
    if (host) {
      if (state.family.some(function (f) { return f.id === host.id; })) rel = host.relation || '亲属';
      else if (state.contacts.some(function (c) { return c.id === host.id; })) rel = '熟人';
      else rel = '市民';
    }

    mg.activeMission = {
      stage: 1,
      specterIndex: state.supernatural.specters.indexOf(target),
      hostName: hostName,
      hostRelation: rel,
      hostOriginalJob: host ? (host.job || '') : '',
      hostOriginalPersonality: host ? (host.personality || '') : '',
      hostOriginalTrait: host ? (host.trait || '') : '',
      bonuses: { atk: 0, awareness: 0 },
      log: ['你开始了猎杀任务。目标：潜伏在' + hostName + '体内的幽诡。'],
    };
    mg.lastPatrolMonth = state.totalMonths;

    Game.lifeDirector.addLog(state, '猎杀开始', '使魔「' + (mg.familiar || '使魔') + '」锁定了目标——' + hostName + '。五阶段的猎杀即将展开。', 'milestone');
    return { ok: true, message: '猎杀开始。目标：' + hostName + '。' };
  }

  function resolveMissionStage(state, value) {
    var mg = state.magicalGirl;
    if (!mg || !mg.activeMission) return { ok: false, message: '无活跃任务' };
    var mission = mg.activeMission;
    if (mission.stage > 5) return { ok: false, message: '任务已结束' };

    var stageDef = MISSION_STAGES[mission.stage - 1];
    if (!stageDef) return { ok: false, message: '未知阶段' };

    var choice = stageDef.choices.find(function (c) { return c.value === value; });
    if (!choice) {
      choice = stageDef.choices[0];
    }

    if (choice.cost) {
      if (choice.cost.magicPower) {
        if (mg.magicPower < choice.cost.magicPower) {
          return { ok: false, message: '魔力不足，需要 ' + choice.cost.magicPower + ' 点魔力' };
        }
        mg.magicPower = Math.max(0, mg.magicPower - choice.cost.magicPower);
      }
    }

    if (choice.bonus) {
      mission.bonuses.atk = (mission.bonuses.atk || 0) + (choice.bonus.atk || 0);
      mission.bonuses.awareness = (mission.bonuses.awareness || 0) + (choice.bonus.awareness || 0);
    }

    var resultText = choice.result.replace(/\{familiar\}/g, mg.familiar || '使魔').replace(/\{hostName\}/g, mission.hostName);
    mission.log.push('第' + mission.stage + '阶段 · ' + stageDef.title + '：' + resultText);
    mission.stage += 1;

    if (choice.purify) {
      var roll = Math.random();
      if (roll < 0.35 + mg.magicPower * 0.004) {
        return finishMission(state, true, mission);
      }
      mission.log.push('净化光束击中了幽诡，但它的力量超出了预期——光芒消散后，幽诡仍然站立着。');
    }

    if (mission.stage > 5) {
      return finishMission(state, false, mission);
    }

    var nextStage = MISSION_STAGES[mission.stage - 1];
    var nextText = nextStage.text.replace(/\{familiar\}/g, mg.familiar || '使魔').replace(/\{hostName\}/g, mission.hostName).replace(/\{specterType\}/g, getSpecterType(state, mission));
    return {
      ok: true,
      message: resultText,
      stage: mission.stage,
      nextTitle: nextStage.title,
      nextText: nextText,
      nextChoices: nextStage.choices.map(function (c) {
        var cText = c.label;
        if (c.cost && c.cost.magicPower) cText += '（魔力-' + c.cost.magicPower + '）';
        return { value: c.value, label: cText, detail: c.detail };
      }),
      combat: nextStage === MISSION_STAGES[4],
    };
  }

  function getSpecterType(state, mission) {
    var idx = mission.specterIndex;
    if (idx >= 0 && state.supernatural && state.supernatural.specters[idx]) {
      return state.supernatural.specters[idx].type;
    }
    return '未知存在';
  }

  function finishMission(state, purified, mission) {
    var mg = state.magicalGirl;
    var specterIdx = mission.specterIndex;
    var specters = state.supernatural.specters;
    var specter = specterIdx >= 0 && specterIdx < specters.length ? specters[specterIdx] : null;

    if (specter) {
      if (purified) {
        specters.splice(specterIdx, 1);
        var hostPurified = Game.people.find(state, specter.hostId);
        if (hostPurified) {
          hostPurified.specterPossessed = false;
          hostPurified.status = '健康';
          hostPurified.deceasedAt = null;
        }
        Game.lifeDirector.addLog(state, '幽诡净化', '奇迹般地，你净化了寄生在' + mission.hostName + '体内的' + specter.type + '。宿主恢复了意识，但对发生的一切毫无记忆。', 'milestone');
        mg.kills += 1;
        mg.soulGem = Math.min(100, mg.soulGem + 10);
        mg.magicPower = Math.min(100, mg.magicPower + 10);
      } else {
        if (state.supernatural.combat && state.supernatural.combat.active) {
          mg.activeMission = null;
          return { ok: true, message: '战斗已开始', combat: true };
        }
        var host = Game.people.find(state, specter.hostId);
        mg.activeMission = null;
        Game.supernaturalSpecter.startCombat(state, specter);
        return { ok: true, message: '幽诡露出了真身！进入战斗。', combat: true };
      }
    }

    mg.activeMission = null;
    return { ok: true, message: '猎杀任务结束', purified: purified };
  }

  function renderMission(state) {
    var mg = state.magicalGirl;
    if (!mg || !mg.activeMission) return '';
    var mission = mg.activeMission;
    if (mission.stage > 5) return '';

    var stageDef = MISSION_STAGES[mission.stage - 1];
    if (!stageDef) return '';

    var title = stageDef.title;
    var text = stageDef.text.replace(/\{familiar\}/g, mg.familiar || '使魔').replace(/\{hostName\}/g, mission.hostName).replace(/\{specterType\}/g, '');

    var hostInfoHtml = '';
    if (mission.hostName && mission.stage >= 3) {
      hostInfoHtml = '<div class="mission-host-info" style="margin-top:6px;padding:8px;border-left:3px solid var(--ui-gold, #b88a35);background:#fffaf0;border-radius:0 6px 6px 0;font-size:10px">'
        + '<p style="margin:0;font-weight:700;color:var(--ui-ink)">原主身份档案</p>'
        + '<p style="margin:2px 0 0;color:var(--ui-muted)">姓名：' + mission.hostName + '</p>'
        + (mission.hostRelation ? '<p style="margin:1px 0 0;color:var(--ui-muted)">关系：' + mission.hostRelation + '</p>' : '')
        + (mission.hostOriginalJob ? '<p style="margin:1px 0 0;color:var(--ui-muted)">原职业：' + mission.hostOriginalJob + '</p>' : '')
        + (mission.hostOriginalPersonality ? '<p style="margin:1px 0 0;color:var(--ui-muted)">性格：' + mission.hostOriginalPersonality + (mission.hostOriginalTrait ? ' · ' + mission.hostOriginalTrait : '') + '</p>' : '')
        + (mission.bonuses.atk > 0 || mission.bonuses.awareness > 0 ? '<p style="margin:4px 0 0 0;color:var(--ui-green, #315f58);font-weight:700">任务加成：攻击+' + mission.bonuses.atk + ' · 感知+' + mission.bonuses.awareness + '</p>' : '')
        + '</div>';
    }

    var logHtml = '';
    if (mission.log.length > 0) {
      logHtml = '<div class="mission-log" style="margin-top:8px;max-height:120px;overflow-y:auto;font-size:10px;color:var(--ui-muted);line-height:1.5">'
        + mission.log.slice(-4).map(function (l) { return '<p style="margin:2px 0;padding:3px 0;border-bottom:1px solid var(--ui-line, #d8d5c9)">' + l + '</p>'; }).join('')
        + '</div>';
    }

    var choicesHtml = stageDef.choices.map(function (c) {
      var label = c.label;
      if (c.cost && c.cost.magicPower) label += ' <small style="color:var(--ui-red, #a8453a)">(-' + c.cost.magicPower + '魔力)</small>';
      if (c.combat) label = '<span style="color:var(--ui-red)">' + label + '</span>';
      return '<button type="button" data-mg-mission="' + c.value + '" style="margin-bottom:6px;width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--ui-line, #d8d5c9);border-radius:6px;background:var(--ui-paper, #fffdf7);text-align:left;font-size:11px;color:var(--ui-ink)">'
        + '<b>' + label + '</b><br><small style="color:var(--ui-muted, #69736f)">' + (c.detail || '') + '</small></button>';
    }).join('');

    return '<div class="magical-mission panel" style="margin-top:8px;padding:12px;border:1px solid var(--ui-line);border-left:4px solid #6b3a7d;border-radius:6px;background:var(--ui-paper, #fffdf7)">'
      + '<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:var(--ui-ink)">猎杀任务 · 第' + mission.stage + '阶段 · ' + title + '</h3>'
      + '<p style="font-size:10px;color:var(--ui-muted);margin:0 0 8px;line-height:1.5">' + text + '</p>'
      + hostInfoHtml
      + '<div style="margin-top:10px">' + choicesHtml + '</div>'
      + logHtml
      + '</div>';
  }

  function handleClick(event) {
    var state = Game._getState ? Game._getState() : null;
    if (!state) return false;

    var mg = Game.magicalGirlCore;
    if (!mg.isMagicalGirl(state)) return false;

    if (event.target.closest('[data-mg-wish]')) {
      var wish = prompt('你的愿望是什么？（最多30字）');
      if (wish) {
        wish = wish.slice(0, 30);
        state.magicalGirl.wish = wish;
        Game.lifeDirector.addLog(state, '许下愿望', '你许下了愿望：「' + wish + '」。使魔「' + (state.magicalGirl.familiar || '使魔') + '」静默地接收了它。', 'milestone');
        if (Game._refresh) Game._refresh();
        if (Game._save) Game._save();
      }
      return true;
    }

    var patrolBtn = event.target.closest('[data-mg-patrol]');
    if (patrolBtn) {
      var result = startPatrol(state);
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }

    var missionBtn = event.target.closest('[data-mg-mission]');
    if (missionBtn) {
      var value = missionBtn.dataset.mgMission;
      var missionResult = resolveMissionStage(state, value);
      if (missionResult.ok) {
        if (missionResult.combat) {
          if (Game._refresh) Game._refresh();
          if (Game._save) Game._save();
          return true;
        }
      }
      Game.view.showToast(missionResult.message || '', missionResult.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }

    return false;
  }

  Game.magicalGirlSystem = Object.freeze({
    monthly: monthly,
    handleClick: handleClick,
    renderMission: renderMission,
  });
}(window));
