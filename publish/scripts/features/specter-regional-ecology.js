(function initSpecterRegionalEcology(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var INFESTATION_CRITICAL = 70;
  var INFESTATION_HIGH = 40;
  var DISPATCH_COOLDOWN = 4;

  function ensure(state) {
    var current = state.specterRegional;
    state.specterRegional = current && typeof current === 'object' ? current : {
      cities: {},
      councilAlert: 0,
      councilLastDispatch: -12,
      dispatchedTo: '',
      dispatchedArrival: -1,
      dispatchedPower: 0,
    };
    var r = state.specterRegional;
    r.cities = r.cities && typeof r.cities === 'object' ? r.cities : {};
    r.councilAlert = Math.max(0, Math.min(100, Number(r.councilAlert) || 0));
    r.councilLastDispatch = Number.isFinite(r.councilLastDispatch) ? r.councilLastDispatch : -12;
    r.dispatchedTo = typeof r.dispatchedTo === 'string' ? r.dispatchedTo : '';
    r.dispatchedArrival = Number.isFinite(r.dispatchedArrival) ? r.dispatchedArrival : -1;
    r.dispatchedPower = Math.max(0, Number(r.dispatchedPower) || 0);
    return r;
  }

  function cityEco(state, cityName) {
    var r = ensure(state);
    var name = cityName || state.location.city;
    if (!r.cities[name]) {
      r.cities[name] = {
        infestation: 0,
        guardianCount: 0,
        guardianPower: 0,
        lastGuardianArrival: -12,
        crisisMonths: 0,
        citizenPanic: 0,
      };
    }
    var eco = r.cities[name];
    eco.infestation = Math.max(0, Math.min(100, Number(eco.infestation) || 0));
    eco.guardianCount = Math.max(0, Math.min(5, Number(eco.guardianCount) || 0));
    eco.guardianPower = Math.max(0, Math.min(500, Number(eco.guardianPower) || 0));
    eco.lastGuardianArrival = Number.isFinite(eco.lastGuardianArrival) ? eco.lastGuardianArrival : -12;
    eco.crisisMonths = Math.max(0, Number(eco.crisisMonths) || 0);
    eco.citizenPanic = Math.max(0, Math.min(100, Number(eco.citizenPanic) || 0));
    return eco;
  }

  function localSpecters(state, cityName) {
    var name = cityName || state.location.city;
    return (state.supernatural?.specters || []).filter(function (s) {
      var host = Game.people.find(state, s.hostId);
      return host && (host.currentCity || state.location.city) === name;
    });
  }

  function localGuardians(state, cityName) {
    var name = cityName || state.location.city;
    return Game.people.all(state).filter(function (p) {
      return p && p.currentCity === name && p.status === '健康'
        && (p.jobId === 'magicalgirl' || p.job === '魔法少女');
    });
  }

  function recomputeCity(state, cityName) {
    var eco = cityEco(state, cityName);
    var specters = localSpecters(state, cityName);
    var guardians = localGuardians(state, cityName);

    var rawInfestation = specters.reduce(function (sum, s) {
      var stageMult = s.stage === '掠食' ? 12 : (s.stage === '显形' ? 7 : 3);
      var typeMult = s.type === '欲母' ? 1.5 : (s.type === '恶煞' ? 1.3 : 1);
      return sum + stageMult * typeMult;
    }, 0);

    eco.infestation = Math.min(100, Math.round(rawInfestation * 2.5));
    eco.guardianCount = guardians.length;
    eco.guardianPower = guardians.reduce(function (sum, g) {
      return sum + (g.magicalPower || Game.magicalGirlCore?.combatBonus?.({ magicalGirl: { magicPower: g.magicPower || 10 } })?.atk || 0) * 2.5;
    }, 0);
    if (state.magicalGirl?.active && state.location.city === cityName) {
      eco.guardianCount += 1;
      eco.guardianPower += (state.magicalGirl.magicPower || 10) * 3;
    }
    eco.guardianPower = Math.max(0, Math.min(500, Math.round(eco.guardianPower)));

    if (eco.infestation >= INFESTATION_CRITICAL) {
      eco.crisisMonths += 1;
      eco.citizenPanic = Math.min(100, eco.citizenPanic + U.between(5, 12));
    } else if (eco.infestation >= INFESTATION_HIGH) {
      eco.citizenPanic = Math.min(100, eco.citizenPanic + U.between(2, 5));
    } else {
      eco.crisisMonths = Math.max(0, eco.crisisMonths - 1);
      eco.citizenPanic = Math.max(0, eco.citizenPanic - U.between(1, 3));
    }

    return eco;
  }

  function councilDispatch(state) {
    var r = ensure(state);
    if (state.totalMonths < r.councilLastDispatch + DISPATCH_COOLDOWN) return;

    var dispatchTarget = '';
    var worstInfestation = 0;
    var allCityNames = [];
    Game.config.cities.forEach(function (city) { allCityNames.push(city.city); });
    allCityNames.forEach(function (name) {
      var eco = cityEco(state, name);
      recomputeCity(state, name);
      if (eco.infestation >= INFESTATION_CRITICAL && eco.infestation > worstInfestation) {
        worstInfestation = eco.infestation;
        dispatchTarget = name;
      }
    });

    if (!dispatchTarget) return;
    var travelMonths = U.between(2, 6);
    r.dispatchedTo = dispatchTarget;
    r.dispatchedArrival = state.totalMonths + travelMonths;
    r.dispatchedPower = U.between(40, 80);
    r.councilLastDispatch = state.totalMonths;
    r.councilAlert = Math.min(100, r.councilAlert + U.between(5, 12));

    Game.lifeDirector.addLog(state, '隐界协调会',
      '隐界协调会注意到了' + dispatchTarget + '市幽诡泛滥的警报。一支由' + r.dispatchedPower + '魔力指数的魔法少女小队已经启程——'
      + '预计' + travelMonths + '个月后抵达。', 'warning');
  }

  function processArrival(state) {
    var r = ensure(state);
    if (!r.dispatchedTo || state.totalMonths < r.dispatchedArrival) return;
    var eco = cityEco(state, r.dispatchedTo);
    eco.guardianCount = Math.min(5, eco.guardianCount + 1);
    eco.guardianPower = Math.min(500, eco.guardianPower + r.dispatchedPower);
    eco.lastGuardianArrival = state.totalMonths;
    eco.infestation = Math.max(0, eco.infestation - U.between(15, 35));
    eco.citizenPanic = Math.max(0, eco.citizenPanic - U.between(10, 20));

    var newGirl = {
      id: 'mg-dispatch-' + state.totalMonths,
      name: Game.nameSystem.makeName('', '女', r.dispatchedTo.indexOf('日本') >= 0 ? 'ja-JP' : ''),
      gender: '女',
      age: U.between(13, 17),
      job: '魔法少女',
      jobId: 'magicalgirl',
      magicalPower: r.dispatchedPower,
      currentCity: r.dispatchedTo,
      homeCity: r.dispatchedTo,
      status: '健康',
      personality: U.random(Game.config.personalities),
      trait: U.random(Game.config.traits),
    };
    Game.systemsState.ensurePerson(state, newGirl);
    if (!state.worldPeople.some(function (p) { return p.id === newGirl.id; })) {
      state.worldPeople.push(newGirl);
    }

    Game.lifeDirector.addLog(state, '魔法少女抵达',
      '隐界协调会派遣的魔法少女「' + newGirl.name + '」抵达了' + r.dispatchedTo + '市。她的灵魂宝石在城市上空展开了一道银色的防护结界——幽诡们短暂地退却了。',
      'good');

    r.dispatchedTo = '';
    r.dispatchedArrival = -1;
    r.dispatchedPower = 0;
  }

  function crisisEffects(state, cityName) {
    var eco = recomputeCity(state, cityName || state.location.city);
    if (eco.infestation >= INFESTATION_CRITICAL && Math.random() < 0.12) {
      state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + U.between(2, 5));
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(1, 3));
      Game.lifeDirector.addLog(state, '幽诡泛滥',
        (cityName || state.location.city) + '市的幽诡数量已经超过了安全阈值。居民们在夜晚不敢出门，失踪案例急剧上升。城市的空气里弥漫着一种腐败的甜味。',
        'danger');
    }
    if (eco.citizenPanic >= 70 && Math.random() < 0.08) {
      Game.lifeDirector.addLog(state, '市民恐慌',
        (cityName || state.location.city) + '市的街道上出现了自发的抗议——人们举着"猎诡"的标语牌在市政府前高喊。但他们不知道自己在对抗什么。',
        'warning');
    }
  }

  function renderRegional(state) {
    if (!state.supernatural?.enabled) return '';
    var eco = recomputeCity(state, state.location.city);
    var infestColor = eco.infestation >= INFESTATION_CRITICAL ? '#c23b32' : (eco.infestation >= INFESTATION_HIGH ? '#b88a35' : 'var(--ui-green, #315f58)');
    var r = ensure(state);
    var dispText = r.dispatchedTo
      ? ' · 协调会已派遣支援至' + r.dispatchedTo + '（' + (r.dispatchedArrival - state.totalMonths) + '月后抵达）'
      : '';

    return '<div class="regional-eco" style="margin:8px 0;padding:8px 10px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);font-size:10px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
      + '<span style="font-weight:700">城市幽诡生态 · ' + state.location.city + '</span>'
      + '<span style="color:' + infestColor + ';font-weight:750">' + eco.infestation + '/100</span></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;color:var(--ui-muted)">'
      + '<span>魔法少女：' + eco.guardianCount + '人（' + eco.guardianPower + '魔力）</span>'
      + '<span>市民恐慌：' + eco.citizenPanic + '/100</span>'
      + '<span>危机持续：' + eco.crisisMonths + '月</span>'
      + '<span>' + (eco.infestation >= INFESTATION_CRITICAL ? '危急状态' : (eco.infestation >= INFESTATION_HIGH ? '警戒状态' : '可控')) + '</span>'
      + '</div>' + dispText + '</div>';
  }

  function monthly(state) {
    recomputeCity(state, state.location.city);
    crisisEffects(state, state.location.city);
    councilDispatch(state);
    processArrival(state);
  }

  Game.specterRegionalEcology = Object.freeze({
    ensure: ensure,
    cityEco: cityEco,
    recomputeCity: recomputeCity,
    monthly: monthly,
    renderRegional: renderRegional,
    localSpecters: localSpecters,
  });
}(window));
