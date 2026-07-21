(function initConventionCatalog(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const themes = Object.freeze([
    { id: 'general', name: '综合漫展', shortName: '综合', series: '', accent: '综合内容' },
    { id: 'touhou', name: '东方Project Only展', shortName: '东方Only',
      series: '东方Project', accent: '东方Project主题' },
    { id: 'starrail', name: '星穹铁道 Only展', shortName: '星铁Only',
      series: '星穹铁道', accent: '星穹铁道主题' },
    { id: 'wuwa', name: '鸣潮 Only展', shortName: '鸣潮Only',
      series: '鸣潮', accent: '鸣潮主题' },
    { id: 'genshin', name: '原神 Only展', shortName: '原神Only',
      series: '原神', accent: '原神主题' },
    { id: 'bluearchive', name: '蔚蓝档案 Only展', shortName: '蔚档Only',
      series: '蔚蓝档案', accent: '蔚蓝档案主题' },
  ]);
  const roles = Object.freeze([
    { id: 'visitor', name: '游客' },
    { id: 'coser', name: 'Coser' },
    { id: 'contestant', name: '比赛选手' },
    { id: 'photographer', name: '摄影师' },
    { id: 'creator', name: '创作者' },
  ]);
  const intents = Object.freeze([
    { id: 'social', name: '结识同好' },
    { id: 'collect', name: '收集周边' },
    { id: 'compete', name: '参加比赛' },
    { id: 'collaborate', name: '拓展合作' },
    { id: 'research', name: '学习取材' },
    { id: 'relax', name: '轻松逛展' },
  ]);
  const prepStages = Object.freeze([
    {
      id: 'venue', name: '场地方案', ability: '管理',
      options: [
        { id: 'venue-efficient', name: '实用型场馆', cost: 40000,
          effects: { quality: 5, safety: 3, promotion: 1 } },
        { id: 'venue-premium', name: '高规格会展中心', cost: 120000,
          effects: { quality: 12, safety: 6, promotion: 4 } },
      ],
    },
    {
      id: 'program', name: '内容配置', ability: '学识',
      options: [
        { id: 'program-market', name: '强化同人与创作区', cost: 50000,
          effects: { quality: 8, safety: 1, promotion: 4 } },
        { id: 'program-stage', name: '强化舞台与嘉宾节目', cost: 90000,
          effects: { quality: 10, safety: -2, promotion: 8 } },
      ],
    },
    {
      id: 'promotion', name: '宣传策略', ability: '交涉',
      options: [
        { id: 'promotion-community', name: '核心社群宣传', cost: 35000,
          effects: { quality: 3, safety: 1, promotion: 8 } },
        { id: 'promotion-broad', name: '跨平台大规模推广', cost: 80000,
          effects: { quality: 2, safety: -3, promotion: 14 } },
      ],
    },
    {
      id: 'safety', name: '现场保障', ability: '心计',
      options: [
        { id: 'safety-basic', name: '标准安保与医疗点', cost: 30000,
          effects: { quality: 1, safety: 7, promotion: 0 } },
        { id: 'safety-full', name: '分区安保与应急团队', cost: 90000,
          effects: { quality: 3, safety: 16, promotion: 1 } },
      ],
    },
  ]);
  const sponsorOffers = Object.freeze([
    {
      id: 'community-alliance', name: '同人社团联合支持',
      primary: '交涉', secondary: '学识', difficulty: 50, value: 70000,
      effects: { quality: 5, safety: 1, promotion: 3 },
    },
    {
      id: 'local-brand', name: '本地消费品牌赞助',
      primary: '管理', secondary: '交涉', difficulty: 56, value: 95000,
      effects: { quality: 1, safety: 0, promotion: 5 },
    },
    {
      id: 'platform-title', name: '内容平台独家冠名',
      primary: '心计', secondary: '管理', difficulty: 68, value: 160000,
      effects: { quality: -2, safety: -3, promotion: 10 },
    },
  ]);
  const guestOffers = Object.freeze([
    {
      id: 'featured-coser', name: '人气 Coser 嘉宾',
      primary: '交涉', secondary: '魅力', difficulty: 54, fee: 40000, draw: 900,
      effects: { quality: 2, safety: -1, promotion: 4 }, themed: true,
    },
    {
      id: 'voice-cast', name: '配音演员舞台嘉宾',
      primary: '交涉', secondary: '管理', difficulty: 66, fee: 90000, draw: 1800,
      effects: { quality: 3, safety: -3, promotion: 7 },
    },
    {
      id: 'creator-panel', name: '创作者座谈嘉宾',
      primary: '学识', secondary: '交涉', difficulty: 48, fee: 30000, draw: 600,
      effects: { quality: 5, safety: 1, promotion: 2 },
    },
  ]);
  const operationPhases = Object.freeze([
    {
      id: 'entry', name: '入场高峰',
      text: '检票口开始聚集人流，需要在通行效率与秩序之间做出选择。',
      options: [
        { id: 'entry-zoned', name: '分区分批放行', primary: '管理', secondary: '心计',
          difficulty: 54, effects: { quality: 2, safety: 6, promotion: -1 } },
        { id: 'entry-open', name: '开放全部闸机快速入场', primary: '体能', secondary: '管理',
          difficulty: 62, effects: { quality: 3, safety: -4, promotion: 4 } },
      ],
    },
    {
      id: 'peak', name: '舞台高峰',
      text: '主舞台与嘉宾活动同时升温，节目延误开始挤压现场空间。',
      options: [
        { id: 'peak-schedule', name: '压缩节目并保护时间表', primary: '管理', secondary: '学识',
          difficulty: 58, effects: { quality: 5, safety: 3, promotion: -2 } },
        { id: 'peak-encore', name: '追加嘉宾互动环节', primary: '交涉', secondary: '魅力',
          difficulty: 66, effects: { quality: 2, safety: -4, promotion: 7 } },
      ],
    },
    {
      id: 'finale', name: '散场收尾',
      text: '闭馆广播响起，返程人流、摊主撤场和线上热度需要同时处理。',
      options: [
        { id: 'finale-controlled', name: '分区闭馆并安排接驳', primary: '管理', secondary: '心计',
          difficulty: 56, effects: { quality: 2, safety: 6, promotion: 0 } },
        { id: 'finale-stream', name: '直播压轴后集中散场', primary: '交涉', secondary: '学识',
          difficulty: 64, effects: { quality: 3, safety: -3, promotion: 6 } },
      ],
    },
  ]);
  const fallbackOrganizers = Object.freeze({
    华夏: '次元城市会展', 日本: '都市创作祭执行委员会', 韩国: '首尔文化活动社',
    新加坡: '狮城流行文化会展', 法国: '巴黎幻想文化协会',
    英国: '伦敦创意活动集团', 美国: '国际流行文化展务公司',
  });

  function theme(id) {
    return themes.find((item) => item.id === id) || themes[0];
  }

  Game.conventionCatalog = Object.freeze({
    themes, roles, intents, prepStages, sponsorOffers, guestOffers, operationPhases, theme,
    fallbackOrganizer: (country) => fallbackOrganizers[country] || `${country}文化会展公司`,
  });
}(window));
