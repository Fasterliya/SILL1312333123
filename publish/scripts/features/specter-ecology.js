(function initSpecterEcology(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var MAX_SPECTERS = 12;
  function ageAtMonth(state, person, month) {
    var child = ['儿子', '女儿', '养子', '养女'].includes(person.relation);
    var birthMonth = Number.isFinite(person.birthMonth)
      ? person.birthMonth : (child && Number.isFinite(person.bornAt)
        ? person.bornAt : -(Number(person.baseAge) || 0) * 12);
    return Math.max(0, Math.floor((month - birthMonth) / 12));
  }
  function recordPossession(state, person, specter) {
    var month = Number.isFinite(specter.possessedAtMonth)
      ? specter.possessedAtMonth : state.totalMonths;
    var age = Number.isFinite(specter.possessedAtAge)
      ? specter.possessedAtAge : ageAtMonth(state, person, month);
    specter.possessedAtMonth = month;
    specter.possessedAtAge = age;
    specter.feeding = specter.feeding && typeof specter.feeding === 'object'
      ? specter.feeding : null;
    specter.splitCount = Math.max(0, Number(specter.splitCount) || 0);
    specter.lastSplitMonth = Number.isFinite(specter.lastSplitMonth)
      ? specter.lastSplitMonth : month - 6;
    specter.generation = Math.max(1, Number(specter.generation) || 1);
    person.specterPossessed = true;
    person.specterPossessedAtMonth = month;
    person.specterPossessedAtAge = age;
    person.specterSourceHostId = specter.parentHostId || '';
    Game.specterHostRecovery?.begin(state, person, specter);
  }
  function ensureSpecter(state, specter) {
    var host = Game.people?.find(state, specter.hostId);
    if (!host) return;
    if (!Number.isFinite(specter.possessedAtMonth)) {
      specter.possessedAtMonth = state.totalMonths - Math.max(0, specter.monthsActive || 0);
    }
    recordPossession(state, host, specter);
  }
  function localCandidates(state, specter, exclusions) {
    var host = Game.people.find(state, specter.hostId);
    var city = host?.currentCity || state.location.city;
    var excluded = new Set(exclusions || []);
    return Game.people.all(state).filter(function (person) {
      return person && person.id !== 'player-profile' && !excluded.has(person.id)
        && person.currentCity === city && person.status === '健康'
        && !person.deceasedAt && !person.specterPossessed && !person.skinCaptured;
    });
  }
  function localSpecters(state) {
    return (state.supernatural?.specters || []).filter(function (specter) {
      return Game.people.find(state, specter.hostId)?.currentCity === state.location.city;
    });
  }
  function protectors(state, specter) {
    var host = Game.people.find(state, specter.hostId);
    var city = host?.currentCity || state.location.city;
    var result = Game.people.all(state).filter(function (person) {
      return person.currentCity === city && person.status === '健康'
        && !person.specterPossessed
        && (person.jobId === 'magicalgirl' || person.job === '魔法少女');
    }).map(function (person) {
      return { name: person.name, player: false, power: 52 + (person.careerRank || 0) * 8 };
    });
    var mg = state.magicalGirl;
    if (mg?.active && mg.magicPower >= 6 && state.location.city === city) {
      result.unshift({ name: state.name, player: true, power: mg.magicPower });
    }
    return result;
  }
  function clearFeeding(state, specter) {
    var victim = specter.feeding && Game.people.find(state, specter.feeding.victimId);
    if (victim) victim.specterPrey = null;
    specter.feeding = null;
  }
  function purify(state, specter, guardian, reason) {
    var index = state.supernatural.specters.indexOf(specter);
    if (index < 0) return false;
    var host = Game.people.find(state, specter.hostId);
    clearFeeding(state, specter);
    state.supernatural.specters.splice(index, 1);
    if (host) {
      if (Game.specterHostRecovery) Game.specterHostRecovery.recover(state, host, specter);
      else {
        host.specterPossessed = false;
        host.specterPurifiedAtMonth = state.totalMonths;
        host.status = '健康';
        host.deceasedAt = null;
      }
    }
    if (guardian?.player) {
      if (guardian.consumeMagic !== false) state.magicalGirl.magicPower = Math.max(0, state.magicalGirl.magicPower - 6);
      Game.magicalGirlCore?.onKill(state);
    }
    Game.lifeDirector.addLog(state, '魔法少女狩猎',
      (guardian?.name || '一位魔法少女') + '在' + reason + '中净化了寄生于'
      + (host?.name || '未知宿主') + '体内的' + specter.type
      + '。宿主失去了全部记忆，以16岁少女的身份回到当地高中重新生活。', 'milestone');
    return true;
  }
  function intercept(state, specter, victim) {
    if (!Game.specterHuntBalance?.canIntercept(specter)) return false;
    var guards = protectors(state, specter);
    if (!guards.length) return false;
    var chance = Math.min(0.82, 0.38 + guards.length * 0.1);
    if (Math.random() > chance) return false;
    var guardian = guards[Math.floor(Math.random() * guards.length)];
    specter.exposed = true;
    specter.alertLevel = Math.min(100, (specter.alertLevel || 0) + 25);
    specter.hp = Math.max(0, specter.hp - U.between(45, 95));
    victim.specterPrey = null;
    specter.feeding = null;
    if (specter.hp <= 0 || Math.random() < 0.28 + guardian.power / 500) {
      return purify(state, specter, guardian, '救援行动');
    }
    if (guardian.player) state.magicalGirl.magicPower = Math.max(0, state.magicalGirl.magicPower - 4);
    Game.lifeDirector.addLog(state, '魔法少女救援',
      guardian.name + '打断了幽诡对' + victim.name + '的吞噬，幽诡负伤逃走。', 'good');
    return true;
  }
  function spread(state, specter, consumedId) {
    if (state.supernatural.specters.length >= MAX_SPECTERS) return;
    if (state.totalMonths - specter.lastSplitMonth < 6) return;
    var candidates = localCandidates(state, specter, [consumedId, specter.hostId]);
    if (!candidates.length) return;
    var target = candidates[Math.floor(Math.random() * candidates.length)];
    var child = Game.supernaturalSpecter.possessTarget(state, target, {
      sourceHostId: specter.hostId,
      generation: Math.max(1, Number(specter.generation) || 1) + 1,
    });
    if (child === false) return;
    specter.splitCount += 1;
    specter.lastSplitMonth = state.totalMonths;
    var spreadLabel = specter.type === '淫妖' ? '淫毒扩散' : (specter.type === '欲母' ? '育母产种' : '寄生扩散');
    Game.lifeDirector.addLog(state, spreadLabel,
      specter.type + '吞噬完猎物后发生分裂，新的个体寄生了' + target.name
      + '。城市中的幽诡数量正在增加。', 'danger');
  }
  function feed(state, specter) {
    ensureSpecter(state, specter);
    if (specter.stage !== '掠食' || state.totalMonths - specter.lastFeedMonth < 1) return;
    if (Math.random() > 0.32) return;
    var feeding = specter.feeding;
    var victim = feeding && Game.people.find(state, feeding.victimId);
    if (!victim || victim.status !== '健康' || victim.specterPossessed) {
      var candidates = localCandidates(state, specter, [specter.hostId]);
      if (!candidates.length) return;
      victim = candidates[Math.floor(Math.random() * candidates.length)];
      feeding = { victimId: victim.id, progress: 0 };
      specter.feeding = feeding;
    }
    if (intercept(state, specter, victim)) return;
    feeding.progress = Math.min(100, feeding.progress + U.between(34, 55));
    victim.specterPrey = { hostId: specter.hostId, progress: feeding.progress };
    specter.lastFeedMonth = state.totalMonths;
    if (feeding.progress < 100) return;
    victim.status = '失踪';
    victim.deceasedAt = state.totalMonths;
    victim.specterPrey = null;
    victim.specterConsumedBy = specter.hostId;
    specter.victims.push(victim.id);
    specter.feeding = null;
    typeSpecialFeedLog(state, specter, victim);
    Game.lifeDirector.addLog(state, '幽诡吞噬',
      victim.name + '被幽诡完全吞噬，原有生命迹象已经消失。', 'danger');
    spread(state, specter, victim.id);
  }
  function typeSpecialFeedLog(state, specter, victim) {
    if (specter.type === '淫妖') {
      Game.lifeDirector.addLog(state, '淫妖吞噬',
        victim.name + '在极致的快感中被淫妖吸干了生命精华。' + victim.name + '的脸上凝固着高潮时的表情——痛苦和欢愉的界限已经消失了。', 'danger');
    } else if (specter.type === '梦魇') {
      Game.lifeDirector.addLog(state, '梦魇吞噬',
        victim.name + '再也没有醒来。她在梦中死于一场她不敢描述的噩梦——梦的主人叫' + (Game.people.find(state, specter.hostId)?.name || '未知') + '。', 'danger');
    } else if (specter.type === '情缚') {
      Game.lifeDirector.addLog(state, '情缚吞噬',
        victim.name + '与宿主的身体在交合中融为了一体——字面意义上。两具纠缠的躯体正在缓慢地合拢，边缘变得模糊，就像蜡像在高温下融化。', 'danger');
    } else if (specter.type === '欲母') {
      Game.lifeDirector.addLog(state, '欲母吞噬',
        victim.name + '的身体被欲母的触须包裹成茧。茧中传出了吮吸的声音，持续了整整一夜。第二天茧裂开时，里面已经什么都不剩了。', 'danger');
    }
  }
  function monthlyProtection(state) {
    var specters = state.supernatural?.specters || [];
    if (!specters.length || state.supernatural.combat?.active
      || state.magicalGirl?.activeMission) return;
    if (state.supernatural.lastGuardianHuntMonth === state.totalMonths) return;
    var target = specters.slice().sort(function (a, b) {
      var rank = { 潜伏: 1, 显形: 2, 掠食: 3 };
      return rank[b.stage] - rank[a.stage];
    })[0];
    var guards = protectors(state, target);
    if (!guards.length || !Game.specterHuntBalance?.track(state, target, guards.length).ready) return;
    if (Math.random() > Math.min(0.34, 0.08 + guards.length * 0.06)) return;
    state.supernatural.lastGuardianHuntMonth = state.totalMonths;
    var guardian = guards[Math.floor(Math.random() * guards.length)];
    target.exposed = true;
    if (Math.random() < 0.42 + guardian.power / 400) purify(state, target, guardian, '城市巡猎');
    else {
      target.hp = Math.max(1, target.hp - U.between(35, 70));
      Game.lifeDirector.addLog(state, '夜间巡猎',
        guardian.name + '发现并击伤了一只幽诡，它暂时停止了猎食。', 'good');
      target.lastFeedMonth = state.totalMonths;
    }
  }
  Game.specterEcology = Object.freeze({
    ensureSpecter: ensureSpecter,
    recordPossession: recordPossession,
    localSpecters: localSpecters,
    clearFeeding: clearFeeding,
    purify: purify,
    feed: feed,
    monthlyProtection: monthlyProtection,
  });
}(window));
