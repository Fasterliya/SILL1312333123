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
      surnames: ['Smith', 'Johnson', 'Brown', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Clark', 'Lewis', 'Walker', 'Hall'],
      male: ['Alex', 'Daniel', 'Ethan', 'Julian', 'Noah', 'Ryan', 'Lucas', 'Owen', 'Miles', 'Henry', 'Caleb', 'Nathan'],
      female: ['Emma', 'Olivia', 'Chloe', 'Grace', 'Mia', 'Sophie', 'Ava', 'Lucy', 'Nora', 'Ella', 'Zoe', 'Claire'],
    },
    'en-GB': {
      surnames: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Hall'],
      male: ['Oliver', 'George', 'Arthur', 'Harry', 'Jack', 'Oscar', 'Charlie', 'Theo', 'Alfie', 'Henry', 'Leo', 'James'],
      female: ['Amelia', 'Isla', 'Florence', 'Lily', 'Freya', 'Alice', 'Sophie', 'Emily', 'Grace', 'Charlotte', 'Lucy', 'Ruby'],
    },
    'fr-FR': {
      surnames: ['Martin ', 'Bernard ', 'Dubois ', 'Thomas ', 'Robert ', 'Petit '],
      male: ['Louis', 'Hugo', 'Gabriel', 'Arthur', 'Jules', 'Theo'],
      female: ['Lea', 'Camille', 'Manon', 'Chloe', 'Ines', 'Juliette'],
    },
  };

  const random = (list) => list[Math.floor(Math.random() * list.length)];
  const poolFor = (gender, culture) => cultures[culture || 'zh-CN']?.[gender === '男' ? 'male' : 'female'];

  function makeName(surname, gender, culture) {
    const data = cultures[culture || 'zh-CN'] || cultures['zh-CN'];
    const family = surname || random(data.surnames);
    const given = random(poolFor(gender, culture) || data.male);
    return ['en-US', 'en-GB', 'fr-FR'].includes(culture) ? `${given} ${family}` : family + given;
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
    setUnique,
    surnames(culture) {
      return (cultures[culture || 'zh-CN'] || cultures['zh-CN']).surnames;
    },
  });
}(window));
