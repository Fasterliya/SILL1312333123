(function initConventionTravel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function identityProfile(state) {
    return Game.hunterMode.identity(state).profile;
  }

  function selectedPerson(state, ts) {
    return ts.selectedCoserId ? Game.people.find(state, ts.selectedCoserId) : null;
  }

  function createCoser(state, costume, ts) {
    const age = Math.max(12, U.age(state) + U.between(-3, 4));
    const person = U.person('漫展相识', '', age, null, state.totalMonths);
    Game.worldCulture.applyPerson(person, state.location.country);
    U.setUniqueName(state, person, Game.worldCulture.profile(state.location.country).locale);
    person.affection = U.between(40, 52);
    person.metCity = `${state.location.city}${ts.placeName}`;
    person.currentCity = state.location.city;
    Game.npcLife.syncGrowth(state, person);
    person.cosplay = costume.name;
    person.job = age >= 18 && Math.random() < 0.35 ? '职业Coser' : '业余Coser';
    person.fashion = person.fashion && typeof person.fashion === 'object' ? person.fashion : {};
    person.fashion.cosplayInterest = U.between(78, 100);
    person.fashion.favoriteSeries = costume.series;
    state.travel.encounters.push(person);
    return person;
  }

  function createRoster(state, ts) {
    const pool = Game.cosplayCatalog.items.filter((item) => (
      item.name !== '无' && (!ts.series || item.series === ts.series)
    ));
    const available = pool.slice();
    while (ts.coserIds.length < 3 && available.length) {
      const index = U.between(0, available.length - 1);
      const [costume] = available.splice(index, 1);
      if (ts.coserIds.some((id) => Game.people.find(state, id)?.cosplay === costume.name)) continue;
      ts.coserIds.push(createCoser(state, costume, ts).id);
    }
    Game.conventionParticipant?.styleRoster(state, ts);
  }

  function start(state, edition) {
    const event = edition || {
      id: '', name: '城市漫展', themeName: '综合漫展', series: '',
      organizer: { name: '城市会展公司' },
    };
    const registration = state.conventionCalendar?.registrations?.[event.id]
      || { role: 'visitor', intent: 'social' };
    const ts = {
      placeName: event.name, mode: 'convention', node: 'entrance',
      editionId: event.id, themeName: event.themeName, series: event.series,
      organizerName: event.organizer.name,
      role: registration.role, intent: registration.intent,
      ...(Game.conventionParticipant?.travelContext(event) || {}),
      score: 0, feedback: '抵达会场，先选择最想体验的区域。',
      path: [], total: 4, coserIds: [], selectedCoserId: null, riskCount: 0,
    };
    state.travel.activeStage = ts;
    createRoster(state, ts);
    Game.lifeDirector.addLog(state, '街区旅途', `你开始了${event.name}的多路线探索。`, 'good');
    return { ok: true, message: `${event.name}已开放：摄影区、主舞台和同人摊位都可以探索` };
  }

  function requirementFailure(state, ts, option) {
    const effect = option.effect || {};
    if ((effect.cost || 0) > state.money) return `资金不足，需要${Game.view.money(effect.cost)}`;
    const req = effect.requires || {};
    const ability = Game.characterAttributes.normalize(req.stat);
    const value = ability ? Game.characterAttributes.playerValue(state, ability) : (state.stats[req.stat] || 0);
    if (req.stat && value < req.min) return `${ability || req.stat}需要达到${req.min}`;
    if (req.cosplay && Game.cosplayCatalog.find(identityProfile(state).cosplay).name === '无') {
      return '需要先在角色外观中穿上 COS 服';
    }
    if (req.cosplay && ts.series
      && Game.cosplayCatalog.find(identityProfile(state).cosplay).series !== ts.series) {
      return `${ts.themeName}舞台只接受对应系列的 COS 服`;
    }
    return '';
  }

  function rosterOptions(state, ts) {
    return ts.coserIds.map((id) => {
      const person = Game.people.find(state, id);
      if (!person) return null;
      const costume = Game.cosplayCatalog.find(person.cosplay);
      return {
        id: `select:${id}`, label: `认识 ${person.name} · ${costume.character}`,
        hint: `${costume.series} COS · ${person.job} · 好感 ${person.affection}`,
        next: 'coser-interact',
        effect: { selectId: id, mood: 2, score: 3,
          result: `你走向身穿${costume.name}服装的${person.name}。` },
      };
    }).filter(Boolean);
  }

  function options(state, ts) {
    const node = Game.conventionRoutes.get(ts.node);
    const baseSource = ts.node === 'coser-select' ? rosterOptions(state, ts) : (node?.options || []);
    const source = Game.conventionParticipant?.options(state, ts, baseSource) || baseSource;
    return source.map((item) => ({ ...item, blocked: requirementFailure(state, ts, item) }));
  }

  function chooseFallbackCoser(state, ts) {
    const candidates = ts.coserIds.map((id) => Game.people.find(state, id)).filter(Boolean);
    if (!candidates.length) return null;
    const person = candidates[U.between(0, candidates.length - 1)];
    ts.selectedCoserId = person.id;
    return person;
  }
  function applyEffect(state, ts, option) {
    const effect = option.effect || {};
    if (effect.cost) Game.economy.spend(state, effect.cost);
    if (effect.mood) Game.legacyMood.apply(state, effect.mood, '漫展体验');
    if (effect.health) state.stats.健康 = U.clamp(state.stats.健康 + effect.health, 0, 100);
    if (effect.intelligence) Game.characterAttributes.gain(state, '学识', effect.intelligence, '城市漫展');
    if (effect.charm) Game.characterAttributes.gain(state, '交涉', effect.charm, '城市漫展');
    if (effect.strength) Game.characterAttributes.gain(state, '体能', effect.strength, '城市漫展');
    state.cityLife ||= { reputation: 0, familiarity: {} };
    state.cityLife.familiarity ||= {};
    if (effect.reputation) {
      state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + effect.reputation, 0, 100);
    }
    if (effect.selectId) ts.selectedCoserId = effect.selectId;
    const person = effect.meetCoser ? (selectedPerson(state, ts) || chooseFallbackCoser(state, ts))
      : selectedPerson(state, ts);
    if (person && effect.affection) {
      person.affection = U.clamp(person.affection + effect.affection, 0, 100);
      person.interactions = (person.interactions || 0) + 1;
    }
    if (person && effect.contact) Game.people.addContact(state, person);
    if (effect.total) ts.total = effect.total;
    ts.score += effect.score || 0;
    ts.feedback = effect.result || '你继续探索漫展。';
  }

  function complete(state, ts) {
    const person = selectedPerson(state, ts);
    const connected = Boolean(person?.phoneUnlocked);
    const rating = ts.score >= 18 ? '深度逛展' : (ts.score >= 13 ? '充实参展' : '轻松到访');
    const relation = connected ? `并与${person.name}交换了联系方式` : '';
    state.cityLife.familiarity[state.location.city] = U.clamp(
      (state.cityLife.familiarity[state.location.city] || 0) + 3, 0, 100,
    );
    Game.stressSystem.reduce(state, ts.score >= 18 ? 9 : 5, '漫展体验');
    Game.structuredTraits.addExperience(state.profile, 'traveler');
    state.travel.localHistory.unshift({
      city: state.location.city, place: ts.placeName, month: state.totalMonths,
      score: ts.score, outcome: `${rating}${relation}`,
    });
    state.travel.localHistory = state.travel.localHistory.slice(0, 20);
    state.travel.activeStage = null;
    const summary = `${rating}，评分${ts.score}${relation}。`;
    Game.conventionCalendar?.finishAttendance(state, ts.editionId, {
      score: ts.score, outcome: `${rating}${relation}`,
    });
    Game.lifeDirector.addLog(state, '漫展归来', summary, 'milestone');
    return { ok: true, finished: true, message: `${ts.placeName}完成：${summary}` };
  }

  function choose(state, choiceId) {
    const ts = state.travel?.activeStage;
    if (ts?.mode !== 'convention') return { ok: false, message: '漫展路线已经失效' };
    const option = options(state, ts).find((item) => item.id === choiceId);
    if (!option) return { ok: false, message: '这个漫展选项已经失效' };
    if (option.blocked) return { ok: false, message: option.blocked };
    const resolved = Game.conventionParticipant?.adjust(state, ts, option) || option;
    applyEffect(state, ts, resolved);
    ts.path.push(option.id);
    if (resolved.effect?.finish) return complete(state, ts);
    ts.node = resolved.next;
    return { ok: true, message: ts.feedback };
  }

  function model(state, ts) {
    const node = Game.conventionRoutes.get(ts.node);
    if (!node && ts.node !== 'coser-select') return null;
    const role = Game.conventionCatalog.roles.find((item) => item.id === ts.role)?.name || '游客';
    const intent = Game.conventionCatalog.intents.find((item) => item.id === ts.intent)?.name || '结识同好';
    return {
      node: ts.node,
      title: node?.title || 'COS 摄影区 · 选择想认识的人',
      text: node?.text || '三名 Coser 穿着不同作品的角色服装，选择一位开始交流。',
      step: ts.path.length + 1, total: ts.total || node?.total || 4,
      feedback: ts.feedback, score: ts.score,
      eventName: ts.placeName, themeName: ts.themeName,
      roleName: role, intentName: intent, arrangement: ts.arrangement || '',
      options: options(state, ts),
      people: ts.coserIds.map((id) => Game.people.find(state, id)).filter(Boolean),
      selectedId: ts.selectedCoserId,
    };
  }

  Game.conventionTravel = Object.freeze({ start, choose, model });
}(window));
