(function initAppearanceCatalog(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const item = (name, tags, minAge, maxAge, personalities, temperaments) => ({
    name, tags, minAge, maxAge, personalities: personalities || [], temperaments: temperaments || [],
  });
  const unique = (items) => [...new Map(items.map((entry) => [entry.name, entry])).values()];
  const variants = (families, colors, minAge, maxAge) => families.flatMap(([base, tags]) => (
    colors.map((color) => item(`${color}${base}`, tags, minAge, maxAge))
  ));
  const simple = (field, tags) => C.appearance[field].map((name) => item(name, tags(name), 0, 120));

  const hairFamilies = [
    ['波波头', ['短发', '休闲']], ['狼尾短发', ['短发', '个性']], ['空气刘海长发', ['长发', '校园']],
    ['法式卷发', ['长发', '文艺']], ['低马尾', ['长发', '休闲']], ['高束马尾', ['长发', '运动']],
    ['双马尾', ['长发', '校园']], ['侧编发', ['长发', '文艺']], ['鱼骨辫', ['长发', '文艺']],
    ['寸头', ['短发', '运动']], ['侧分短发', ['短发', '正式']], ['背头', ['短发', '正式']],
    ['锁骨发', ['中发', '休闲']], ['羊毛卷', ['中发', '文艺']], ['挑染层次发', ['中发', '个性']],
  ];
  const hairFinishes = ['清爽', '蓬松', '柔顺'];
  const japaneseHair = [
    item('日式姬发式', ['和风', '长发'], 12, 70), item('传统和风盘发', ['和风', '传统'], 16, 80),
    item('巫女垂顺长发', ['和风', '长发'], 14, 70), item('樱花发簪盘发', ['和风', '传统'], 16, 80),
    item('日式低双马尾', ['和风', '校园'], 8, 35), item('公主切长发', ['和风', '长发'], 10, 60),
    item('武家高束发', ['和风', '传统'], 16, 70), item('日式短碎发', ['和风', '短发'], 8, 70),
  ];

  const topFixed = [
    item('婴儿连体衣', ['居家'], 0, 2), item('彩色童装', ['休闲'], 2, 7),
    item('日式幼稚园制服', ['和风', '校园'], 3, 5),
    item('简洁校服', ['校园'], 6, 18, ['自律', '内向']), item('校园休闲', ['校园', '休闲'], 12, 24),
    item('运动穿搭', ['运动', '休闲'], 8, 65, ['热血', '外向']), item('文艺穿搭', ['文艺'], 14, 75),
    item('通勤正装', ['正式'], 20, 70, ['理性'], ['干练']), item('品质日常', ['休闲'], 18, 90),
    item('舒适棉麻', ['文艺', '休闲'], 30, 120), item('针织开衫', ['校园', '保暖'], 10, 85),
    item('工装外套', ['休闲', '运动'], 15, 70), item('轻便羽绒服', ['保暖'], 5, 100),
  ];
  const outfitGroups = [
    [['校园'], 6, 24, [
      '水手服迷你裙', '水手服过膝裙', '西式制服百褶裙', '西式制服长裤',
      '针织背心衬衫套装', '学院西装短裙套装', '学院西装长裤套装', '校园运动外套',
      '棒球夹克校服套装', '复古学院背带裙', '领结衬衫半身裙', '领带衬衫直筒裤',
    ]],
    [['休闲'], 10, 90, [
      '连帽卫衣束脚裤', '牛仔外套直筒裤', '短款夹克工装裤', '针织开衫连衣裙',
      '宽松毛衣半身裙', '衬衫牛仔裤套装', 'Polo衫休闲裤', '背带裤叠穿套装',
      '都市衬衫裙', '简约T恤阔腿裤', '皮夹克机车裤', '针织马甲长裙',
      '灯芯绒外套套装', '亚麻衬衫九分裤', '连体工装裤', '轻便防晒外套',
    ]],
    [['正式'], 18, 85, [
      '单排扣西装套装', '双排扣西装套装', '职业衬衫铅笔裙', '职业衬衫西装裤',
      '收腰风衣套装', '长款大衣正装', '礼宾燕尾服', '简约礼服长裙',
      '都市西装连衣裙', '商务马甲三件套', '法式小香套装', '立领行政套装',
    ]],
    [['运动'], 8, 75, [
      '慢跑训练服', '篮球训练服', '足球训练服', '网球运动服', '羽毛球运动服',
      '瑜伽休闲服', '棒球比赛服', '滑雪防护服', '骑行运动服', '登山冲锋套装',
      '游泳训练外套', '田径比赛服',
    ]],
    [['文艺'], 12, 80, [
      '画室围裙套装', '复古灯笼袖长裙', '诗人衬衫背心套装', '舞台演出礼服',
      '古典音乐会正装', '摄影马甲旅行装', '手作工坊罩衫', '书店店员围裙装',
      '博物馆讲解员套装', '设计师不对称套装',
    ]],
    [['保暖'], 5, 100, [
      '羊毛大衣高领衫套装', '羽绒外套保暖裤', '摇粒绒户外套装', '绗缝棉服套装',
      '呢料斗篷连衣裙', '皮草领冬季大衣', '长款羽绒服雪地装', '北欧针织冬装',
    ]],
    [['旅行'], 12, 85, [
      '旅行机能套装', '海滨度假长裙', '海滨短袖沙滩装', '城市轻奢旅行装',
      '露营多口袋套装', '雨季防水旅行装', '热带探险套装', '机场通勤套装',
    ]],
  ];
  const distinctTops = outfitGroups.flatMap(([tags, minAge, maxAge, names]) => (
    names.map((name) => item(name, tags, minAge, maxAge))
  ));
  const japaneseTops = [
    item('白绯巫女服', ['和风', '传统'], 16, 80), item('夏日花火浴衣', ['和风', '休闲'], 8, 90),
    item('樱纹小纹和服', ['和风', '传统'], 12, 90), item('成人式振袖', ['和风', '正式'], 18, 35),
    item('毕业袴套装', ['和风', '校园'], 16, 30), item('男性纹付羽织袴', ['和风', '正式'], 18, 80),
    item('夏日甚平', ['和风', '休闲'], 5, 90), item('弓道服', ['和风', '运动'], 12, 70),
    item('剑道服', ['和风', '运动'], 10, 75), item('和风羽织外套', ['和风', '休闲'], 12, 90),
    item('町娘和服', ['和风', '传统'], 14, 80), item('神官狩衣风套装', ['和风', '传统'], 18, 80),
  ];

  const sockFamilies = [
    ['短袜', ['休闲']], ['中筒袜', ['校园']], ['过膝袜', ['校园']], ['条纹袜', ['休闲']],
    ['格纹袜', ['文艺']], ['罗纹袜', ['休闲']], ['运动短袜', ['运动']], ['运动长袜', ['运动']],
    ['羊毛中筒袜', ['保暖']], ['加绒长袜', ['保暖']], ['商务袜', ['正式']], ['船袜', ['休闲']],
    ['分趾足袋袜', ['和风', '传统']], ['蕾丝边袜', ['文艺']], ['压缩运动袜', ['运动']], ['居家绒袜', ['居家', '保暖']],
  ];
  const sockColors = ['黑色', '白色', '灰色', '藏青', '米白', '樱粉'];
  const shoeFamilies = [
    item('高帮帆布鞋', ['校园'], 8, 70), item('缓震跑步鞋', ['运动'], 8, 80),
    item('低帮板鞋', ['休闲'], 10, 80), item('便士乐福鞋', ['正式'], 14, 90),
    item('系带牛津鞋', ['正式'], 16, 90), item('防滑短靴', ['保暖'], 12, 90),
    item('轻便凉鞋', ['休闲'], 6, 90), item('户外登山鞋', ['旅行'], 12, 80),
    item('传统木屐', ['和风', '传统'], 8, 90), item('和服草履', ['和风', '传统'], 8, 90),
  ];
  const normalizeSocks = (name) => {
    if (!name) return '船袜';
    if (!String(name).includes('棉袜')) return name;
    return String(name).includes('中筒') ? '白色中筒袜' : '船袜';
  };

  Game.appearanceCatalog = Object.freeze({
    hairColor: simple('hairColor', (name) => name.includes('银') ? ['个性'] : ['自然']),
    temperament: simple('temperament', () => ['气质']),
    bodyType: C.appearance.bodyType.map((name) => {
      const mature = ['小胸', '丰满'].includes(name);
      return item(name, ['身材'], name === '幼小' ? 0 : (mature ? 12 : 6), name === '幼小' ? 11 : 120);
    }),
    hairstyle: unique([
      ...simple('hairstyle', (name) => name.includes('短') ? ['短发'] : ['日常']),
      ...variants(hairFamilies, hairFinishes, 8, 90), ...japaneseHair,
    ]),
    top: unique([...topFixed, ...distinctTops, ...japaneseTops]),
    socks: unique([
      ...simple('socks', (name) => name.includes('运动') ? ['运动'] : ['日常']),
      ...variants(sockFamilies, sockColors, 5, 100),
    ]),
    shoes: unique([
      ...simple('shoes', (name) => name.includes('运动') ? ['运动'] : ['日常']),
      ...shoeFamilies,
    ]),
    normalizeSocks,
  });
}(window));
