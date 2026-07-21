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
  function route(choiceId) {
    if (/stage|contestant/.test(choiceId)) return {
      primary: '魅力', secondary: '体能', difficulty: 60, tag: 'stage',
    };
    if (/market|creator|visitor/.test(choiceId)) return {
      primary: '学识', secondary: '管理', difficulty: 50, tag: 'market',
    };
    if (/photo|coser|select|photographer/.test(choiceId)) return {
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
      social: 'social', collect: 'market', compete: 'stage',
      collaborate: 'social', research: 'market', relax: 'general',
    };
    const quality = Math.round(((ts.quality ?? 50) - 50) / 10);
    const safety = ['stage', 'social'].includes(tag)
      ? Math.round(((ts.safety ?? 50) - 50) / 14) : 0;
    const promotion = ['market', 'social'].includes(tag)
      ? Math.round(((ts.promotion ?? 50) - 50) / 14) : 0;
    return (roleMatches[ts.role] === tag ? 6 : 0) + (intentMatches[ts.intent] === tag ? 5 : 0)
      + quality + safety + promotion;
  }
  function options(state, ts, source) {
    const contextual = contextualOptions(state, ts);
    if (ts.node !== 'entrance') return [...contextual, ...source];
    return [roleOptions[ts.role] || roleOptions.visitor, ...contextual, ...source];
  }
  function adjust(state, ts, option) {
    const profile = route(option.id);
    const result = Game.actionResolver.resolve(state, {
      primary: profile.primary, secondary: profile.secondary,
      difficulty: profile.difficulty, context: context(ts, profile.tag),
      variance: 6, label: option.label,
    });
    const effect = { ...(option.effect || {}) };
    ['score', 'affection', 'intelligence', 'charm', 'strength'].forEach((key) => {
      if (Number.isFinite(effect[key])) effect[key] = Math.max(
        key === 'score' || key === 'affection' ? 1 : 0,
        Math.round(effect[key] * result.multiplier * 10) / 10,
      );
    });
    effect.result = `${effect.result || '你继续探索漫展。'} ${Game.actionResolver.summary(result)}`;
    return { ...option, effect, actionResolution: result };
  }

  Game.conventionParticipant = Object.freeze({
    options, adjust, roleOptions, travelContext, styleRoster,
  });
}(window));
