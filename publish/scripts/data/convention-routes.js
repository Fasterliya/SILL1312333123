(function initConventionRoutes(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const option = (id, label, hint, next, effect) => ({
    id, label, hint, next, effect: effect || {},
  });

  const nodes = {
    entrance: {
      step: 1, total: 4, title: '会场入口 · 选择第一站',
      text: '舞台广播、同人摊位和摄影区同时开放，第一站会决定后续遇到的人与事件。',
      options: [
        option('zone-cosplay', '前往 COS 摄影区', '从现场三名 Coser 中选择一位认识。',
          'coser-select', { mood: 2, score: 2, total: 4, result: '你跟随集邮人群来到摄影区。' }),
        option('zone-stage', '赶往主舞台', '观看比赛、帮忙救场，或穿自己的 COS 服登台。',
          'stage', { mood: 2, score: 2, total: 3, result: '舞台灯光亮起，主持人正在召集参与者。' }),
        option('zone-market', '先逛同人摊位', '购买作品、寻找创作者，也可能结识来逛摊的 Coser。',
          'market', { intelligence: 1, score: 2, total: 3, result: '你走进了画册、徽章与手作摊位之间。' }),
      ],
    },
    stage: {
      step: 2, total: 4, title: '主舞台 · 活动开始',
      text: '台前正在进行走秀，后台则缺少临时协助。你的选择会进入不同的舞台事件。',
      options: [
        option('stage-watch', '站到前排认真看走秀', '稳定获得观展体验，继续等待压轴环节。',
          'stage-finale', { mood: 5, score: 4, result: '你看到了几套完成度很高的舞台造型。' }),
        option('stage-help', '去后台帮忙整理道具', '需要一定社交能力，会直接认识一名候场 Coser。',
          'coser-interact', { charm: 2, score: 5, affection: 5, meetCoser: true,
            total: 4, requires: { stat: '交涉', min: 40 }, result: '你的帮助缓解了后台的混乱。' }),
        option('stage-enter', '穿着当前 COS 服报名登台', '只有玩家已经穿着 COS 服时可以选择。',
          'stage-finale', { mood: 6, charm: 2, reputation: 4, score: 7,
            requires: { cosplay: true }, result: '你完成了自己的第一次会场舞台展示。' }),
      ],
    },
    'stage-finale': {
      step: 3, total: 3, title: '舞台压轴 · 决定如何收尾',
      text: '压轴节目即将结束，你可以继续追活动，也可以把今天的舞台经验带走。',
      options: [
        option('stage-cheer', '留到最后为参赛者应援', '提高本次评价并完整看完活动。',
          '', { mood: 5, score: 5, finish: true, result: '你在全场欢呼中看完了压轴节目。' }),
        option('stage-backstage', '跟随工作人员去后台致谢', '会遇到一名刚结束表演的 Coser。',
          'coser-interact', { score: 4, affection: 4, meetCoser: true,
            total: 5, result: '工作人员把你介绍给了一名刚下台的 Coser。' }),
        option('stage-notes', '记录舞台编排与造型细节', '偏向创作积累，不继续社交。',
          '', { intelligence: 3, score: 4, finish: true, result: '你整理出一份完整的舞台观察笔记。' }),
      ],
    },
    market: {
      step: 2, total: 4, title: '同人摊位 · 在作品中选路',
      text: '摊主、限定商品和交流区带来不同收获，消费并不是唯一的推进方式。',
      options: [
        option('market-zine', '购买一本喜欢的同人志', '花费 80 元，获得明确的收藏与心情回报。',
          'market-finale', { cost: 80, mood: 6, score: 5, result: '你买到了一本很合口味的同人志。' }),
        option('market-talk', '询问摊主的创作过程', '通过交流获得创作经验。',
          'market-finale', { intelligence: 3, charm: 1, score: 4,
            result: '摊主分享了从草图到印刷的制作过程。' }),
        option('market-limited', '排队购买限定套装', '花费 160 元，回报较高但需要承担排队。',
          'market-finale', { cost: 160, mood: 8, score: 6,
            result: '你赶在售罄前拿到了限定套装。' }),
      ],
    },
    'market-finale': {
      step: 3, total: 4, title: '摊位交流区 · 最后的机会',
      text: '离开摊位区前，你还能选择一次创作、社交或帮助他人的行动。',
      options: [
        option('market-coser', '和正在挑周边的 Coser 聊作品', '进入 Coser 互动支线。',
          'coser-interact', { mood: 2, score: 4, affection: 4, meetCoser: true,
            total: 5, result: '你们因为喜欢同一部作品聊了起来。' }),
        option('market-share', '把今天的发现整理成推荐', '偏向智力和城市声望。',
          '', { intelligence: 2, reputation: 3, score: 5, finish: true,
            result: '你的推荐帮助其他游客快速找到了感兴趣的摊位。' }),
        option('market-help', '帮助摊主搬运收摊物料', '需要体能达到 40。',
          '', { mood: 3, reputation: 4, score: 5, finish: true,
            strength: 1, requires: { stat: '体能', min: 40 }, result: '你帮摊主顺利完成了收摊。' }),
      ],
    },
    'coser-interact': {
      step: 3, total: 4, title: 'Coser 互动 · 选择交流方式',
      text: '对方的角色与服装都已明确，尊重作品和现场礼仪更容易建立关系。',
      options: [
        option('coser-photo', '先礼貌询问能否合影', '稳妥提升好感和心情。',
          'coser-finale', { mood: 5, score: 5, affection: 8, result: '对方整理好造型，和你完成了一张合影。' }),
        option('coser-lore', '聊这个角色的剧情与设定', '学识达到 40 时可以选择。',
          'coser-finale', { intelligence: 2, score: 6, affection: 10,
            requires: { stat: '学识', min: 40 }, result: '你们从角色设定一路聊到了作品细节。' }),
        option('coser-craft', '称赞服装制作与还原细节', '偏向交涉与创作交流。',
          'coser-finale', { charm: 2, score: 5, affection: 9,
            result: '你注意到的制作细节让对方很开心。' }),
      ],
    },
    'coser-finale': {
      step: 4, total: 4, title: '散场之前 · 决定关系去向',
      text: '短暂交流已经结束，最后的选择决定这名 Coser 会不会进入长期联系人。',
      options: [
        option('coser-contact', '交换联系方式，约下次漫展再见', '保存为联系人，并记录喜欢的作品系列。',
          '', { score: 6, affection: 5, contact: true, finish: true,
            requires: { stat: '交涉', min: 45 },
            result: '你们交换了联系方式，约好下次活动再见。' }),
        option('coser-together', '结伴继续逛完剩余展区', '获得更多好感和心情，但不自动保存联系人。',
          '', { mood: 6, score: 5, affection: 8, finish: true,
            result: '你们结伴逛完了剩余展区。' }),
        option('coser-goodbye', '礼貌道别，把相遇留在今天', '轻量收尾，不改变长期关系。',
          '', { mood: 3, score: 3, affection: 2, finish: true,
            result: '你们在散场人流中礼貌道别。' }),
      ],
    },
  };

  Game.conventionRoutes = Object.freeze({
    get: (id) => nodes[id] || null,
  });
}(window));
