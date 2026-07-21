(function initConventionCalendar(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  function hash(value) {
    return [...String(value)].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }
  function ensure(state) {
    state.conventionCalendar = state.conventionCalendar && typeof state.conventionCalendar === 'object'
      ? state.conventionCalendar : {};
    const data = state.conventionCalendar;
    data.version = 6;
    data.registrations = data.registrations && typeof data.registrations === 'object'
      ? data.registrations : {};
    data.attendance = data.attendance && typeof data.attendance === 'object'
      ? data.attendance : {};
    data.contracts = data.contracts && typeof data.contracts === 'object' ? data.contracts : {};
    data.bids = data.bids && typeof data.bids === 'object' ? data.bids : {};
    data.preparation = data.preparation && typeof data.preparation === 'object' ? data.preparation : {};
    data.settlements = data.settlements && typeof data.settlements === 'object' ? data.settlements : {};
    return data;
  }
  function countries() {
    return [...new Set(Game.config.cities.map((city) => city.country || '华夏'))];
  }
  function cityFor(country, seed) {
    const cities = Game.config.cities.filter((city) => (city.country || '华夏') === country);
    return cities[seed % cities.length];
  }
  function npcOrganizer(city, country, seed) {
    const candidates = Game.companyCatalog.inCity(city).filter((company) => (
      /文化|创意|娱乐|演艺/.test(company.industry)
    ));
    const company = candidates.length ? candidates[seed % candidates.length] : null;
    return {
      type: 'npc', companyId: company?.id || `national-convention-${country}`,
      name: company?.name || Game.conventionCatalog.fallbackOrganizer(country),
    };
  }
  function generated(year, country) {
    const seed = hash(`${year}:${country}:annual-convention`);
    const city = cityFor(country, seed);
    const only = seed % 100 >= 55;
    const themes = Game.conventionCatalog.themes;
    const theme = only ? themes[1 + ((seed >>> 8) % (themes.length - 1))] : themes[0];
    const tier = Number(city.tier) || 3;
    const scale = tier === 1 ? ((seed & 2) ? '大型' : '国际级') : (tier === 2 ? '标准' : '地区级');
    const month = 3 + ((seed >>> 13) % 9);
    const organizer = npcOrganizer(city.city, country, seed >>> 5);
    const basePrice = { 国际级: 420, 大型: 320, 标准: 240, 地区级: 180 }[scale];
    return {
      id: `${year}-${country}`, year, month, country, city: city.city,
      themeId: theme.id, themeName: theme.name, series: theme.series,
      kind: theme.id === 'general' ? 'general' : 'only',
      name: `${city.city}${theme.id === 'general' ? '国际动漫游戏展' : theme.name}`,
      scale, ticketPrice: basePrice + (seed % 5) * 20,
      organizer, zones: theme.id === 'general'
        ? ['主舞台', 'COS摄影区', '同人摊位', '商业展区', '休息区']
        : ['主题舞台', '角色摄影区', 'Only同人区', '交流区', '休息区'],
    };
  }
  function organizer(state, edition) {
    return ensure(state).contracts[edition.id]?.organizer || edition.organizer;
  }
  function preparation(state, edition) {
    const data = ensure(state);
    if (!data.preparation[edition.id]) {
      const scale = { 国际级: 72, 大型: 64, 标准: 56, 地区级: 50 }[edition.scale] || 55;
      data.preparation[edition.id] = {
        version: 1, stage: 'assigned', budget: 0,
        quality: scale, safety: scale, promotion: Math.max(45, scale - 4), decisions: [],
      };
    }
    const prep = data.preparation[edition.id];
    prep.sponsors = Array.isArray(prep.sponsors) ? prep.sponsors : [];
    prep.guests = Array.isArray(prep.guests) ? prep.guests : [];
    prep.partnerAttempts = prep.partnerAttempts && typeof prep.partnerAttempts === 'object'
      ? prep.partnerAttempts : { sponsor: [], guest: [] };
    prep.partnerAttempts.sponsor = Array.isArray(prep.partnerAttempts.sponsor)
      ? prep.partnerAttempts.sponsor : [];
    prep.partnerAttempts.guest = Array.isArray(prep.partnerAttempts.guest)
      ? prep.partnerAttempts.guest : [];
    prep.operations = prep.operations && typeof prep.operations === 'object'
      ? prep.operations : { decisions: [], score: 0, completed: false };
    prep.operations.decisions = Array.isArray(prep.operations.decisions)
      ? prep.operations.decisions : [];
    prep.operations.score = Number(prep.operations.score) || 0;
    prep.operations.completed = Boolean(prep.operations.completed);
    return prep;
  }
  function edition(state, year, country) {
    const item = generated(year, country);
    item.organizer = organizer(state, item);
    item.preparation = preparation(state, item);
    Game.conventionFranchise?.decorate(state, item);
    return item;
  }
  function list(state, year = state.year) {
    ensure(state);
    return countries().map((country) => edition(state, year, country))
      .sort((left, right) => left.month - right.month || left.country.localeCompare(right.country));
  }
  function find(state, id) {
    const match = /^(\d+)-(.+)$/.exec(String(id || ''));
    return match ? edition(state, Number(match[1]), match[2]) : null;
  }
  function status(state, item) {
    if (state.year < item.year) return { id: 'announced', label: '预告' };
    if (state.year > item.year || state.month > item.month) return { id: 'ended', label: '已结束' };
    if (state.month === item.month) return { id: 'ongoing', label: '举办中' };
    if (item.month - state.month <= 2) return { id: 'registration', label: '报名中' };
    return { id: 'announced', label: '预告' };
  }
  function eligibleCompanies(state) {
    return (state.companies || []).filter((company) => (
      company.industry === '娱乐'
      && (company.conventionLicense || company.businessLines?.includes('convention'))
    ));
  }
  function assignOrganizer(state, editionId, companyId) {
    const item = find(state, editionId);
    const company = eligibleCompanies(state).find((entry) => entry.id === companyId);
    if (!item || !company) return { ok: false, message: '公司尚未取得漫展承办资格' };
    if (ensure(state).contracts[item.id]) return { ok: false, message: '本届承办合同已经确定' };
    if (!['announced'].includes(status(state, item).id)) return { ok: false, message: '本届承办公司已经锁定' };
    ensure(state).contracts[item.id] = {
      organizer: { type: 'player', companyId: company.id, name: company.name },
      assignedAt: state.totalMonths,
    };
    return { ok: true, message: `${company.name}已接手${item.name}` };
  }
  function updatePreparation(state, editionId, patch, decision) {
    const item = find(state, editionId);
    if (!item || organizer(state, item).type !== 'player') return { ok: false, message: '没有该漫展的筹备权限' };
    const prep = preparation(state, item);
    ['quality', 'safety', 'promotion'].forEach((key) => {
      if (Number.isFinite(patch?.[key])) prep[key] = clamp(patch[key]);
    });
    if (Number.isFinite(patch?.budget)) prep.budget = Math.max(0, Math.round(patch.budget));
    if (decision) prep.decisions.push({ month: state.totalMonths, id: decision });
    prep.decisions = prep.decisions.slice(-12);
    return { ok: true, message: `${item.name}筹备状态已更新` };
  }
  function register(state, editionId, role = 'visitor', intent = 'social') {
    const item = find(state, editionId);
    if (!item || !['registration', 'ongoing'].includes(status(state, item).id)) {
      return { ok: false, message: '当前不在报名期' };
    }
    const roles = Game.conventionCatalog.roles.map((entry) => entry.id);
    const intents = Game.conventionCatalog.intents.map((entry) => entry.id);
    ensure(state).registrations[item.id] = {
      role: roles.includes(role) ? role : 'visitor',
      intent: intents.includes(intent) ? intent : 'social',
      registeredAt: state.totalMonths,
    };
    return { ok: true, message: `已报名${item.name}` };
  }
  function startAttendance(state, editionId) {
    const item = find(state, editionId);
    if (!item || status(state, item).id !== 'ongoing') return { ok: false, message: '漫展当前没有开放' };
    if (item.city !== state.location.city) return { ok: false, message: `需要先前往${item.city}` };
    if (Game.content.age(state) < 12) return { ok: false, message: '12岁后可以独立参加漫展' };
    if (state.travel?.activeStage) return { ok: false, message: '请先完成当前旅途' };
    if (ensure(state).attendance[item.id]?.completed) return { ok: false, message: '本届漫展已经参加过' };
    if (state.money < item.ticketPrice) return { ok: false, message: `门票需要${Game.view.money(item.ticketPrice)}` };
    const stamina = Game.staminaSystem?.spend(state, 20) || { ok: true };
    if (!stamina.ok) return stamina;
    Game.economy.spend(state, item.ticketPrice);
    if (!ensure(state).registrations[item.id]) register(state, item.id);
    const registration = ensure(state).registrations[item.id];
    ensure(state).attendance[item.id] = {
      startedAt: state.totalMonths, completed: false,
      role: registration.role, intent: registration.intent,
    };
    item.preparation = preparation(state, item);
    return Game.conventionTravel.start(state, item);
  }
  function finishAttendance(state, editionId, result) {
    if (!editionId) return;
    const feedback = Game.conventionAudienceFeedback?.capture(state.travel?.activeStage, result);
    ensure(state).attendance[editionId] = {
      ...ensure(state).attendance[editionId], completed: true, completedAt: state.totalMonths,
      score: Math.round(result.score || 0), outcome: result.outcome || '', feedback,
    };
  }

  Game.conventionCalendar = Object.freeze({
    ensure, countries, list, find, status, preparation, eligibleCompanies,
    assignOrganizer, updatePreparation, register, startAttendance, finishAttendance,
  });
}(window));
