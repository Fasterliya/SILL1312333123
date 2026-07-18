(function initAppearanceCatalog(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const item = (name, tags, minAge, maxAge, personalities, temperaments) => ({
    name, tags, minAge, maxAge, personalities: personalities || [], temperaments: temperaments || [],
  });
  const simple = (field, tagMap) => C.appearance[field].map((name) => (
    item(name, tagMap[name] || ['日常'], 0, 120)
  ));

  Game.appearanceCatalog = Object.freeze({
    hairColor: simple('hairColor', {
      黑色: ['自然', '校园'], 深棕: ['自然', '休闲'], 栗色: ['文艺', '休闲'],
      亚麻棕: ['明快', '休闲'], 银灰: ['个性', '文艺'], 黑灰: ['沉稳', '自然'],
    }),
    temperament: C.appearance.temperament.map((name) => item(name, ['气质'], 0, 120,
      name === '明快' ? ['外向', '乐观'] : [], name === '文雅' ? ['文雅'] : [])),
    bodyType: C.appearance.bodyType.map((name) => item(name, ['身材'], name === '幼小' ? 0 : 6,
      name === '幼小' ? 7 : 120)),
    hairstyle: C.appearance.hairstyle.map((name) => {
      const child = ['胎毛短发', '儿童短发'].includes(name);
      const elder = name === '银丝短发';
      const tags = name.includes('马尾') ? ['校园', '运动'] : (name.includes('卷') ? ['文艺', '休闲'] : ['日常']);
      return item(name, tags, elder ? 55 : 0, child ? 7 : 120);
    }),
    top: [
      item('婴儿连体衣', ['居家'], 0, 2), item('彩色童装', ['休闲'], 2, 7),
      item('简洁校服', ['校园'], 6, 18, ['自律', '内向']),
      item('校园休闲', ['校园', '休闲'], 12, 24, ['随和', '慢热']),
      item('运动穿搭', ['运动', '休闲'], 8, 55, ['热血', '外向']),
      item('文艺穿搭', ['文艺', '休闲'], 14, 65, ['温柔', '内向'], ['文雅']),
      item('通勤正装', ['正式'], 20, 65, ['理性'], ['干练', '沉稳']),
      item('品质日常', ['休闲'], 20, 75, ['务实', '随和']),
      item('舒适棉麻', ['文艺', '休闲'], 35, 120, ['温柔'], ['从容']),
      item('针织开衫', ['校园', '文艺', '保暖'], 12, 75, ['温柔', '慢热']),
      item('工装外套', ['休闲', '运动'], 16, 60, ['热血', '外向']),
      item('轻便羽绒服', ['保暖', '休闲'], 6, 90),
    ],
    socks: [
      item('婴儿袜', ['居家', '保暖'], 0, 2), item('短棉袜', ['休闲'], 2, 120),
      item('白色中筒袜', ['校园'], 6, 24), item('船袜', ['休闲'], 12, 70),
      item('运动袜', ['运动'], 6, 75, ['热血', '外向']),
      item('黑色商务袜', ['正式'], 18, 85, ['理性'], ['干练']),
      item('羊毛袜', ['保暖'], 4, 120),
    ],
    shoes: [
      item('婴儿软底鞋', ['居家'], 0, 2), item('魔术贴童鞋', ['校园', '休闲'], 2, 9),
      item('白色运动鞋', ['校园', '运动'], 6, 55), item('帆布鞋', ['校园', '休闲'], 10, 55),
      item('跑步鞋', ['运动'], 8, 80, ['热血', '外向']),
      item('乐福鞋', ['文艺', '正式'], 14, 75, ['温柔'], ['文雅']),
      item('皮鞋', ['正式'], 18, 85, ['理性'], ['干练', '沉稳']),
      item('舒适布鞋', ['休闲'], 45, 120, ['随和'], ['从容']),
    ],
  });
}(window));
