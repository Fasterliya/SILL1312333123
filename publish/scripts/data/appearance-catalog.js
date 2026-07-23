(function initAppearanceCatalog(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var C = Game.config;
  var item = function (name, tags, minAge, maxAge, personalities, temperaments) {
    return {
      name: name, tags: tags, minAge: minAge, maxAge: maxAge,
      personalities: personalities || [], temperaments: temperaments || [],
    };
  };
  var unique = function (items) { return items.filter(function (entry, index, self) { return self.findIndex(function (e) { return e.name === entry.name; }) === index; }); };
  var variants = function (families, colors, minAge, maxAge) {
    return families.reduce(function (list, pair) {
      return list.concat(colors.map(function (color) { return item(color + pair[0], pair[1], minAge, maxAge); }));
    }, []);
  };
  var simple = function (field, tagsFn) { return C.appearance[field].map(function (name) { return item(name, tagsFn(name), 0, 120); }); };

  var hairFamilies = [
    ['波波头', ['短发', '校园']], ['狼尾短发', ['短发', '个性']], ['空气刘海长发', ['长发', '校园']],
    ['法式卷发', ['长发', '可爱']], ['低马尾', ['长发', '校园']], ['高束马尾', ['长发', '校园']],
    ['双马尾', ['长发', '校园']], ['侧编发', ['长发', '可爱']], ['鱼骨辫', ['长发', '可爱']],
    ['锁骨发', ['中发', '可爱']], ['羊毛卷', ['中发', '可爱']], ['挑染层次发', ['中发', '个性']],
  ];
  var hairFinishes = ['清爽', '蓬松', '柔顺'];

  var japaneseHair = [
    item('日式姬发式', ['和风', '长发'], 12, 70), item('传统和风盘发', ['和风'], 16, 80),
    item('巫女垂顺长发', ['和风', '长发'], 14, 70), item('樱花发簪盘发', ['和风'], 16, 80),
    item('日式低双马尾', ['和风', '校园'], 8, 35), item('公主切长发', ['和风', '长发'], 10, 60),
    item('武家高束发', ['和风'], 16, 70), item('日式短碎发', ['和风', '短发'], 8, 70),
    item('岛田髷', ['和风'], 14, 80), item('夜会卷', ['和风'], 16, 80),
    item('水引编发', ['和风'], 12, 70), item('花簪横兵库', ['和风'], 16, 80),
  ];

  var girlYouthHair = [
    '双马尾', '层次长发', '层次碎发', '自然卷发', '钻头卷发', '姬发式',
    '齐肩长发', '腰长发', '高马尾', '单马尾', '自然层次发',
  ].map(function (name) { return item(name, ['校园', '长发'], 6, 17); });

  var cuteHair = [
    item('波浪卷双马尾', ['可爱'], 12, 55),
    item('姬发式刘海卷', ['可爱', '校园'], 12, 55),
    item('波浪长卷发', ['可爱'], 12, 70),
    item('清爽中长发', ['校园'], 6, 60),
    item('整齐中长发', ['校园'], 6, 60),
  ];

  var topFixed = [
    item('婴儿连体衣', ['居家'], 0, 2), item('彩色童装', ['校园'], 2, 7),
    item('日式幼稚园制服', ['和风', '校园'], 3, 5),
    item('幼稚园制服', ['校园'], 6, 7),
    item('JK制服格子裙', ['校园'], 15, 17),
    item('针织开衫制服格子裙', ['校园'], 15, 17),
    item('简洁校服', ['校园'], 6, 18, ['自律', '内向']), item('校园休闲', ['校园'], 12, 24),
    item('文艺穿搭', ['可爱'], 14, 75),
    item('通勤正装', ['正式'], 20, 70, ['理性'], ['清冷']), item('品质日常', ['校园'], 18, 90),
    item('针织开衫', ['校园'], 10, 85),
    item('日式学院制服', ['校园', '和风'], 12, 55),
    item('紧身吊带连衣裙', ['可爱'], 14, 60),
    item('针织连衣裙', ['可爱'], 14, 70),
    item('宽松毛衣', ['可爱'], 14, 70),
    item('日式家居服', ['可爱'], 10, 90),
  ];

  var outfitGroups = [
    [['校园'], 6, 24, [
      '水手服迷你裙', '水手服过膝裙', '西式制服百褶裙', '西式制服长裤',
      '针织背心衬衫套装', '学院西装短裙套装', '学院西装长裤套装', '校园运动外套',
      '棒球夹克校服套装', '复古学院背带裙', '领结衬衫半身裙', '领带衬衫直筒裤',
    ]],
    [['可爱'], 10, 90, [
      '连帽卫衣束脚裤', '牛仔外套直筒裤', '短款夹克工装裤', '针织开衫连衣裙',
      '宽松毛衣半身裙', '衬衫牛仔裤套装', 'Polo衫休闲裤', '背带裤叠穿套装',
      '都市衬衫裙', '简约T恤阔腿裤', '皮夹克机车裤', '针织马甲长裙',
      '轻便防晒外套',
    ]],
    [['正式'], 18, 85, [
      '职业衬衫铅笔裙', '职业衬衫西装裤', '收腰风衣套装',
      '都市西装连衣裙', '法式小香套装',
    ]],
    [['可爱','文艺'], 12, 80, [
      '画室围裙套装', '复古灯笼袖长裙', '诗人衬衫背心套装', '舞台演出礼服',
      '古典音乐会正装', '摄影马甲旅行装', '手作工坊罩衫', '书店店员围裙装',
      '博物馆讲解员套装', '设计师不对称套装',
    ]],
  ];

  var lolitaTops = [
    item('洛丽塔蓬蓬裙', ['可爱'], 12, 60),
    item('甜系洛丽塔套装', ['可爱'], 12, 55),
    item('哥特洛丽塔连衣裙', ['可爱'], 14, 60),
    item('草莓印花吊带裙', ['可爱'], 10, 50),
    item('碎花连衣裙', ['可爱'], 10, 80),
    item('蕾丝边吊带裙', ['可爱'], 14, 55),
    item('蝴蝶结娃娃衫', ['可爱'], 10, 45),
    item('灯笼袖雪纺衫', ['可爱'], 14, 60),
    item('荷叶边半身裙', ['可爱'], 10, 70),
    item('兔耳连帽卫衣', ['可爱'], 10, 40),
    item('贝壳扣针织开衫', ['可爱'], 14, 70),
    item('系带收腰小洋装', ['可爱'], 14, 50),
  ];

  var distinctTops = outfitGroups.reduce(function (list, group) {
    return list.concat(group[3].map(function (name) { return item(name, group[0], group[1], group[2]); }));
  }, []);

  var japaneseTops = [
    item('白绯巫女服', ['和风'], 16, 80), item('夏日花火浴衣', ['和风'], 8, 90),
    item('樱纹小纹和服', ['和风'], 12, 90), item('成人式振袖', ['和风'], 18, 35),
    item('毕业袴套装', ['和风', '校园'], 16, 30),
    item('夏日甚平', ['和风'], 5, 90), item('弓道服', ['和风'], 12, 70),
    item('剑道服', ['和风'], 10, 75), item('和风羽织外套', ['和风'], 12, 90),
    item('町娘和服', ['和风'], 14, 80), item('神官狩衣风套装', ['和风'], 18, 80),
    item('大正浪漫袴套装', ['和风', '校园'], 14, 60),
    item('半幅带日常着物', ['和风', '可爱'], 12, 80),
    item('和风刺绣衬衫', ['和风', '可爱'], 14, 70),
    item('樱花纹半衿襦袢', ['和风'], 12, 80),
    item('绀色水手服', ['和风', '校园'], 12, 60),
    item('白色セーラー服', ['和风', '校园'], 12, 55),
    item('关西襟水手服', ['和风', '校园'], 12, 55),
    item('名古屋襟水手服', ['和风', '校园'], 14, 60),
    item('七夕浴衣', ['和风'], 8, 80),
    item('花魁打掛', ['和风'], 16, 70),
    item('巫女千早', ['和风'], 14, 80),
  ];

  var sockFamilies = [
    ['短袜', ['校园']], ['中筒袜', ['校园']], ['过膝袜', ['校园']],
    ['格纹袜', ['可爱']], ['罗纹袜', ['校园']], ['商务袜', ['正式']], ['船袜', ['校园']],
    ['分趾足袋袜', ['和风']], ['蕾丝边袜', ['可爱']],
  ];
  var sockColors = ['黑色', '白色', '灰色', '藏青', '米白', '樱粉'];

  var specialSocks = [
    item('蝴蝶结蕾丝短袜', ['校园', '可爱'], 8, 60),
    item('荷叶边短袜', ['可爱'], 8, 60),
    item('白色二趾足袋袜', ['和风'], 8, 90),
    item('黑色蕾丝足袋袜', ['和风'], 8, 90),
    item('黑色蕾丝中筒袜', ['可爱'], 14, 60),
  ];

  var shoeFamilies = [
    item('玛丽珍鞋', ['校园'], 6, 11),
    item('高帮帆布鞋', ['校园'], 8, 70),
    item('低帮板鞋', ['校园'], 10, 80), item('便士乐福鞋', ['正式'], 14, 90),
    item('系带牛津鞋', ['正式'], 16, 90),
    item('轻便凉鞋', ['校园'], 6, 90),
    item('传统木屐', ['和风'], 8, 90), item('和服草履', ['和风'], 8, 90),
    item('高木屐', ['和风'], 10, 90), item('駒下駄', ['和风'], 10, 90),
    item('高下駄', ['和风'], 10, 90), item('高底草履', ['和风'], 10, 90),
    item('尖头细跟高跟鞋', ['正式'], 18, 70),
  ];

  var bodyTypeExtras = [
    item('凝胶少萝', ['可爱'], 12, 120),
    item('精致少女', ['校园'], 12, 120),
    item('纤细柔软', ['可爱'], 12, 120),
    item('丰腴', ['正式'], 12, 120),
  ];

  var temperamentExtras = [
    item('安静', ['气质'], 0, 120),
  ];

  var normalizeSocks = function (name) {
    if (!name) return '船袜';
    if (!String(name).includes('棉袜')) return name;
    return String(name).includes('中筒') ? '白色中筒袜' : '船袜';
  };

  /* catalog lookup */
  var _index = {};
  var buildIndex = function () {
    if (Object.keys(_index).length > 0) return;
    var cats = ['hairstyle', 'top', 'socks', 'shoes', 'bodyType', 'hairColor', 'temperament'];
    cats.forEach(function (k) {
      var items = exports[k] || [];
      items.forEach(function (entry) { _index[entry.name] = entry; });
    });
  };

  var find = function (name) { buildIndex(); return _index[name] || null; };
  var byTag = function (tag) {
    buildIndex();
    return Object.values(_index).filter(function (entry) { return entry.tags && entry.tags.indexOf(tag) >= 0; });
  };
  var byTags = function (tags) {
    buildIndex();
    return Object.values(_index).filter(function (entry) {
      return entry.tags && tags.every(function (t) { return entry.tags.indexOf(t) >= 0; });
    });
  };

  var exports = {
    hairColor: simple('hairColor', function (name) { return name.indexOf('银') >= 0 ? ['个性'] : ['自然']; }),
    temperament: unique([
      simple('temperament', function () { return ['气质']; }),
      temperamentExtras,
    ]),
    bodyType: unique([
      C.appearance.bodyType.map(function (name) {
        var mature = ['小胸', '丰满'].indexOf(name) >= 0;
        return item(name, ['身材'], name === '幼小' ? 0 : (mature ? 12 : 6), name === '幼小' ? 11 : 120);
      }),
      bodyTypeExtras,
    ]),
    hairstyle: unique([
      simple('hairstyle', function (name) { return name.indexOf('短') >= 0 ? ['短发'] : ['校园']; }),
      girlYouthHair, variants(hairFamilies, hairFinishes, 8, 90), japaneseHair, cuteHair,
    ]),
    top: unique([topFixed, distinctTops, japaneseTops, lolitaTops]),
    socks: unique([
      simple('socks', function (name) { return name.indexOf('运动') >= 0 ? ['校园'] : ['校园']; }),
      variants(sockFamilies, sockColors, 5, 100), specialSocks,
    ]),
    shoes: unique([
      simple('shoes', function (name) { return name.indexOf('运动') >= 0 ? ['校园'] : ['校园']; }),
      shoeFamilies,
    ]),
    normalizeSocks: normalizeSocks,
  };

  Game.appearanceCatalog = Object.freeze(Object.assign(exports, {
    find: find, byTag: byTag, byTags: byTags,
  }));
}(window));
