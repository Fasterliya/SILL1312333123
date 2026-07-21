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
    if (ts.node !== 'entrance') return source;
    const special = roleOptions[ts.role] || roleOptions.visitor;
    return [special, ...source];
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

  Game.conventionParticipant = Object.freeze({ options, adjust, roleOptions });
}(window));
