(function initVtuberCareer(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content || { clamp: function(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}, between: function(a,b){return a+Math.floor(Math.random()*(b-a+1));}, random: function(arr){return arr[Math.floor(Math.random()*arr.length)];} };

  var STREAM_TYPES = Object.freeze([
    { id: 'chat', name: '杂谈', viewersBase: 60, followersRate: 0.06, incomeMult: 0.8, burnout: 5, mood: 3, tags: ['杂谈','聊天','日常'] },
    { id: 'sing', name: '歌回', viewersBase: 90, followersRate: 0.10, incomeMult: 1.2, burnout: 10, mood: 5, tags: ['歌回','翻唱','演唱'] },
    { id: 'game', name: '游戏', viewersBase: 80, followersRate: 0.08, incomeMult: 1.0, burnout: 7, mood: 4, tags: ['游戏','实况','初见'] },
    { id: 'collab', name: '联动', viewersBase: 120, followersRate: 0.14, incomeMult: 1.5, burnout: 8, mood: 6, tags: ['联动','合作','对谈'] },
  ]);

  var MEMBER_TIERS = Object.freeze([
    { id: 0, name: '未开通', cost: 0, conversion: 0, label: '', emoji: '' },
    { id: 1, name: '舰长', cost: 198, conversion: 0.02, label: '舰长', emoji: '🚢' },
    { id: 2, name: '提督', cost: 1998, conversion: 0.005, label: '提督', emoji: '⚓' },
    { id: 3, name: '总督', cost: 19998, conversion: 0.001, label: '总督', emoji: '👑' },
  ]);

  var MODEL_LEVELS = Object.freeze([
    { id: 0, name: '基础Live2D', cost: 0, viewerBonus: 0, hint: '入门级虚拟形象' },
    { id: 1, name: '精致Live2D', cost: 50000, viewerBonus: 15, hint: '表情丰富的高质量模型' },
    { id: 2, name: '3D化', cost: 200000, viewerBonus: 35, hint: '全身追踪的3D模型' },
    { id: 3, name: '豪华3D', cost: 800000, viewerBonus: 60, hint: '电影级渲染的顶级模型' },
  ]);

  function ensure(state) {
    if (!state.vtuber || typeof state.vtuber !== 'object') state.vtuber = {};
    var v = state.vtuber;
    v.lastStreamMonth = Number.isFinite(v.lastStreamMonth) ? v.lastStreamMonth : -1;
    v.streamCount = Math.max(0, Number(v.streamCount) || 0);
    v.totalSuperchat = Math.max(0, Number(v.totalSuperchat) || 0);
    v.memberTier = U.clamp(Number(v.memberTier) || 0, 0, 3);
    v.memberCount = Math.max(0, Math.round(Number(v.memberCount) || 0));
    v.lastMemberChange = Number.isFinite(v.lastMemberChange) ? v.lastMemberChange : -3;
    v.modelLevel = U.clamp(Number(v.modelLevel) || 0, 0, 3);
    v.collabPartners = Array.isArray(v.collabPartners) ? v.collabPartners.slice(-8) : [];
    v.milestones = Array.isArray(v.milestones) ? v.milestones.slice(-10) : [];
    v.consecutiveStreams = Math.max(0, Number(v.consecutiveStreams) || 0);
    v.lastCollabMonth = Number.isFinite(v.lastCollabMonth) ? v.lastCollabMonth : -3;
    if (Game.creatorCareer) {
      if (!state.creator || typeof state.creator !== 'object') state.creator = {};
      var c = state.creator;
      c.channelId = c.channelId || 'vtuber';
      c.followers = Math.max(0, Math.round(Number(c.followers) || 0));
      c.totalViews = Math.max(0, Math.round(Number(c.totalViews) || 0));
      c.brandTrust = U.clamp(Number(c.brandTrust) || 45, 0, 100);
      c.scandalRisk = U.clamp(Number(c.scandalRisk) || 0, 0, 100);
      c.lastSponsorMonth = Number.isFinite(c.lastSponsorMonth) ? c.lastSponsorMonth : -6;
      c.lastCommunityMonth = Number.isFinite(c.lastCommunityMonth) ? c.lastCommunityMonth : -1;
    }
    return v;
  }

  function isVtuber(state) { return state.career.jobId === 'vtuber'; }

  function compact(v) {
    if (!isFinite(v)) return '0';
    return v >= 10000 ? (v/10000).toFixed(1)+'万' : v >= 1000 ? (v/1000).toFixed(1)+'k' : String(Math.round(v));
  }

  function startStream(state, typeId) {
    var v = ensure(state);
    if (!isVtuber(state)) return { ok: false, message: '只有虚拟主播可以直播' };
    if (v.lastStreamMonth === state.totalMonths) return { ok: false, message: '本月已直播过' };
    var stream = STREAM_TYPES.find(function(s){return s.id===typeId;}) || STREAM_TYPES[0];
    var creator = state.creator || {};
    var model = MODEL_LEVELS[v.modelLevel] || MODEL_LEVELS[0];
    var baseViewers = Math.max(30, Math.round(stream.viewersBase + (creator.followers||0) * stream.followersRate
      + (state.stats.魅力||50) * 4 + model.viewerBonus + v.consecutiveStreams * 3));
    var appeal = 0.75 + U.clamp((state.stats.魅力||50), 0, 100)/100;
    var styleM = (Game.creatorStyleGrowth && Game.creatorStyleGrowth.multiplier) ? Game.creatorStyleGrowth.multiplier(state.profile, 'vtuber') : 1;
    var income = Math.round(baseViewers * stream.incomeMult * (1.2 + ((creator.brandTrust||45)/70)));
    var gained = Math.max(3, Math.round(baseViewers * 0.08 * appeal * styleM));
    creator.followers = (creator.followers||0) + gained;
    creator.totalViews = (creator.totalViews||0) + baseViewers;
    state.money += income;
    state.stats.心情 = U.clamp((state.stats.心情||0) + stream.mood, 0, 100);
    state.career.burnout = U.clamp((state.career.burnout||0) + stream.burnout, 0, 100);
    state.career.performance = U.clamp((state.career.performance||0) + 6, 0, 100);
    v.lastStreamMonth = state.totalMonths;
    v.streamCount += 1;
    v.consecutiveStreams += 1;
    v.totalSuperchat += Math.round(income * 0.15);
    var msg = stream.name+'直播:同接'+compact(baseViewers)+'人,+'+compact(gained)+'粉,收入'+Game.view.money(income);
    if (event) msg += ' · ' + event.text;
    return { ok: true, message: msg };
  }

  function setMemberTier(state, tier) {
    var v = ensure(state);
    if (!isVtuber(state)) return { ok: false, message: '只有虚拟主播可以开通舰长' };
    if (tier === v.memberTier) return { ok: false, message: '已是当前档位' };
    if (state.totalMonths - v.lastMemberChange < 3) return { ok: false, message: '切换档位需间隔3个月' };
    v.memberTier = U.clamp(tier, 0, 3);
    v.lastMemberChange = state.totalMonths;
    v.memberCount = 0;
    return { ok: true, message: '已开通' + (MEMBER_TIERS[tier]||{}).name };
  }

  function upgradeModel(state) {
    var v = ensure(state);
    if (!isVtuber(state)) return { ok: false, message: '只有虚拟主播可以升级模型' };
    if (v.modelLevel >= 3) return { ok: false, message: '模型已满级' };
    var next = MODEL_LEVELS[v.modelLevel + 1];
    if (state.money < next.cost) return { ok: false, message: '升级需要' + Game.view.money(next.cost) };
    Game.economy.spend(state, next.cost);
    v.modelLevel += 1;
    Game.lifeDirector.addLog(state, '模型升级', '升级至' + next.name + '！观众吸引力大幅提升。', 'milestone');
    return { ok: true, message: '模型升级至' + next.name };
  }

  function communityVtuber(state) {
    var v = ensure(state);
    var creator = state.creator || {};
    if (creator.lastCommunityMonth === state.totalMonths) return { ok: false, message: '本月已完成社群活动' };
    creator.lastCommunityMonth = state.totalMonths;
    var appeal = 0.75 + U.clamp((state.stats.魅力||50), 0, 100)/100;
    var styleM = (Game.creatorStyleGrowth && Game.creatorStyleGrowth.multiplier) ? Game.creatorStyleGrowth.multiplier(state.profile, 'vtuber') : 1;
    var gain = Math.max(10, Math.round(((creator.followers||0)*0.015 + 20) * appeal * styleM));
    creator.followers = (creator.followers||0) + gain;
    creator.brandTrust = U.clamp((creator.brandTrust||0) + 6, 0, 100);
    state.stats.心情 = U.clamp((state.stats.心情||0) + 3, 0, 100);
    return { ok: true, message: '社群活动新增'+compact(gain)+'粉丝' };
  }

  function sponsorVtuber(state) {
    var creator = state.creator || {};
    if ((creator.followers||0) < 1000) return { ok: false, message: '粉丝达1k才能承接广告' };
    if (state.totalMonths - (creator.lastSponsorMonth||-6) < 3) return { ok: false, message: '广告需间隔3个月' };
    creator.lastSponsorMonth = state.totalMonths;
    var income = Game.creatorEconomy ? Game.creatorEconomy.sponsorIncome(creator.followers, creator.brandTrust) : 800;
    state.money += income;
    creator.brandTrust = U.clamp((creator.brandTrust||0) + 4, 0, 100);
    state.career.performance = U.clamp((state.career.performance||0) + 8, 0, 100);
    return { ok: true, message: '广告收入'+Game.view.money(income) };
  }

  var VTUBER_NAMES = [
    '星川莎拉', '月野露娜', '神楽めあ', '時雨ユイ', '白上フブキ', '湊あくあ', '兎田ぺこら', '潤羽るしあ',
    '雪花ラミィ', '獅白ぼたん', '桃鈴ねね', '尾丸ポルカ', '博衣こより', '沙花叉クロヱ', '風真いろは',
    '天音かなた', '角巻わため', '常闇トワ', '姫森ルーナ', '夏色まつり', '紫咲シオン', '百鬼あやめ',
    '癒月ちょこ', '大空スバル', 'さくらみこ', '星街すいせい', '戌神ころね', '猫又おかゆ', '大神ミオ',
    '不知火フレア', '白銀ノエル', '宝鐘マリン', '一伊那尓栖', 'がうる・ぐら', '森カリオペ',
    '小鳥遊キアラ', '七詩ムメイ', 'ハコス・ベールズ', 'セレス・ファウナ', 'オーロ・クロニー',
    '月ノ美兎', '剣持刀也', '葛葉', '叶', '笹木咲', '椎名唯華', '勇気ちひろ', '樋口楓',
    '静凛', '渋谷ハル', '鈴原るる', '花畑チャイカ', '舞元啓介', '社築', '加賀美ハヤト',
    '夕陽リリ', '如月れん', '海妹四葉', '早瀬走', '小柳ロウ', '星導ショウ', '叢雲カゲツ', '伊波ライ',
    'ソフィア・ヴァレンタイン', 'ジョー・力一', 'レイン・パターソン', 'オリバー・エバンス',
  ];

  var VTUBER_AGENCIES = ['ホロライブ', 'にじさんじ', 'VSPO!', '個人勢', 'ぶいすぽっ!', 'のりプロ', '774inc.', 'あおぎり高校'];

  function partnerAvatar(name) {
    var h = 0; for (var i = 0; i < (name||'').length; i++) h = ((h<<5)-h)+name.charCodeAt(i);
    var colors = ['#5b4fcf','#a33b56','#3d796a','#b88a35','#4f7dcf','#cf5b8e','#5b8ecf','#8e5bcf'];
    return '<span class="vtuber-avatar" style="background:' + colors[Math.abs(h)%colors.length] + '">' + (name||'?').charAt(0) + '</span>';
  }

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(a,b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function generateCollabPartner(state) {
    return {
      name: rand(VTUBER_NAMES),
      agency: rand(VTUBER_AGENCIES),
      specialty: rand(['歌','游戏','杂谈','绘画','ASMR','弹唱']),
      modelLevel: randInt(0, 3),
      followers: randInt(5000, 800000),
      memberTier: randInt(0, 3),
      lastCollabMonth: -12,
      collabCount: 0,
      affection: randInt(30, 55),
      joinedMonth: state.totalMonths,
    };
  }

  function collabStream(state, partnerId) {
    var v = ensure(state);
    if (!isVtuber(state)) return { ok: false, message: '只有虚拟主播可以联动' };
    if (state.totalMonths - v.lastCollabMonth < 3) return { ok: false, message: '联动需要间隔3个月' };

    var partner;
    if (partnerId) {
      partner = v.collabPartners.find(function(p) { return p.name === partnerId; });
      if (!partner) return { ok: false, message: '联动对象不存在' };
      if (state.totalMonths - (partner.lastCollabMonth||-12) < 3) return { ok: false, message: '与该主播联动需间隔3个月' };
    } else {
      partner = generateCollabPartner(state);
      v.collabPartners.push(partner);
      v.collabPartners = v.collabPartners.slice(-20);
    }

    v.lastCollabMonth = state.totalMonths;
    partner.lastCollabMonth = state.totalMonths;
    partner.collabCount = (partner.collabCount||0) + 1;
    partner.affection = U.clamp((partner.affection||30) + randInt(5, 12), 0, 100);

    var result = startStream(state, 'collab');
    if (!result.ok) return result;

    var crossFans = Math.max(50, Math.round((partner.followers||5000) * 0.01 * (0.5 + (partner.affection||30) / 100)));
    var creator = state.creator || {};
    creator.followers = (creator.followers || 0) + crossFans;
    partner.followers = (partner.followers||5000) + Math.max(30, Math.round((creator.followers||0) * 0.005));

    v._collabPicker = null; v._collabView = null;
    result.message += ' · 与' + partner.name + '(' + (partner.agency||'') + ')联动！+' + compact(crossFans) + '交叉粉';
    Game.lifeDirector.addLog(state, 'V联动', '与' + partner.name + '(' + (partner.agency||'個人勢') + ', ' + compact(partner.followers||0) + '粉)联动，双方粉丝反响热烈。', 'good');
    return result;
  }

  function showCollabPicker(state) {
    var v = ensure(state);
    v._collabPicker = true; v._collabView = null;
  }

  function openCollabList(state) {
    var v = ensure(state);
    v._collabPicker = false;
    var html = '<div class="collab-list-panel">';
    if (v.collabPartners.length) {
      v.collabPartners.slice().reverse().forEach(function(p) {
        var canCollab = state.totalMonths - (p.lastCollabMonth||-12) >= 3;
        html += '<div class="picker-card" data-vtuber-collab-view="' + p.name + '">';
        html += partnerAvatar(p.name);
        html += '<div><strong>' + p.name + '</strong><span>' + (p.agency||'個人勢') + ' · ' + (p.specialty||'杂谈') + '</span>';
        html += '<small>' + compact(p.followers||0) + '粉 · 好感' + (p.affection||30) + ' · ' + (p.collabCount||0) + '次联动</small></div>';
        html += '<b class="' + (canCollab ? '' : 'cd') + '">' + (canCollab ? '可联动' : 'CD') + '</b></div>';
      });
    } else {
      html += '<p class="empty-state">还没有联动伙伴。通过联动直播认识新主播吧！</p>';
    }
    html += '</div>';
    Game.navigation.openDetail('联动伙伴', html, 'collab-list');
  }

  function openCollabDetail(state, partnerName) {
    var v = ensure(state);
    v._collabView = partnerName;
    v._collabPicker = false;
    var p = v.collabPartners.find(function(pp) { return pp.name === partnerName; });
    if (!p) return;
    var tier = MEMBER_TIERS[U.clamp(p.memberTier||0,0,3)] || MEMBER_TIERS[0];
    var pMemberCount = Math.round((p.followers||0) * (tier.conversion||0));
    var canCollab = state.totalMonths - (p.lastCollabMonth||-12) >= 3;
    var html = '<div class="collab-detail-panel">'
      + '<div class="collab-detail-head">' + partnerAvatar(p.name) + '<div><strong>' + p.name + '</strong>'
      + '<span>' + (p.agency||'個人勢') + ' · ' + (p.specialty||'杂谈') + '专精</span></div></div>'
      + '<div class="collab-detail-stats"><div><span>粉丝</span><strong>' + compact(p.followers||0) + '</strong></div>'
      + '<div><span>舰长</span><strong>' + compact(pMemberCount) + '位' + tier.label + '</strong></div>'
      + '<div><span>模型</span><strong>Lv' + (p.modelLevel||0) + '</strong></div>'
      + '<div><span>好感度</span><strong>' + (p.affection||30) + '/100</strong></div>'
      + '<div><span>联动次数</span><strong>' + (p.collabCount||0) + '次</strong></div>'
      + '<div><span>上次联动</span><strong>' + (state.totalMonths - (p.lastCollabMonth||-12)) + '月前</strong></div></div>'
      + '<div class="system-actions"><button data-vtuber-collab-go="' + p.name + '"' + (canCollab ? '' : ' disabled') + '>'
      + (canCollab ? '发起联动直播' : '联动冷却中(3月)') + '</button>'
      + '<button data-vtuber-collab-list>← 返回列表</button></div></div>';
    Game.navigation.openDetail(p.name, html, 'collab-detail');
  }

  function openCollabListRefresh(state) {
    var v = ensure(state);
    v._collabView = null;
    openCollabList(state);
  }

  function renderCollabPartners(state) {
    var v = ensure(state);
    if (!v.collabPartners.length) return '';
    var html = '<div class="vtuber-collabs"><h4>联动伙伴 (' + v.collabPartners.length + '人)</h4>';
    v.collabPartners.slice().reverse().forEach(function(p) {
      var canCollab = state.totalMonths - (p.lastCollabMonth||-12) >= 3;
      html += '<div class="vtuber-collab-card" data-vtuber-collab-view="' + p.name + '">';
      html += partnerAvatar(p.name);
      html += '<div class="collab-card-main"><strong>' + p.name + '</strong><span>' + (p.agency||'個人勢') + ' · ' + (p.specialty||'杂谈') + '</span>';
      html += '<small>' + compact(p.followers||0) + '粉 · 好感' + (p.affection||30) + '</small></div>';
      html += '<b class="' + (canCollab ? '' : 'cd') + '">' + (canCollab ? '可联动' : 'CD') + '</b></div>';
    });
    html += '</div>';
    return html;
  }

  function renderCollabPicker(state) {
    var v = ensure(state);
    var html = '<div class="vtuber-collab-picker"><div class="picker-head"><strong>选择联动对象</strong><button data-vtuber-collab-close>取消</button></div>';
    if (v.collabPartners.length) {
      html += '<h4>已有伙伴</h4>';
      v.collabPartners.slice().reverse().forEach(function(p) {
        var can = state.totalMonths - (p.lastCollabMonth||-12) >= 3;
        html += '<div class="picker-card" data-vtuber-collab-go="' + p.name + '">';
        html += partnerAvatar(p.name);
        html += '<div><strong>' + p.name + '</strong><span>' + (p.agency||'個人勢') + ' · ' + (p.specialty||'杂谈') + '</span>';
        html += '<small>' + compact(p.followers||0) + '粉 · 好感' + (p.affection||30) + ' · ' + (p.collabCount||0) + '次联动</small></div>';
        html += '<b>' + (can ? '可联动' : '冷却中') + '</b></div>';
      });
    }
    html += '<h4>认识新主播</h4>';
    html += '<div class="picker-card new" data-vtuber-collab-go="__new__">';
    html += '<span class="vtuber-avatar new-avatar">+</span>';
    html += '<div><strong>寻找新的联动对象</strong><span>随机匹配一位未合作过的虚拟主播</span></div></div>';
    html += '</div>';
    return html;
  }

  function renderCollabDetail(state) {
    var v = ensure(state);
    if (!v._collabView) return '';
    var p = v.collabPartners.find(function(pp) { return pp.name === v._collabView; });
    if (!p) return '';
    var tier = MEMBER_TIERS[U.clamp(p.memberTier||0,0,3)] || MEMBER_TIERS[0];
    var pMemberCount = Math.round((p.followers||0) * (tier.conversion||0));
    var canCollab = state.totalMonths - (p.lastCollabMonth||-12) >= 3;
    return '<div class="vtuber-collab-detail">'
      + '<div class="collab-detail-head">' + partnerAvatar(p.name) + '<div><button data-vtuber-collab-close>← 返回</button>'
      + '<strong>' + p.name + '</strong><span>' + (p.agency||'個人勢') + ' · ' + (p.specialty||'杂谈') + '专精</span></div></div>'
      + '<div class="collab-detail-stats"><div><span>粉丝</span><strong>' + compact(p.followers||0) + '</strong></div>'
      + '<div><span>舰长</span><strong>' + compact(pMemberCount) + '位' + tier.label + '</strong></div>'
      + '<div><span>模型</span><strong>Lv' + (p.modelLevel||0) + '</strong></div>'
      + '<div><span>好感度</span><strong>' + (p.affection||30) + '/100</strong></div>'
      + '<div><span>联动次数</span><strong>' + (p.collabCount||0) + '次</strong></div>'
      + '<div><span>上次联动</span><strong>' + (state.totalMonths - (p.lastCollabMonth||-12)) + '月前</strong></div></div>'
      + '<div class="system-actions"><button data-vtuber-collab-go="' + p.name + '"' + (canCollab ? '' : ' disabled') + '>'
      + (canCollab ? '发起联动直播' : '联动冷却中(3月)') + '</button></div></div>';
  }

  /* ---- patron system ---- */
  function startPatronHookup(state) {
    var v = ensure(state);
    if (!isVtuber(state)) return { ok: false, message: '只有虚拟主播可以接受金主邀约' };
    var creator = state.creator || {};
    if ((creator.followers || 0) < 2000) return { ok: false, message: '粉丝达2k后才会收到金主私信' };
    if (state.totalMonths - (v._lastPatronMonth || -6) < 6) return { ok: false, message: '金主邀约至少间隔6个月' };
    v._lastPatronMonth = state.totalMonths;
    var sponsor = Game.creatorCareer ? Game.creatorCareer.generateSponsor(state) : null;
    if (!sponsor) {
      sponsor = U.person('金主', U.random(Game.nameSystem ? Game.nameSystem.surnames() : ['王','李','张']), U.between(30, 50), '男', state.totalMonths);
      sponsor.wealth = U.between(500000, 5000000);
      sponsor.id = 'vpatron_' + state.totalMonths;
      if (state.worldPeople) state.worldPeople.push(sponsor);
    }
    v._patron = { stage: 0, sponsorId: sponsor.id, sponsorName: sponsor.name, sponsorWealth: sponsor.wealth || 500000 };
    state.stats.心情 = U.clamp((state.stats.心情 || 0) + 2, 0, 100);
    creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + 5, 0, 100);
    return { ok: true, message: sponsor.name + '发来高额私信邀约' };
  }

  function choosePatronHookup(state, choiceId) {
    var v = ensure(state);
    var h = v._patron;
    if (!h) return { ok: false, message: '没有进行中的邀约' };
    if (h.stage === 0) {
      if (choiceId === 'decline') { v._patron = null; return { ok: true, message: '婉拒了邀约' }; }
      if (choiceId === 'accept') { h.stage = 1; return { ok: true, message: '接下了邀约' }; }
      if (choiceId === 'forced') {
        var partner = U.person('金主', '', U.between(30, 50), '男', state.totalMonths);
        partner.wealth = h.sponsorWealth;
        partner.id = h.sponsorId; partner.name = h.sponsorName;
        if (state.worldPeople) state.worldPeople.push(partner);
        v._patron = null;
        var creator = state.creator || {};
        creator.scandalRisk = U.clamp((creator.scandalRisk || 0) + 15, 0, 100);
        Game.stressSystem.add(state, 12, '金主强迫');
        Game.psychology.addTrauma(state, 10, '被强行发生关系');
        Game.encounterSystem.init(state, partner, 'rape', 'provider');
        Game._refresh();
        Game.encounterSystem.showOverlay(state);
        Game.lifeDirector.addLog(state, 'V金主强要', h.sponsorName + '以曝光中之人信息为威胁，强行与你发生了关系。', 'milestone');
        return { ok: true, message: '被迫服从...' };
      }
    }
    return { ok: false, message: '无效选择' };
  }

  function renderPatronHookup(state) {
    var v = ensure(state);
    var h = v._patron;
    if (!h) return '';
    if (h.stage === 0) {
      return '<div class="vtuber-hookup"><div class="panel-title"><h3>金主私信</h3></div>'
        + '<p>' + h.sponsorName + '（资产约' + Game.view.money(h.sponsorWealth) + '）发来高额私信邀约，想与你线下见面。'
        + '对方话里话外暗示知道你的中之人信息。</p>'
        + '<div class="vtuber-hookup-actions">'
        + '<button data-vtuber-patron="accept">接受邀约·线下见面</button>'
        + '<button data-vtuber-patron="forced" class="danger">拒绝·但被威胁...</button>'
        + '<button data-vtuber-patron="decline">婉拒</button></div></div>';
    }
    if (h.stage === 1) {
      v._patron = null;
      var partner = U.person('金主', '', U.between(30, 50), '男', state.totalMonths);
      partner.wealth = h.sponsorWealth; partner.id = h.sponsorId; partner.name = h.sponsorName;
      if (state.worldPeople) state.worldPeople.push(partner);
      Game.encounterSystem.init(state, partner, 'hookup', 'provider');
      Game._refresh();
      Game.encounterSystem.showOverlay(state);
      Game.lifeDirector.addLog(state, 'V金主约会', '与' + h.sponsorName + '线下见面。', 'normal');
      return '';
    }
    return '';
  }

  function checkMilestones(state) {
    var v = ensure(state);
    var followers = (state.creator||{}).followers || 0;
    var milestones = [
      { at: 1000, text: '1000粉！频道终于有了第一批忠实观众。' },
      { at: 10000, text: '1万粉！银盾在望。' },
      { at: 50000, text: '5万粉！有影响力的虚拟主播。' },
      { at: 100000, text: '10万粉！金盾到手。' },
      { at: 500000, text: '50万粉！虚拟区顶流。' },
    ];
    milestones.forEach(function(m) {
      if (followers >= m.at && !v.milestones.some(function(p){return p.at===m.at;})) {
        v.milestones.push({ at: m.at, month: state.totalMonths });
        Game.lifeDirector.addLog(state, 'V里程碑', m.text, 'milestone');
        state.stats.心情 = U.clamp((state.stats.心情||0) + 10, 0, 100);
      }
    });
  }

  function memberMonthly(state) {
    var v = ensure(state);
    if (!isVtuber(state)) return 0;
    var tier = MEMBER_TIERS[v.memberTier] || MEMBER_TIERS[0];
    if (!tier.conversion) return 0;
    var creator = state.creator || {};
    var gain = Math.round((creator.followers||0) * tier.conversion);
    var churn = Math.round(v.memberCount * 0.04);
    v.memberCount = Math.max(0, Math.min(creator.followers||0, v.memberCount + gain - churn));
    var income = v.memberCount * tier.cost;
    state.money += income;
    return income;
  }

  function vtuberMonthly(state) {
    var v = ensure(state);
    if (!isVtuber(state)) return;
    if (v.lastStreamMonth >= 0 && state.totalMonths - v.lastStreamMonth > 1) v.consecutiveStreams = 0;
    memberMonthly(state);
    checkMilestones(state);
    var creator = state.creator || {};
    var views = Math.round((creator.followers||0) * (0.3 + Math.random()*0.25));
    var income = Game.creatorEconomy ? Game.creatorEconomy.passiveIncome(views, creator.followers, creator.brandTrust) : 0;
    creator.totalViews = (creator.totalViews||0) + views;
    state.money += income;
    creator.scandalRisk = U.clamp((creator.scandalRisk||0) - 2, 0, 100);
    if (Math.random() < (creator.scandalRisk||0)/1200) {
      var lost = Math.min(creator.followers||0, Math.round((creator.followers||0)*0.18));
      creator.followers = (creator.followers||0) - lost;
      creator.brandTrust = U.clamp((creator.brandTrust||0) - 15, 0, 100);
      creator.scandalRisk = U.clamp((creator.scandalRisk||0) - 25, 0, 100);
      Game.lifeDirector.addLog(state, '频道争议', '争议事件导致流失'+compact(lost)+'粉丝。', 'normal');
    }
    var baseSalary = 8800;
    try { var j = Game.config.jobs.find(function(j){return j.id==='vtuber';});
      if (j) baseSalary = j.salary || 8800; } catch(e) {}
    state.career.salary = Game.creatorEconomy ? Game.creatorEconomy.monthlySalary(baseSalary, creator.followers, creator.brandTrust) : baseSalary;
  }

  function render(state) {
    var v = ensure(state);
    if (!isVtuber(state)) return '';
    var creator = state.creator || {};
    var tier = MEMBER_TIERS[v.memberTier] || MEMBER_TIERS[0];
    var model = MODEL_LEVELS[v.modelLevel] || MODEL_LEVELS[0];
    var nextModel = v.modelLevel < 3 ? MODEL_LEVELS[v.modelLevel + 1] : null;
    var canStream = v.lastStreamMonth !== state.totalMonths;
    var canCollab = state.totalMonths - v.lastCollabMonth >= 3;
    var membersIncome = v.memberCount * tier.cost;

    var html = '';
    html += '<div class="vtuber-panel">';
    html += renderPatronHookup(state);
    html += '<div class="panel-title"><h2>虚拟主播</h2><span>' + compact(creator.followers||0) + '粉 · ' + model.name + '</span></div>';

    html += '<div class="vtuber-model"><strong>虚拟形象</strong><span>' + model.name + ' · 观众+' + model.viewerBonus + '</span>';
    if (nextModel) html += '<button data-vtuber-model>升级 → ' + nextModel.name + ' · ' + Game.view.money(nextModel.cost) + '</button>';
    else html += '<small>已满级</small>';
    html += '</div>';

    html += '<div class="vtuber-streams"><span>直播' + (canStream ? '' : ' (本月已播)') + '</span><div class="vtuber-stream-btns">';
    STREAM_TYPES.forEach(function(s) {
      html += '<button data-vtuber-stream="' + s.id + '"' + (canStream ? '' : ' disabled') + '><strong>' + s.name + '</strong><small>同接+' + s.viewersBase + ' · 收入×' + s.incomeMult.toFixed(2) + '</small></button>';
    });
    if (canCollab) html += '<button data-vtuber-collab-picker style="grid-column:1/-1"><strong>联动直播</strong><small>选择合作对象 · 认识新主播 · 3月CD</small></button>';
    html += '</div>';
    if (v.consecutiveStreams >= 3) html += '<small class="vtuber-streak">连续' + v.consecutiveStreams + '月直播 · 同接+' + (v.consecutiveStreams*3) + '</small>';
    html += '</div>';

    html += '<div class="vtuber-members"><strong>舰长系统</strong><div class="vtuber-member-tiers">';
    MEMBER_TIERS.filter(function(t){return t.id>0;}).forEach(function(t) {
      html += '<div class="vtuber-member-tier' + (v.memberTier===t.id?' active':'') + '"><strong>' + t.emoji + ' ' + t.label + '</strong><small>' + Game.view.money(t.cost) + '/月</small></div>';
    });
    html += '</div><span>' + compact(v.memberCount) + '位' + tier.label + ' · ' + Game.view.money(membersIncome) + '/月</span>';
    html += '<div class="system-actions">';
    MEMBER_TIERS.filter(function(t){return t.id>0;}).forEach(function(t) {
      html += '<button data-vtuber-member="' + t.id + '"' + (t.id===v.memberTier?' disabled':'') + '>' + t.label + '</button>';
    });
    html += '</div></div>';

    html += '<div class="vtuber-stats"><div><span>总直播</span><strong>' + v.streamCount + '次</strong></div>';
    html += '<div><span>SC收入</span><strong>' + Game.view.money(v.totalSuperchat||0) + '</strong></div>';
    html += '<div><span>品牌信任</span><strong>' + Math.round(creator.brandTrust||45) + '</strong></div>';
    html += '<div><span>播放量</span><strong>' + compact(creator.totalViews||0) + '</strong></div></div>';

    html += '<div class="vtuber-actions"><button data-vtuber-community>社群活动</button><button data-vtuber-sponsor>承接广告</button>';
    html += '<button data-vtuber-patron-start>金主邀约 · 6月CD</button></div>';
    if (v.collabPartners.length) {
      html += '<button class="vtuber-collab-menu-btn" data-vtuber-collab-list>联动伙伴 (' + v.collabPartners.length + '人) →</button>';
    }

    if (v.milestones.length) {
      html += '<div class="vtuber-milestones"><h4>里程碑</h4>';
      v.milestones.slice().reverse().forEach(function(m){html += '<span>'+compact(m.at)+'粉</span>';});
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function handleClick(event) {
    var btn = event.target.closest('[data-vtuber-stream], [data-vtuber-member], [data-vtuber-model], [data-vtuber-community], [data-vtuber-sponsor], [data-vtuber-collab], [data-vtuber-collab-picker], [data-vtuber-collab-list], [data-vtuber-collab-go], [data-vtuber-collab-view], [data-vtuber-patron], [data-vtuber-patron-start]');
    if (!btn) return false;
    var state = Game._getState ? Game._getState() : null;
    if (!state) return false;
    var r;
    if (btn.dataset.vtuberStream !== undefined) r = startStream(state, btn.dataset.vtuberStream);
    else if (btn.dataset.vtuberMember !== undefined) r = setMemberTier(state, Number(btn.dataset.vtuberMember));
    else if (btn.dataset.vtuberModel !== undefined) r = upgradeModel(state);
    else if (btn.dataset.vtuberCommunity !== undefined) r = communityVtuber(state);
    else if (btn.dataset.vtuberSponsor !== undefined) r = sponsorVtuber(state);
    else if (btn.dataset.vtuberCollab !== undefined) { showCollabPicker(state); Game._refresh(); return true; }
    else if (btn.dataset.vtuberCollabPicker !== undefined) { showCollabPicker(state); Game._refresh(); return true; }
    else if (btn.dataset.vtuberCollabList !== undefined) { openCollabList(state); return true; }
    else if (btn.dataset.vtuberCollabGo !== undefined) {
      if (btn.dataset.vtuberCollabGo === '__new__') r = collabStream(state);
      else r = collabStream(state, btn.dataset.vtuberCollabGo);
      Game._refresh(); Game._save();
      if (r.ok && btn.dataset.vtuberCollabGo !== '__new__') openCollabListRefresh(state);
      else Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
      return true;
    }
    else if (btn.dataset.vtuberCollabView !== undefined) { openCollabDetail(state, btn.dataset.vtuberCollabView); return true; }
    else if (btn.dataset.vtuberPatron !== undefined) r = choosePatronHookup(state, btn.dataset.vtuberPatron);
    else if (btn.dataset.vtuberPatronStart !== undefined) r = startPatronHookup(state);
    else return false;
    if (Game._refresh) Game._refresh();
    if (Game._save) Game._save();
    Game.view.showToast(r.message, r.ok ? 'good' : 'warning');
    return true;
  }

  Game.vtuberCareer = Object.freeze({
    ensure: ensure, isVtuber: isVtuber, startStream: startStream,
    setMemberTier: setMemberTier, upgradeModel: upgradeModel,
    communityVtuber: communityVtuber, sponsorVtuber: sponsorVtuber,
    collabStream: collabStream, vtuberMonthly: vtuberMonthly,
    render: render, handleClick: handleClick,
  });
}(window));
