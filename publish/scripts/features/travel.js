(function initTravel(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {}, U = Game.content;
  const neighborhoods = [
    ['商业街', 120, '店铺与行人很多，适合消费、观察与社交。', 'daily'],
    ['城市公园', 40, '湖畔与绿地节奏舒缓，也有需要体力的路线。', 'daily'],
    ['书店街', 80, '阅读、创作交流与安静相识集中在这里。', 'daily'],
    ['车站广场', 60, '短暂停留的旅人让每次交流都带有偶然性。', 'social'],
    ['夜间食街', 160, '成年后可在深夜摊档中品尝与拼桌。', 'night'],
    ['创作者市集', 180, '作品、摊主与合作机会构成创作探索。', 'creative'],
    ['红灯区', 680, '成年人的深夜消费区域，由独立事件链处理。', 'night'],
  ].map(([name, cost, description, category]) => (
    { name, cost, description, kind: 'neighborhood', category }));
  const filterLabels = ['全部', 'daily:日常休闲', 'social:社交邂逅', 'creative:创作活动', 'night:深夜']; let activeFilter = '全部';
  function ensureTravel(state) { state.travel = state.travel && typeof state.travel === 'object' ? state.travel : {};
    state.travel.encounters = Array.isArray(state.travel.encounters) ? state.travel.encounters : [];
    state.travel.localHistory = Array.isArray(state.travel.localHistory) ? state.travel.localHistory : []; return state.travel;
  }
  const places = (state) => [...(Game.cityAttractions?.forCity(state.location.city) || []), ...neighborhoods];
  function unavailable(state, place) {
    if (['夜间食街', '红灯区'].includes(place.name) && U.age(state) < 18) return '成年后才能前往';
    if (place.name === '创作者市集' && U.age(state) < 12) return '12岁后可以独立参加';
    return '';
  }
  function requirementFailure(state, effect) {
    if ((effect.cost || 0) > state.money) return `资金不足，需要${Game.view.money(effect.cost)}`;
    const req = effect.requires || {};
    if (req.age && U.age(state) < req.age) return `需要年满${req.age}岁`;
    const ability = Game.characterAttributes.normalize(req.stat);
    const value = ability ? Game.characterAttributes.playerValue(state, ability) : (state.stats[req.stat] || 0);
    if (req.stat && value < req.min) return `${ability || req.stat}需要达到${req.min}`;
    return '';
  }
  function requirementText(effect) {
    const parts = [];
    if (effect.cost) parts.push(`资金≥${Game.view.money(effect.cost)}`);
    if (effect.requires?.age) parts.push(`年龄≥${effect.requires.age}`);
    if (effect.requires?.stat) parts.push(`${Game.characterAttributes.normalize(effect.requires.stat) || effect.requires.stat}≥${effect.requires.min}`);
    return parts.join(' · ') || '无额外门槛';
  }
  function rewardText(effect) {
    const labels = { charm: '交涉经验', intelligence: '学习积累',
      strength: '体能经验', health: '健康', reputation: '声望' };
    const gains = Object.entries(labels).filter(([key]) => effect[key])
      .map(([key, label]) => `${label}${effect[key] > 0 ? '+' : ''}${effect[key]}`);
    if (effect.score) gains.push(`评价+${effect.score}`);
    const risk = effect.risk ? `；风险${Math.round(effect.risk.chance * 100)}%` : '';
    return `${gains.join(' · ') || '推进旅途'}${risk}`;
  }
  function addEncounter(state, ts) {
    if (ts.partnerId) return Game.people.find(state, ts.partnerId);
    const age = Math.max(1, U.age(state) + U.between(-3, 3));
    const person = U.person('旅途相识', '', age, null, state.totalMonths);
    Game.worldCulture.applyPerson(person, state.location.country);
    U.setUniqueName(state, person, Game.worldCulture.profile(state.location.country).locale);
    Object.assign(person, { affection: U.between(32, 50), phoneUnlocked: false,
      metCity: `${state.location.city}${ts.placeName}` });
    Game.npcLife.syncGrowth(state, person);
    state.travel.encounters.push(person);
    ts.partnerId = person.id;
    Game.lifeDirector.addLog(state, '旅途相识', `你在${ts.placeName}认识了${person.name}。`, 'good');
    return person;
  }
  function applyEffect(state, ts, effect) {
    if (effect.cost) Game.economy.spend(state, effect.cost);
    if (effect.money) state.money += effect.money;
    if (effect.mood) Game.legacyMood.apply(state, effect.mood, '街区旅途');
    if (effect.health) state.stats.健康 = U.clamp(state.stats.健康 + effect.health, 0, 100);
    if (effect.intelligence && Game.subjectPanel.isStudent(state)) Game.educationSystem.addPreparation(state, effect.intelligence * 2);
    if (effect.charm) Game.characterAttributes.gain(state, '交涉', effect.charm, '街区旅途');
    if (effect.strength) Game.characterAttributes.gain(state, '体能', effect.strength, '街区旅途');
    state.cityLife = state.cityLife || { reputation: 0, familiarity: {} }; state.cityLife.familiarity ||= {};
    if (effect.reputation) state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) + effect.reputation, 0, 100);
    ts.score += effect.score || 0;
    const partner = effect.meet ? addEncounter(state, ts) : (ts.partnerId
      ? Game.people.find(state, ts.partnerId) : null);
    if (partner && effect.affection) partner.affection = U.clamp(partner.affection + effect.affection, 0, 100);
    let riskText = '';
    if (effect.risk && Math.random() < effect.risk.chance) {
      const risk = effect.risk;
      if (risk.stat === '压力') Game.stressSystem.add(state, risk.delta, '旅途风险');
      else state.stats[risk.stat] = U.clamp(state.stats[risk.stat] + risk.delta, 0, 100);
      ts.riskCount += 1;
      riskText = ` ${risk.text}`;
    }
    return `${effect.result || '这一步顺利完成。'}${riskText}`;
  }
  function startTravel(state, placeName) {
    const travel = ensureTravel(state);
    const place = places(state).find((item) => item.name === placeName);
    if (!place) return { ok: false, message: '没有这个城市目的地' };
    if (travel.activeStage) return { ok: false, message: `请先完成${travel.activeStage.placeName}的旅途` };
    if (state.brothelStage?.active || state.hookupStage?.active) return { ok: false, message: '请先完成当前深夜事件' };
    const blocked = unavailable(state, place);
    if (blocked) return { ok: false, message: blocked };
    const cost = Math.round(place.cost);
    if (state.money < cost) return { ok: false, message: `前往${placeName}需要${Game.view.money(cost)}` };
    if (placeName !== '红灯区' && !Game.travelStages?.forPlace(placeName).length) {
      return { ok: false, message: '该地点路线尚未开放' };
    }
    const staminaCost = placeName === '红灯区' ? 35 : 20;
    const stamina = Game.staminaSystem?.spend(state, staminaCost) || { ok: true };
    if (!stamina.ok) return stamina;
    Game.economy.spend(state, cost);
    if (placeName === '红灯区') {
      if (!Game.brothelSystem?.start) return { ok: false, message: '红灯区事件暂不可用' };
      const result = Game.brothelSystem.start(state);
      if (result.ok) recordHistory(state, placeName, 0, '进入独立事件链');
      return result;
    }
    travel.encounters = [];
    travel.activeStage = { placeName, stage: 0, score: 0, partnerId: null, riskCount: 0, feedback: `抵达${placeName}，请选择第一段行动。`, choices: [] };
    Game.lifeDirector.addLog(state, '街区旅途', `你开始了${placeName}的多段探索。`, 'good');
    return { ok: true, message: `开始探索${placeName}` };
  }
  function recordHistory(state, place, score, outcome) {
    state.travel.localHistory.unshift({ city: state.location.city, place, month: state.totalMonths, score, outcome });
    state.travel.localHistory = state.travel.localHistory.slice(0, 20);
  }
  function chooseStage(state, choiceId) {
    const ts = ensureTravel(state).activeStage; if (!ts) return { ok: false, message: '当前没有进行中的旅途' };
    if (ts.mode === 'convention') return Game.conventionTravel.choose(state, choiceId);
    ts.stage = Number.isInteger(ts.stage) ? ts.stage : 0; ts.score = Number.isFinite(ts.score) ? ts.score : 0;
    ts.riskCount = Number.isInteger(ts.riskCount) ? ts.riskCount : 0;
    ts.choices = Array.isArray(ts.choices) ? ts.choices : []; ts.feedback ||= '继续完成这段旅途。';
    const stage = Game.travelStages?.stageData(ts.placeName, ts.stage);
    const choice = stage?.options.find((item) => item[0] === choiceId);
    if (!choice) return { ok: false, message: '选项已失效，请刷新后重试' };
    const blocked = requirementFailure(state, choice[2]);
    if (blocked) return { ok: false, message: blocked };
    ts.feedback = applyEffect(state, ts, choice[2]);
    ts.choices.push(choiceId);
    ts.stage += 1;
    const total = Game.travelStages.forPlace(ts.placeName).length;
    if (ts.stage < total) return { ok: true, message: ts.feedback };
    const city = state.location.city;
    state.cityLife.familiarity[city] = U.clamp((state.cityLife.familiarity[city] || 0) + 2, 0, 100);
    const rating = ts.score >= 13 ? '深入探索' : (ts.score >= 9 ? '充实旅程' : '轻松到访');
    const summary = `${rating}，评分${ts.score}，遭遇风险${ts.riskCount}次。${ts.feedback}`;
    Game.stressSystem.reduce(state, ts.score >= 13 ? 8 : 4, '街区旅途'); Game.structuredTraits.addExperience(state.profile, 'traveler');
    recordHistory(state, ts.placeName, ts.score, rating);
    state.travel.activeStage = null;
    Game.lifeDirector.addLog(state, '旅途归来', `${ts.placeName}：${summary}`, 'milestone');
    return { ok: true, message: `${ts.placeName}完成：${summary}`, finished: true };
  }
  function renderEncounters(state) {
    const people = ensureTravel(state).encounters.slice(-6).reverse();
    if (!people.length) return '<p class="empty-state">完成社交选择后，可能在这里留下旅途相识。</p>';
    return people.map((person) => Game.social.card(person,
      [['chat', '交谈'], ['meal', '请客'], ['exchange', '留联系方式']])).join('');
  }
  function renderActive(state, ts) {
    if (ts.mode === 'convention') return Game.conventionTravelView.render(state, ts);
    const stages = Game.travelStages?.forPlace(ts.placeName) || [];
    const stage = stages[ts.stage];
    if (!stage) { state.travel.activeStage = null; return ''; }
    const options = stage.options.map(([id, label, effect]) => {
      const blocked = requirementFailure(state, effect);
      return `<button data-travel-choice="${id}" ${blocked ? 'disabled' : ''}><strong>${label}</strong><br><small>条件：${requirementText(effect)}<br>变化：${rewardText(effect)}${blocked ? `<br>${blocked}` : ''}</small></button>`;
    }).join('');
    return `<section class="journey-current"><span>${ts.placeName} · 第${ts.stage + 1}/${stages.length}段</span>
      <strong>${stage.title}</strong><small>${stage.text}<br>上一步：${ts.feedback}</small>
      <div class="journey-progress"><i style="width:${ts.stage * 100 / stages.length}%"></i></div></section>
      <div class="journey-options">${options}</div><h3>旅途相识</h3>${renderEncounters(state)}`;
  }
  function render(state) {
    ensureTravel(state);
    if (state.brothelStage?.active && Game.brothelSystem?.render) return Game.brothelSystem.render(state);
    if (state.hookupStage?.active && Game.hookupSystem?.render) return Game.hookupSystem.render(state);
    if (state.travel.activeStage) {
      const active = renderActive(state, state.travel.activeStage);
      if (active) return active;
    }
    const recent = state.travel.localHistory[0];
    const filtered = activeFilter === '全部' ? places(state)
      : places(state).filter((place) => place.category === activeFilter || place.kind === activeFilter);
    const filters = filterLabels.map((item) => {
      const [value, label] = item.includes(':') ? item.split(':') : [item, item];
      return `<button class="${activeFilter === value ? 'active' : ''}" data-travel-filter="${value}">${label}</button>`;
    }).join('');
    const cards = filtered.map((place) => {
      const cost = Math.round(place.cost);
      const blocked = unavailable(state, place);
      return `<button class="travel-choice" data-travel-start="${place.name}" ${blocked ? 'disabled' : ''}>
        <span><strong>${place.name}</strong><small>${place.description}${blocked ? ` · ${blocked}` : ''}</small></span>
        <b>${Game.view.money(cost)}<br><span class="travel-category">${place.kind === 'landmark' ? '城市景观' : place.category}</span></b></button>`;
    }).join('');
    const streetHtml = `<section class="list-guide"><strong>${state.location.country} · ${state.location.city}</strong>
      <span>${recent ? `最近完成：${recent.place}（${recent.outcome || '已游览'}）。` : '选择目的地开始三段探索。'}</span></section>
      <nav class="filter-chips">${filters}</nav><div class="travel-grid">${cards || '<p class="empty-state">当前筛选没有匹配地点。</p>'}</div>
      <h3>旅途相识 · ${state.travel.encounters.length}位角色</h3>${renderEncounters(state)}`;
    return Game.conventionCalendarView?.wrap(state, streetHtml) || streetHtml;
  }
  function setFilter(value) {
    const valid = filterLabels.map((item) => item.includes(':') ? item.split(':')[0] : item);
    if (valid.includes(value)) activeFilter = value;
  }
  Game.travelSystem = Object.freeze({ roam: startTravel, chooseStage, render, setFilter });
}(window));
