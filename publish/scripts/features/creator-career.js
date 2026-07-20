(function initCreatorCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const ids = new Set(['vtuber', 'beautyblog', 'styleblog', 'portraitblog']);
  const labels = {
    vtuber: '虚拟主播频道', beautyblog: '美妆频道',
    styleblog: '穿搭频道', portraitblog: '影像频道',
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
    creator.videos = Array.isArray(creator.videos) ? creator.videos.slice(0, 12) : [];
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
    }[state.career.jobId] || [];
    const keyword = topics.some((word) => title.includes(word)) ? 18 : 0;
    const length = title.length >= 8 && title.length <= 24 ? 12 : 3;
    const punctuation = /[？！!?]/.test(title) ? 4 : 0;
    return keyword + length + punctuation;
  }

  function publish(state, rawTitle) {
    if (!isCreator(state)) return { ok: false, message: '当前职业没有个人频道' };
    const creator = ensure(state);
    const title = String(rawTitle || '').replace(/[\u0000-\u001f<>&"'`]/g, ' ').trim().slice(0, 40);
    if (title.length < 2) return { ok: false, message: '请输入2到40字的视频标题' };
    if (creator.lastPublishMonth === state.totalMonths) return { ok: false, message: '本月已经发布过主要内容' };
    const quality = titleQuality(state, title);
    const reach = 320 + creator.followers * (0.35 + Math.random() * 0.5)
      + state.stats.魅力 * 28 + state.stats.智力 * 8 + quality * 70;
    const views = Math.max(100, Math.round(reach * (0.72 + Math.random() * 0.65)));
    const gained = Math.max(5, Math.round(Math.sqrt(views) * (0.6 + quality / 60)));
    const income = Math.round(views / 1000 * (8 + creator.brandTrust / 8));
    creator.followers += gained;
    creator.totalViews += views;
    creator.lastPublishMonth = state.totalMonths;
    creator.videos.unshift({ title, views, gained, income, month: state.totalMonths });
    creator.videos = creator.videos.slice(0, 12);
    creator.brandTrust = U.clamp(creator.brandTrust + (quality >= 20 ? 3 : 1), 0, 100);
    state.money += income;
    state.career.performance = U.clamp(state.career.performance + 7, 0, 100);
    state.career.exp += 6;
    Game.lifeDirector.addLog(state, '频道发布', `《${title}》获得${views}次播放，新增${gained}名粉丝。`, 'good');
    return { ok: true, message: `发布完成：${views}播放，新增${gained}粉丝，收入${Game.view.money(income)}` };
  }

  function livestream(state) {
    if (state.career.jobId !== 'vtuber') return { ok: false, message: '只有虚拟主播可以开启频道直播' };
    const creator = ensure(state);
    if (creator.lastLiveMonth === state.totalMonths) return { ok: false, message: '本月已经完成过频道直播' };
    creator.lastLiveMonth = state.totalMonths;
    const viewers = Math.max(20, Math.round(80 + creator.followers * 0.08 + state.stats.魅力 * 4));
    const income = Math.round(viewers * (1.5 + Math.random() * 1.8));
    creator.followers += Math.max(3, Math.round(viewers * 0.08));
    creator.totalViews += viewers;
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 4, 0, 100);
    state.career.burnout = U.clamp(state.career.burnout + 8, 0, 100);
    return { ok: true, message: `直播峰值${viewers}人，获得${Game.view.money(income)}` };
  }

  function sponsor(state) {
    const creator = ensure(state);
    if (creator.followers < 1000) return { ok: false, message: '粉丝达到1000后才能稳定承接广告' };
    if (state.totalMonths - creator.lastSponsorMonth < 3) return { ok: false, message: '距离上次广告合作不足3个月' };
    creator.lastSponsorMonth = state.totalMonths;
    const income = Math.round(1200 + creator.followers * (0.08 + creator.brandTrust / 1000));
    state.money += income;
    creator.brandTrust = U.clamp(creator.brandTrust + 4, 0, 100);
    state.career.performance = U.clamp(state.career.performance + 8, 0, 100);
    return { ok: true, message: `广告合作完成，收入${Game.view.money(income)}` };
  }

  function privateDeal(state) {
    const creator = ensure(state);
    if (creator.followers < 5000) return { ok: false, message: '粉丝达到5000后才会出现私人商务邀约' };
    if (state.totalMonths - creator.lastPrivateMonth < 6) return { ok: false, message: '私人合作邀约至少间隔6个月' };
    creator.lastPrivateMonth = state.totalMonths;
    const income = Math.round(3000 + creator.followers * 0.16);
    state.money += income;
    creator.scandalRisk = U.clamp(creator.scandalRisk + 22, 0, 100);
    creator.brandTrust = U.clamp(creator.brandTrust - 5, 0, 100);
    Game.relationshipSecrets.addPlayerSecret(
      state, '未披露私人合作', '接受了一次没有向观众公开具体条件的私人商务邀约',
    );
    return { ok: true, message: `私人合作带来${Game.view.money(income)}，但公开风险上升` };
  }

  function community(state) {
    const creator = ensure(state);
    if (creator.lastCommunityMonth === state.totalMonths) return { ok: false, message: '本月已经完成过社群活动' };
    creator.lastCommunityMonth = state.totalMonths;
    const gain = Math.max(10, Math.round(creator.followers * 0.015 + state.stats.魅力));
    creator.followers += gain;
    creator.brandTrust = U.clamp(creator.brandTrust + 6, 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + 3, 0, 100);
    return { ok: true, message: `社群互动新增${gain}粉丝，品牌信任提升` };
  }

  function monthly(state) {
    if (!isCreator(state)) return;
    const creator = ensure(state);
    const views = Math.round(creator.followers * (0.3 + Math.random() * 0.25));
    const income = Math.round(views / 1000 * (6 + creator.brandTrust / 10));
    creator.totalViews += views;
    state.money += income;
    const base = Game.config.jobs.find((job) => job.id === state.career.jobId)?.salary || 0;
    state.career.salary = Math.round(base * 0.35 + creator.followers * 0.035);
    if (creator.scandalRisk > 0) creator.scandalRisk = U.clamp(creator.scandalRisk - 2, 0, 100);
    if (Math.random() < creator.scandalRisk / 1200) {
      const lost = Math.min(creator.followers, Math.round(creator.followers * 0.18));
      creator.followers -= lost;
      creator.brandTrust = U.clamp(creator.brandTrust - 15, 0, 100);
      creator.scandalRisk = U.clamp(creator.scandalRisk - 25, 0, 100);
      Game.lifeDirector.addLog(state, '频道争议', `未披露合作引发质疑，流失${lost}名粉丝。`, 'normal');
    }
  }

  function render(state) {
    const creator = ensure(state);
    const videos = creator.videos.slice(0, 5).map((video) => (
      `<div class="creator-video"><strong>${video.title}</strong><span>${video.views}播放 · +${video.gained}粉丝
      · ${Game.view.money(video.income)}</span></div>`
    )).join('');
    return `<section class="creator-card"><header><div><span>${labels[state.career.jobId]}</span>
      <strong>${creator.followers.toLocaleString()} 粉丝</strong></div><b>${creator.totalViews.toLocaleString()} 播放</b></header>
      <div class="creator-metrics"><span>品牌信任 <b>${Math.round(creator.brandTrust)}</b></span>
      <span>公开风险 <b>${Math.round(creator.scandalRisk)}</b></span></div>
      <label class="creator-title"><span>本期标题</span><input data-creator-title maxlength="40"
      placeholder="输入视频标题"></label><div class="creator-actions">
      <button data-creator-action="publish">发布视频</button>
      ${state.career.jobId === 'vtuber' ? '<button data-creator-action="live">开启直播</button>' : ''}
      <button data-creator-action="community">经营社群</button>
      <button data-creator-action="sponsor">承接广告</button>
      <button data-creator-action="private">私人合作</button></div>
      <div class="creator-videos">${videos || '<p class="empty-state">频道还没有发布内容。</p>'}</div></section>`;
  }

  Game.creatorCareer = Object.freeze({
    isCreator, ensure, onJobChange, publish, livestream, sponsor, privateDeal, community, monthly, render,
  });
}(window));
