(function initCompanyCatalog(root) {
  'use strict';

  const C = root.LifeGame.config;
  const archetypes = [
    {
      suffix: '未来科技研究院', parent: '未来产业集团', industry: '科技',
      roles: [
        ['软件开发工程师', 3, 78, '科学', ['计算机科学', '数据科学']],
        ['数据运营专员', 2, 64, '商业', ['数据科学', '工商管理']],
        ['产品项目助理', 1, 54, '社交', ['工商管理', '数字媒体']],
      ],
    },
    {
      suffix: '国际商业中心', parent: '环球城市商业联盟', industry: '商业',
      roles: [
        ['财务分析专员', 3, 74, '商业', ['金融学', '工商管理']],
        ['客户服务主管', 2, 62, '社交', ['国际商务', '现代服务']],
        ['商务运营助理', 1, 52, '商业', ['工商管理', '国际商务']],
      ],
    },
    {
      suffix: '文化创意社', parent: '新视界文化控股', industry: '创意',
      roles: [
        ['数字内容设计师', 2, 66, '艺术', ['数字媒体', '动画设计', '视觉传达']],
        ['品牌活动策划', 2, 61, '社交', ['文化产业管理', '新闻传播']],
        ['国际文化运营', 1, 55, '文学', ['日语', '韩语', '国际关系', '旅游管理']],
      ],
    },
    {
      suffix: '城市发展集团', parent: '', industry: '城市服务',
      roles: [
        ['城市工程技术员', 2, 67, '科学', ['智能制造', '建筑工程', '机电技术']],
        ['物流调度专员', 1, 54, '商业', ['现代服务', '工商管理']],
        ['健康服务协调员', 2, 60, '社交', ['临床医学', '心理学', '公共管理']],
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
      const company = {
        id: companyId,
        name: `${city.city}${type.suffix}`,
        parent: type.parent,
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
