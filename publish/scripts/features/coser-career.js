(function initCoserCareer(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content || { clamp: function(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}, between: function(a,b){return a+Math.floor(Math.random()*(b-a+1));} };
  function compact(v) { return v>=10000?(v/10000).toFixed(1)+'万':v>=1000?(v/1000).toFixed(1)+'k':String(Math.round(v||0)); }

  function ensure(state) {
    if (!state.coser || typeof state.coser !== 'object') state.coser = {};
    var c = state.coser;
    c.cosplayInventory = Array.isArray(c.cosplayInventory) ? c.cosplayInventory.slice(-30) : [];
    c.contestHistory = Array.isArray(c.contestHistory) ? c.contestHistory.slice(-20) : [];
    c.lastPublishMonth = Number.isFinite(c.lastPublishMonth) ? c.lastPublishMonth : -1;
    c.lastSponsorMonth = Number.isFinite(c.lastSponsorMonth) ? c.lastSponsorMonth : -6;
    c.lastCommunityMonth = Number.isFinite(c.lastCommunityMonth) ? c.lastCommunityMonth : -1;
    c._fold = c._fold || '';
    if (Game.creatorCareer) {
      if (!state.creator || typeof state.creator !== 'object') state.creator = {};
      var cr = state.creator;
      cr.channelId = cr.channelId || 'coser';
      cr.followers = Math.max(0, Math.round(Number(cr.followers) || 0));
      cr.totalViews = Math.max(0, Math.round(Number(cr.totalViews) || 0));
      cr.brandTrust = U.clamp(Number(cr.brandTrust) || 45, 0, 100);
      cr.scandalRisk = U.clamp(Number(cr.scandalRisk) || 0, 0, 100);
      cr.lastSponsorMonth = Number.isFinite(cr.lastSponsorMonth) ? cr.lastSponsorMonth : -6;
      cr.lastCommunityMonth = Number.isFinite(cr.lastCommunityMonth) ? cr.lastCommunityMonth : -1;
    }
    return c;
  }

  function isCoser(state) { return state.career.jobId === 'coser'; }

  function toggleFold(state, key) {
    var c = ensure(state);
    c._fold = c._fold === key ? '' : key;
  }

  /* --- wardrobe --- */
  function addCosplayToInventory(state, costumeName) {
    var c = ensure(state);
    var item = Game.cosplayCatalog.find(costumeName);
    if (!item || item.name === '无') return { ok: false, message: '无效的cos服' };
    if (c.cosplayInventory.some(function(i) { return i.name === item.name; })) {
      return { ok: false, message: '已经拥有这套cos服' };
    }
    c.cosplayInventory.push({ name: item.name, series: item.series, character: item.character,
      acquired: state.totalMonths, wear: 0, rarity: Math.random() < 0.1 ? 'rare' : 'common' });
    c.cosplayInventory = c.cosplayInventory.slice(-30);
    return { ok: true, message: '获得' + item.name };
  }

  function wearCosplay(state, costumeName) {
    var c = ensure(state);
    var item = c.cosplayInventory.find(function(i) { return i.name === costumeName; });
    if (!item) return { ok: false, message: '衣柜中没有这套cos服' };
    if (item.wear >= 100) return { ok: false, message: '这套cos服已经磨损严重，需要修复' };
    var profile = Game.hunterMode ? Game.hunterMode.identity(state).profile : state.profile;
    profile.cosplay = item.name;
    item.wear = Math.min(100, (item.wear || 0) + U.between(2, 8));
    return { ok: true, message: '穿上了' + item.name + (item.wear > 70 ? ' (已磨损，建议修复)' : '') };
  }

  function repairCosplay(state, costumeName) {
    var c = ensure(state);
    var item = c.cosplayInventory.find(function(i) { return i.name === costumeName; });
    if (!item) return { ok: false, message: '衣柜中没有这套cos服' };
    var cost = Math.round((item.wear || 0) * 5);
    if (state.money < cost) return { ok: false, message: '修复需要' + Game.view.money(cost) };
    Game.economy.spend(state, cost);
    item.wear = 0;
    return { ok: true, message: '已修复' + item.name + ', 花费' + Game.view.money(cost) };
  }

  function buyCosplay(state, costumeName) {
    var c = ensure(state);
    var item = Game.cosplayCatalog.find(costumeName);
    if (!item || item.name === '无') return { ok: false, message: '无效的cos服' };
    if (c.cosplayInventory.some(function(i) { return i.name === item.name; })) return { ok: false, message: '已经拥有' };
    var cost = item.series ? 800 : 500;
    if (state.money < cost) return { ok: false, message: '需要' + Game.view.money(cost) };
    Game.economy.spend(state, cost);
    c.cosplayInventory.push({ name: item.name, series: item.series, character: item.character,
      acquired: state.totalMonths, wear: 0, rarity: Math.random() < 0.15 ? 'rare' : 'common' });
    c.cosplayInventory = c.cosplayInventory.slice(-30);
    return { ok: true, message: '购得' + item.name + ' · ' + Game.view.money(cost) };
  }

  function openBuyMenu(state, filter) {
    var c = ensure(state);
    c._buyFilter = filter || '全部';
    var pool = Game.cosplayCatalog.items.filter(function(item) {
      return item.name !== '无' && !c.cosplayInventory.some(function(i) { return i.name === item.name; });
    });
    var series = ['全部'].concat(Game.cosplayCatalog.series.filter(function(s) {
      return pool.some(function(item) { return item.series === s; });
    }));
    if (c._buyFilter !== '全部') {
      pool = pool.filter(function(item) { return item.series === c._buyFilter; });
    }
    pool.sort(function(a, b) { return (a.series||'').localeCompare(b.series||''); });
    var html = '<div class="coser-buy-panel">';
    html += '<nav class="filter-chips">' + series.map(function(s) {
      return '<button class="' + (c._buyFilter === s ? 'active' : '') + '" data-coser-buy-filter="' + s + '">' + s + '</button>';
    }).join('') + '</nav>';
    html += '<h4>' + pool.length + '件可选</h4>';
    if (!pool.length) {
      html += '<p class="empty-state">该系列已全部拥有。</p>';
    } else {
      html += '<div class="coser-buy-grid">';
      pool.forEach(function(item) {
        var cost = item.series ? 800 : 500;
        var canBuy = state.money >= cost;
        html += '<div class="buy-item' + (canBuy ? '' : ' locked') + '" data-coser-buy="' + item.name + '">';
        html += '<strong>' + item.name + '</strong><small>' + (item.series||'通用') + ' · ' + (item.character||'') + '</small>';
        html += '<b>' + Game.view.money(cost) + '</b></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    Game.navigation.openDetail('选购Cos服', html, 'coser-buy');
  }

  function openBuyMenuRefresh(state) {
    openBuyMenu(state, (state.coser||{})._buyFilter || '全部');
  }

  /* --- publish --- */
  function publishCoser(state) {
    var c = ensure(state);
    if (!isCoser(state)) return { ok: false, message: '只有Coser可以发布作品' };
    if (c.lastPublishMonth === state.totalMonths) return { ok: false, message: '本月已发布过' };
    var titles = ['今天的新返图！', '漫展' + U.random(['舞台','场照','集邮']) + '返图', '新造型试妆', '角色还原' + U.random(['挑战','记录','日常']), '摄影师' + U.random(['约拍','合作','返图'])];
    var title = titles[Math.floor(Math.random() * titles.length)];
    var quality = 12; if (title.length >= 8) quality += 8;
    var creator = state.creator || {};
    var appeal = 0.75 + U.clamp((state.stats.魅力||50),0,100)/100;
    var styleM = (Game.creatorStyleGrowth&&Game.creatorStyleGrowth.multiplier) ? Game.creatorStyleGrowth.multiplier(state.profile,'coser') : 1;
    var reach = 320 + (creator.followers||0)*(0.35+Math.random()*0.5) + (state.stats.魅力||50)*28 + quality*60;
    var views = Math.max(100, Math.round(reach*(0.72+Math.random()*0.65)));
    var gained = Math.max(5, Math.round(Math.sqrt(views)*(0.6+quality/60)*appeal*styleM));
    var income = Game.creatorEconomy ? Game.creatorEconomy.contentIncome(views,creator.followers,creator.brandTrust) : 0;
    creator.followers = (creator.followers||0) + gained;
    creator.totalViews = (creator.totalViews||0) + views;
    creator.brandTrust = U.clamp((creator.brandTrust||0)+(quality>=16?3:1),0,100);
    c.lastPublishMonth = state.totalMonths;
    state.money += income;
    state.career.performance = U.clamp((state.career.performance||0)+7,0,100);
    state.career.exp = (state.career.exp||0) + 6;
    return { ok: true, message: '发布"' + title + '":' + compact(views) + '播放,+' + compact(gained) + '粉,收入' + Game.view.money(income) };
  }

  function communityCoser(state) {
    var c = ensure(state);
    var creator = state.creator || {};
    if (creator.lastCommunityMonth === state.totalMonths) return { ok: false, message: '本月已完成社群活动' };
    creator.lastCommunityMonth = state.totalMonths;
    var appeal = 0.75 + U.clamp((state.stats.魅力||50),0,100)/100;
    var styleM = (Game.creatorStyleGrowth&&Game.creatorStyleGrowth.multiplier) ? Game.creatorStyleGrowth.multiplier(state.profile,'coser') : 1;
    var gain = Math.max(10, Math.round(((creator.followers||0)*0.015+20)*appeal*styleM));
    creator.followers = (creator.followers||0) + gain;
    creator.brandTrust = U.clamp((creator.brandTrust||0)+6,0,100);
    state.stats.心情 = U.clamp((state.stats.心情||0)+3,0,100);
    return { ok: true, message: '社群互动新增' + compact(gain) + '粉丝' };
  }

  function sponsorCoser(state) {
    var creator = state.creator || {};
    if ((creator.followers||0) < 1000) return { ok: false, message: '粉丝达1k才能承接合作' };
    if (state.totalMonths - (creator.lastSponsorMonth||-6) < 3) return { ok: false, message: '品牌合作需间隔3个月' };
    creator.lastSponsorMonth = state.totalMonths;
    var income = Game.creatorEconomy ? Game.creatorEconomy.sponsorIncome(creator.followers, creator.brandTrust) : 800;
    state.money += income;
    creator.brandTrust = U.clamp((creator.brandTrust||0)+4,0,100);
    state.career.performance = U.clamp((state.career.performance||0)+8,0,100);
    return { ok: true, message: '品牌合作收入' + Game.view.money(income) };
  }

  function recordContest(state, contestResult) {
    var c = ensure(state);
    c.contestHistory.unshift({
      month: state.totalMonths,
      event: contestResult.event || '',
      placed: contestResult.placed || 0,
      round: contestResult.round || 0,
      opponent: contestResult.opponent || '',
      won: contestResult.won || false,
    });
    c.contestHistory = c.contestHistory.slice(-20);
  }

  function coserMonthly(state) {
    var c = ensure(state);
    if (!isCoser(state)) return;
    var creator = state.creator || {};
    var views = Math.round((creator.followers||0)*(0.3+Math.random()*0.25));
    var income = Game.creatorEconomy ? Game.creatorEconomy.passiveIncome(views,creator.followers,creator.brandTrust) : 0;
    creator.totalViews = (creator.totalViews||0) + views;
    state.money += income;
    creator.scandalRisk = U.clamp((creator.scandalRisk||0)-2,0,100);
    if (Math.random() < (creator.scandalRisk||0)/1200) {
      var lost = Math.min(creator.followers||0, Math.round((creator.followers||0)*0.18));
      creator.followers -= lost;
      creator.brandTrust = U.clamp((creator.brandTrust||0)-15,0,100);
      creator.scandalRisk = U.clamp((creator.scandalRisk||0)-25,0,100);
    }
    var base = 8500;
    try { var j = Game.config.jobs.find(function(jj){return jj.id==='coser';}); if (j) base = j.salary||8500; } catch(e) {}
    state.career.salary = Game.creatorEconomy ? Game.creatorEconomy.monthlySalary(base,creator.followers,creator.brandTrust) : base;
  }

  function renderWardrobe(state) {
    var c = ensure(state);
    var folded = c._fold !== 'wardrobe';
    var profile = Game.hunterMode ? Game.hunterMode.identity(state).profile : state.profile;
    var currentCos = (profile.cosplay || '无');
    var html = '<details class="coser-fold"' + (folded ? '' : ' open') + ' data-coser-fold="wardrobe"><summary><strong>Cos衣柜</strong><span>' + c.cosplayInventory.length + '套 · 当前' + currentCos + '</span></summary>';
    if (!c.cosplayInventory.length) {
      html += '<p class="empty-state">还没有cos服。购买或通过漫展获取。</p>';
    } else {
      html += '<div class="coser-wardrobe-grid">';
      c.cosplayInventory.forEach(function(item) {
        var active = profile.cosplay === item.name;
        var worn = item.wear > 70 ? ' worn' : '';
        var rare = item.rarity === 'rare' ? ' 🔮' : '';
        html += '<div class="wardrobe-item' + (active ? ' active' : '') + worn + '">';
        html += '<div><strong>' + item.name + rare + '</strong><small>' + (item.series||'') + ' · ' + (item.character||'') + '</small>';
        html += '<span>磨损' + (item.wear||0) + '%</span></div>';
        html += '<div class="wardrobe-actions">';
        if (!active) html += '<button data-coser-wear="' + item.name + '">穿</button>';
        if ((item.wear||0) > 0) html += '<button data-coser-repair="' + item.name + '">修</button>';
        html += '</div></div>';
      });
      html += '</div>';
    }
    html += '<div class="wardrobe-buy"><button data-coser-buy-menu>选购Cos服</button></div></details>';
    return html;
  }

  function renderContestHistory(state) {
    var c = ensure(state);
    var folded = c._fold !== 'contests';
    var html = '<details class="coser-fold"' + (folded ? '' : ' open') + ' data-coser-fold="contests"><summary><strong>比赛战绩</strong><span>' + c.contestHistory.length + '场</span></summary>';
    if (!c.contestHistory.length) {
      html += '<p class="empty-state">暂无比赛记录。参加漫展Cosplay大赛来积累战绩。</p>';
    } else {
      html += '<div class="contest-list">';
      c.contestHistory.forEach(function(ct) {
        var label = ct.placed === 1 ? '🏆冠军' : ct.placed === 2 ? '🥈亚军' : ct.placed <= 4 ? '四强' : '参赛';
        var cls = ct.won ? 'win' : '';
        html += '<div class="contest-row ' + cls + '"><span>' + label + '</span><strong>' + (ct.event||'漫展比赛') + '</strong><small>' + (ct.opponent ? 'vs ' + ct.opponent : '') + '</small></div>';
      });
      html += '</div>';
    }
    html += '</details>';
    return html;
  }

  function render(state) {
    var c = ensure(state);
    if (!isCoser(state)) return '';
    var creator = state.creator || {};
    var rankHtml = Game.specialCareerRanks ? Game.specialCareerRanks.render(state) : '';

    return '<div class="coser-panel">'
      + rankHtml
      + '<div class="coser-stats"><div><span>粉丝</span><strong>' + compact(creator.followers||0) + '</strong></div>'
      + '<div><span>播放</span><strong>' + compact(creator.totalViews||0) + '</strong></div>'
      + '<div><span>品牌信任</span><strong>' + Math.round(creator.brandTrust||45) + '</strong></div>'
      + '<div><span>风格加成</span><strong>×' + ((Game.creatorStyleGrowth&&Game.creatorStyleGrowth.multiplier)?Game.creatorStyleGrowth.multiplier(state.profile,'coser').toFixed(2):'1.00') + '</strong></div></div>'
      + '<div class="coser-actions"><button data-coser-publish>发布返图</button><button data-coser-community>社群活动</button><button data-coser-sponsor>品牌合作</button></div>'
      + renderWardrobe(state)
      + renderContestHistory(state)
      + '</div>';
  }

  function handleClick(event) {
    var btn = event.target.closest('[data-coser-publish],[data-coser-community],[data-coser-sponsor],[data-coser-wear],[data-coser-repair],[data-coser-buy],[data-coser-buy-menu],[data-coser-buy-filter],[data-coser-fold]');
    if (!btn) return false;
    var state = Game._getState ? Game._getState() : null;
    if (!state) return false;
    var r;
    if (btn.dataset.coserPublish !== undefined) r = publishCoser(state);
    else if (btn.dataset.coserCommunity !== undefined) r = communityCoser(state);
    else if (btn.dataset.coserSponsor !== undefined) r = sponsorCoser(state);
    else if (btn.dataset.coserWear !== undefined) r = wearCosplay(state, btn.dataset.coserWear);
    else if (btn.dataset.coserRepair !== undefined) r = repairCosplay(state, btn.dataset.coserRepair);
    else if (btn.dataset.coserBuy !== undefined) {
      r = buyCosplay(state, btn.dataset.coserBuy);
      Game._refresh(); Game._save();
      Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      if (r.ok) openBuyMenu(state, (state.coser||{})._buyFilter || '全部');
      return true;
    }
    else if (btn.dataset.coserBuyMenu !== undefined) { openBuyMenu(state, '全部'); return true; }
    else if (btn.dataset.coserBuyFilter !== undefined) { openBuyMenu(state, btn.dataset.coserBuyFilter); return true; }
    else if (btn.dataset.coserFold !== undefined) { toggleFold(state, btn.dataset.coserFold); Game._refresh(); return true; }
    else return false;
    Game._refresh(); Game._save();
    Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
    return true;
  }

  Game.coserCareer = Object.freeze({
    ensure, isCoser, publishCoser, communityCoser, sponsorCoser,
    addCosplayToInventory, wearCosplay, repairCosplay, buyCosplay,
    recordContest, coserMonthly, render, handleClick,
  });
}(window));
