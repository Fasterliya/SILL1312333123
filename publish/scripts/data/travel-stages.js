(function initTravelStages(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const localMeta = {
    商业街: ['店铺橱窗、咖啡香与来往行人', 'market'],
    城市公园: ['湖畔草木、晨练人群与安静长椅', 'nature'],
    书店街: ['新书架、旧书摊与阅读交流区', 'culture'],
    车站广场: ['车次广播、短暂停留的旅人与月台灯光', 'urban'],
    夜间食街: ['深夜摊档、热锅香气与拼桌食客', 'night'],
    城市漫展: ['同人摊位、舞台活动与装扮同好', 'theme'],
    创作者市集: ['插画、摄影、手作摊位与创作交流', 'culture'],
    红灯区: ['霓虹巷道、会所与成人夜间消费', 'night'],
  };

  const routeCopy = {
    heritage: [['辨认历史入口', '先读建筑格局，再决定从哪条轴线深入。'], ['走进遗存核心', '旧建筑与城市记忆在细节里逐渐清晰。'], ['登临回望', '在离开前把历史景观与今日城市放在一起看。']],
    shrine: [['整理参访礼序', '入口、参道与礼仪提示让脚步自然慢下来。'], ['穿过仪式空间', '香火、林荫与传统建筑形成安静的秩序。'], ['带走一份平静', '人群渐散，适合为这次参访做最后选择。']],
    garden: [['选择园中路线', '水面、廊桥与花木把不同方向分隔开来。'], ['深入园景', '转过一段曲径，视野和声音都发生变化。'], ['在出口前停留', '最后一段景色适合休息、记录或结识同路人。']],
    waterside: [['靠近水岸', '风向、步道与远处轮廓决定了今天的游览节奏。'], ['沿水线探索', '桥梁、船影和岸边生活不断变换。'], ['等到光线变化', '临近返程，水面与城市呈现出另一种层次。']],
    mountain: [['判断登行路线', '坡度、天气和体力决定你能看到多少风景。'], ['抵达半程节点', '视野打开，但继续向上需要更稳定的状态。'], ['完成高处收束', '山风与远景给这段行程留下明确终点。']],
    nature: [['进入生态区域', '先观察环境，再选择轻松或深入的路线。'], ['寻找自然细节', '植物、动物与地形让行程不只是走马观花。'], ['安静结束观察', '离开前可以整理发现，也可以帮助身边游客。']],
    museum: [['规划参观重点', '展线很多，先决定把注意力放在哪里。'], ['细看核心展陈', '展品之间的联系开始构成完整故事。'], ['完成观展笔记', '出口前的回顾会决定这次参观留下什么。']],
    culture: [['寻找创作线索', '作品、街景与创作者正在共同讲述这里。'], ['参与现场交流', '主动提问会获得更多信息，也可能带来新关系。'], ['整理灵感离场', '把零散感受变成可带走的见闻。']],
    theme: [['制定体验顺序', '热门项目、限定活动和排队时间需要取舍。'], ['投入核心体验', '现场节奏加快，选择会直接影响收获。'], ['赶上闭场活动', '最后的演出或互动是提高评价的机会。']],
    market: [['从摊位间选路', '香气、叫卖声与地方商品同时争夺注意力。'], ['深入品尝交流', '消费、询问和分享会带来不同结果。'], ['在街口收尾', '带走战利品、故事或新联系方式。']],
    night: [['适应夜间节奏', '灯光与人流让熟悉的城市显得不同。'], ['进入热闹中心', '越往里走，消费和社交机会越集中。'], ['在散场前决定', '夜色将尽，需要在尽兴与克制之间选择。']],
    urban: [['读懂城市人流', '先观察交通、街口与人群，再确定方向。'], ['穿入街区内部', '主路之外的店铺和公共空间更接近日常生活。'], ['在灯光中返程', '城市仍在运转，但你的这段探索即将结束。']],
    coast: [['确认海岸条件', '海风、潮水和步道状况影响接下来的行动。'], ['沿海湾前进', '开阔视野伴随着更高的体力消耗。'], ['看完海面余光', '返程前可以留下照片、故事或一次相识。']],
  };

  function effect(result, changes, requires, risk) {
    return Object.assign({ result, requires: requires || {} }, changes, risk ? { risk } : {});
  }

  function options(meta, routeType, stage) {
    const place = meta.name;
    const social = ['ask', `向同路人请教${place}的看法`,
      effect(`交流让你听见了${place}的另一种故事。`, { mood: 3, charm: 1, score: 4, meet: true },
        { stat: '交涉', min: 40 })];
    const sets = [
      [
        ['plan', `先研究${place}的导览与路线`,
          effect('清晰的路线让后续探索更从容。', { intelligence: 2, score: 3 })],
        ['record', `从最有代表性的角度记录${place}`,
          effect('你留下了一张能代表此地气质的照片。', { mood: 4, charm: 1, score: 3 }, {},
            { chance: 0.2, stat: '压力', delta: 2, text: '拥挤与等待增加了少量压力。' })],
        social,
      ],
      [
        ['focus', `沿${meta.description}的核心区域深入`,
          effect('认真探索换来了更完整的见闻。', { intelligence: 2, mood: 3, score: 4 },
            { stat: '体能', min: routeType === 'mountain' || routeType === 'coast' ? 55 : 35 })],
        ['experience', `购买一次${place}特色体验`,
          effect('这次投入换来了鲜明而具体的体验。', { cost: 90, mood: 6, score: 5 })],
        ['shortcut', '选择人少但不熟悉的支线',
          effect('偏离主路让你看见了少有人注意的细节。', { mood: 4, intelligence: 1, score: 4 }, {},
            { chance: 0.3, stat: '健康', delta: -3, text: '绕路消耗了额外体力。' })],
      ],
      [
        ['reflect', `整理今天在${place}的见闻`,
          effect('你把零散印象整理成了清晰记忆。', { intelligence: 1, mood: 5, score: 4 })],
        ['help', '帮助一位临时遇到困难的游客',
          effect('善意得到回应，你在当地留下了好口碑。', { reputation: 3, mood: 4, strength: 1, score: 5 },
            { stat: '体能', min: 40 })],
        ['linger', `多停留一会儿等待${place}的最佳光线`,
          effect('等待带来了漂亮的收尾画面。', { mood: 7, score: 5 }, { stat: '体能', min: 35 },
            { chance: 0.18, stat: '健康', delta: -2, text: '久留让身体略感疲惫。' })],
      ],
    ];
    return sets[stage];
  }

  function metaFor(placeName) {
    const local = localMeta[placeName];
    if (local) return { name: placeName, description: local[0], routeType: local[1] };
    return Game.cityAttractions?.find(placeName) || null;
  }

  function forPlace(placeName) {
    const meta = metaFor(placeName);
    const copy = meta && routeCopy[meta.routeType];
    if (!meta || !copy) return [];
    return copy.map(([title, text], index) => ({
      title: `${placeName} · ${title}`,
      text: `${meta.description}。${text}`,
      options: options(meta, meta.routeType, index),
    }));
  }

  function stageData(placeName, stage) {
    return forPlace(placeName)[stage] || null;
  }

  Game.travelStages = Object.freeze({ forPlace, stageData, metaFor });
}(window));
