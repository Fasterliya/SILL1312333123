(function initWelfareCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  var SUBSCRIPTION_TIERS = Object.freeze([
    { id: 0, name: '免费频道', rate: 0, cost: 0, conversion: 0, hint: '公开发布，靠广告和赞助盈利' },
    { id: 1, name: '标准会员', rate: 0.08, cost: 30, conversion: 0.03, hint: '每月30元，解锁会员专属内容' },
    { id: 2, name: '高级VIP', rate: 0.15, cost: 80, conversion: 0.06, hint: '每月80元，全部内容+优先互动' },
  ]);

  var CONTENT_TIERS = Object.freeze([
    { id: 0, name: '公开内容', incomeMult: 0.4, fanGrowth: 1.0, riskBonus: 0, label: '写真/日常' },
    { id: 1, name: '会员限定', incomeMult: 1.0, fanGrowth: 0.5, riskBonus: 3, label: '福利/限定' },
    { id: 2, name: '私人订制', incomeMult: 2.2, fanGrowth: 0.15, riskBonus: 8, label: '专属/互动' },
  ]);

  var OUTFIT_SETS = Object.freeze([
    { id: 'sailor', name: '水手服', top: '水手服迷你裙', socks: '白色过膝袜', hair: '双马尾', shoes: '玛丽珍鞋', style: 'cute', mult: 1.25 },
    { id: 'jk', name: 'JK制服', top: '西式制服百褶裙', socks: '白色中筒袜', hair: '姬发式', shoes: '便士乐福鞋', style: 'fashion', mult: 1.15 },
    { id: 'sexy', name: '性感风', top: '紧身吊带连衣裙', socks: '黑色蕾丝中筒袜', hair: '波浪长卷发', shoes: '尖头细跟高跟鞋', style: 'sexy', mult: 1.35 },
    { id: 'casual', name: '日常装', top: '针织开衫连衣裙', socks: '白色中筒袜', hair: '齐肩直发', shoes: '白色运动鞋', style: 'cute', mult: 1.10 },
  ]);

  var PATRON_TIERS = Object.freeze([
    { min: 0, max: 5000, label: '本地商人', wealthMin: 500000, wealthMax: 2000000, cities: 'local' },
    { min: 5000, max: 20000, label: '区域富豪', wealthMin: 2000000, wealthMax: 10000000, cities: 'country' },
    { min: 20000, max: 99999999, label: '全国巨贾', wealthMin: 10000000, wealthMax: 50000000, cities: 'global' },
  ]);

  var FAN_TYPES = ['core', 'casual', 'anti', 'stalker'];

  function ensure(state) {
    state.welfare = state.welfare && typeof state.welfare === 'object' ? state.welfare : {};
    var w = state.welfare;
    w.subscriptionTier = U.clamp(Number(w.subscriptionTier) || 0, 0, 2);
    w.subscriberCount = Math.max(0, Math.round(Number(w.subscriberCount) || 0));
    w.lastTierChange = Number.isFinite(w.lastTierChange) ? w.lastTierChange : -3;
    w.regularClients = Array.isArray(w.regularClients) ? w.regularClients.slice(-12) : [];
    w.contentTier = U.clamp(Number(w.contentTier) || 0, 0, 2);
    w.lastContentMonth = Number.isFinite(w.lastContentMonth) ? w.lastContentMonth : -1;
    w.platformStrikes = U.clamp(Number(w.platformStrikes) || 0, 0, 3);
    w.platformBanned = Boolean(w.platformBanned);
    w.banMonths = Math.max(0, Number(w.banMonths) || 0);
    w.fanTiers = w.fanTiers && typeof w.fanTiers === 'object' ? w.fanTiers : {};
    FAN_TYPES.forEach(function (t) { w.fanTiers[t] = Math.max(0, Math.round(Number(w.fanTiers[t]) || 0)); });
    w.keptBy = w.keptBy || null;
    w.lastServiceMonth = Number.isFinite(w.lastServiceMonth) ? w.lastServiceMonth : -1;
    w.activeOutfit = w.activeOutfit || '';
    w.lastPatronDiscovery = Number.isFinite(w.lastPatronDiscovery) ? w.lastPatronDiscovery : -3;
    if (Game.creatorCareer) {
      state.creator = state.creator && typeof state.creator === 'object' ? state.creator : {};
      var c = state.creator;
      c.channelId = c.channelId || 'welfare';
      c.followers = Math.max(0, Math.round(Number(c.followers) || 0));
      c.totalViews = Math.max(0, Math.round(Number(c.totalViews) || 0));
      c.brandTrust = U.clamp(Number(c.brandTrust) || 45, 0, 100);
      c.scandalRisk = U.clamp(Number(c.scandalRisk) || 0, 0, 100);
    }
    return w;
  }

  function isWelfare(state) {
    return state.career.jobId === 'welfare';
  }

  function subInfo(state) {
    return SUBSCRIPTION_TIERS[ensure(state).subscriptionTier];
  }

  function setSubscriptionTier(state, tier) {
    var w = ensure(state);
    if (!isWelfare(state)) return { ok: false, message: '只有福利姬可以设置订阅档位' };
    if (tier === w.subscriptionTier) return { ok: false, message: '已经是当前档位' };
    if (state.totalMonths - w.lastTierChange < 3) return { ok: false, message: '切换订阅档位需要间隔3个月' };
    w.subscriptionTier = U.clamp(tier, 0, 2);
    w.lastTierChange = state.totalMonths;
    w.subscriberCount = 0;
    Game.lifeDirector.addLog(state, '调整订阅',
      '切换到了"' + SUBSCRIPTION_TIERS[tier].name + '"档位。现有订阅者已重置。', 'normal');
    return { ok: true, message: '已切换至' + SUBSCRIPTION_TIERS[tier].name };
  }

  function setContentTier(state, tier) {
    var w = ensure(state);
    if (!isWelfare(state)) return { ok: false, message: '只有福利姬可以设置内容级别' };
    w.contentTier = U.clamp(tier, 0, 2);
    return { ok: true, message: '当前内容级别：' + CONTENT_TIERS[tier].name };
  }

  /* ---- quick outfit ---- */
  function applyOutfit(state, setId) {
    var w = ensure(state);
    if (!isWelfare(state)) return { ok: false, message: '当前职业不支持换装' };
    var set = OUTFIT_SETS.find(function (s) { return s.id === setId; });
    if (!set) return { ok: false, message: '套装不存在' };
    var profile = Game.hunterMode ? Game.hunterMode.identity(state).profile : state.profile;
    profile.clothing = profile.clothing || {};
    profile.clothing.top = set.top;
    profile.clothing.socks = set.socks;
    profile.clothing.shoes = set.shoes;
    profile.hairstyle = set.hair;
    w.activeOutfit = setId;
    Game.lifeDirector.addLog(state, '快速换装',
      '换上了' + set.name + '套装。' + set.style + '增粉倍率×' + set.mult.toFixed(2) + '。', 'normal');
    return { ok: true, message: '换上' + set.name + ' · ' + set.style + '增粉×' + set.mult.toFixed(2) };
  }

  function currentOutfitBonus(state) {
    var w = ensure(state);
    if (!w.activeOutfit) return null;
    return OUTFIT_SETS.find(function (s) { return s.id === w.activeOutfit; }) || null;
  }

  /* ---- patron discovery ---- */
  function patronTier(state) {
    var creator = state.creator || {};
    var followers = creator.followers || 0;
    for (var i = PATRON_TIERS.length - 1; i >= 0; i -= 1) {
      if (followers >= PATRON_TIERS[i].min) return PATRON_TIERS[i];
    }
    return PATRON_TIERS[0];
  }

  function discoverPatron(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return;
    if (w.regularClients.length >= 12) return;
    var creator = state.creator || {};
    var growth = Math.max(0, (creator.followers || 0) - (w._lastDiscoveryFollowers || 0));
    w._lastDiscoveryFollowers = creator.followers || 0;
    var chance = growth * 0.0003 + ((w.subscriberCount || 0) / 10000) * 0.02;
    if (Math.random() >= chance) return;
    if (state.totalMonths - w.lastPatronDiscovery < 2) return;
    w.lastPatronDiscovery = state.totalMonths;
    var tier = patronTier(state);
    var wealth = U.between(tier.wealthMin, tier.wealthMax);
    var cityPool = tier.cities === 'global'
      ? Game.config.cities : tier.cities === 'country'
      ? Game.config.cities.filter(function (c) { return c.country === state.location.country; })
      : [state.location.city];
    var city = cityPool[U.between(0, cityPool.length - 1)] || state.location.city;
    var id = 'patron_' + state.totalMonths + '_' + U.between(0, 999);
    var client = { id: id, count: 0, firstMonth: state.totalMonths, lastMonth: state.totalMonths,
      affection: U.between(40, 60), monthlyAllowance: Math.round(wealth * 0.0015),
      possessive: U.between(5, 25), wealth: wealth, city: city, tier: tier.label, isPatron: true };
    w.regularClients.push(client);
    w.regularClients = w.regularClients.slice(-12);
    Game.lifeDirector.addLog(state, '金主关注',
      '一位来自' + city + '的' + tier.label + '关注了你的频道，私信表达了合作意愿。资产约'
      + Game.view.money(wealth) + '。', 'good');
  }

  /* ---- kept system ---- */
  function proposeKept(state, clientId) {
    var w = ensure(state);
    if (!isWelfare(state)) return { ok: false, message: '只有福利姬可以接受包养' };
    if (w.keptBy) return { ok: false, message: '已被' + (w.keptBy.name || '金主') + '包养中' };
    var client = w.regularClients.find(function (c) { return c.id === clientId; });
    if (!client) return { ok: false, message: '金主不存在' };
    if ((client.affection || 0) < 70) return { ok: false, message: '金主好感不足70' };
    if ((client.wealth || 0) < 2000000) return { ok: false, message: '金主资产需达到200万' };
    if (w.subscriptionTier < 1) return { ok: false, message: '需要标准会员以上档位' };
    state.pendingDecision = { type: 'kept_proposal', clientId: clientId };
    state.timeSpeed = 0;
    return { ok: true, message: '金主提出包养邀约' };
  }

  function resolveKept(state, accepted) {
    var d = state.pendingDecision;
    if (!d || d.type !== 'kept_proposal') return { ok: false, message: '没有待处理的包养邀约' };
    var w = ensure(state);
    var client = w.regularClients.find(function (c) { return c.id === d.clientId; });
    state.pendingDecision = null;
    if (!client) return { ok: false, message: '金主已不存在' };
    if (accepted) {
      var monthly = Math.round((client.wealth || 2000000) * 0.002);
      w.keptBy = { clientId: client.id, name: client.name || client.id,
        monthly: monthly, since: state.totalMonths, possessive: client.possessive || 10,
        city: client.city || state.location.city };
      client.monthlyAllowance = monthly;
      client.affection = U.clamp((client.affection || 70) + 5, 0, 100);
      Game.lifeDirector.addLog(state, '包养关系',
        '你接受了' + (client.name || '金主') + '的包养邀约。月供' + Game.view.money(monthly)
        + '，但不能再接受其他私人约会。', 'milestone');
      Game.stressSystem.reduce(state, 10, '经济保障');
      return { ok: true, message: '包养关系建立，月供' + Game.view.money(monthly) };
    }
    client.affection = U.clamp((client.affection || 70) - 15, 0, 100);
    Game.lifeDirector.addLog(state, '拒绝包养',
      '你婉拒了对方的包养邀约。金主显得有些失望。', 'normal');
    return { ok: true, message: '拒绝了包养邀约' };
  }

  function keptMonthly(state) {
    var w = ensure(state);
    if (!w.keptBy) return;
    var monthsSinceService = state.totalMonths - (w.lastServiceMonth >= 0 ? w.lastServiceMonth : w.keptBy.since);
    if (monthsSinceService > 30) {
      var client = w.regularClients.find(function (c) { return c.id === w.keptBy.clientId; });
      if (client) client.affection = U.clamp((client.affection || 70) - 15, 0, 100);
      Game.lifeDirector.addLog(state, '包养危机',
        '太久没有服务金主了。对方发来不满的消息，暗示可能终止关系。', 'warning');
    }
    w.keptBy.possessive = U.clamp((w.keptBy.possessive || 10) + U.between(1, 3), 0, 100);
    if (w.keptBy.possessive > 70 && Math.random() < 0.05) {
      Game.lifeDirector.addLog(state, '金主控制',
        '金主开始限制你的社交生活，要求查看你的手机消息。压力+10。', 'warning');
      Game.stressSystem.add(state, 10, '金主控制');
    }
    if (w.keptBy.possessive > 90) {
      w.keptBy = null;
      Game.lifeDirector.addLog(state, '包养破裂',
        '控制欲压垮了这段关系。金主单方面终止了包养协议，但你获得了自由。', 'milestone');
      state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) - 10, 0, 100);
      var creator = state.creator || {};
      creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + 20, 0, 100);
    }
  }

  function updateSubscribers(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return;
    var info = SUBSCRIPTION_TIERS[w.subscriptionTier];
    if (!info.conversion) return;
    var creator = state.creator || {};
    var potential = Math.round(creator.followers * info.conversion);
    var churn = Math.round(w.subscriberCount * 0.06);
    w.subscriberCount = Math.max(0, Math.min(creator.followers, w.subscriberCount + potential - churn));
    state.money += w.subscriberCount * info.cost;
  }

  function autoTitle(state) {
    var w = ensure(state);
    var tier = CONTENT_TIERS[w.contentTier];
    var templates = {
      0: ['今日份的日常分享~', '最近爱用的好物推荐', '宅家随手拍了几张', '新到了一批可爱小物', '今天的阳光真好'],
      1: ['会员限定福利来啦', '你们想看的都在这了', '深夜悄悄发一组', '只给懂得欣赏的人', '限时解锁中...'],
      2: ['专属定制·只为你', '私人订制·不可外传', '一对一私密内容', 'VIP专享·请勿传播', '你的专属时刻'],
    };
    var pool = templates[w.contentTier] || templates[0];
    return pool[U.between(0, pool.length - 1)];
  }

  function publishAuto(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return { ok: false, message: '只有福利姬可以发布内容' };
    if (w.lastContentMonth === state.totalMonths) return { ok: false, message: '本月已发布过内容' };
    var title = autoTitle(state);
    var titleQuality = 0;
    var topics = ['写真', '福利', '限定', '日常', '互动', '妆容', '穿搭', '教程', '护肤', '测评'];
    for (var i = 0; i < topics.length; i += 1) {
      if (title.indexOf(topics[i]) >= 0) { titleQuality = 18; break; }
    }
    if (title.length >= 8 && title.length <= 24) titleQuality += 12;
    if (/[？！!?]/.test(title)) titleQuality += 4;
    var creator = state.creator || {};
    var appeal = 0.75 + U.clamp(state.stats.魅力 || 0, 0, 100) / 100;
    var styleMultiplier = Game.creatorStyleGrowth?.multiplier(state.profile, 'welfare') || 1;
    var reach = 320 + creator.followers * (0.35 + Math.random() * 0.5)
      + state.stats.魅力 * 28 + Game.learningAttribute?.checkValue(state.stats.智力) * 8 + titleQuality * 70;
    var views = Math.max(100, Math.round(reach * (0.72 + Math.random() * 0.65)));
    var gained = Math.max(5, Math.round(Math.sqrt(views) * (0.6 + titleQuality / 60) * appeal * styleMultiplier));
    var income = Game.creatorEconomy?.contentIncome(views, creator.followers, creator.brandTrust) || 0;
    creator.followers += gained;
    creator.totalViews += views;
    creator.lastPublishMonth = state.totalMonths;
    creator.brandTrust = U.clamp((creator.brandTrust || 0) + (titleQuality >= 20 ? 3 : 1), 0, 100);
    state.money += income;
    state.career.performance = U.clamp((state.career.performance || 0) + 7, 0, 100);
    state.career.exp = (state.career.exp || 0) + 6;
    w.lastContentMonth = state.totalMonths;
    var tier = CONTENT_TIERS[w.contentTier];
    if (w.contentTier >= 1) {
      var premiumIncome = Math.round(w.subscriberCount * tier.incomeMult * 4 * (0.8 + Math.random() * 0.4));
      state.money += premiumIncome;
      creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + tier.riskBonus, 0, 100);
      return { ok: true, message: '发布"' + title + '"：' + Game.creatorEconomy?.compact(views) + '播放，+' + Game.creatorEconomy?.compact(gained) + '粉，广告收入' + Game.view.money(income) + ' · ' + tier.name + '收入' + Game.view.money(premiumIncome) };
    }
    return { ok: true, message: '发布"' + title + '"：' + Game.creatorEconomy?.compact(views) + '播放，+' + Game.creatorEconomy?.compact(gained) + '粉，收入' + Game.view.money(income) };
  }

  function addRegularClient(state, sponsorId) {
    var w = ensure(state);
    var existing = w.regularClients.find(function (c) { return c.id === sponsorId; });
    if (existing) {
      existing.count += 1;
      existing.lastMonth = state.totalMonths;
      existing.affection = U.clamp((existing.affection || 40) + U.between(3, 8), 0, 100);
      w.lastServiceMonth = state.totalMonths;
      w._hookup = null;
      return existing;
    }
    var client = { id: sponsorId, count: 1, firstMonth: state.totalMonths, lastMonth: state.totalMonths,
      affection: U.between(35, 55), monthlyAllowance: U.between(800, 3000),
      possessive: U.between(0, 20), isPatron: false };
    w.regularClients.push(client);
    w.regularClients = w.regularClients.slice(-12);
    w.lastServiceMonth = state.totalMonths;
    w._hookup = null;
    return client;
  }

  /* ---- inline hookup (不经过旅途街区) ---- */
  function startInlineHookup(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return { ok: false, message: '只有福利姬可以发起金主约会' };
    if (w.keptBy) return { ok: false, message: '已被包养，不能再接其他约会' };
    var creator = state.creator || {};
    if ((creator.followers || 0) < 1000) return { ok: false, message: '粉丝达到1k后才能收到金主邀约' };
    if (state.totalMonths - (creator.lastPrivateMonth || -6) < 6) return { ok: false, message: '金主约会至少间隔6个月' };
    creator.lastPrivateMonth = state.totalMonths;
    creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + 8, 0, 100);
    creator.brandTrust = U.clamp((creator.brandTrust || 0) - 2, 0, 100);

    var sponsor = Game.creatorCareer?.generateSponsor(state);
    if (!sponsor) return { ok: false, message: '暂时没有合适的金主' };
    w._hookup = { stage: 0, sponsorId: sponsor.id, sponsorName: sponsor.name,
      sponsorWealth: sponsor.wealth || 500000, style: '' };
    state.stats.心情 = U.clamp((state.stats.心情 || 0) + 4, 0, 100);
    return { ok: true, message: sponsor.name + '发来私密邀约' };
  }

  function chooseInlineHookup(state, choiceId) {
    var w = ensure(state);
    var h = w._hookup;
    if (!h) return { ok: false, message: '没有进行中的约会' };
    if (h.stage === 0) {
      if (choiceId === 'decline') { w._hookup = null; return { ok: true, message: '婉拒了邀约' }; }
      h.stage = 1;
      return { ok: true, message: '准备赴约...' };
    }
    if (h.stage === 1) {
      h.style = choiceId;
      h.stage = 2;
      if (choiceId === 'school') {
        var profile = Game.hunterMode?.identity(state)?.profile || state.profile;
        profile.clothing = profile.clothing || {};
        profile.clothing.top = '水手服迷你裙';
        profile.clothing.socks = '白色过膝袜';
        profile.hairstyle = '双马尾';
        profile.clothing.shoes = '玛丽珍鞋';
      }
      var partner = Game.people?.find(state, h.sponsorId);
      if (!partner) {
        partner = U.person('金主', '', U.between(28, 55), '男', state.totalMonths);
        partner.id = h.sponsorId;
        partner.name = h.sponsorName;
        partner.wealth = h.sponsorWealth;
        state.worldPeople.push(partner);
      }
      w._hookup = null;
      Game.encounterSystem?.init(state, partner, 'hookup', 'provider');
      Game._refresh?.();
      Game.encounterSystem?.showOverlay(state);
      return { ok: true, message: '赴约开始...' };
    }
    return { ok: false, message: '无效选择' };
  }

  function renderInlineHookup(state) {
    var w = ensure(state);
    var h = w._hookup;
    if (!h) return '';
    if (h.stage === 0) {
      return '<div class="welfare-hookup"><div class="panel-title"><h3>金主邀约</h3></div>'
        + '<p>' + h.sponsorName + '发来私密邀约，资产约' + Game.view.money(h.sponsorWealth)
        + '。今晚共度良宵。</p>'
        + '<div class="welfare-hookup-actions">'
        + '<button data-welfare-hookup="accept">接受邀约</button>'
        + '<button data-welfare-hookup="decline">婉拒</button></div></div>';
    }
    if (h.stage === 1) {
      return '<div class="welfare-hookup"><div class="panel-title"><h3>赴约准备</h3></div>'
        + '<p>你想穿什么风格赴约？</p>'
        + '<div class="welfare-hookup-actions">'
        + '<button data-welfare-hookup="school">学院风 · 水手服</button>'
        + '<button data-welfare-hookup="sexy">性感风 · 连衣裙</button>'
        + '<button data-welfare-hookup="casual">日常便服</button></div></div>';
    }
    return '';
  }

  function regularClientMonthly(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return 0;
    var totalIncome = 0;
    var active = w.regularClients.filter(function (c) {
      return state.totalMonths - c.lastMonth <= 3;
    });
    active.forEach(function (c) {
      totalIncome += c.monthlyAllowance || 0;
      c.affection = U.clamp((c.affection || 40) - U.between(1, 4), 0, 100);
      if (c.affection <= 15) c.inactive = true;
      if (c.possessive > 40 && Math.random() < 0.06) {
        Game.lifeDirector.addLog(state, '金主骚扰', '一位常客频繁私信要求见面。压力+5。', 'normal');
        Game.stressSystem.add(state, 5, '金主骚扰');
        c.possessive += U.between(2, 8);
      }
      var creator = state.creator || {};
      if (c.possessive > 70 && Math.random() < 0.04) {
        creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + 12, 0, 100);
        Game.lifeDirector.addLog(state, '金主威胁', '被冷落的常客威胁公开私密记录。品牌信任-18。', 'warning');
        creator.brandTrust = U.clamp((creator.brandTrust || 0) - 18, 0, 100);
        c.possessive = U.clamp(c.possessive - 40, 0, 100);
      }
    });
    if (totalIncome > 0) state.money += totalIncome;
    w.regularClients = w.regularClients.filter(function (c) {
      return !c.inactive && state.totalMonths - c.lastMonth <= 6;
    });
    return totalIncome;
  }

  function updateFanTiers(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return;
    var creator = state.creator || {};
    var total = creator.followers || 0;
    if (!total) return;
    w.fanTiers.core = Math.round(total * U.clamp(0.03 + w.subscriptionTier * 0.04, 0.03, 0.11));
    w.fanTiers.casual = Math.max(0, total - w.fanTiers.core);
    w.fanTiers.anti = Math.round(total * (0.02 + (creator.scandalRisk || 0) / 2000));
    w.fanTiers.stalker = Math.round(total * (w.subscriptionTier >= 2 ? 0.008 : 0.003)
      * (state.stats.魅力 > 70 ? 1.5 : 1));
    if (w.fanTiers.stalker > 0 && Math.random() < (w.subscriptionTier >= 2 ? 0.04 : 0.015)) {
      Game.lifeDirector.addLog(state, '痴汉粉', '有人频繁在你住所附近徘徊。压力+8。', 'warning');
      Game.stressSystem.add(state, 8, '痴汉粉骚扰');
      creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + 5, 0, 100);
    }
  }

  function checkPlatformRisk(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return;
    if (w.platformBanned) {
      w.banMonths -= 1;
      if (w.banMonths <= 0) {
        w.platformBanned = false; w.platformStrikes = 0; w.subscriberCount = 0;
        var creator = state.creator || {};
        creator.followers = Math.round(creator.followers * 0.35);
        Game.lifeDirector.addLog(state, '账号解封', '封禁结束，重新注册了新账号。损失了大量粉丝。', 'milestone');
      }
      return;
    }
    var risk = 0;
    if (w.subscriptionTier >= 2) risk += 0.03;
    if (w.contentTier >= 2) risk += 0.04;
    if ((state.creator?.scandalRisk || 0) > 60) risk += 0.02;
    risk += w.platformStrikes * 0.015;
    if (w.keptBy) risk *= 0.5;
    if (Math.random() < risk) {
      w.platformStrikes += 1;
      Game.lifeDirector.addLog(state, '平台警告', '违规通知（第' + w.platformStrikes + '次）。', 'warning');
      if (w.platformStrikes >= 3) {
        w.platformBanned = true; w.banMonths = U.between(3, 12); w.platformStrikes = 0;
        Game.lifeDirector.addLog(state, '账号封禁', '频道被关闭。等待' + w.banMonths + '个月。', 'milestone');
        Game.stressSystem.add(state, 20, '平台封号');
      }
    }
  }

  function welfareMonthly(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return;
    discoverPatron(state);
    updateSubscribers(state);
    regularClientMonthly(state);
    keptMonthly(state);
    updateFanTiers(state);
    checkPlatformRisk(state);
    if (!w.platformBanned && SUBSCRIPTION_TIERS[w.subscriptionTier].conversion > 0) {
      state.money += w.subscriberCount * SUBSCRIPTION_TIERS[w.subscriptionTier].cost;
    }
  }

  function compact(value) {
    if (value >= 10000) return (value / 10000).toFixed(1) + '万';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return String(Math.round(value));
  }

  function render(state) {
    var w = ensure(state);
    if (!isWelfare(state)) return '';
    var sub = SUBSCRIPTION_TIERS[w.subscriptionTier];
    var content = CONTENT_TIERS[w.contentTier];
    var clients = w.regularClients.filter(function (c) { return state.totalMonths - c.lastMonth <= 3; });
    var outfit = currentOutfitBonus(state);
    var keptHtml = '';
    if (w.keptBy) {
      keptHtml = '<div class="welfare-kept"><strong>包养中</strong>'
        + '<span>' + (w.keptBy.name || '金主') + ' · ' + Game.view.money(w.keptBy.monthly) + '/月'
        + ' · 控制欲' + (w.keptBy.possessive || 0) + '</span>'
        + '<small>上次服务: ' + (w.lastServiceMonth >= 0 ? (state.totalMonths - w.lastServiceMonth) + '天前' : '尚未服务') + '</small></div>';
    }
    var html = '<section class="welfare-panel">'
      + renderInlineHookup(state)
      + '<div class="panel-title"><h2>福利姬运营</h2>'
      + (w.platformBanned ? '<span style="color:#c23b32">封禁·剩余' + w.banMonths + '月</span>'
        : '<span>' + sub.name + ' · ' + w.subscriberCount + '人订阅</span>') + '</div>'
      + keptHtml
      + '<div class="welfare-tiers">'
      + SUBSCRIPTION_TIERS.map(function (t) {
        return '<div class="welfare-tier' + (w.subscriptionTier === t.id ? ' active' : '') + '"><strong>'
          + t.name + '</strong><small>' + t.hint + '</small></div>';
      }).join('') + '</div>'
      + '<div class="welfare-stats"><div><span>订阅收入</span><strong>'
      + Game.view.money(w.subscriberCount * sub.cost) + '/月</strong></div>'
      + '<div><span>常客月供</span><strong>'
      + Game.view.money(clients.reduce(function (s, c) { return s + (c.monthlyAllowance || 0); }, 0)) + '/月</strong></div>'
      + '<div><span>平台警告</span><strong>' + w.platformStrikes + '/3次</strong></div>'
      + '<div><span>内容级别</span><strong>' + content.name + '</strong></div></div>'
      + '<div class="welfare-outfits"><span>快速换装</span>'
      + '<div class="outfit-buttons">'
      + OUTFIT_SETS.map(function (s) {
        return '<button data-welfare-outfit="' + s.id + '"'
          + (w.activeOutfit === s.id ? ' class="active"' : '')
          + (w.platformBanned ? ' disabled' : '') + '><strong>' + s.name + '</strong>'
          + '<small>' + s.style + '增粉×' + s.mult.toFixed(2) + '</small></button>';
      }).join('') + '</div>'
      + (outfit ? '<small class="outfit-current">当前: ' + outfit.name + ' · ' + outfit.style + '×' + outfit.mult.toFixed(2) + '</small>' : '')
      + '</div>'
      + (clients.length ? '<div class="welfare-clients"><h4>常客 (' + clients.length + '人)</h4>'
        + clients.map(function (c) {
          var tag = c.isPatron ? (c.tier || '') : '';
          var keBtn = !w.keptBy && c.isPatron && (c.affection || 0) >= 65
            ? ' <button data-welfare-kept="' + c.id + '" class="kept-btn">包养</button>' : '';
          return '<div class="welfare-client"><span>' + (c.id || '金主') + (tag ? ' [' + tag + ']' : '')
            + keBtn + '</span><small>好感' + c.affection + ' · '
            + Game.view.money(c.monthlyAllowance || 0) + '/月'
            + (c.possessive > 40 ? ' ⚠占有' + c.possessive : '') + '</small></div>';
        }).join('') + '</div>' : '')
      + '<div class="welfare-fans"><h4>粉丝构成</h4>'
      + '<div class="fan-breakdown"><span>核心粉 <b>' + compact(w.fanTiers.core || 0) + '</b></span>'
      + '<span>路人粉 <b>' + compact(w.fanTiers.casual || 0) + '</b></span>'
      + '<span>黑粉 <b style="color:#9a5961">' + compact(w.fanTiers.anti || 0) + '</b></span>'
      + '<span>痴汉粉 <b style="color:#c23b32">' + compact(w.fanTiers.stalker || 0) + '</b></span></div></div>'
      + '<div class="welfare-creator-actions">'
      + '<div class="welfare-action-btns">'
      + '<button data-welfare-publish>' + (w.lastContentMonth === state.totalMonths ? '本月已发布' : '发布' + content.label) + '</button>'
      + '<button data-welfare-community>经营社群</button>'
      + '<button data-welfare-sponsor>承接广告</button>'
      + (w.keptBy ? '<button data-welfare-private disabled>已被包养</button>'
        : '<button data-welfare-private>金主约会</button>')
      + '</div></div>'
      + '<div class="welfare-creator-metrics"><span>粉丝 <b>' + compact((state.creator || {}).followers || 0) + '</b></span>'
      + '<span>播放 <b>' + compact((state.creator || {}).totalViews || 0) + '</b></span>'
      + '<span>品牌信任 <b>' + Math.round((state.creator || {}).brandTrust || 45) + '</b></span>'
      + '<span>丑闻风险 <b style="color:' + (((state.creator || {}).scandalRisk || 0) > 50 ? '#c23b32' : '#8a6a73') + '">' + Math.round((state.creator || {}).scandalRisk || 0) + '</b></span></div>'
      + '<div class="system-actions">'
      + SUBSCRIPTION_TIERS.map(function (t) {
        return '<button data-welfare-tier="' + t.id + '"'
          + (t.id === w.subscriptionTier || w.platformBanned ? ' disabled' : '') + '>' + t.name + '</button>';
      }).join('') + '</div>'
      + '<div class="system-actions" style="margin-top:4px">'
      + CONTENT_TIERS.map(function (t) {
        return '<button data-welfare-content="' + t.id + '"'
          + (t.id === w.contentTier || w.platformBanned ? ' disabled' : '') + '>' + t.label + '</button>';
      }).join('') + '</div></section>';
    return html;
  }

  function handleClick(event) {
    var btn = event.target.closest('[data-welfare-tier], [data-welfare-content], [data-welfare-outfit], [data-welfare-kept], [data-welfare-publish], [data-welfare-community], [data-welfare-sponsor], [data-welfare-private], [data-welfare-hookup]');
    if (!btn) return false;
    var state = Game._getState?.();
    if (!state) return false;
    if (btn.dataset.welfareTier !== undefined) {
      var r = setSubscriptionTier(state, Number(btn.dataset.welfareTier));
      Game._refresh?.(); Game._save?.();
      Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      return true;
    }
    if (btn.dataset.welfareContent !== undefined) {
      var r = setContentTier(state, Number(btn.dataset.welfareContent));
      Game._refresh?.();
      Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      return true;
    }
    if (btn.dataset.welfareOutfit !== undefined) {
      var r = applyOutfit(state, btn.dataset.welfareOutfit);
      Game._refresh?.(); Game._save?.();
      Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      return true;
    }
    if (btn.dataset.welfareKept !== undefined) {
      var r = proposeKept(state, btn.dataset.welfareKept);
      Game._refresh?.();
      if (r.ok) Game.view.showToast('包养邀约已发起', 'info');
      else Game.view.showToast(r.message, 'warning');
      return true;
    }
    if (btn.dataset.welfarePublish !== undefined) {
      var r = publishAuto(state);
      Game._refresh?.(); Game._save?.();
      Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      return true;
    }
    if (btn.dataset.welfareCommunity !== undefined) {
      var creator = state.creator || {};
      if ((creator.lastCommunityMonth || -1) === state.totalMonths) {
        Game.view.showToast('本月已完成过社群活动', 'warning'); return true;
      }
      creator.lastCommunityMonth = state.totalMonths;
      var appeal = 0.75 + U.clamp(state.stats.魅力 || 0, 0, 100) / 100;
      var styleM = Game.creatorStyleGrowth?.multiplier(state.profile, 'welfare') || 1;
      var gain = Math.max(10, Math.round(((creator.followers || 0) * 0.015 + 20) * appeal * styleM));
      creator.followers += gain;
      creator.brandTrust = U.clamp((creator.brandTrust || 0) + 6, 0, 100);
      state.stats.心情 = U.clamp((state.stats.心情 || 0) + 3, 0, 100);
      Game._refresh?.(); Game._save?.();
      Game.view.showToast('社群互动新增' + Game.creatorEconomy?.compact(gain) + '粉丝', 'good');
      return true;
    }
    if (btn.dataset.welfareSponsor !== undefined) {
      var creator = state.creator || {};
      if ((creator.followers || 0) < 1000) { Game.view.showToast('粉丝达1k后才能承接广告', 'warning'); return true; }
      if (state.totalMonths - (creator.lastSponsorMonth || -6) < 3) { Game.view.showToast('广告合作需要间隔3个月', 'warning'); return true; }
      creator.lastSponsorMonth = state.totalMonths;
      var income = Game.creatorEconomy?.sponsorIncome(creator.followers, creator.brandTrust) || 0;
      state.money += income;
      creator.brandTrust = U.clamp((creator.brandTrust || 0) + 4, 0, 100);
      state.career.performance = U.clamp((state.career.performance || 0) + 8, 0, 100);
      Game._refresh?.(); Game._save?.();
      Game.view.showToast('广告收入' + Game.view.money(income), 'good');
      return true;
    }
    if (btn.dataset.welfarePrivate !== undefined) {
      var r = startInlineHookup(state);
      Game._refresh?.(); Game._save?.();
      if (r?.ok) Game.view.showToast(r.message, 'good');
      else Game.view.showToast(r?.message || '无法开始', 'warning');
      return true;
    }
    if (btn.dataset.welfareHookup !== undefined) {
      var r = chooseInlineHookup(state, btn.dataset.welfareHookup);
      Game._refresh?.(); Game._save?.();
      Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      return true;
    }
    return false;
  }

  /* ---- kept decision integration ---- */
  function renderDecision(state) {
    var d = state.pendingDecision;
    if (!d || d.type !== 'kept_proposal') return null;
    var w = ensure(state);
    var client = w.regularClients.find(function (c) { return c.id === d.clientId; });
    if (!client) return null;
    var monthly = Math.round((client.wealth || 2000000) * 0.002);
    return {
      title: '包养邀约',
      text: (client.name || '一位金主') + '提出长期包养。月供' + Game.view.money(monthly)
        + '，但你需要保持专一。被发现与他人约会将导致严重后果。',
      options: [
        { value: 'accept', label: '接受包养 · 月供' + Game.view.money(monthly) + ' · 专一限制' },
        { value: 'decline', label: '婉拒 · 好感-15' },
      ],
    };
  }

  function resolve(state, choiceId) {
    return resolveKept(state, choiceId === 'accept');
  }

  Game.welfareCareer = Object.freeze({
    ensure, isWelfare, subInfo, setSubscriptionTier, setContentTier,
    publishAuto, addRegularClient, welfareMonthly, render, handleClick,
    applyOutfit, currentOutfitBonus, discoverPatron,
    proposeKept, resolveKept, renderDecision, resolve,
    startInlineHookup, chooseInlineHookup,
  });
}(window));
