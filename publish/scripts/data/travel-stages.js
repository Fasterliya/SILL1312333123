(function initTravelStages(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  const stages = {
    '商业街': [
      { title: '步入商圈', text: '店铺林立，行人如织。橱窗里的商品琳琅满目。',
        options: [['shop', '逛街购物放松心情', { cost: 260, mood: 5, score: 3 }],
          ['observe', '坐在长椅上观察来往人群', { mood: 3, intelligence: 1, score: 2 }],
          ['direct', '直奔目的地不浪费时间', { mood: 1, score: 1 }]] },
      { title: '街区探索', text: '空气中飘着咖啡和烘焙的香气，各家店铺的音乐交织在一起。',
        options: [['cafe', '走进街角咖啡馆小憩', { cost: 80, mood: 4, score: 3 }],
          ['bookstore', '在书店消磨一段安静时光', { intelligence: 2, mood: 2, score: 2 }],
          ['boutique', '逛逛精品店挑选小物件', { cost: 180, mood: 4, charm: 1, score: 3 }]] },
      { title: '偶遇与收尾', text: '夕阳西斜，金色的光线铺满街道。是时候决定今天的收尾了。',
        options: [['chat', '主动与坐在隔壁的人搭讪', { mood: 3, affection: 5, score: 4, meet: true }],
          ['leave', '带着满足的心情自然离开', { mood: 4, score: 2 }]] },
    ],
    '城市公园': [
      { title: '晨光入园', text: '晨雾未散，空气中带着草木特有的清香。',
        options: [['jog', '换上运动装开始晨跑', { 健康: 3, mood: 3, score: 3 }],
          ['lake', '沿着湖边慢慢散步', { mood: 5, score: 2 }],
          ['lawn', '在草坪上铺开垫子休息', { mood: 4, score: 1 }]] },
      { title: '园中活动', text: '渐渐热闹起来。远处有人在打太极，近处有人在喂鸽子。',
        options: [['pigeon', '买一包鸽粮喂鸽子', { cost: 20, mood: 5, score: 2 }],
          ['perform', '驻足观看街头艺人表演', { mood: 6, score: 3 }],
          ['taichi', '加入太极队伍舒展身体', { 健康: 4, mood: 2, score: 4 }]] },
      { title: '午后时光', text: '阳光透过树叶洒下斑驳的光影，长椅上零星坐着休息的人。',
        options: [['chat', '与同在喂鸽子的人聊天', { mood: 3, affection: 4, score: 4, meet: true }],
          ['read', '在树荫下独自看书', { intelligence: 2, mood: 4, score: 2 }]] },
    ],
    '书店街': [
      { title: '书香门廊', text: '整条街都弥漫着纸张和油墨的气味，橱窗里展示着最新的出版物。',
        options: [['new', '直奔新书区寻找最新出版', { intelligence: 3, mood: 2, score: 3 }],
          ['used', '在旧书摊前流连翻阅', { cost: 40, intelligence: 2, mood: 4, score: 2 }],
          ['magazine', '翻翻最新的杂志和期刊', { mood: 5, score: 1 }]] },
      { title: '阅读时光', text: '书架之间的走廊安静而悠长，只有翻页的沙沙声。',
        options: [['sit', '坐下来细细阅读一本好书', { intelligence: 4, mood: 5, score: 4 }],
          ['club', '参加书店的读书分享会', { intelligence: 2, mood: 2, score: 3, meet: true }],
          ['browse', '在各个书架间探索感兴趣的主题', { intelligence: 3, score: 2 }]] },
      { title: '书店社交', text: '咖啡区飘来手冲的香气，几个人正在低声讨论着什么。',
        options: [['talk', '与附近看书的人交流感受', { mood: 3, affection: 6, charm: 1, score: 4, meet: true }],
          ['ask', '向店员请教推荐书目', { intelligence: 1, mood: 3, score: 2 }]] },
    ],
    '车站广场': [
      { title: '人流之中', text: '来来往往的行人拖着行李匆匆而过，广播声和脚步声混成一片。',
        options: [['watch', '坐在候车区观察来往人群', { intelligence: 1, mood: 3, score: 2 }],
          ['coffee', '在站内咖啡店买杯咖啡等待', { cost: 60, mood: 4, score: 3 }],
          ['timetable', '看看列车时刻表规划下次旅行', { intelligence: 2, score: 1 }]] },
      { title: '候车时光', text: '广播一遍遍播报着车次信息，候车室里的陌生人各自消磨着时间。',
        options: [['chat', '与邻座的旅人闲聊', { mood: 3, affection: 5, score: 4, meet: true }],
          ['help', '主动帮迷路的游客指路', { charm: 2, reputation: 2, mood: 4, score: 3 }],
          ['music', '戴上耳机听街头音乐', { cost: 30, mood: 5, score: 2 }]] },
      { title: '月台告别', text: '一列列车缓缓进站，人群涌向月台。有人相聚，有人分离。',
        options: [['memory', '留下一段候车室里的短暂回忆', { mood: 2, affection: 3, score: 3, meet: true }],
          ['hurry', '匆匆离开赶去下一个目的地', { mood: 1, score: 1 }]] },
    ],
    '夜间食街': [
      { title: '夜幕降临', text: '灯箱招牌一间间点亮，空气里弥漫着烧烤、油炸和甜品的味道。',
        options: [['stall', '逛一圈尝尝各家小吃摊', { cost: 120, mood: 6, score: 3 }],
          ['diner', '找一家深夜食堂坐下来', { cost: 200, mood: 5, score: 2 }],
          ['bar', '拐进小酒馆喝一杯', { cost: 160, mood: 4, score: 2 }]] },
      { title: '深夜滋味', text: '越夜越热闹，隔壁桌的对话声、后厨的翻炒声、杯盘的碰撞声汇成宵夜的交响。',
        options: [['vendor', '与小吃摊摊主聊聊家常', { mood: 3, affection: 4, score: 3 }],
          ['share', '与邻桌的人拼桌共食', { cost: 60, mood: 5, affection: 6, score: 4, meet: true }],
          ['alone', '独享深夜美食的安宁', { mood: 7, score: 2 }]] },
      { title: '宵夜尾声', text: '摊主开始收拾桌椅，街灯下只剩下零星的食客还在流连。',
        options: [['tipsy', '微醺中与偶遇的人交换联系方式', { mood: 4, affection: 8, score: 4, meet: true }],
          ['quiet', '安静起身告别这个满足的夜晚', { mood: 5, score: 3 }]] },
    ],
    '城市漫展': [
      { title: '入场排队', text: '队伍蜿蜒了几个弯，Cosplayer和背着痛包的同好们在身边兴奋交谈。',
        options: [['chat', '排队时与身后的同好搭话', { mood: 4, affection: 6, score: 4, meet: true }],
          ['observe', '观察四周的Cosplay造型', { mood: 6, score: 3 }]] },
      { title: '逛展区', text: '场馆里人山人海，同人摊位前人头攒动，官方展台搭得像小型演唱会。',
        options: [['doujin', '在同人摊前淘本子和周边', { cost: 180, mood: 7, score: 4 }],
          ['official', '去官方展台排队看限定展品', { mood: 5, score: 3 }],
          ['photo', '在Cosplay区拍摄和与Coser合影', { cost: 80, mood: 8, charm: 1, score: 5, meet: true }]] },
      { title: '舞台活动', text: '大屏幕上播放着预告片，台下挤满了挥舞着应援棒的粉丝。',
        options: [['watch', '坐进观众席认真观看演出', { mood: 6, score: 3 }],
          ['game', '参加舞台互动游戏赢奖品', { mood: 8, charm: 2, score: 5 }],
          ['backstage', '想办法溜到后台附近', { mood: 4, score: 2 }]] },
      { title: '散场', text: '广播已经开始播报闭馆通知，人流缓慢地向出口移动。',
        options: [['exchange', '与今天认识的同好互加好友', { mood: 4, affection: 10, score: 5, meet: true }],
          ['club', '加入某个主题粉丝社团', { mood: 5, reputation: 3, score: 4 }]] },
    ],
    '创作者市集': [
      { title: '逛摊', text: '每个摊位都展示着创作者的心血——插画、写真集、手作饰品、独立杂志。',
        options: [['art', '仔细欣赏插画摊位的作品', { mood: 5, intelligence: 1, score: 3 }],
          ['photo', '翻阅独立摄影师的写真集', { mood: 4, score: 2 }],
          ['craft', '看手作摊位的各种小物件', { cost: 100, mood: 6, score: 3 }]] },
      { title: '交流', text: '摊主们热情地介绍着自己的创作理念，周围充满了艺术和灵感的碰撞。',
        options: [['creator', '与摊主聊聊创作背后的故事', { mood: 5, affection: 7, score: 5, meet: true }],
          ['support', '买下喜欢的作品支持创作者', { cost: 260, mood: 7, score: 4 }],
          ['idea', '留下合作意向和联系方式', { mood: 3, reputation: 3, score: 3 }]] },
      { title: '收摊', text: '市集接近尾声，夕阳洒在收摊的人群身上，气氛变得柔和而温情。',
        options: [['contact', '与新认识的朋友交换联系方式', { mood: 4, affection: 8, score: 5, meet: true }],
          ['inspire', '带着满满的灵感离开', { mood: 6, intelligence: 2, score: 3 }]] },
    ],
    '红灯区': [
      { title: '踏入烟花巷', text: '霓虹灯映照着狭窄的巷子。穿着暴露的女性倚在门框上，空气里飘着廉价香水和酒精的气味。',
        options: [['premium', '径直走进最高档的会所', { cost: 800, mood: 2, score: 3 }],
          ['browse', '先在巷子里转转观察各家', { mood: 5, score: 2 }],
          ['direct', '直接选最近的店面进去', { cost: 400, mood: 3, score: 1 }]] },
      { title: '选择对象', text: '几位女性向你投来目光，各有风韵——有的穿着水手服，有的穿着高开叉旗袍，有的娇小如学生。',
        options: [['young', '选择最年轻娇小的那位', { mood: 6, cost: 200, score: 4 }],
          ['cute', '选择穿着可爱的制服少女', { mood: 5, cost: 150, score: 3 }],
          ['mature', '选择气质成熟的那位', { mood: 3, cost: 100, score: 2 }]] },
      { title: '房中私语', text: '她带你进入房间。淡淡的熏香和昏黄的灯光让人放松。',
        options: [['gentle', '温柔地和她聊聊天先放松', { affection: 10, mood: 3, score: 3 }],
          ['direct', '不多废话直接开始正事', { mood: 5, score: 2 }],
          ['gift', '先送上小礼物讨她欢心', { cost: 300, affection: 15, mood: 6, score: 5 }]] },
    ],
  };

  function forPlace(placeName) {
    return stages[placeName] || null;
  }

  function stageData(placeName, stage) {
    const entry = stages[placeName];
    return entry ? entry[stage] : null;
  }

  Game.travelStages = Object.freeze({ forPlace, stageData, stages });
}(window));
