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
    item('简洁校服', ['校园'], 6, 18, ['自律', '内向']), item('校园休闲', ['校园', '休闲'], 12, 24),
    item('运动穿搭', ['运动', '休闲'], 8, 65, ['热血', '外向']), item('文艺穿搭', ['文艺'], 14, 75),
    item('通勤正装', ['正式'], 20, 70, ['理性'], ['干练']), item('品质日常', ['休闲'], 18, 90),
    item('舒适棉麻', ['文艺', '休闲'], 30, 120), item('针织开衫', ['校园', '保暖'], 10, 85),
    item('工装外套', ['休闲', '运动'], 15, 70), item('轻便羽绒服', ['保暖'], 5, 100),
  ];
  const topFamilies = [
    ['衬衫套装', ['校园', '正式']], ['针织背心套装', ['校园', '文艺']], ['连帽卫衣套装', ['休闲', '运动']],
    ['棒球夹克套装', ['校园', '运动']], ['宽松毛衣套装', ['休闲', '保暖']], ['风衣套装', ['正式', '休闲']],
    ['西装套装', ['正式']], ['职业裙装', ['正式']], ['都市连衣裙', ['正式', '文艺']],
    ['牛仔外套套装', ['休闲']], ['工装套装', ['休闲', '运动']], ['慢跑训练服', ['运动']],
    ['网球运动服', ['运动', '校园']], ['篮球训练服', ['运动']], ['瑜伽休闲服', ['运动', '休闲']],
    ['羊毛大衣套装', ['保暖', '正式']], ['羽绒外套套装', ['保暖']], ['摇粒绒套装', ['保暖', '休闲']],
    ['复古学院套装', ['校园', '文艺']], ['画室围裙套装', ['文艺']], ['舞台演出服', ['文艺', '个性']],
    ['旅行机能套装', ['旅行', '运动']], ['海滨度假装', ['旅行', '休闲']], ['城市轻奢套装', ['正式', '休闲']],
  ];
  const topColors = ['黑白', '海军蓝', '雾灰', '樱粉', '松绿', '酒红'];
  const japaneseTops = [
    item('白绯巫女服', ['和风', '传统'], 16, 80), item('夏日花火浴衣', ['和风', '休闲'], 8, 90),
    item('樱纹小纹和服', ['和风', '传统'], 12, 90), item('成人式振袖', ['和风', '正式'], 18, 35),
    item('毕业袴套装', ['和风', '校园'], 16, 30), item('男性纹付羽织袴', ['和风', '正式'], 18, 80),
    item('夏日甚平', ['和风', '休闲'], 5, 90), item('弓道服', ['和风', '运动'], 12, 70),
    item('剑道服', ['和风', '运动'], 10, 75), item('和风羽织外套', ['和风', '休闲'], 12, 90),
    item('町娘和服', ['和风', '传统'], 14, 80), item('神官狩衣风套装', ['和风', '传统'], 18, 80),
  ];

  const sockFamilies = [
    ['短棉袜', ['休闲']], ['中筒棉袜', ['校园']], ['过膝袜', ['校园']], ['条纹袜', ['休闲']],
    ['格纹袜', ['文艺']], ['罗纹袜', ['休闲']], ['运动短袜', ['运动']], ['运动长袜', ['运动']],
    ['羊毛中筒袜', ['保暖']], ['加绒长袜', ['保暖']], ['商务袜', ['正式']], ['船袜', ['休闲']],
    ['分趾足袋袜', ['和风', '传统']], ['蕾丝边袜', ['文艺']], ['压缩运动袜', ['运动']], ['居家绒袜', ['居家', '保暖']],
  ];
  const sockColors = ['黑色', '白色', '灰色', '藏青', '米白', '樱粉'];
  const shoeFamilies = [
    ['帆布鞋', ['校园']], ['跑步鞋', ['运动']], ['板鞋', ['休闲']], ['乐福鞋', ['正式']],
    ['牛津鞋', ['正式']], ['短靴', ['保暖']], ['凉鞋', ['休闲']], ['登山鞋', ['旅行']],
    ['木屐', ['和风', '传统']], ['草履', ['和风', '传统']],
  ];
  const shoeColors = ['黑色', '白色', '棕色', '藏青'];

  Game.appearanceCatalog = Object.freeze({
    hairColor: simple('hairColor', (name) => name.includes('银') ? ['个性'] : ['自然']),
    temperament: simple('temperament', () => ['气质']),
    bodyType: C.appearance.bodyType.map((name) => item(name, ['身材'], name === '幼小' ? 0 : 6, name === '幼小' ? 7 : 120)),
    hairstyle: unique([
      ...simple('hairstyle', (name) => name.includes('短') ? ['短发'] : ['日常']),
      ...variants(hairFamilies, hairFinishes, 8, 90), ...japaneseHair,
    ]),
    top: unique([...topFixed, ...variants(topFamilies, topColors, 10, 90), ...japaneseTops]),
    socks: unique([
      ...simple('socks', (name) => name.includes('运动') ? ['运动'] : ['日常']),
      ...variants(sockFamilies, sockColors, 5, 100),
    ]),
    shoes: unique([
      ...simple('shoes', (name) => name.includes('运动') ? ['运动'] : ['日常']),
      ...variants(shoeFamilies, shoeColors, 6, 100),
    ]),
  });
}(window));
