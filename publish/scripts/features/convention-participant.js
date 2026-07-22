(function initConventionParticipant(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const roleOptions = Object.freeze({
    visitor: {
      id: 'role-visitor', label: '领取导览手册规划路线', hint: '游客入口，优先了解摊位与舞台安排。',
      next: 'market', effect: { score: 3, result: '你根据导览手册确定了今天的重点。' },
    },
    coser: {
      id: 'role-coser', label: '前往更衣与集邮区', hint: '以Coser身份加入现场交流。',
      next: 'coser-select', effect: { score: 5, requires: { cosplay: true },
        result: '你整理好服装，进入Coser集邮与交流区域。' },
    },
    contestant: {
      id: 'role-contestant', label: '前往舞台完成比赛检录', hint: '选手身份直接进入舞台路线。',
      next: 'stage', effect: { score: 5, requires: { cosplay: true },
        result: '你完成检录，拿到了舞台候场号码。' },
    },
    photographer: {
      id: 'role-photographer', label: '登记摄影证并寻找拍摄对象', hint: '摄影师身份更容易建立合作。',
      next: 'coser-select', effect: { score: 4, result: '你完成摄影登记，进入约拍区域。' },
    },
    creator: {
      id: 'role-creator', label: '确认创作者摊位与交流安排', hint: '创作者身份优先进入同人区域。',
      next: 'market', effect: { score: 5, result: '你确认了摊位位置和创作者交流时间。' },
    },
  });
  const choice = (id, label, hint, next, effect) => ({ id, label, hint, next, effect });
  function operationName(id) {
    return Game.conventionCatalog.operationPhases.flatMap((phase) => phase.options)
      .find((option) => option.id === id)?.name || '';
  }
  function travelContext(event) {
    const prep = event.preparation || {};
    const sponsorIds = (prep.sponsors || []).map((item) => item.id);
    const guestIds = (prep.guests || []).map((item) => item.id);
    const operationIds = (prep.operations?.decisions || []).map((item) => item.optionId);
    return {
      quality: prep.quality ?? 50, safety: prep.safety ?? 50, promotion: prep.promotion ?? 50,
      organizerType: event.organizer?.type || 'npc', sponsorIds, guestIds, operationIds,
      arrangement: operationIds.map(operationName).filter(Boolean).join(' · '),
    };
  }
  function styleRoster(state, ts) {
    if (!ts.guestIds?.includes('featured-coser')) return;
    const person = Game.people.find(state, ts.coserIds[0]);
    if (!person) return;
    person.job = '受邀嘉宾Coser';
    Game.npcFemboyCareer?.onJobAssigned(state, person, person.job);
    person.conventionGuest = true;
    person.affection = Math.min(100, person.affection + 5);
  }
  function contextualOptions(state, ts) {
    const items = [];
    const sponsors = ts.sponsorIds || [], guests = ts.guestIds || [], operations = ts.operationIds || [];
    if (ts.node === 'entrance' && sponsors.includes('local-brand')) {
      items.push(choice('market-sponsor-local-brand', '领取品牌联名入场包',
        '本地品牌在入口提供限定纪念品和消费券。', 'market',
        { score: 5, result: '你领取联名入场包，顺势前往商业与同人区域。' }));
    }
    if (ts.node === 'entrance' && operations.includes('entry-zoned')) {
      items.push(choice('operation-zoned-entry', '使用分区导流快速入场',
        '承办方提前划分了入场队列，可以从容选择第一站。', 'market',
        { score: 5, result: '你避开拥堵，沿分区指引进入会场。' }));
    }
    if (ts.node === 'entrance' && operations.includes('entry-open')) {
      items.push(choice('operation-open-entry', '跟随快速人流直奔主舞台',
        '全部闸机开放后入场很快，但现场更加拥挤。', 'stage',
        { score: 4, result: '你随着快速入场的人群抵达主舞台。' }));
    }
    if (ts.node === 'market' && sponsors.includes('community-alliance')) {
      items.push(choice('market-community-alliance', '参观社团联合创作专区',
        '联合赞助让同人社团获得了独立展示区域。', 'market-finale',
        { intelligence: 2, score: 6, result: '你与多个社团交流了创作经验。' }));
    }
    if (ts.node === 'market' && guests.includes('creator-panel')) {
      items.push(choice('market-creator-panel', '参加创作者座谈',
        '主嘉宾正在分享选题、制作和发行经验。', 'market-finale',
        { intelligence: 3, charm: 1, score: 7, result: '座谈提供了完整的创作方法。' }));
    }
    if (ts.node === 'stage' && guests.includes('voice-cast')) {
      items.push(choice('stage-voice-cast', '参加配音演员见面环节',
        '主嘉宾登台交流角色塑造与录音经历。', 'stage-finale',
        { charm: 2, score: 7, result: '嘉宾互动让舞台气氛达到高潮。' }));
    }
    if (ts.node === 'stage' && operations.includes('peak-encore')) {
      items.push(choice('stage-guest-encore', '留下观看追加嘉宾互动',
        '承办方临时延长了舞台活动。', 'stage-finale',
        { reputation: 2, score: 7, result: '追加环节带来了意外的高热度。' }));
    }
    if (ts.node === 'stage' && sponsors.includes('platform-title')) {
      items.push(choice('stage-platform-live', '进入平台冠名直播区',
        '冠名平台开放了舞台直播与实时互动。', 'stage-finale',
        { charm: 1, score: 6, result: '你的现场互动进入了活动直播。' }));
    }
    if (ts.node === 'coser-interact' && selectedGuest(state, ts)) {
      items.push(choice('coser-featured-talk', '询问嘉宾的服装筹备经验',
        '受邀 Coser 愿意分享舞台和服装制作细节。', 'coser-finale',
        { intelligence: 2, affection: 12, score: 7, result: '嘉宾认真讲解了整套造型的制作过程。' }));
    }
    if (['stage-finale', 'market-finale', 'coser-finale'].includes(ts.node)
      && operations.includes('finale-controlled')) {
      items.push(choice('operation-safe-exit', '乘坐分区接驳有序离场',
        '承办方安排了分批闭馆与返程接驳。', '',
        { score: 5, finish: true, result: '你避开散场拥堵，顺利结束今天的行程。' }));
    }
    if (ts.node === 'stage-finale' && operations.includes('finale-stream')) {
      items.push(choice('stage-stream-finale', '参与直播压轴互动',
        '闭馆前的直播压轴仍在继续。', '',
        { charm: 2, reputation: 3, score: 6, finish: true,
          result: '你参与直播互动，为活动留下了热闹的收尾。' }));
    }
    return items;
  }
  function selectedGuest(state, ts) {
    return Boolean(ts.selectedCoserId
      && Game.people.find(state, ts.selectedCoserId)?.conventionGuest);
  }

  function careerConventionOptions(state, ts) {
    var items = [];
    var jobId = state.career.jobId || '';
    if (jobId === 'coser' && ts.node === 'entrance') {
      items.push(choice('career-coser-wardrobe', '从衣柜挑选cos服参加比赛',
        '穿着自己拥有的cos服参赛，还原度加成更高。', 'contest-prelim',
        { cost: 80, score: 5, total: 5, enterContest: true, coserWardrobe: true,
          requires: { cosplay: true }, result: '你从衣柜中精心挑选了cos服，签入大赛。' }));
      var coserData = state.coser || {};
      var rankLevel = coserData._rankLevel;
      if (!rankLevel && Game.specialCareerRanks) {
        try { var r = Game.specialCareerRanks.profile(state); if (r) rankLevel = r.level; } catch(e) {}
      }
      if (rankLevel >= 3) {
        items.push(choice('career-coser-guest', '以受邀嘉宾身份入场',
          '直接进入舞台后台，免报名费，嘉宾通道。', 'stage',
          { score: 6, reputation: 4, total: 3, coserGuest: true,
            result: '工作人员认出你后毕恭毕敬地将你引向后台。' }));
      }
    }
    if (jobId === 'vtuber' && ts.node === 'entrance') {
      items.push(choice('career-vtuber-booth', '架设直播设备现场直播',
        '在booth区开播，漫展观众+线上粉丝同接。', 'stage',
        { score: 6, fans: true, total: 3, vtuberBooth: true,
          result: '你架好设备，弹幕立刻刷起。"在漫展？！""求偶遇！"' }));
      items.push(choice('career-vtuber-meetup', '举办小型粉丝见面会',
        '签名合影，转化核心粉。', 'coser-select',
        { mood: 6, score: 5, total: 4, result: '粉丝们排起小队，每个人都带着你的周边。' }));
      var vData = state.vtuber || {};
      if (vData.collabPartners && vData.collabPartners.length) {
        items.push(choice('career-vtuber-collab-con', '约联动伙伴漫展面基',
          '和线上联动过的虚拟主播线下见面。', 'coser-interact',
          { mood: 8, score: 7, total: 4, result: '你们第一次线下见面，激动得互相拥抱。' }));
      }
    }
    if (jobId === 'welfare' && ts.node === 'entrance') {
      items.push(choice('career-welfare-photo', '接受私密拍摄邀约',
        '金主想租借cos服拍私房。高收入高丑闻风险。', 'coser-select',
        { score: 8, money: true, total: 3, welfarePhoto: true,
          result: '你在约定地点见到了拿着相机的金主。' }));
      items.push(choice('career-welfare-patron', '陪同金主逛展',
        '常客邀你线下陪同逛展+酒店服务。', 'coser-interact',
        { mood: 4, score: 6, total: 4, welfarePatron: true,
          result: '金主在展馆门口等着你，手里提着购物袋。' }));
      items.push(choice('career-welfare-sell', '摆摊贩卖签名写真',
        '出售限定签名写真和自制周边。', 'market',
        { score: 6, money: true, total: 3, result: '摊位刚摆好就有人驻足翻看你的写真集。' }));
    }
    return items;
  }
  function route(choiceId) {
    if (/stage|contestant|contest/.test(choiceId)) return {
      primary: '魅力', secondary: '体能', difficulty: 60, tag: 'stage',
    };
    if (/market|creator|visitor|collect/.test(choiceId)) return {
      primary: '学识', secondary: '管理', difficulty: 50, tag: 'market',
    };
    if (/photo|coser|select|photographer|social|showcase/.test(choiceId)) return {
      primary: '交涉', secondary: '魅力', difficulty: 52, tag: 'social',
    };
    return { primary: '交涉', secondary: '学识', difficulty: 48, tag: 'general' };
  }
  function context(ts, tag) {
    const roleMatches = {
      visitor: 'general', coser: 'social', contestant: 'stage',
      photographer: 'social', creator: 'market',
    };
    const intentMatches = {
      compete: 'stage', social: 'social', collect: 'market', showcase: 'social',
    };
    const quality = Math.round(((ts.quality ?? 50) - 50) / 10);
    const safety = ['stage', 'social'].includes(tag)
      ? Math.round(((ts.safety ?? 50) - 50) / 14) : 0;
    const promotion = ['market', 'social'].includes(tag)
      ? Math.round(((ts.promotion ?? 50) - 50) / 14) : 0;
    return (roleMatches[ts.role] === tag ? 6 : 0) + (intentMatches[ts.intent] === tag ? 6 : 0)
      + quality + safety + promotion;
  }

  function evt(id, at, label, hint, next, effect, cond) {
    return { id, at, label, hint, next, effect: effect || {}, cond: cond || null, weight: 10 };
  }

  function checkCondition(state, ts, cond) {
    if (!cond) return true;
    if (cond.cosplay && Game.cosplayCatalog.find(Game.hunterMode.identity(state).profile.cosplay).name === '无') return false;
    if (cond.moneyMin && state.money < cond.moneyMin) return false;
    if (cond.moneyMax && state.money > cond.moneyMax) return false;
    if (cond.charmMin && Game.characterAttributes.derivedCharm(Game.hunterMode.identity(state).profile) < cond.charmMin) return false;
    if (cond.statMin && cond.stat && Game.characterAttributes.playerValue(state, cond.stat) < cond.statMin) return false;
    if (cond.reputationMin && (state.cityLife?.reputation || 0) < cond.reputationMin) return false;
    if (cond.contestWon && (!ts.contest || !ts.contest.results.length || ts.contest.results[ts.contest.results.length - 1].outcome !== 'win_big' && ts.contest.results[ts.contest.results.length - 1].outcome !== 'win_close')) return false;
    if (cond.contestLost && (!ts.contest || !ts.contest.results.length || ts.contest.results[ts.contest.results.length - 1].outcome === 'win_big' || ts.contest.results[ts.contest.results.length - 1].outcome === 'win_close')) return false;
    if (cond.chain && ts._chain !== cond.chain) return false;
    if (cond.notChain && ts._chain === cond.notChain) return false;
    if (cond.largeScale && ts.eventScale !== '大型') return false;
    if (cond.hasFriend && !ts.coserIds.some(function (id) { return (Game.people.find(state, id)?.affection || 0) >= 55; })) return false;
    if (cond.healthMin && (state.stats.健康 || 0) < cond.healthMin) return false;
    return true;
  }

  function intentEventPool() {
    var chain = function (c, on) { return on ? { chain: c } : { notChain: c }; };
    return {
      compete: [
        evt('ce1', 'entrance', '提前到后台热身练习', '比赛前抓住最后时间打磨走位和定姿。', 'contest-prelim', { score: 6, reputation: 2, result: '你的热身准备让心态更加从容。' }),
        evt('ce2', 'entrance', '认识同组参赛选手', '在检录处认识了一位来自其他城市的参赛者，互相打气。', 'coser-select', { mood: 3, score: 4, affection: 8, result: '你们互相展示了服装细节，气氛友好中带着一丝竞争。' }),
        evt('ce3', 'entrance', '研究比赛规则和评分标准', '仔细阅读比赛手册，了解各组别重点加分项。', 'contest-prelim', { intelligence: 2, score: 7, result: '你对评分标准有了清晰的理解，信心大增。' }),
        evt('ce4', 'entrance', '紧急修复道具故障', '入场时道具背包的带子断了，需要在开场前修好。', 'contest-prelim', { score: 4, result: '你手忙脚乱地修好了道具，虽然耽误了些时间但总算赶上了。' }, { cosplay: true }),
        evt('ce5', 'stage', '观察其他参赛者的表现', '坐在台下仔细观察，为上台做好心理准备。', 'stage-finale', { intelligence: 2, score: 5, result: '你注意到了几个值得学习的走台细节。' }),
        evt('ce6', 'stage', '向评委助理请教注意事项', '一位和蔼的工作人员透露了评委的偏好。', 'stage-finale', { charm: 1, score: 6, result: '工作人员建议多展示服装的原创细节。' }, { stat: '交涉', statMin: 18 }),
        evt('ce7', 'stage', '在后台寻找临时搭档', '双人赛还有名额，需要一位临时搭档。', 'coser-interact', { score: 8, affection: 10, result: '你找到了一位穿着同系列角色的Coser，临时组成了双人组合！' }, { charmMin: 40 }),
        evt('ce8', 'market', '购买比赛用补妆工具', '在摊位上找到了一款合适的定型喷雾。花费60元。', 'market-finale', { cost: 60, score: 5, result: '补妆工具的加持让你在下一个舞台更加自信。' }),
        evt('ce9', 'market', '定制参赛名片', '一家摊位提供现场印刷个人名片服务，附赠角色立绘。花费100元。', 'market-finale', { cost: 100, score: 6, reputation: 1, result: '你的名片在选手中悄悄传开，增加了专业感。' }, { moneyMin: 200 }),
        evt('ce10', 'market', '购买急救针线包', '准备应急缝纫工具，以防服装意外。花费40元。', 'market-finale', { cost: 40, score: 3, result: '有了针线包在手，即使服装出问题也能迅速补救。' }, { moneyMin: 100 }),
        evt('ce11', 'coser-interact', '向经验者请教比赛心得', '对方分享了几个实用的上台小技巧。好感度额外提升。', 'coser-finale', { charm: 1, score: 6, affection: 12, result: '对方的经验之谈让你受益良多。' }),
        evt('ce12', 'coser-interact', '和对手互相鼓励', '比赛压力大，你们互相打气缓解紧张情绪。', 'coser-finale', { mood: 5, score: 4, affection: 8, result: '虽然是对手，但一句"加油"让彼此都放松了不少。' }),
        evt('ce13', 'stage-finale', '赛后接受动漫媒体采访', '记者对你的造型很感兴趣。', '', { reputation: 5, score: 4, finish: true, result: '你的采访将在下一期本地动漫资讯中出现。' }, { stat: '交涉', statMin: 20 }),
        evt('ce14', 'stage-finale', '和对手互相复盘比赛', '赛后和同组选手交流心得，分析得失。', '', { intelligence: 3, score: 5, finish: true, result: '对手坦诚地评价了你的优缺点，这些反馈非常宝贵。' }),
        evt('ce15', 'contest-prelim', '赛前深呼吸稳定心态', '闭上眼睛数三十秒，把所有紧张呼出去。', 'contest-result', { score: 4, result: '你的心跳渐渐平复下来，眼前只剩舞台和灯光。' }),
        evt('ce16', 'contest-semi', '回想预选赛的经验教训', '预选赛的细节在脑海中回放。', 'contest-result', { intelligence: 1, score: 5, result: '你调整了几个之前评委提到的细节要点。' }),
        evt('ce17', 'contest-final', '全力展示最终造型', '压轴作品，倾尽全力不留遗憾。', 'contest-result', { score: 8, charm: 2, result: '你在聚光灯下完成了有史以来最投入的一次展示。' }, { chain: 'ce15' }),
        evt('ce18', 'coser-select', '发现一位评委在集邮区', '认出了比赛评委之一的资深Coser，正在摊位前挑选周边。', 'coser-interact', { score: 7, reputation: 2, affection: 5, result: '你礼貌地上前打招呼，对方友善地聊了几句比赛心得。' }, { reputationMin: 15 }),
        evt('ce19', 'contest-result', '夺冠后接受粉丝祝贺', '台下的小粉丝激动地冲上来想和你合影。', 'entrance', { mood: 8, score: 6, reputation: 3, finishContest: true, result: '被孩子们围着的这一刻，你觉得所有的准备都值得了。' }, { contestWon: true }),
        evt('ce20', 'contest-result', '失利后收到对手的鼓励', '击败你的对手悄悄走过来，递给你一张写满鼓励的纸条。', 'entrance', { mood: 4, score: 3, affection: 8, finishContest: true, result: '"你的服装细节非常出色，希望下次还能在舞台上见到你。"' }, { contestLost: true }),
        evt('ce21', 'entrance', '临时决定挑战更高组别', '原本报了初级组，但听说中级组的评委更专业，你决定搏一把。', 'contest-prelim', { score: 8, reputation: 3, result: '工作人员帮你调换了组别，中级组的竞争果然更激烈。' }, { charmMin: 50, largeScale: true }),
        evt('ce22', 'market-finale', '买到了心仪已久的限量道具', '一直想用来参赛的角色道具居然在摊位上找到了。花费300元。', '', { cost: 300, score: 7, mood: 6, finish: true, result: '这件道具让你的造型有了质的飞跃！' }, { moneyMin: 400 }),
      ],
      social: [
        evt('se1', 'entrance', '主动认识一位路人同好', '在入口处向一位看起来友善的参展者打招呼。', 'coser-select', { score: 4, result: '你们因为相同的IP聊得很投机。' }),
        evt('se2', 'entrance', '帮迷路的参展者指路', '一位拿着地图的新人正在入口处不知所措。', 'market', { score: 3, reputation: 2, result: '你详细介绍了各展区的分布，对方感激地递来一张小贴纸。' }),
        evt('se3', 'entrance', '加入现场群聊组的线下接头', '群里有人提议在入口大屏下集合，一起逛展。', 'coser-select', { mood: 5, score: 6, result: '你们这个临时组成的逛展小队气氛热烈。' }, { healthMin: 30 }),
        evt('se4', 'stage', '加入观众交流群', '和周围观众交换了对节目的看法，认识了几位新朋友。', 'stage-finale', { charm: 1, score: 5, reputation: 1, result: '观众群里的讨论非常热烈。' }),
        evt('se5', 'stage', '帮迷路的coser找到舞台', '一位紧张的Coser在走廊里走来走去，找不到检录入口。', 'stage', { charm: 2, score: 5, affection: 8, result: '她松了口气，连声道谢后急忙跑向检录处。' }),
        evt('se6', 'stage', '参与现场抽奖活动', '舞台上正在抽奖，凭入场券可参与。', 'stage-finale', { mood: 4, score: 4, result: '虽然没中大奖，但参与感让你融入了热闹的氛围。' }),
        evt('se7', 'market', '参加社团见面会', '一个同人社团正在举办小型的粉丝交流会。', 'market-finale', { intelligence: 1, score: 6, reputation: 2, result: '你收到了社团交换的无料和联系方式。' }),
        evt('se8', 'market', '帮摊主临时看摊', '一位摊主急着去洗手间，拜托你帮忙看几分钟。', 'market-finale', { score: 5, reputation: 3, result: '你热心帮忙，摊主回来后送了你一套明信片作为感谢。' }),
        evt('se9', 'market', '参加同人作者签售', '一位知名的同人画师正在签售，队伍排得很长。', 'market-finale', { mood: 5, score: 6, result: '轮到你了，画师认真地在扉页上画了你的专属签绘。' }),
        evt('se10', 'coser-interact', '邀请Coser一起拍合照', '礼貌地询问能否一起合影。', 'coser-finale', { mood: 4, score: 5, affection: 10, result: '你们在摄影师面前留下了愉快的一张合照。' }),
        evt('se11', 'coser-interact', '帮Coser拍返图', '对方的手机没电了，请你帮忙拍几张然后传过去。', 'coser-finale', { charm: 1, score: 5, affection: 12, result: '你认真调整角度拍了几张，对方看了后非常满意。' }),
        evt('se12', 'coser-interact', '发现对方也是你推的CP粉', '聊到角色剧情时，你们发现站的是同一对CP。', 'coser-finale', { mood: 7, score: 6, affection: 14, result: '你们兴奋地聊了将近半小时的角色分析。' }, { chain: 'se1' }),
        evt('se13', 'coser-select', '偶遇一位上次漫展认识的朋友', '对方也认出了你，惊喜地走过来打招呼。', 'coser-interact', { mood: 6, score: 5, affection: 15, result: '你们回忆起上次的活动，约好这次一定要多拍几张。' }),
        evt('se14', 'coser-select', '被一位Coser主动搭话', '一位你一直关注的Coser居然主动走上来夸赞你的穿搭。', 'coser-interact', { mood: 8, score: 6, affection: 10, result: '受宠若惊的感觉让你整个人都飘了起来。' }, { charmMin: 45 }),
        evt('se15', 'market-finale', '约新认识的朋友展后聚餐', '几个聊得来的同好提议展后去附近咖啡厅续摊。花费60元。', '', { cost: 60, mood: 7, score: 5, reputation: 2, finish: true, result: '聚餐时大家交换了社交媒体，约定下次活动再聚。' }),
        evt('se16', 'stage-finale', '被拉去当亲友团助威', '一位参赛者缺亲友团，你被临时拉去举应援牌。', '', { mood: 6, score: 6, reputation: 1, finish: true, result: '你的用心应援让参赛者感动不已，表演更加投入。' }),
        evt('se17', 'entrance', '帮海外参展者翻译', '一位外国同好在售票处犯了难，你上前用英语帮忙沟通。', 'coser-select', { intelligence: 2, score: 6, reputation: 2, result: '对方感激地送你一枚海外的限定徽章。' }, { stat: '学识', statMin: 30 }),
        evt('se18', 'market', '邂逅来扫货的知名UP主', '本地一位动漫区UP主正在摊位前挑货。', 'market-finale', { charm: 2, score: 7, reputation: 3, result: '你们聊起了内容创作，对方关注了你的账号。' }, { reputationMin: 25 }),
        evt('se19', 'stage', '被官方摄影师拍到', '大屏幕上突然出现了你的脸，官方镜头正在扫观众席。', 'stage-finale', { mood: 5, score: 5, reputation: 3, result: '你对着镜头摆了个造型，全场观众都笑了。' }),
        evt('se20', 'coser-interact', '被邀请加入Coser线下社团', '对方热情邀请你加入当地的Coser交流社团。', 'coser-finale', { score: 7, reputation: 4, affection: 10, result: '社团里果然有很多志同道合的朋友。' }, { charmMin: 35, hasFriend: true }),
        evt('se21', 'entrance', '偶遇多年不见的同学', '在人群中你看到了一个熟悉的背影。', 'coser-select', { mood: 7, score: 5, result: '你们聊起了学生时代的往事，感慨时光飞逝。' }),
        evt('se22', 'market-finale', '被人群中的同好认出', '有人小声说"你是不是上次那个……"', '', { mood: 5, score: 4, reputation: 1, finish: true, result: '虽然你们之前没见过，但共同的爱好让对话格外自然。' }, { reputationMin: 20 }),
      ],
      collect: [
        evt('cl1', 'entrance', '领取限定场刊确定目标', '场刊上标注了限量发售的摊位位置。', 'market', { score: 4, result: '你圈出了几个必须打卡的摊位。' }),
        evt('cl2', 'entrance', '向工作人员打听隐藏摊位', '据说会场的角落里有一个不在地图上的秘密摊位。', 'market', { intelligence: 1, score: 5, result: '工作人员悄悄告诉你哪个摊位藏着真正的宝藏。' }),
        evt('cl3', 'entrance', '在入口领取特典明信片', '早鸟入场福利，前100名赠送作者签绘明信片。', 'market', { mood: 4, score: 4, result: '你幸运地排进了前100，领到了一张精美的签绘明信片。' }),
        evt('cl4', 'market', '抢先排队抢购稀有挂画', '摊位刚开张，队伍还不长。花费200元。', 'market-finale', { cost: 200, mood: 8, score: 7, result: '你幸运地买到了限量50份的作者签绘挂画！' }, { moneyMin: 300 }),
        evt('cl5', 'market', '和摊主讨价还价买套装', '交涉能力有优势时能以折扣价拿下。花费120元。', 'market-finale', { cost: 120, score: 5, result: '你用不错的折扣价拿下了心仪的套装。' }, { stat: '交涉', statMin: 22 }),
        evt('cl6', 'market', '在二手摊位捡到大漏', '一本初版画集只卖90元，摊主显然不知道市场价。', 'market-finale', { cost: 90, mood: 8, score: 7, result: '你努力控制住上扬的嘴角，这绝对是今天最大的收获。' }),
        evt('cl7', 'market', '参加摊位集章活动', '在各摊位集满10个印章可以兑换限定奖品。', 'market-finale', { score: 5, reputation: 1, result: '你跑遍了所有参与摊位，终于集齐了印章。' }),
        evt('cl8', 'market', '发现原创画师的出道作', '一位新人画师正在羞涩地展示第一本个人志。花费50元。', 'market-finale', { cost: 50, mood: 5, score: 6, result: '你买下了这本处女作，说不定以后它会升值。' }),
        evt('cl9', 'stage', '购买舞台限定纪念品', '舞台旁设有周边贩售摊位，凭票可购限定品。花费100元。', 'stage-finale', { cost: 100, mood: 5, score: 5, result: '限定的舞台纪念徽章已经入手。' }),
        evt('cl10', 'stage', '竞拍舞台用过的道具', '表演结束后，主办方在拍卖舞台上的原版道具。起拍200元。', 'stage-finale', { cost: 200, mood: 6, score: 7, result: '你举手竞价，最终以合理价格拍下了一件独一无二的舞台道具。' }, { moneyMin: 300 }),
        evt('cl11', 'stage', '参加漫展限定抽赏', '舞台屏幕上滚动着抽奖号码，每抽50元。', 'stage-finale', { cost: 50, mood: 5, score: 5, result: '虽然不是A赏，但B赏的挂件也很可爱。' }),
        evt('cl12', 'coser-interact', '向Coser购买自制周边', '对方展示了自己设计的亚克力挂件和贴纸套装。花费50元。', 'coser-finale', { cost: 50, mood: 4, score: 4, affection: 6, result: '这些小周边设计精美，是独一无二的收藏。' }),
        evt('cl13', 'coser-interact', '用藏品交换Coser的同人本', '你包里恰好有一本对方一直在找的同人本。', 'coser-finale', { score: 6, affection: 14, result: '以物易物，双方都得到了想要的东西。' }, { moneyMin: 50 }),
        evt('cl14', 'coser-select', '发现一位同好的收藏展示', '有人在展示自己多年的藏品，摆了整整一桌。', 'coser-interact', { intelligence: 1, score: 5, result: '你们交流了各自的收藏心得，对方还告诉你几个绝版品来源。' }),
        evt('cl15', 'market-finale', '买到了回家的最后一件心仪物', '散场前最后的冲动消费，你拿下了犹豫了一整天的套装。花费180元。', '', { cost: 180, mood: 7, score: 6, finish: true, result: '虽然钱包在哭，但买到的那一刻一切都值了。' }),
        evt('cl16', 'market', '和藏友竞价稀有手办', '两人同时看中一个限定手办，摊主提议暗标。', 'market-finale', { score: 6, result: '你出的价格刚好压过对方，摊主把稀有手办交到你手里。' }, { moneyMin: 250, stat: '心计', statMin: 18 }),
        evt('cl17', 'entrance', '预购了一本热门画师的新刊', '线上没抢到，线下预留名额居然还有。花费80元。', 'market', { cost: 80, score: 5, result: '你拿到了最后一本预留新刊！' }),
        evt('cl18', 'market', '受邀参观VIP收藏室', '一位收藏家邀请你去看看他私人收藏的绝版珍品。', 'market-finale', { intelligence: 2, score: 6, reputation: 2, result: '那些珍品让你大开眼界，你对收藏的理解又深了一层。' }, { reputationMin: 30 }),
        evt('cl19', 'coser-interact', '交换海外限定藏品', '一位从日本来的coser带来了日本的限定品。', 'coser-finale', { mood: 6, score: 6, affection: 8, result: '你拿本地限定换了对方的日本限定，双方都赚到了。' }, { charmMin: 30 }),
        evt('cl20', 'market', '在跳蚤市场淘到童年回忆', '一个不起眼的角落摊位卖着泛旧的老周边，勾起了你的童年回忆。花费30元。', 'market-finale', { cost: 30, mood: 7, score: 5, result: '廉价的旧玩具，却是无价的情怀。' }),
        evt('cl21', 'stage-finale', '舞台散场后捡到限量海报', '有人在座位上落下了一张限量海报，你问了一圈没人认领。', '', { score: 5, mood: 4, finish: true, result: '你小心地将海报卷好，这算是意外的惊喜。' }),
        evt('cl22', 'entrance', '快速扫描全场锁定目标', '凭借丰富的逛展经验，你在入口处就规划好了最优路线。', 'market', { intelligence: 1, score: 5, result: '你的目标明确，直扑几个最可能售罄的摊位。' }, { chain: 'cl1' }),
      ],
      showcase: [
        evt('sh1', 'entrance', '在入口摄影墙前定妆', '整理服装细节，让第一批跟拍镜头留下完美印象。', 'coser-select', { mood: 4, charm: 1, score: 5, result: '你的造型立刻吸引了摄影师的镜头。' }),
        evt('sh2', 'entrance', '找到最佳光线位置', '观察入口大厅的灯光布局，找到最上镜的角度。', 'coser-select', { intelligence: 1, score: 4, result: '这个位置的侧光刚好能突出你服装的面料质感。' }),
        evt('sh3', 'entrance', '为围观群众即兴摆拍', '一群小朋友被你的造型吸引，围着你转。', 'coser-select', { mood: 6, score: 5, reputation: 2, result: '你摆了几个经典角色姿势，小朋友们兴奋地鼓起掌来。' }),
        evt('sh4', 'stage', '请求参加舞台临时走秀', '主持人正在召唤台下Coser加入即兴走秀环节。', 'stage-finale', { charm: 2, score: 8, reputation: 3, result: '你的即兴走秀获得了全场欢呼！' }, { cosplay: true }),
        evt('sh5', 'stage', '在舞台侧幕练习走位', '躲在不显眼的侧幕后面，对着镜子反复练习。', 'stage-finale', { charm: 1, score: 4, result: '几个路过的coser看到后也加入进来，你们一起完成了走位练习。' }),
        evt('sh6', 'stage', '被邀请上台做特邀展示', '主持人认出你是知名Coser，临时请你上台展示。', 'stage-finale', { score: 9, reputation: 5, result: '你的展示成为今天舞台的高光时刻之一。' }, { reputationMin: 35, cosplay: true }),
        evt('sh7', 'coser-select', '请摄影师拍一组外景', '找到一位持专业设备的摄影师，商量出一组作品。', 'coser-interact', { charm: 1, score: 6, reputation: 2, result: '摄影师对光线和角度非常专业。' }),
        evt('sh8', 'coser-select', '发现摄影区最火的布景', '这个布景前排了十几位Coser等着拍照。', 'coser-interact', { score: 5, reputation: 1, result: '你耐心排队，终于轮到你在这个网红布景前拍照。' }),
        evt('sh9', 'coser-select', '被路人夸赞服装还原度', '两个路过的同好指着你的服装小声惊叹。', 'coser-interact', { mood: 5, score: 4, result: '"这也太像了吧！"她们的夸奖让你一整天的心情都很好。' }, { cosplay: true }),
        evt('sh10', 'coser-interact', '邀请另一位Coser双人合照', '找到穿着同系列角色的Coser提出联合出片。', 'coser-finale', { mood: 5, score: 7, affection: 12, result: '双人造型默契十足，引来大量围观拍摄。' }),
        evt('sh11', 'coser-interact', '接受路人的拍照请求', '几个年轻人不好意思地问能不能拍张照。', 'coser-finale', { mood: 4, score: 4, reputation: 2, result: '你大方地摆好姿势，他们连拍了好几张。' }),
        evt('sh12', 'coser-interact', '评委私下来称赞你的还原', '一位比赛评委路过时驻足，认真看了你的服装细节。', 'coser-finale', { score: 7, reputation: 3, affection: 5, result: '"这套服装的细节处理非常出色，看得出花了大量心思。"' }, { cosplay: true, reputationMin: 20 }),
        evt('sh13', 'market', '购买手持道具提升造型完整度', '摊位上有一款刚好匹配你角色的武器模型。花费150元。', 'market-finale', { cost: 150, score: 7, reputation: 1, result: '加上道具后，你的造型完整度又上了一个档次。' }),
        evt('sh14', 'market', '发现一套绝版的美瞳片', '一家美妆摊位正在清仓，正好有适合你角色的隐形眼镜。花费80元。', 'market-finale', { cost: 80, charm: 1, score: 5, result: '换上这对美瞳后，你的角色还原度提升到了新的层次。' }),
        evt('sh15', 'market', '被美妆博主邀请试妆', '一位美妆博主想要用你的脸演示角色仿妆。', 'market-finale', { charm: 2, score: 6, reputation: 3, result: '演示结束后，博主把仿妆套组送给了你作为答谢。' }, { charmMin: 45 }),
        evt('sh16', 'stage-finale', '接受粉丝的合影请求', '几个穿着同作品角色的小朋友怯生生地走上来想和你拍照。', '', { mood: 6, score: 5, reputation: 4, finish: true, result: '你蹲下来和小朋友们一起比了角色手势，家长在一旁连连感谢。' }),
        evt('sh17', 'stage-finale', '被官方社媒转发返图', '活动官号居然截了你的一张返图发到了首页。', '', { score: 6, reputation: 5, finish: true, result: '你的手机开始疯狂震动，点赞和转发数量飙升。' }, { reputationMin: 30 }),
        evt('sh18', 'market-finale', '临时充当服装救急站', '一位coser的服装出了问题，你拿出自己的工具包帮忙。', '', { score: 5, reputation: 2, affection: 6, finish: true, result: '你熟练地帮她重新固定了配饰，对方感激地送了你一个小零食。' }),
        evt('sh19', 'coser-interact', '被选中参加官方COS大合影', '工作人员正在召集Coser参加官方大合照。', 'coser-finale', { reputation: 3, score: 6, mood: 5, result: '你站在前排，这张合影将出现在活动的官方报道中。' }, { cosplay: true }),
        evt('sh20', 'entrance', '获得官方证件的专业摄影通行证', '工作人员看到你的造型后主动递来一张额外的摄影通行证。', 'coser-select', { score: 5, reputation: 1, result: '有了这张证，你可以进入一些需要许可才能拍摄的区域。' }, { largeScale: true, cosplay: true }),
        evt('sh21', 'stage', '现场教新人Coser摆姿势', '一位初次参展的Coser紧张得不知道怎么站好。', 'stage-finale', { charm: 2, score: 4, reputation: 2, result: '你耐心教她几个经典角色站姿，她感激地表示下次要请你喝奶茶。' }),
        evt('sh22', 'coser-select', '被陌生人认作某角色的官方coser', '一个人坚定地认为你是官方的特约coser。', 'coser-interact', { mood: 7, score: 5, reputation: 2, result: '"我不是官方的啦……"但你心里其实挺开心的。' }, { cosplay: true, charmMin: 38 }),
      ],
    };
  }

  function intentEvents(state, ts) {
    var pool = intentEventPool();
    var events = pool[ts.intent] || pool.social;
    var node = ts.node;
    var candidates = events.filter(function (evt) {
      return (evt.at === node || (Array.isArray(evt.at) && evt.at.indexOf(node) >= 0))
        && checkCondition(state, ts, evt.cond);
    });
    candidates.sort(function () { return Math.random() - 0.5; });
    var maxShow = 3;
    var picked = [];
    for (var i = 0; i < candidates.length && picked.length < maxShow; i += 1) {
      var evt = candidates[i];
      if (evt.cond && evt.cond.chain) ts._chain = evt.cond.chain;
      picked.push({ id: evt.id, label: evt.label, hint: evt.hint, next: evt.next, effect: evt.effect });
    }
    return picked;
  }

  function intentBonus(ts, key) {
    var mapping = {
      compete: { contest: 5, affection: 0, bargain: 0, fame: 0, affinity: -2 },
      social: { contest: 0, affection: 1.3, bargain: 0, fame: 0, affinity: 4 },
      collect: { contest: 0, affection: 0, bargain: 3, fame: 0, affinity: 0 },
      showcase: { contest: 2, affection: 0, bargain: 0, fame: 3, affinity: -2 },
    };
    var bonus = mapping[ts.intent] || {};
    return Number(bonus[key]) || 0;
  }

  function intentReward(state, ts) {
    var score = ts.score || 0;
    var intent = ts.intent;
    var result = { bonus: '', log: '', reward: {} };
    if (intent === 'compete') {
      if (score >= 18 && ts.contest && ts.contest.placed <= 2) {
        result.bonus = '比赛优胜让你的Coser履历增添光彩一笔。';
        state.stats.魅力 = U.clamp((state.stats.魅力 || 20) + 1, 0, 100);
        state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + 3, 0, 100);
      } else if (ts.contest) {
        result.bonus = '比赛经验是成长的阶梯，下次你会准备得更充分。';
      }
    } else if (intent === 'social') {
      var contacts = ts.coserIds.filter(function (id) {
        return Game.people.find(state, id)?.affection >= 55;
      }).length;
      if (contacts >= 1) {
        result.bonus = '你结交了' + contacts + '位新朋友，人脉网络进一步扩展。';
        result.reward.friendship = contacts;
      } else {
        result.bonus = '虽然这次没有深交，但下次活动说不定还能再见。';
      }
    } else if (intent === 'collect') {
      var totalSpent = ts.path.filter(function (p) { return /cost|collect|buy/.test(p); }).length;
      if (totalSpent >= 2) {
        state.collection = state.collection || [];
        state.collection.push({ name: '漫展藏品', from: ts.placeName, month: state.totalMonths, score: score });
        state.collection = state.collection.slice(-30);
        result.bonus = '你的收藏品又增加了一件，可以在家中展示。';
        result.reward.collection = true;
      } else {
        result.bonus = '虽然没买到太多东西，但逛展本身就是一种收获。';
      }
    } else if (intent === 'showcase') {
      if (score >= 16) {
        result.bonus = '全场瞩目的焦点！你的造型获得了大量返图和转发。';
        state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + 4, 0, 100);
        state.stats.心情 = U.clamp((state.stats.心情 || 0) + 8, 0, 100);
      } else {
        result.bonus = '虽然没有博得满堂彩，但展示本身就是一种快乐。';
      }
    }
    return result;
  }
  function options(state, ts, source) {
    const contextual = contextualOptions(state, ts);
    const career = Game.conventionCoserCareer?.options(state, ts) || [];
    const careerConv = careerConventionOptions(state, ts);
    const intent = intentEvents(state, ts);
    if (ts.node !== 'entrance') return [...career, ...intent, ...contextual, ...source];
    return [roleOptions[ts.role] || roleOptions.visitor, ...career, ...careerConv, ...intent, ...contextual, ...source];
  }
  function adjust(state, ts, option) {
    const profile = route(option.id);
    var intentTag = { compete: 'stage', social: 'social', collect: 'market', showcase: 'social' }[ts.intent] || '';
    var matchesIntent = profile.tag === intentTag;
    var bonusContext = matchesIntent ? 4 : 0;
    const result = Game.actionResolver.resolve(state, {
      primary: profile.primary, secondary: profile.secondary,
      difficulty: profile.difficulty, context: context(ts, profile.tag) + bonusContext
        + (Game.conventionCoserCareer?.contextBonus(state, ts, profile.tag) || 0),
      variance: 6, label: option.label,
    });
    var effect = { ...(option.effect || {}) };
    var affectionMult = ts.intent === 'social' ? 1.3 : 1;
    var scoreBonus = 0;
    if (matchesIntent) {
      if (ts.intent === 'compete') scoreBonus = 5;
      if (ts.intent === 'showcase') scoreBonus = 2;
    }
    ['score', 'affection', 'intelligence', 'charm', 'strength'].forEach(function (key) {
      if (Number.isFinite(effect[key])) {
        var mult = key === 'affection' ? affectionMult : 1;
        effect[key] = Math.max(
          key === 'score' || key === 'affection' ? 1 : 0,
          Math.round((effect[key] + (key === 'score' ? scoreBonus : 0)) * result.multiplier * mult * 10) / 10,
        );
      }
    });
    if (ts.intent === 'collect' && matchesIntent && effect.cost) {
      effect.cost = Math.max(0, Math.round(effect.cost * 0.85));
    }
    effect.result = `${effect.result || '你继续探索漫展。'} ${Game.actionResolver.summary(result)}`;
    return { ...option, effect, actionResolution: result };
  }

  Game.conventionParticipant = Object.freeze({
    options, adjust, roleOptions, travelContext, styleRoster,
    intentBonus, intentReward, intentEvents,
  });
}(window));
