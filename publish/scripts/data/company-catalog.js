(function initCompanyCatalog(root) {
  'use strict';

  const C = root.LifeGame.config;
  const brands = {
    华夏: ['云岚智能装备', '九州供应链', '拾光文化传媒', '安城民生服务'],
    日本: ['青叶精密系统', '东町商事', '白鹭映像', '和光城市服务'],
    韩国: ['汉江数字工程', '新罗流通', '星光内容工场', '大韩生活服务'],
    新加坡: ['海峡数据港', '狮城贸易', '滨海创意网络', '城市宜居集团'],
    法国: ['塞纳工业设计', '左岸商贸', '光影文化工坊', '都会公共服务'],
    英国: ['泰晤士工程系统', '王冠供应链', '北辰传媒', '联合城市服务'],
    美国: ['先锋云端科技', '大陆商业网络', '自由港创意', '都会基础设施'],
  };
  const archetypes = [
    {
      industry: '工程科技',
      roles: [
        ['平台系统工程师', 3, 78, '科学', ['计算机科学', '数据科学']],
        ['智能设备工程师', 2, 70, '科学', ['智能制造', '机电技术']],
        ['数据安全分析员', 2, 68, '商业', ['数据科学', '计算机科学']],
      ],
    },
    {
      industry: '商贸物流',
      roles: [
        ['供应链计划师', 2, 70, '商业', ['工商管理', '现代服务']],
        ['国际客户经理', 2, 66, '社交', ['国际商务', '金融学']],
        ['门店运营主管', 1, 58, '商业', ['现代服务', '工商管理']],
      ],
    },
    {
      industry: '文化传媒',
      roles: [
        ['影像内容制作人', 2, 68, '艺术', ['数字媒体', '动画设计', '视觉传达']],
        ['展览与活动策划', 2, 63, '社交', ['文化产业管理', '新闻传播']],
        ['品牌传播编辑', 1, 57, '文学', ['新闻传播', '国际关系']],
      ],
    },
    {
      industry: '城市民生',
      roles: [
        ['公共设施工程师', 2, 68, '科学', ['建筑工程', '机电技术']],
        ['城区运营调度员', 1, 56, '商业', ['现代服务', '工商管理']],
        ['社区健康协调员', 2, 62, '社交', ['临床医学', '心理学', '公共管理']],
      ],
    },
  ];

  function salary(city, companyIndex, roleIndex) {
    const cityBase = city.tier === 1 ? 9800 : (city.tier === 2 ? 7600 : 6200);
    const foreign = city.country === '华夏' ? 1 : 1.22;
    return Math.round((cityBase + companyIndex * 700 + roleIndex * 850) * foreign / 100) * 100;
  }

  C.cities.forEach((city, cityIndex) => {
    archetypes.forEach((type, companyIndex) => {
      const companyId = `city-c-${cityIndex}-${companyIndex}`;
      const brand = (brands[city.country] || brands.华夏)[companyIndex];
      const company = {
        id: companyId,
        name: `${city.city}${brand}`,
        parent: companyIndex < 3 ? `${brand}集团` : '',
        city: city.city,
        country: city.country,
        industry: type.industry,
        positions: [],
      };
      type.roles.forEach(([name, education, need, category, majors], roleIndex) => {
        const id = `${companyId}-r${roleIndex}`;
        company.positions.push(id);
        C.jobs.push({
          id,
          name,
          company: company.name,
          companyId,
          industry: type.industry,
          salary: salary(city, companyIndex, roleIndex),
          need,
          category,
          majors,
          education,
          tier: 3,
          cities: [city.city],
          minAge: 18,
        });
      });
      C.companies.push(company);
    });
  });

  const companyNames = new Map(C.companies.map((company) => [company.name, company]));
  C.jobs.forEach((job, index) => {
    if (job.freelance) return;
    let company = companyNames.get(job.company);
    if (!company) {
      const city = job.cities?.[0] || '全国';
      company = {
        id: `employer-${index}`, name: job.company || `城市企业${index + 1}`,
        parent: '', city, country: C.cities.find((item) => item.city === city)?.country || '华夏',
        industry: job.industry || '综合', positions: [],
      };
      C.companies.push(company);
      companyNames.set(company.name, company);
    }
    job.companyId ||= company.id;
    if (!company.positions.includes(job.id)) company.positions.push(job.id);
  });

  root.LifeGame.companyCatalog = Object.freeze({
    find(id) {
      return C.companies.find((company) => company.id === id) || null;
    },
    inCity(city) {
      return C.companies.filter((company) => company.city === city);
    },
  });
}(window));
