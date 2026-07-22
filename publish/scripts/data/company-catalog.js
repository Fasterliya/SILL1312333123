(function initCompanyCatalog(root) {
  'use strict';

  const Game = root.LifeGame;
  const C = Game.config;
  const VENUE_JOBS = new Set(['idol-underground', 'idoltrainee', 'idol', 'magicalgirl']);
  const INDEPENDENT_JOBS = new Set(['prostitute']);
  const archetypes = [
    {
      industry: '科技研发', specialty: '软件、产品与数据研发',
      roles: [
        ['软件开发工程师', 3, 76, '科学', ['计算机科学', '数据科学']],
        ['产品运营经理', 2, 68, '社交', ['计算机科学', '工商管理']],
        ['数据分析专员', 2, 70, '商业', ['数据科学', '金融学']],
      ],
    },
    {
      industry: '商贸金融', specialty: '供应链、财务与客户业务',
      roles: [
        ['供应链计划师', 2, 66, '商业', ['工商管理', '现代服务']],
        ['财务分析专员', 3, 74, '商业', ['金融学', '工商管理']],
        ['商务客户经理', 1, 58, '社交', ['工商管理', '现代服务']],
      ],
    },
    {
      industry: '文化创意', specialty: '内容、视觉与城市活动',
      roles: [
        ['视觉设计师', 2, 66, '艺术', ['数字媒体']],
        ['内容策划编辑', 2, 62, '文学', ['数字媒体', '教育学']],
        ['活动制作人', 1, 58, '社交', ['现代服务', '工商管理']],
      ],
    },
    {
      industry: '城市服务', specialty: '公共设施、健康与教育服务',
      roles: [
        ['公共设施工程师', 2, 66, '科学', ['建筑工程', '机电技术']],
        ['健康服务协调员', 2, 64, '社交', ['临床医学', '现代服务']],
        ['教育项目专员', 3, 70, '文学', ['教育学', '工商管理']],
      ],
    },
    {
      industry: '生活消费', specialty: '门店、餐饮与旅行体验',
      roles: [
        ['门店运营主管', 1, 54, '商业', ['现代服务', '工商管理']],
        ['餐饮产品主理人', 1, 52, '艺术', ['现代服务']],
        ['旅行体验顾问', 1, 55, '社交', ['现代服务', '工商管理']],
      ],
    },
    {
      industry: '演艺娱乐', specialty: 'Livehouse、舞台与艺人运营',
      roles: [
        ['舞台运营专员', 1, 54, '社交', ['现代服务', '数字媒体']],
        ['现场音响师', 1, 60, '科学', ['机电技术', '数字媒体']],
        ['艺人统筹', 2, 64, '社交', ['数字媒体', '工商管理']],
      ],
    },
  ];
  const industryGroups = [
    ['科技', '工程', '制造', '游戏', '数据'],
    ['金融', '商业', '物流', '交通', '商贸'],
    ['传媒', '创意', '文化', '会展', '内容'],
    ['医疗', '教育', '公共', '法律', '建筑'],
    ['服务', '餐饮', '技能', '生活', '旅游'],
    ['娱乐', '偶像', '演艺'],
  ];

  function salary(city, companyIndex, roleIndex) {
    const base = city.tier === 1 ? 9800 : (city.tier === 2 ? 7600 : 6200);
    const overseas = city.country === '华夏' ? 1 : 1.2;
    return Math.round((base + companyIndex * 450 + roleIndex * 850) * overseas / 100) * 100;
  }

  C.cities.forEach((city, cityIndex) => {
    const names = Game.cityBusinesses.names(city.city);
    archetypes.forEach((type, companyIndex) => {
      const companyId = `city-c-${cityIndex}-${companyIndex}`;
      const company = {
        id: companyId, name: names[companyIndex], parent: '', city: city.city,
        country: city.country, industry: type.industry, specialty: type.specialty, positions: [],
      };
      type.roles.forEach(([name, education, need, category, majors], roleIndex) => {
        const id = `${companyId}-r${roleIndex}`;
        company.positions.push(id);
        C.jobs.push({
          id, name, company: company.name, companyId, industry: type.industry,
          salary: salary(city, companyIndex, roleIndex), need, category, majors,
          education, tier: 3, cities: [city.city], minAge: 18, localCompany: true,
        });
      });
      C.companies.push(company);
    });
  });

  function companyIndex(industry) {
    const text = String(industry || '');
    const index = industryGroups.findIndex((group) => group.some((name) => text.includes(name)));
    return index < 0 ? 4 : index;
  }

  function companyFor(cityName, industry) {
    return C.companies.find((company) => (
      company.city === cityName && company.industry === archetypes[companyIndex(industry)].industry
    )) || null;
  }

  function localizeJob(job, cityName) {
    if (!job) return null;
    if (job.localCompany) return job.cities?.includes(cityName) ? job : null;
    if (job.freelance) {
      return { ...job, company: `${cityName}${job.company}`, companyId: `local-${cityName}-${job.id}`,
        parentCompany: '个人独立经营', branchCity: cityName };
    }
    if (INDEPENDENT_JOBS.has(job.id)) {
      return { ...job, company: `${cityName}${job.company}`, companyId: `local-${cityName}-${job.id}`,
        parentCompany: '本地独立场所', branchCity: cityName };
    }
    const company = companyFor(cityName, VENUE_JOBS.has(job.id) ? '娱乐业' : job.industry);
    if (!company) return null;
    return { ...job, company: company.name, companyId: company.id, industry: company.industry,
      parentCompany: '', branchCity: cityName, cities: [cityName] };
  }

  function available(job, cityName) {
    return Boolean(
      (job.localCompany && job.cities?.includes(cityName))
      || job.freelance
      || VENUE_JOBS.has(job.id)
      || INDEPENDENT_JOBS.has(job.id)
      || (job.cities?.length && job.cities.includes(cityName)),
    );
  }

  function jobsInCity(cityName) {
    const city = C.cities.find((item) => item.city === cityName);
    return C.jobs.filter((job) => available(job, cityName)
      && (!city || city.tier <= (job.tier || 3)))
      .map((job) => localizeJob(job, cityName)).filter(Boolean);
  }

  function normalizeCareer(state) {
    if (!state?.career?.jobId || !state.location?.city) return false;
    const source = C.jobs.find((job) => job.id === state.career.jobId);
    const local = localizeJob(source, state.location.city);
    if (!local || state.career.company === local.company) return false;
    state.career.company = local.company;
    if (state.workplace?.companyId) state.workplace.companyId = local.companyId;
    (state.workplace?.rosterIds || []).forEach((id) => {
      const person = Game.people?.find?.(state, id);
      if (person) {
        person.company = local.company;
        person.companyId = local.companyId;
      }
    });
    return true;
  }

  Game.companyCatalog = Object.freeze({
    find(id) {
      return C.companies.find((company) => company.id === id) || null;
    },
    inCity(city) {
      return C.companies.filter((company) => company.city === city);
    },
    companyFor,
    localizeJob,
    jobsInCity,
    normalizeCareer,
  });
}(window));
