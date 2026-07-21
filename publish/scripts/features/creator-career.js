(function initCreatorCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const ids = new Set(['vtuber', 'beautyblog', 'styleblog', 'portraitblog', 'welfare']);
  const labels = {
    vtuber: '虚拟主播频道', beautyblog: '美妆频道',
    styleblog: '穿搭频道', portraitblog: '影像频道',
    welfare: '福利频道',
  };

  function isCreator(state) {
    return ids.has(state.career.jobId);
  }

  function ensure(state) {
    state.creator = state.creator && typeof state.creator === 'object' ? state.creator : {};
    const creator = state.creator;
    creator.channelId ||= state.career.jobId || '';
    creator.followers = Math.max(0, Math.round(Number(creator.followers) || 0));
    creator.totalViews = Math.max(0, Math.round(Number(creator.totalViews) || 0));
    creator.brandTrust = U.clamp(Number(creator.brandTrust) || 45, 0, 100);
    creator.scandalRisk = U.clamp(Number(creator.scandalRisk) || 0, 0, 100);
    creator.lastPublishMonth = Number.isFinite(creator.lastPublishMonth) ? creator.lastPublishMonth : -1;
    creator.lastSponsorMonth = Number.isFinite(creator.lastSponsorMonth) ? creator.lastSponsorMonth : -6;
    creator.lastLiveMonth = Number.isFinite(creator.lastLiveMonth) ? creator.lastLiveMonth : -1;
    creator.lastCommunityMonth = Number.isFinite(creator.lastCommunityMonth) ? creator.lastCommunityMonth : -1;
    creator.lastPrivateMonth = Number.isFinite(creator.lastPrivateMonth) ? creator.lastPrivateMonth : -6;
    delete creator.videos;
    return creator;
  }

  function onJobChange(state) {
    if (!isCreator(state)) return;
    const creator = ensure(state);
    creator.channelId = state.career.jobId;
  }

  function titleQuality(state, title) {
    const topics = {
      vtuber: ['直播', '挑战', '游戏', '歌回', '杂谈'],
      beautyblog: ['妆容', '测评', '教程', '护肤', '平价'],
      styleblog: ['穿搭', '通勤', '显高', '约会', '换季'],
      portraitblog: ['摄影', '构图', '写真', '街拍', '幕后'],
      welfare: ['写真', '福利', '限定', '日常', '互动'],
    }[state.career.jobId] || [];
    const keyword = topics.some((word) => title.includes(word)) ? 18 : 0;
    const length = title.length >= 8 && title.length <= 24 ? 12 : 3;
    const punctuation = /[？！!?]/.test(title) ? 4 : 0;
    return keyword + length + punctuation;
  }

  const appeal = (state) => 0.75 + U.clamp(state.stats.魅力, 0, 100) / 100;
  const style = (state) => Game.creatorStyleGrowth.multiplier(state.profile, state.career.jobId);

  function publish(state, rawTitle) {
    if (!isCreator(state)) return { ok: false, message: '当前职业没有个人频道' };
    const creator = ensure(state);
    const title = String(rawTitle || '').replace(/[\u0000-\u001f<>&"'`]/g, ' ').trim().slice(0, 40);
    if (title.length < 2) return { ok: false, message: '请输入2到40字的视频标题' };
    if (creator.lastPublishMonth === state.totalMonths) return { ok: false, message: '本月已经发布过主要内容' };
    const quality = titleQuality(state, title);
    const reach = 320 + creator.followers * (0.35 + Math.random() * 0.5)
      + state.stats.魅力 * 28 + Game.learningAttribute.checkValue(state.stats.智力) * 8 + quality * 70;
    const views = Math.max(100, Math.round(reach * (0.72 + Math.random() * 0.65)));
    const gained = Math.max(5, Math.round(Math.sqrt(views) * (0.6 + quality / 60) * appeal(state) * style(state)));
    const income = Game.creatorEconomy.contentIncome(views, creator.followers, creator.brandTrust);
    creator.followers += gained;
    creator.totalViews += views;
    creator.lastPublishMonth = state.totalMonths;
    creator.brandTrust = U.clamp(creator.brandTrust + (quality >= 20 ? 3 : 1), 0, 100);
    state.money += income;
    state.career.performance = U.clamp(state.career.performance + 7, 0, 100);
    state.career.exp += 6;
    return { ok: true, message: `发布完成：${Game.creatorEconomy.compact(views)}播放，新增${Game.creatorEconomy.compact(gained)}粉丝，收入${Game.view.money(income)}` };
  }

  function livestream(state) {
    if (state.career.jobId !== 'vtuber') return { ok: false, message: '只有虚拟主播可以开启频道直播' };
    const creator = ensure(state);
    if (creator.lastLiveMonth === state.totalMonths) return { ok: false, message: '本月已经完成过频道直播' };
    creator.lastLiveMonth = state.totalMonths;
    const viewers = Math.max(20, Math.round(80 + creator.followers * 0.08 + state.stats.魅力 * 4));
    const income = Game.creatorEconomy.livestreamIncome(viewers, creator.followers, creator.brandTrust);
    creator.followers += Math.max(3, Math.round(viewers * 0.08 * appeal(state) * style(state)));
    creator.totalViews += viewers;
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 4, 0, 100);
    state.career.burnout = U.clamp(state.career.burnout + 8, 0, 100);
    return { ok: true, message: `直播峰值${Game.creatorEconomy.compact(viewers)}人，获得${Game.view.money(income)}` };
  }

  function sponsor(state) {
    const creator = ensure(state);
    if (creator.followers < 1000) return { ok: false, message: '粉丝达到1k后才能稳定承接广告' };
    if (state.totalMonths - creator.lastSponsorMonth < 3) return { ok: false, message: '距离上次广告合作不足3个月' };
    creator.lastSponsorMonth = state.totalMonths;
    const income = Game.creatorEconomy.sponsorIncome(creator.followers, creator.brandTrust);
    state.money += income;
    creator.brandTrust = U.clamp(creator.brandTrust + 4, 0, 100);
    state.career.performance = U.clamp(state.career.performance + 8, 0, 100);
    return { ok: true, message: `广告合作完成，收入${Game.view.money(income)}` };
  }

  function generateSponsor(state) {
    const gender = state.gender === '女' ? '男' : '女';
    const age = U.between(28, 55);
    const sponsor = U.person('金主', U.random(Game.nameSystem.surnames()), age, gender, state.totalMonths);
    Game.worldCulture.applyPerson(sponsor, state.location.country);
    U.setUniqueName(state, sponsor, Game.worldCulture.profile(state.location.country).locale);
    sponsor.metCity = state.location.city;
    sponsor.currentCity = state.location.city;
    sponsor.affection = U.between(42, 62);
    sponsor.wealth = U.between(500000, 5000000);
    sponsor.sponsorType = true;
    if (!state.worldPeople.some((p) => p.id === sponsor.id)) state.worldPeople.push(sponsor);
    return sponsor;
  }

  function hookup(state) {
    const creator = ensure(state);
    const isWelfare = state.career.jobId === 'welfare';
    const minFollowers = isWelfare ? 1000 : 5000;
    const label = isWelfare ? '金主约会' : '约炮';
    if (creator.followers < minFollowers) {
      return { ok: false, message: `粉丝达到${Game.creatorEconomy.compact(minFollowers)}后才能收到${label}邀约` };
    }
    if (state.totalMonths - creator.lastPrivateMonth < 6) {
      return { ok: false, message: `${label}至少间隔6个月` };
    }
    creator.lastPrivateMonth = state.totalMonths;
    creator.scandalRisk = U.clamp(creator.scandalRisk + 10, 0, 100);
    creator.brandTrust = U.clamp(creator.brandTrust - 3, 0, 100);
    /* Delegate to hookup system for multi-stage encounter */
    const playerRole = (state.career.jobId === 'welfare' || state.gender === '女') ? 'provider' : 'client';
    const result = Game.hookupSystem.start(state, null, playerRole);
    if (result.ok) {
      Game.view.showToast(`${label}开始`, 'good');
    }
    return result;
  }

  function privateDeal(state) { return hookup(state); }

  function community(state) {
    const creator = ensure(state);
    if (creator.lastCommunityMonth === state.totalMonths) return { ok: false, message: '本月已经完成过社群活动' };
    creator.lastCommunityMonth = state.totalMonths;
    const gain = Math.max(10, Math.round((creator.followers * 0.015 + 20) * appeal(state) * style(state)));
    creator.followers += gain;
    creator.brandTrust = U.clamp(creator.brandTrust + 6, 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + 3, 0, 100);
    return { ok: true, message: `社群互动新增${Game.creatorEconomy.compact(gain)}粉丝，品牌信任提升` };
  }

  function monthly(state) {
    if (!isCreator(state)) return;
    const creator = ensure(state);
    const views = Math.round(creator.followers * (0.3 + Math.random() * 0.25));
    const income = Game.creatorEconomy.passiveIncome(views, creator.followers, creator.brandTrust);
    creator.totalViews += views;
    state.money += income;
    const base = Game.config.jobs.find((job) => job.id === state.career.jobId)?.salary || 0;
    state.career.salary = Game.creatorEconomy.monthlySalary(base, creator.followers, creator.brandTrust);
    if (creator.scandalRisk > 0) creator.scandalRisk = U.clamp(creator.scandalRisk - 2, 0, 100);
    if (Math.random() < creator.scandalRisk / 1200) {
      const lost = Math.min(creator.followers, Math.round(creator.followers * 0.18));
      creator.followers -= lost;
      creator.brandTrust = U.clamp(creator.brandTrust - 15, 0, 100);
      creator.scandalRisk = U.clamp(creator.scandalRisk - 25, 0, 100);
      Game.lifeDirector.addLog(state, '频道争议', `未披露合作引发质疑，流失${Game.creatorEconomy.compact(lost)}名粉丝。`, 'normal');
    }
  }

  function render(state) {
    const creator = ensure(state);
    return `<section class="creator-card"><header><div><span>${labels[state.career.jobId]}</span>
      <strong>${Game.creatorEconomy.compact(creator.followers)} 粉丝</strong></div><b>${Game.creatorEconomy.compact(creator.totalViews)} 播放</b></header>
      <div class="creator-metrics"><span>品牌信任 <b>${Math.round(creator.brandTrust)}</b></span>
      <span>公开风险 <b>${Math.round(creator.scandalRisk)}</b></span>
      <span>魅力增粉 <b>×${appeal(state).toFixed(2)}</b></span>
      <span>衣着增粉 <b>×${style(state).toFixed(2)}</b></span></div>
      <label class="creator-title"><span>本期标题</span><input data-creator-title maxlength="40"
      placeholder="输入视频标题"></label><div class="creator-actions">
      <button data-creator-action="publish">发布视频</button>
      ${state.career.jobId === 'vtuber' ? '<button data-creator-action="live">开启直播</button>' : ''}
      <button data-creator-action="community">经营社群</button>
      ${Game.creatorGrowthActions.buttons()}
      <button data-creator-action="sponsor">承接广告</button>
      <button data-creator-action="private">${state.career.jobId === 'welfare' ? '金主约会' : '约炮'}</button></div></section>`;
  }

  Game.creatorCareer = Object.freeze({
    isCreator, ensure, onJobChange, publish, livestream, sponsor, privateDeal, hookup, generateSponsor, community, monthly, render,
  });
}(window));
