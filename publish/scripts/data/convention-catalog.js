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
  const fallbackOrganizers = Object.freeze({
    华夏: '次元城市会展', 日本: '都市创作祭执行委员会', 韩国: '首尔文化活动社',
    新加坡: '狮城流行文化会展', 法国: '巴黎幻想文化协会',
    英国: '伦敦创意活动集团', 美国: '国际流行文化展务公司',
  });

  function theme(id) {
    return themes.find((item) => item.id === id) || themes[0];
  }

  Game.conventionCatalog = Object.freeze({
    themes, roles, intents, prepStages, theme,
    fallbackOrganizer: (country) => fallbackOrganizers[country] || `${country}文化会展公司`,
  });
}(window));
