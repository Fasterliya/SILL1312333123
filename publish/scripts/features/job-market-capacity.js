(function initJobMarketCapacity(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const LOW_THRESHOLD = new Set([
    'idoltrainee', 'idol-underground', 'welfare', 'coser', 'vtuber',
    'fashionblog', 'prostitute',
  ]);

  function hash(value) {
    let result = 2166136261;
    for (const char of String(value || '')) {
      result ^= char.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function jobCity(state, job) {
    return job?.branchCity || job?.cities?.[0] || state.location.city;
  }

  function demand(state, job) {
    if (!job) return 0;
    const cityName = jobCity(state, job);
    if (job.id === 'idoltrainee') return 10;
    if (job.id === 'idol-underground') return 6;
    if (job.id === 'idol') return 3;
    if (job.freelance) return 5 + (hash(`${cityName}:${job.id}`) % 4);
    const city = Game.config.cities.find((item) => item.city === cityName);
    const base = city?.tier === 1 ? 4 : (city?.tier === 2 ? 3 : 2);
    return base + (hash(`${cityName}:${job.id}`) % 3);
  }

  function personMatches(person, job, city) {
    if (!person || person.status !== '健康') return false;
    if ((person.currentCity || person.careerCity || person.homeCity) !== city) return false;
    return person.jobId === job.id
      || (person.job === job.name && (!job.companyId || person.companyId === job.companyId));
  }

  function archiveStats(state, job, city) {
    const archives = state.socialWorld?.cityArchives || {};
    const ids = new Set();
    let count = 0;
    Object.entries(archives).forEach(([homeCity, records]) => {
      (records || []).forEach((record) => {
        if (!record?.i) return;
        ids.add(record.i);
        if ((record.d || homeCity) === city && record.j === job.id) count += 1;
      });
    });
    return { count, ids };
  }

  function occupied(state, job) {
    const city = jobCity(state, job);
    const archive = archiveStats(state, job, city);
    let count = archive.count + workers(state, job).filter((person) => (
      !archive.ids.has(person.residentKey || person.id)
    )).length;
    if (state.career.jobId === job.id && state.career.company === job.company) count += 1;
    return count;
  }

  function workers(state, job) {
    const city = jobCity(state, job);
    return Game.people.all(state).filter((person) => personMatches(person, job, city));
  }

  function vacancies(state, job) {
    return Math.max(0, demand(state, job) - occupied(state, job));
  }

  function competition(state, job) {
    const total = demand(state, job);
    const left = vacancies(state, job);
    const ratio = total ? left / total : 0;
    if (!left) return '已饱和';
    if (ratio <= 0.25) return '激烈';
    if (ratio <= 0.55) return '较高';
    return '正常';
  }

  function chanceMultiplier(state, job) {
    const total = demand(state, job);
    const left = vacancies(state, job);
    if (!left) return 0;
    const ratio = left / Math.max(1, total);
    return 0.48 + ratio * 0.52;
  }

  function candidateScore(person, job) {
    const education = Number(person.educationLevel) || 0;
    const ability = {
      科学: '学识', 文学: '学识', 艺术: '交涉', 社交: '交涉', 商业: '管理', 运动: '体能',
    }[job.category] || '学识';
    const check = (name) => Game.characterAttributes.checkValue(
      Game.characterAttributes.personValue(person, name),
    );
    const professional = check(ability);
    const negotiation = check('交涉');
    const charm = Game.characterAttributes.derivedCharm(person);
    if (['idoltrainee', 'idol-underground', 'idol'].includes(job.id)) {
      return charm * 0.45 + negotiation * 0.25
        + check('体能') * 0.2 + education * 5;
    }
    return professional * 0.58 + negotiation * 0.16 + education * 12;
  }

  function canNpcEnter(state, person, job) {
    if ((job.education || 0) > (person.educationLevel || 0)) return false;
    if (!vacancies(state, job)) return false;
    const score = candidateScore(person, job);
    const threshold = LOW_THRESHOLD.has(job.id) ? Math.max(28, job.need - 18) : job.need - 5;
    return score >= threshold;
  }

  function summary(state, job) {
    return {
      demand: demand(state, job),
      occupied: occupied(state, job),
      vacancies: vacancies(state, job),
      competition: competition(state, job),
    };
  }

  Game.jobMarket = Object.freeze({
    demand, occupied, vacancies, competition, chanceMultiplier, canNpcEnter, summary, workers,
  });
}(window));
