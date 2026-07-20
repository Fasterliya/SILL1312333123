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
  };
  const types = ['公立综合', '理工重点', '国际特色', '应用本科'];
  const curatedCountries = new Set(['韩国', '新加坡', '法国', '英国', '美国']);
  const flagshipUniversities = [
    { id: 'kr-snu', name: '首尔国立大学', city: '首尔', country: '韩国', min: 625, type: '世界顶尖综合', majors: ['数据科学', '国际关系', '生物科学'], overseasRequirements: { english: 110, readiness: 68, wealth: 90000 } },
    { id: 'kr-yonsei', name: '延世大学', city: '首尔', country: '韩国', min: 595, type: '私立名校', majors: ['国际商务', '文化产业管理', '数字媒体'], overseasRequirements: { english: 105, readiness: 63, wealth: 80000 } },
    { id: 'kr-korea', name: '高丽大学', city: '首尔', country: '韩国', min: 585, type: '私立名校', majors: ['金融学', '法学', '计算机科学'], overseasRequirements: { english: 100, readiness: 60, wealth: 75000 } },
    { id: 'sg-nus', name: '新加坡国立大学', city: '新加坡', country: '新加坡', min: 655, type: '世界顶尖综合', majors: ['计算机科学', '数据科学', '金融学'], overseasRequirements: { english: 120, readiness: 74, wealth: 150000 } },
    { id: 'sg-ntu', name: '南洋理工大学', city: '新加坡', country: '新加坡', min: 640, type: '世界顶尖理工', majors: ['智能制造', '计算机科学', '国际商务'], overseasRequirements: { english: 115, readiness: 70, wealth: 135000 } },
    { id: 'sg-smu', name: '新加坡管理大学', city: '新加坡', country: '新加坡', min: 610, type: '商科名校', majors: ['金融学', '工商管理', '数据科学'], overseasRequirements: { english: 110, readiness: 65, wealth: 120000 } },
    { id: 'fr-psl', name: '巴黎文理研究大学', city: '巴黎', country: '法国', min: 630, type: '世界顶尖综合', majors: ['艺术设计', '数据科学', '文化产业管理'], overseasRequirements: { english: 105, readiness: 70, wealth: 120000 } },
    { id: 'fr-sorbonne', name: '索邦大学', city: '巴黎', country: '法国', min: 600, type: '公立名校', majors: ['法学', '社会学', '文化产业管理'], overseasRequirements: { english: 100, readiness: 64, wealth: 100000 } },
    { id: 'fr-sciences-po', name: '巴黎政治学院', city: '巴黎', country: '法国', min: 615, type: '人文社科名校', majors: ['国际关系', '公共管理', '新闻传播'], overseasRequirements: { english: 110, readiness: 68, wealth: 110000 } },
    { id: 'uk-imperial', name: '帝国理工学院', city: '伦敦', country: '英国', min: 670, type: '世界顶尖理工', majors: ['计算机科学', '数据科学', '生物科学'], overseasRequirements: { english: 125, readiness: 78, wealth: 200000 } },
    { id: 'uk-ucl', name: '伦敦大学学院', city: '伦敦', country: '英国', min: 650, type: '世界顶尖综合', majors: ['建筑工程', '计算机科学', '心理学'], overseasRequirements: { english: 120, readiness: 73, wealth: 180000 } },
    { id: 'uk-lse', name: '伦敦政治经济学院', city: '伦敦', country: '英国', min: 655, type: '商科社科名校', majors: ['金融学', '国际关系', '法学'], overseasRequirements: { english: 125, readiness: 76, wealth: 190000 } },
    { id: 'us-columbia', name: '哥伦比亚大学', city: '纽约', country: '美国', min: 680, type: '世界顶尖综合', majors: ['数据科学', '金融学', '新闻传播'], overseasRequirements: { english: 130, readiness: 82, wealth: 280000 } },
    { id: 'us-nyu', name: '纽约大学', city: '纽约', country: '美国', min: 635, type: '私立名校', majors: ['数字媒体', '金融学', '工商管理'], overseasRequirements: { english: 115, readiness: 72, wealth: 230000 } },
    { id: 'us-cuny', name: '纽约市立大学', city: '纽约', country: '美国', min: 600, type: '公立综合', majors: ['计算机科学', '工商管理', '新闻传播'], overseasRequirements: { english: 105, readiness: 65, wealth: 160000 } },
  ];

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
  flagshipUniversities.forEach((school, index) => {
    normalize(school, C.universities.length + index);
    C.universities.push(school);
  });
  const counts = () => Object.fromEntries(C.cities.map((city) => [
    city.city, C.universities.filter((school) => school.city === city.city).length,
  ]));
  let added = 0;
  C.cities.forEach((city) => {
    if (curatedCountries.has(city.country)) return;
    let count = counts()[city.city];
    while (count < 2) {
      addUniversity(city, count, added);
      added += 1;
      count += 1;
    }
  });
  const expansion = ['东京', '大阪', '北京', '上海', '深圳', '杭州', '南京', '成都'];
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
