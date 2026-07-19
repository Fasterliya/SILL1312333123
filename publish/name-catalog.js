(function initNameCatalog(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const cultures = {
    'zh-CN': {
      surnames: [
        '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '朱',
        '胡', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯',
        '于', '董', '萧', '程', '沈', '叶', '潘', '姚', '夏', '陆', '盛',
      ],
      male: [
        '景行', '明远', '以煊', '思远', '浩然', '宇航', '沐阳', '泽宇', '亦辰', '庭轩',
        '承泽', '修远', '文昊', '俊熙', '弘毅', '嘉树', '云舟', '知衡', '砚川', '屹安',
        '子谦', '绍钧', '怀瑾', '嘉言', '星野', '靖川', '启铭', '博衍', '清和', '昭临',
      ],
      female: [
        '知夏', '雨桐', '若溪', '嘉禾', '清越', '欣彤', '佳妮', '怡然', '秋雨', '思怡',
        '雨霏', '梦怡', '晓雨', '婉若', '安琪', '佳丽', '晓婷', '诗涵', '语桐', '芷晴',
        '若琳', '可欣', '静宜', '书瑶', '念初', '昭宁', '映雪', '舒然', '云舒', '令仪',
      ],
    },
    'ja-JP': {
      surnames: ['佐藤', '铃木', '高桥', '田中', '伊藤', '渡边', '山本', '中村', '小林', '加藤', '吉田', '山田'],
      male: ['悠真', '莲', '拓海', '直树', '翔太', '悠斗', '和也', '大辅', '健太', '凉介', '隼人', '诚'],
      female: ['葵', '凛', '结衣', '阳菜', '美月', '千夏', '樱', '美咲', '七海', '玲奈', '真由', '彩香'],
    },
    'ko-KR': {
      surnames: ['金', '李', '朴', '崔', '郑', '姜', '赵', '尹'],
      male: ['敏俊', '志勋', '贤宇', '道允', '俊昊', '泰成', '成珉', '宇镇'],
      female: ['智恩', '秀妍', '书妍', '多恩', '允儿', '海仁', '彩英', '恩彩'],
    },
    'en-US': {
      surnames: ['史密斯', '约翰逊', '布朗', '米勒', '戴维斯', '威尔逊', '摩尔', '泰勒', '克拉克', '刘易斯', '沃克', '霍尔'],
      male: ['亚历克斯', '丹尼尔', '伊桑', '朱利安', '诺亚', '瑞安', '卢卡斯', '欧文', '迈尔斯', '亨利', '凯莱布', '内森'],
      female: ['艾玛', '奥利维亚', '克洛伊', '格蕾丝', '米娅', '索菲', '艾娃', '露西', '诺拉', '艾拉', '佐伊', '克莱尔'],
    },
    'en-GB': {
      surnames: ['史密斯', '琼斯', '泰勒', '布朗', '威廉姆斯', '威尔逊', '埃文斯', '托马斯', '罗伯茨', '沃克', '赖特', '霍尔'],
      male: ['奥利弗', '乔治', '亚瑟', '哈里', '杰克', '奥斯卡', '查理', '西奥', '阿尔菲', '亨利', '利奥', '詹姆斯'],
      female: ['阿米莉亚', '艾拉', '弗洛伦丝', '莉莉', '弗蕾娅', '爱丽丝', '索菲', '艾米莉', '格蕾丝', '夏洛特', '露西', '鲁比'],
    },
    'fr-FR': {
      surnames: ['马丁', '贝尔纳', '杜布瓦', '托马', '罗贝尔', '珀蒂', '迪朗', '勒鲁瓦', '莫罗', '西蒙'],
      male: ['路易', '雨果', '加布里埃尔', '阿蒂尔', '朱尔', '泰奥', '拉斐尔', '卢卡', '纳唐', '保罗'],
      female: ['莱娅', '卡米耶', '玛侬', '克洛伊', '伊内丝', '朱丽叶', '路易丝', '爱丽丝', '克拉拉', '妮娜'],
    },
  };
  const western = new Set(['en-US', 'en-GB', 'fr-FR']);
  const legacy = {
    'en-US': {
      surnames: 'Smith,Johnson,Brown,Miller,Davis,Wilson,Moore,Taylor,Clark,Lewis,Walker,Hall'.split(','),
      male: 'Alex,Daniel,Ethan,Julian,Noah,Ryan,Lucas,Owen,Miles,Henry,Caleb,Nathan'.split(','),
      female: 'Emma,Olivia,Chloe,Grace,Mia,Sophie,Ava,Lucy,Nora,Ella,Zoe,Claire'.split(','),
    },
    'en-GB': {
      surnames: 'Smith,Jones,Taylor,Brown,Williams,Wilson,Evans,Thomas,Roberts,Walker,Wright,Hall'.split(','),
      male: 'Oliver,George,Arthur,Harry,Jack,Oscar,Charlie,Theo,Alfie,Henry,Leo,James'.split(','),
      female: 'Amelia,Isla,Florence,Lily,Freya,Alice,Sophie,Emily,Grace,Charlotte,Lucy,Ruby'.split(','),
    },
    'fr-FR': {
      surnames: 'Martin,Bernard,Dubois,Thomas,Robert,Petit,Durand,Leroy,Moreau,Simon'.split(','),
      male: 'Louis,Hugo,Gabriel,Arthur,Jules,Theo,Raphael,Lucas,Nathan,Paul'.split(','),
      female: 'Lea,Camille,Manon,Chloe,Ines,Juliette,Louise,Alice,Clara,Nina'.split(','),
    },
  };

  const random = (list) => list[Math.floor(Math.random() * list.length)];
  const poolFor = (gender, culture) => cultures[culture || 'zh-CN']?.[gender === '男' ? 'male' : 'female'];
  const hash = (value) => [...String(value)].reduce((sum, char) => (
    Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
  ), 2166136261);
  const localeFor = (culture) => cultures[culture] ? culture
    : (Game.worldCulture?.profile(culture).locale || 'zh-CN');

  function normalizeSurname(value, culture) {
    const locale = localeFor(culture);
    if (!western.has(locale) || !/[A-Za-z]/.test(value || '')) return value || '';
    const index = legacy[locale].surnames.indexOf(String(value).trim());
    const pool = cultures[locale].surnames;
    return pool[index >= 0 ? index : hash(value) % pool.length];
  }

  function normalizeName(value, gender, culture) {
    const locale = localeFor(culture);
    if (!western.has(locale) || !/[A-Za-z]/.test(value || '')) return value || '';
    const parts = String(value).trim().split(/[\s·]+/);
    const family = normalizeSurname(parts.at(-1), locale);
    const key = gender === '男' ? 'male' : 'female';
    const index = legacy[locale][key].indexOf(parts[0]);
    const pool = cultures[locale][key];
    const given = pool[index >= 0 ? index : hash(value) % pool.length];
    return `${given}·${family}`;
  }

  function makeName(surname, gender, culture) {
    const data = cultures[culture || 'zh-CN'] || cultures['zh-CN'];
    const family = surname || random(data.surnames);
    const given = random(poolFor(gender, culture) || data.male);
    return western.has(culture) ? `${given}·${family}` : family + given;
  }

  function setUnique(state, person, culture) {
    const used = new Set([state.name, ...(Game.people ? Game.people.all(state) : [...state.family, ...state.contacts])].map((item) => (
      typeof item === 'string' ? item : item?.name
    )));
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const candidate = makeName('', person.gender, culture);
      if (!used.has(candidate)) {
        person.name = candidate;
        return;
      }
    }
  }

  Game.nameSystem = Object.freeze({
    cultures: Object.freeze(cultures),
    makeName,
    normalizeName,
    normalizeSurname,
    setUnique,
    surnames(culture) {
      return (cultures[culture || 'zh-CN'] || cultures['zh-CN']).surnames;
    },
  });
}(window));
