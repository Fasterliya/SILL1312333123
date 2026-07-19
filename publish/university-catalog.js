(function initUniversityCatalog(root) {
  'use strict';

  const C = root.LifeGame.config;
  const generalMajors = [
    ['计算机科学', '数据科学', '工商管理'],
    ['智能制造', '机电技术', '建筑工程'],
    ['数字媒体', '动画设计', '视觉传达'],
    ['金融学', '法学', '国际商务'],
    ['临床医学', '心理学', '生物科学'],
    ['教育学', '社会学', '公共管理'],
    ['现代服务', '旅游管理', '酒店管理'],
    ['新闻传播', '数字媒体', '文化产业管理'],
  ];
  const internationalMajors = {
    日本: [
      ['日语', '国际商务', '旅游管理'],
      ['动画设计', '数字媒体', '计算机科学'],
      ['智能制造', '机器人技术', '数据科学'],
    ],
    韩国: [
      ['韩语', '国际商务', '文化产业管理'],
      ['数字媒体', '视觉传达', '旅游管理'],
    ],
    新加坡: [['国际商务', '数据科学', '金融学'], ['旅游管理', '公共管理', '计算机科学']],
    法国: [['艺术设计', '文化产业管理', '国际商务'], ['旅游管理', '金融学', '数字媒体']],
    英国: [['金融学', '法学', '国际关系'], ['计算机科学', '数据科学', '新闻传播']],
    美国: [['计算机科学', '数据科学', '工商管理'], ['数字媒体', '金融学', '国际关系']],
  };
  const suffixes = {
    华夏: ['城市大学', '理工学院', '财经传媒大学', '应用技术学院'],
    日本: ['国际大学', '未来科技大学', '文化艺术学院', '产业技术大学'],
    韩国: ['国际大学', '数字文化大学', '产业科学大学'],
    新加坡: ['国际学院', '科技管理大学', '城市应用大学'],
    法国: ['高等学院', '艺术与商业大学', '城市科学学院'],
    英国: ['城市大学', '皇家应用学院', '科技与人文大学'],
    美国: ['城市大学', '州立科技学院', '国际商业大学'],
  };
  const types = ['公立综合', '理工重点', '国际特色', '应用本科'];

  function cityInfo(name) {
    return C.cities.find((city) => city.city === name) || { country: '华夏', tier: 3 };
  }

  function majorsFor(city, index) {
    const sets = internationalMajors[city.country] || generalMajors;
    return sets[(C.cities.indexOf(city) + index) % sets.length].slice(0, 3);
  }

  function normalize(school, index) {
    const city = cityInfo(school.city);
    const fallback = majorsFor(city, index);
    school.id ||= `legacy-u-${index}`;
    school.country ||= city.country;
    school.majors = [...new Set([school.major, ...(school.majors || []), ...fallback].filter(Boolean))].slice(0, 3);
    school.major = school.majors[0];
    school.durationMonths ||= school.type === '高职专科' ? 36 : 48;
    school.international = school.country !== '华夏';
  }

  function addUniversity(city, localIndex, serial) {
    const pool = suffixes[city.country] || suffixes.华夏;
    const suffix = pool[localIndex % pool.length];
    const min = Math.min(680, (city.country === '华夏' ? 350 : 400)
      + (3 - city.tier) * 65 + localIndex * 18);
    const school = {
      id: `city-u-${C.cities.indexOf(city)}-${localIndex}`,
      name: `${city.city}${suffix}`,
      city: city.city,
      country: city.country,
      min,
      type: types[(serial + localIndex) % types.length],
      majors: majorsFor(city, localIndex),
      durationMonths: 48,
      international: city.country !== '华夏',
    };
    school.major = school.majors[0];
    C.universities.push(school);
  }

  C.universities.forEach(normalize);
  const counts = () => Object.fromEntries(C.cities.map((city) => [
    city.city, C.universities.filter((school) => school.city === city.city).length,
  ]));
  let added = 0;
  C.cities.forEach((city) => {
    let count = counts()[city.city];
    while (count < 2) {
      addUniversity(city, count, added);
      added += 1;
      count += 1;
    }
  });
  const expansion = ['东京', '大阪', '北京', '上海', '深圳', '纽约', '巴黎', '伦敦'];
  for (let index = 0; added < 50; index += 1) {
    const city = C.cities.find((item) => item.city === expansion[index % expansion.length]);
    addUniversity(city, counts()[city.city], added);
    added += 1;
  }

  root.LifeGame.universityCatalog = Object.freeze({
    added,
    find(id) {
      return C.universities.find((school) => school.id === id) || null;
    },
  });
}(window));
