(function initConventionSchedule(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const frequentCountries = new Set(['华夏', '日本']);

  function hash(value) {
    return [...String(value)].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function countries() {
    return [...new Set(Game.config.cities.map((city) => city.country || '华夏'))];
  }

  function frequency(country) {
    return frequentCountries.has(country) ? 18 : 1;
  }

  function cityFor(country, seed) {
    const cities = Game.config.cities.filter((city) => (
      (city.country || '华夏') === country
    ));
    return cities[seed % cities.length];
  }

  function npcOrganizer(city, country, seed) {
    const candidates = Game.companyCatalog.inCity(city).filter((company) => (
      /文化|创意|娱乐|演艺/.test(company.industry)
    ));
    const company = candidates.length ? candidates[seed % candidates.length] : null;
    return {
      type: 'npc',
      companyId: company?.id || `national-convention-${country}`,
      name: company?.name || Game.conventionCatalog.fallbackOrganizer(country),
    };
  }

  function monthFor(country, slot, seed) {
    const count = frequency(country);
    if (count === 1) return 3 + ((seed >>> 13) % 9);
    return 1 + Math.floor(slot * 12 / count);
  }

  function generated(year, country, slot = 0) {
    const count = frequency(country);
    const index = Math.max(0, Math.min(count - 1, Number(slot) || 0));
    const seed = hash(`${year}:${country}:${index}:convention`);
    const city = cityFor(country, seed);
    const only = seed % 100 >= 55;
    const themes = Game.conventionCatalog.themes;
    const theme = only ? themes[1 + ((seed >>> 8) % (themes.length - 1))] : themes[0];
    const tier = Number(city.tier) || 3;
    const scale = tier === 1 ? ((seed & 2) ? '大型' : '国际级')
      : (tier === 2 ? '标准' : '地区级');
    const organizer = npcOrganizer(city.city, country, seed >>> 5);
    const basePrice = { 国际级: 420, 大型: 320, 标准: 240, 地区级: 180 }[scale];
    return {
      id: `${year}-${country}-${index}`, year, month: monthFor(country, index, seed),
      country, city: city.city, slot: index, annualFrequency: count,
      themeId: theme.id, themeName: theme.name, series: theme.series,
      kind: theme.id === 'general' ? 'general' : 'only',
      name: `${city.city}${theme.id === 'general' ? '国际动漫游戏展' : theme.name}`,
      scale, ticketPrice: basePrice + (seed % 5) * 20, organizer,
      zones: theme.id === 'general'
        ? ['主舞台', 'COS摄影区', '同人摊位', '商业展区', '休息区']
        : ['主题舞台', '角色摄影区', 'Only同人区', '交流区', '休息区'],
    };
  }

  function list(year) {
    return countries().flatMap((country) => (
      Array.from({ length: frequency(country) }, (_, slot) => generated(year, country, slot))
    ));
  }

  function find(id) {
    const current = /^(\d+)-(.+)-(\d+)$/.exec(String(id || ''));
    if (current) return generated(Number(current[1]), current[2], Number(current[3]));
    const legacy = /^(\d+)-(.+)$/.exec(String(id || ''));
    return legacy ? generated(Number(legacy[1]), legacy[2], 0) : null;
  }

  Game.conventionSchedule = Object.freeze({
    countries, frequency, generated, list, find,
  });
}(window));
