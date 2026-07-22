(function initConventionContest(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  var ROUNDS = Object.freeze([
    { id: 'prelim', name: '预选赛', step: 1, total: 3, description: '多位参赛者同台，评委初筛最具还原度的造型。' },
    { id: 'semi', name: '晋级赛', step: 2, total: 3, description: '剩余选手逐一登台，表现力与角色理解成为关键。' },
    { id: 'final', name: '决赛', step: 3, total: 3, description: '最终对决，冠亚军仅一线之隔。评委和观众共同决定优胜者。' },
  ]);

  var CONTEST_TICKET = 80;

  function cosplayScore(state, person) {
    var profile = person || Game.hunterMode.identity(state).profile;
    var charm = Game.characterAttributes.derivedCharm(profile);
    var cosplay = Game.cosplayCatalog.find(profile.cosplay);
    var hasCosplay = cosplay && cosplay.name !== '无';
    var charisma = Game.characterAttributes.playerValue(state, '交涉');
    var learning = Game.characterAttributes.playerValue(state, '学识');
    var cosplayMatch = 0;
    if (hasCosplay) {
      cosplayMatch = profile.cosplay === cosplay.name ? 70 : 40;
      if (cosplay.series && cosplay.name !== '无') cosplayMatch += 10;
    }
    var careerBonus = Game.conventionCoserCareer
      ? Game.conventionCoserCareer.contextBonus(state, {}, 'stage') || 0
      : 0;
    var intentBonus = 0;
    var ts = state.travel?.activeStage;
    if (ts && ts.intent === 'compete') intentBonus = 5;
    var wardrobeBonus = 0;
    if (hasCosplay && state.career?.jobId === 'coser') {
      var inventory = (state.coser||{}).cosplayInventory || [];
      var owned = inventory.find(function(i){return i.name === cosplay.name;});
      if (owned) {
        wardrobeBonus = (owned.rarity === 'rare' ? 8 : 4) - Math.floor((owned.wear||0)/10);
      }
    }
    var baseScore = charm * 0.30 + cosplayMatch * 0.30 + charisma * 0.18
      + learning * 0.10 + careerBonus * 0.12 + intentBonus + wardrobeBonus;
    var variance = U.between(-6, 6) + U.between(-5, 5);
    return U.clamp(Math.round(baseScore + variance), 8, 98);
  }

  function generateOpponent(state, ts, quality) {
    var age = U.between(18, 32);
    var person = U.person('比赛对手', '', age, null, state.totalMonths);
    Game.worldCulture.applyPerson(person, ts.hostCountry);
    U.setUniqueName(state, person, Game.worldCulture.profile(ts.hostCountry).locale);
    person.metCity = ts.hostCity;
    person.currentCity = ts.hostCity;
    Game.npcLife.syncGrowth(state, person);
    var pool = Game.cosplayCatalog.items.filter(function (item) {
      return item.name !== '无' && (!ts.series || item.series === ts.series);
    });
    var costume = pool.length ? pool[U.between(0, pool.length - 1)] : { name: '原创角色', series: '', character: '原创' };
    person.cosplay = costume.name;
    person.fashion = { cosplayInterest: U.between(60, 95), favoriteSeries: costume.series };
    var oppCharm = U.clamp(30 + quality * 0.4 + U.between(-8, 8), 20, 80);
    var oppMatch = U.clamp(40 + quality * 0.3 + U.between(-5, 5), 25, 85);
    var oppNegotiation = U.clamp(25 + quality * 0.3 + U.between(-6, 6), 15, 75);
    person._opponent = {
      costume: costume, charm: oppCharm,
      cosplayMatch: oppMatch, negotiation: oppNegotiation,
      quality: quality,
    };
    state.travel.encounters.push(person);
    return person;
  }

  function opponentScore(opp) {
    var data = opp._opponent || {};
    var base = (data.charm || 40) * 0.28 + (data.cosplayMatch || 45) * 0.28
      + (data.negotiation || 30) * 0.16;
    var variance = U.between(-7, 7) + U.between(-5, 5);
    return U.clamp(Math.round(base + variance), 6, 96);
  }

  function initContest(state, ts) {
    ts.contest = {
      active: true, round: 0, totalRounds: 3,
      opponents: [], results: [], playerScores: [], opponentScores: [],
      mishaps: 0, placed: null, rewarded: false,
    };
    var baseQuality = ts.eventScale === '大型' ? 65 : ts.eventScale === '标准' ? 50 : 38;
    for (var r = 0; r < 3; r += 1) {
      var quality = baseQuality + r * 8;
      ts.contest.opponents.push(generateOpponent(state, ts, quality));
    }
    ts.contest.opponentScores = ts.contest.opponents.map(opponentScore);
    if (ts.contestTicketCost == null) ts.contestTicketCost = CONTEST_TICKET;
    return ts.contest;
  }

  function currentRound(ts) {
    var c = ts.contest;
    if (!c || !c.active) return null;
    if (c.round >= c.totalRounds) return null;
    return c.round;
  }

  function roundInfo(ts, roundIdx) {
    var c = ts.contest;
    if (!c) return null;
    var meta = ROUNDS[roundIdx] || ROUNDS[0];
    var opp = c.opponents[roundIdx];
    var oppData = opp?._opponent;
    if (!oppData) return null;
    return {
      id: meta.id, name: meta.name,
      step: meta.step, total: meta.total, description: meta.description,
      opponentName: opp.name, opponentCostume: oppData.costume,
      opponentCharacter: oppData.costume.character || '参赛者',
      opponentScore: c.opponentScores[roundIdx],
      ticket: ts.contestTicketCost || CONTEST_TICKET,
    };
  }

  function perform(state, ts, roundIdx) {
    var c = ts.contest;
    if (!c || !c.active || roundIdx !== c.round) {
      return { ok: false, message: '该轮比赛已经结束或尚未开始。' };
    }
    var playerScore = cosplayScore(state, null);
    c.playerScores.push(playerScore);
    var oppScore = c.opponentScores[roundIdx];
    var opp = c.opponents[roundIdx];
    var diff = playerScore - oppScore;
    var result = { playerScore: playerScore, opponentScore: oppScore, diff: diff };
    if (playerScore < 38) {
      result.mishap = true;
      c.mishaps += 1;
      result.narrative = mishapNarrative(state, ts, playerScore);
    } else if (diff < -15) {
      result.outcome = 'lose_big';
      result.narrative = '对手的还原度与舞台表现力明显更胜一筹，你止步本轮。';
    } else if (diff < -2) {
      result.outcome = 'lose_close';
      result.narrative = '评分非常接近，但对手在细节处理上略占优势。虽败犹荣。';
    } else if (diff <= 5) {
      result.outcome = 'win_close';
      result.narrative = diff <= 2 && playerScore < oppScore + 3
        ? '评委出现了分歧，最终以微弱优势判定你晋级！'
        : '你的创意表现打动了评委，以扎实的还原度成功晋级。';
    } else {
      result.outcome = 'win_big';
      result.narrative = diff > 18
        ? '你的造型与表演完全碾压对手，全场观众起立鼓掌！'
        : '你凭借出色的服装还原和舞台台风，顺利拿下本轮。';
    }
    if (result.mishap) {
      result.outcome = roundIdx < c.totalRounds - 1 ? 'lose_big' : 'lose_close';
    }
    var won = result.outcome === 'win_big' || result.outcome === 'win_close';
    if (!won) opp._opponent.defeated = false;
    c.results.push(result);
    if (!won) {
      c.placed = roundIdx === 0 ? 8 : roundIdx === 1 ? 4 : 2;
      c.active = false;
    } else if (roundIdx >= c.totalRounds - 1) {
      c.placed = 1;
      c.active = false;
    } else {
      c.round += 1;
    }
    return { ok: true, result: result };
  }

  function mishapNarrative(state, ts, score) {
    var events = [
      '上台时高跟鞋卡进了舞台缝隙，你踉跄了一下。',
      '假发在转身时突然滑脱，台下传来一阵笑声。',
      '道具在关键时刻断裂，你只能硬着头皮继续。',
      '走秀时踩到了自己过长的裙摆，差点摔倒。',
    ];
    return score < 25
      ? U.random(events) + ' 这次事故严重影响了你的舞台表现。'
      : U.random(events) + ' 你努力保持镇定，但节奏已经被打乱。';
  }

  function settle(state, ts) {
    var c = ts.contest;
    if (!c || c.rewarded) return null;
    c.rewarded = true;
    var placed = c.placed || 8;
    var profile = Game.hunterMode.identity(state).profile;
    var reward = { fame: 0, money: 0, message: '' };
    if (placed === 1) {
      reward.fame = 18; reward.money = 3000;
      reward.message = '恭喜！你夺得本次漫展Cosplay大赛冠军！';
      profile.cosplayTitles = profile.cosplayTitles || [];
      profile.cosplayTitles.push(ts.placeName + '冠军');
      profile.cosplayTitles = profile.cosplayTitles.slice(-5);
    } else if (placed === 2) {
      reward.fame = 10; reward.money = 1200;
      reward.message = '你获得了亚军，虽败犹荣，台下掌声不断。';
    } else if (placed <= 4) {
      reward.fame = 5; reward.money = 400;
      reward.message = '你进入了四强，作为实力Coser的声誉正在上升。';
    } else {
      reward.fame = 2;
      reward.message = '比赛是成长的阶梯，下次你会做得更好。';
    }
    state.cityLife ||= { reputation: 0, familiarity: {} };
    state.cityLife.reputation = U.clamp(
      (state.cityLife.reputation || 0) + reward.fame, 0, 100,
    );
    state.money += reward.money;
    if (state.career.jobId === 'coser') {
      Game.coserCareer?.recordContest(state, {
        event: ts.placeName, placed: placed,
        round: c.totalRounds, won: placed === 1,
        opponent: c.opponents && c.opponents[c.totalRounds-1] ? c.opponents[c.totalRounds-1].name : '',
      });
    }
    Game.view.showToast(reward.message, placed <= 2 ? 'good' : 'info');
    Game.lifeDirector.addLog(state, '比赛结果', reward.message
      + (reward.money ? ` 奖金${Game.view.money(reward.money)}。` : ''), placed <= 2 ? 'milestone' : 'normal');
    return reward;
  }

  function model(state, ts) {
    var c = ts.contest;
    if (!c) return null;
    var round = currentRound(ts);
    var info = round != null ? roundInfo(ts, round) : null;
    var allRounds = [];
    for (var i = 0; i < Math.min(c.totalRounds, c.playerScores.length); i += 1) {
      var meta = ROUNDS[i];
      var opp = c.opponents[i];
      allRounds.push({
        name: meta.name,
        player: c.playerScores[i],
        opponent: c.opponentScores[i],
        opponentName: opp.name,
        opponentCostume: opp._opponent?.costume?.character || '',
        narrative: c.results[i]?.narrative || '',
        won: c.results[i]?.outcome === 'win_big' || c.results[i]?.outcome === 'win_close',
      });
    }
    return {
      active: c.active, round: round, totalRounds: c.totalRounds,
      info: info, allRounds: allRounds,
      placed: c.placed, mishaps: c.mishaps,
      ticket: c.contestTicketCost || CONTEST_TICKET,
    };
  }

  Game.conventionContest = Object.freeze({
    ROUNDS: ROUNDS, CONTEST_TICKET: CONTEST_TICKET,
    cosplayScore: cosplayScore, initContest: initContest,
    currentRound: currentRound, roundInfo: roundInfo,
    perform: perform, settle: settle, model: model,
  });
}(window));
