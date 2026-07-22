(function initConventionTravel(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  function identityProfile(state) {
    return Game.hunterMode.identity(state).profile;
  }
  function selectedPerson(state, ts) {
    return ts.selectedCoserId ? Game.people.find(state, ts.selectedCoserId) : null;
  }
  function createCoser(state, costume, ts) {
    const age = Math.random() < 0.48 ? U.between(18, 23)
      : (Math.random() < 0.7 ? U.between(24, 29) : U.between(30, 38));
    const person = U.person('漫展相识', '', age, null, state.totalMonths);
    Game.worldCulture.applyPerson(person, ts.hostCountry);
    U.setUniqueName(state, person, Game.worldCulture.profile(ts.hostCountry).locale);
    person.affection = U.between(40, 52);
    person.metCity = `${ts.hostCity}${ts.placeName}`;
    person.currentCity = ts.hostCity;
    Game.npcLife.syncGrowth(state, person);
    person.cosplay = costume.name;
    person.job = age >= 18 && Math.random() < 0.35 ? '职业Coser' : '业余Coser';
    person.fashion = person.fashion && typeof person.fashion === 'object' ? person.fashion : {};
    person.fashion.cosplayInterest = U.between(78, 100);
    person.fashion.favoriteSeries = costume.series;
    Game.conventionCoserRoster?.prepare(state, person, costume);
    state.travel.encounters.push(person);
    return person;
  }
  function createRoster(state, ts) {
    const pool = Game.cosplayCatalog.items.filter((item) => (
      item.name !== '无' && (!ts.series || item.series === ts.series)
    ));
    const available = pool.slice();
    while (ts.coserIds.length < 3 && available.length) {
      const index = U.between(0, available.length - 1);
      const [costume] = available.splice(index, 1);
      if (ts.coserIds.some((id) => Game.people.find(state, id)?.cosplay === costume.name)) continue;
      ts.coserIds.push(createCoser(state, costume, ts).id);
    }
    Game.conventionParticipant?.styleRoster(state, ts);
  }

  function start(state, edition) {
    const event = edition || {
      id: '', name: '城市漫展', themeName: '综合漫展', series: '',
      organizer: { name: '城市会展公司' },
    };
    const registration = state.conventionCalendar?.registrations?.[event.id]
      || { role: 'visitor', intent: 'social' };
    const ts = {
      placeName: event.name, mode: 'convention', node: 'entrance',
      editionId: event.id, eventScale: event.scale || '标准', themeName: event.themeName, series: event.series,
      hostCity: event.city || state.location.city,
      hostCountry: event.country || state.location.country,
      organizerName: event.organizer.name,
      role: registration.role, intent: registration.intent,
      ...(Game.conventionParticipant?.travelContext(event) || {}),
      score: 0, feedback: '抵达会场，先选择最想体验的区域。',
      path: [], total: 4, coserIds: [], selectedCoserId: null, riskCount: 0,
    };
    state.travel.activeStage = ts;
    createRoster(state, ts);
    Game.lifeDirector.addLog(state, '漫展出行', `你持票前往${ts.hostCity}参加${event.name}。`, 'good');
    return { ok: true, message: `已抵达${ts.hostCity}，摄影区、主舞台和同人摊位都可以探索` };
  }

  function requirementFailure(state, ts, option) {
    const effect = option.effect || {};
    if ((effect.cost || 0) > state.money) return `资金不足，需要${Game.view.money(effect.cost)}`;
    const req = effect.requires || {};
    const ability = Game.characterAttributes.normalize(req.stat);
    const value = ability ? Game.characterAttributes.playerValue(state, ability) : (state.stats[req.stat] || 0);
    if (req.stat && value < req.min) return `${ability || req.stat}需要达到${req.min}`;
    if (req.cosplay && Game.cosplayCatalog.find(identityProfile(state).cosplay).name === '无') {
      return '需要先在角色外观中穿上 COS 服';
    }
    if (req.cosplay && ts.series
      && Game.cosplayCatalog.find(identityProfile(state).cosplay).series !== ts.series) {
      return `${ts.themeName}舞台只接受对应系列的 COS 服`;
    }
    return '';
  }

  function rosterOptions(state, ts) {
    return ts.coserIds.map((id) => {
      const person = Game.people.find(state, id);
      if (!person) return null;
      const costume = Game.cosplayCatalog.find(person.cosplay);
      return {
        id: `select:${id}`, label: `认识 ${person.name} · ${costume.character}`,
        hint: `${costume.series} COS · ${person.job} · 好感 ${person.affection}`,
        next: 'coser-interact',
        effect: { selectId: id, mood: 2, score: 3,
          result: `你走向身穿${costume.name}服装的${person.name}。` },
      };
    }).filter(Boolean);
  }

  function options(state, ts) {
    var isContest = /^contest-/.test(ts.node);
    if (isContest && !ts.contest) return [];
    if (isContest) {
      let roundMap = { 'contest-prelim': 0, 'contest-semi': 1, 'contest-final': 2 };
      let roundIdx = roundMap[ts.node];
      let info = Game.conventionContest.roundInfo(ts, roundIdx);
      let routeNode = Game.conventionRoutes.get(ts.node);
      let baseOpts = (routeNode?.options || []).map(function (opt) {
        var enriched = { ...opt };
        if (opt.effect && opt.effect.contest && info) {
          enriched.hint = '对手: ' + info.opponentName
            + ' · ' + info.opponentCharacter
            + ' · 预估得分 ' + info.opponentScore;
          enriched.label = opt.label + '（第' + info.step + '/' + info.total + '轮）';
        }
        return enriched;
      });
      if (ts.node === 'contest-result') {
        baseOpts[0].label = ts.contest.placed === 1 ? '冠军！继续逛展'
          : ts.contest.placed === 2 ? '亚军，继续逛展' : '比赛结束，继续逛展';
      }
      return baseOpts.map(function (item) {
        return { ...item, blocked: requirementFailure(state, ts, item) };
      });
    }
    const node = Game.conventionRoutes.get(ts.node);
    const baseSource = ts.node === 'coser-select' ? rosterOptions(state, ts) : (node?.options || []);
    const source = Game.conventionParticipant?.options(state, ts, baseSource) || baseSource;
    return source.map((item) => ({ ...item, blocked: requirementFailure(state, ts, item) }));
  }

  function chooseFallbackCoser(state, ts) {
    const candidates = ts.coserIds.map((id) => Game.people.find(state, id)).filter(Boolean);
    if (!candidates.length) return null;
    const person = candidates[U.between(0, candidates.length - 1)];
    ts.selectedCoserId = person.id;
    return person;
  }
  function applyEffect(state, ts, option) {
    const effect = option.effect || {};
    if (effect.cost) Game.economy.spend(state, effect.cost);
    if (effect.mood) Game.legacyMood.apply(state, effect.mood, '漫展体验');
    if (effect.health) state.stats.健康 = U.clamp(state.stats.健康 + effect.health, 0, 100);
    if (effect.intelligence && Game.subjectPanel.isStudent(state)) Game.educationSystem.addPreparation(state, effect.intelligence * 2);
    state.cityLife ||= { reputation: 0, familiarity: {} };
    state.cityLife.familiarity ||= {};
    if (effect.reputation) {
      state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + effect.reputation, 0, 100);
    }
    if (effect.selectId) ts.selectedCoserId = effect.selectId;
    if (effect.enterContest) {
      Game.conventionContest.initContest(state, ts);
      if (effect.coserWardrobe) {
        var profile = identityProfile(state);
        var cosplayName = profile.cosplay;
        if (cosplayName && cosplayName !== '无') {
          Game.coserCareer?.addCosplayToInventory(state, cosplayName);
        }
      }
    }
    if (effect.coserGuest) {
      ts.score += 1;
      state.stats.心情 = U.clamp((state.stats.心情 || 0) + 5, 0, 100);
    }
    if (effect.vtuberBooth) {
      var vData = state.vtuber || {};
      var boothViewers = Math.max(40, Math.round(80 + (state.creator||{}).followers * 0.04 + (state.stats.魅力||50) * 3));
      var boothIncome = Math.round(boothViewers * 1.0 * (1.2 + ((state.creator||{}).brandTrust||45)/70));
      state.money += boothIncome;
      vData.totalSuperchat = (vData.totalSuperchat||0) + Math.round(boothIncome * 0.15);
      effect.result += ' 同接' + boothViewers + '人，收入' + Game.view.money(boothIncome);
    }
    if (effect.welfarePhoto) {
      var wData = state.welfare || {};
      var photoIncome = Math.round((wData.subscriberCount||0) * 6 + (state.stats.魅力||50) * 30);
      state.money += photoIncome;
      var creator = state.creator || {};
      creator.scandalRisk = U.clamp((creator.scandalRisk||0) + 15, 0, 100);
      effect.result += ' 收入' + Game.view.money(photoIncome) + '，丑闻+15';
    }
    if (effect.welfarePatron) {
      var wData2 = state.welfare || {};
      var activeClients = (wData2.regularClients||[]).filter(function(c){return state.totalMonths-(c.lastMonth||0)<=3;});
      if (activeClients.length) {
        var client = activeClients[0];
        client.affection = U.clamp((client.affection||40)+12,0,100);
        client.monthlyAllowance = Math.round((client.monthlyAllowance||2000)*1.5);
        var patron = U.person('金主','',U.between(30,50),'男',state.totalMonths);
        patron.id = client.id; patron.wealth = (client.wealth||500000);
        state.worldPeople.push(patron);
        Game.encounterSystem?.init(state, patron, 'hookup', 'provider');
        Game._refresh();
        Game.encounterSystem?.showOverlay(state);
        effect.result += ' 金主好感+12，月供×1.5';
      }
    }
    if (effect.welfareSell) {
      var wData3 = state.welfare || {};
      var sellIncome = Math.round(((state.creator||{}).followers||0)*0.3 + (wData3.subscriberCount||0)*2);
      state.money += sellIncome;
      effect.result += ' 收入' + Game.view.money(sellIncome);
    }
    if (effect.contest) {
      var roundMap = { prelim: 0, semi: 1, final: 2 };
      var roundIdx = roundMap[effect.contest];
      var performed = Game.conventionContest.perform(state, ts, roundIdx);
      if (performed && performed.result) {
        var c = ts.contest;
        var r = performed.result;
        var opp = c.opponents[roundIdx];
        ts.feedback = r.mishap
          ? (effect.result + ' ' + r.narrative)
          : `你的得分 ${r.playerScore} vs ${opp.name}(${opp._opponent.costume.character}) ${r.opponentScore}。${r.narrative}`;
        ts.score += (r.outcome === 'win_big' ? 5 : r.outcome === 'win_close' ? 3 : 1);
      }
      return;
    }
    if (effect.finishContest) {
      Game.conventionContest.settle(state, ts);
      effect.result = ts.feedback;
    }
    const person = effect.meetCoser ? (selectedPerson(state, ts) || chooseFallbackCoser(state, ts)) : selectedPerson(state, ts);
    if (person && effect.affection) {
      person.affection = U.clamp(person.affection + effect.affection, 0, 100);
      person.interactions = (person.interactions || 0) + 1;
    }
    if (person && effect.contact) Game.people.addContact(state, person);
    if (effect.total) ts.total = effect.total;
    if (!effect.contest) ts.score += effect.score || 0;
    Game.conventionCoserCareer?.applyChoice(state, ts, effect);
    ts.feedback = effect.result || '你继续探索漫展。';
  }

  function complete(state, ts) {
    const person = selectedPerson(state, ts);
    const connected = Boolean(person?.phoneUnlocked);
    const rating = ts.score >= 18 ? '深度逛展' : (ts.score >= 13 ? '充实参展' : '轻松到访');
    const relation = connected ? `并与${person.name}交换了联系方式` : '';
    const career = Game.conventionCoserCareer?.settle(state, ts);
    const careerText = career ? `，职业项目新增${career.followers}粉丝、收入${Game.view.money(career.income)}` : '';
    state.cityLife ||= { reputation: 0, familiarity: {} };
    state.cityLife.familiarity ||= {};
    state.cityLife.familiarity[ts.hostCity] = U.clamp(
      (state.cityLife.familiarity[ts.hostCity] || 0) + 3, 0, 100);
    Game.stressSystem.reduce(state, ts.score >= 18 ? 9 : 5, '漫展体验');
    Game.structuredTraits.addExperience(state.profile, 'traveler');
    state.travel.localHistory.unshift({
      city: ts.hostCity, place: ts.placeName, month: state.totalMonths,
      score: ts.score, outcome: `${rating}${relation}${careerText}`,
    });
    state.travel.localHistory = state.travel.localHistory.slice(0, 20);
    const summary = `从${ts.hostCity}返程，${rating}，评分${ts.score}${relation}${careerText}。`;
    var reward = Game.conventionParticipant?.intentReward(state, ts);
    var rewardSummary = reward ? ' ' + reward.bonus : '';
    Game.conventionCalendar?.finishAttendance(state, ts.editionId, {
      score: ts.score, outcome: `${rating}${relation}${careerText}${rewardSummary}`,
    });
    state.travel.activeStage = null;
    Game.conventionRisk?.checkHealthAfterConvention(state, ts);
    Game.conventionRisk?.rollStalking?.(state, ts);
    Game.lifeDirector.addLog(state, '漫展归来', summary + rewardSummary, 'milestone');
    return { ok: true, finished: true, message: `${ts.placeName}完成：${summary}` };
  }

  function choose(state, choiceId) {
    const ts = state.travel?.activeStage;
    if (ts?.mode !== 'convention') return { ok: false, message: '漫展路线已经失效' };
    const option = options(state, ts).find((item) => item.id === choiceId);
    if (!option) return { ok: false, message: '这个漫展选项已经失效' };
    if (option.blocked) return { ok: false, message: option.blocked };
    if (!/^contest-/.test(ts.node)) {
      Game.conventionRisk?.roll(state, ts);
    }
    const resolved = Game.conventionParticipant?.adjust(state, ts, option) || option;
    applyEffect(state, ts, resolved);
    ts.path.push(option.id);
    if (resolved.effect?.finish) return complete(state, ts);
    ts.node = resolved.next || 'entrance';
    return { ok: true, message: ts.feedback };
  }
  function model(state, ts) {
    Game.conventionCoserRoster?.normalize(state, ts);
    var node = Game.conventionRoutes.get(ts.node);
    if (!node && ts.node !== 'coser-select' && !/^contest-/.test(ts.node)) return null;
    const role = Game.conventionCatalog.roles.find((item) => item.id === ts.role)?.name || '游客';
    const intent = Game.conventionCatalog.intents.find((item) => item.id === ts.intent)?.name || '拓展人脉';
    var contestModel = Game.conventionContest?.model(state, ts) || null;
    var nodeTitle = node?.title || '';
    var nodeText = node?.text || '';
    if (/^contest-/.test(ts.node) && contestModel && contestModel.info) {
      nodeTitle = contestModel.info.name;
      nodeText = contestModel.info.description
        + '\n对手: ' + contestModel.info.opponentName
        + ' · ' + contestModel.info.opponentCharacter
        + ' · 预评 ' + contestModel.info.opponentScore + '分';
    }
    if (ts.node === 'contest-result' && contestModel) {
      nodeTitle = contestModel.placed === 1 ? '冠军！'
        : contestModel.placed === 2 ? '亚军' : '比赛结束';
      var lastResult = contestModel.allRounds[contestModel.allRounds.length - 1];
      nodeText = lastResult ? lastResult.narrative : '评委宣布了结果。';
    }
    return {
      node: ts.node,
      title: nodeTitle, text: nodeText,
      step: ts.path.length + 1, total: ts.total || node?.total || 4,
      feedback: ts.feedback, score: ts.score,
      eventName: ts.placeName, themeName: ts.themeName,
      roleName: role, intentName: intent, arrangement: ts.arrangement || '',
      career: Game.conventionCoserCareer?.model(state, ts) || null,
      contest: contestModel,
      options: options(state, ts),
      people: ts.coserIds.map((id) => Game.people.find(state, id)).filter(Boolean),
      selectedId: ts.selectedCoserId,
    };
  }

  Game.conventionTravel = Object.freeze({ start, choose, model });
}(window));
