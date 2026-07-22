(function initCradleNetworkCharacters(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function pickAnime(task) {
    if (task.reformType !== '舞台角色重塑') return;
    if (task.orderSeries && task.orderCharacter) return;
    var items = (Game.cosplayCatalog?.items || []).filter(function (item) {
      return item.name !== '无' && item.series && item.character;
    });
    if (!items.length) return;
    var picked = items[Math.floor(Math.random() * items.length)];
    task.orderSeries = picked.series;
    task.orderCharacter = picked.character;
  }

  function ensureTask(state, task) {
    task.originalName = task.originalName || task.name || '无名档案';
    task.name = task.name || task.originalName;
    task.progress = clamp(task.progress);
    task.bodyProgress = Number.isFinite(task.bodyProgress)
      ? clamp(task.bodyProgress) : task.progress;
    task.mindProgress = Number.isFinite(task.mindProgress)
      ? clamp(task.mindProgress) : task.progress;
    task.status = Game.cradleNetwork?.statuses?.includes(task.status)
      ? task.status : (task.progress >= 100 ? '待转运' : '监禁改造中');
    task.startedMonth = Number.isFinite(task.startedMonth)
      ? task.startedMonth : state.totalMonths;
    task.lastProgressMonth = Number.isFinite(task.lastProgressMonth)
      ? task.lastProgressMonth : task.startedMonth;
    pickAnime(task);
    return task;
  }

  function archiveRecord(state, task) {
    var archives = Game.cityPopulation.ensure(state);
    var cities = Object.keys(archives);
    for (var i = 0; i < cities.length; i += 1) {
      var record = archives[cities[i]].find(function (item) {
        return item.i === task.targetId;
      });
      if (record) return record;
    }
    return null;
  }

  function createPerson(state, task) {
    var existing = Game.people.find(state, task.targetId);
    if (existing) return existing;
    var record = archiveRecord(state, task);
    var person = U.person(
      '摇篮囚徒',
      '',
      task.ageAtCapture || 16,
      '女',
      state.totalMonths,
    );
    Object.assign(person, {
      id: task.targetId,
      name: task.originalName,
      birthName: task.originalName,
      birthMonth: task.birthMonth ?? record?.b ?? person.birthMonth,
      culture: task.culture || record?.c || '华夏',
      personality: task.personality || record?.p || person.personality,
      trait: task.trait || record?.t || person.trait,
      affection: record?.a || person.affection,
      metCity: '上海',
      currentCity: '上海',
      homeCity: task.city,
      institution: '摇篮改造机构',
      cradleInmate: true,
      phoneUnlocked: false,
    });
    state.worldPeople.push(person);
    Game.systemsState.ensurePerson(state, person);
    return person;
  }

  function japaneseName(task) {
    if (!task.japaneseName) task.japaneseName = Game.nameSystem.makeName('', '女', 'ja-JP');
    return task.japaneseName;
  }

  function applyName(person, task) {
    var changed = task.mindProgress >= 60;
    var current = changed ? japaneseName(task) : task.originalName;
    task.name = current;
    person.cradleFormerName = task.originalName;
    person.birthName = person.birthName || task.originalName;
    person.nameHistory = Array.isArray(person.nameHistory) ? person.nameHistory : [];
    if (changed && !person.nameHistory.some(function (item) {
      return item.from === task.originalName && item.to === current;
    })) {
      person.nameHistory.push({
        from: task.originalName,
        to: current,
        country: '日本',
        reason: '摇篮身份改造',
      });
    }
    person.name = current;
    if (changed) {
      person.culturePreference = '日本文化';
      person.cradleIdentity = task.mindProgress >= 85 ? '日本身份认同' : '日本文化倾向';
    }
  }

  function applyAppearance(person, task) {
    if (task.bodyProgress >= 25) {
      person.hairstyle = '整齐中长发';
      person.temperament = '安静';
    }
    if (task.bodyProgress >= 50) {
      person.bodyType = '匀称';
      person.clothing = {
        top: '日式学院制服',
        socks: '白色中筒袜',
        shoes: '乐福鞋',
      };
    }
    if (task.reformType === '舞台角色重塑' && task.bodyProgress >= 35
      && task.orderSeries && task.orderCharacter) {
      person.cosplay = task.orderSeries + ' · ' + task.orderCharacter;
    }
    if (task.mindProgress >= 80) person.personality = '温顺';
  }

  function syncTask(state, task) {
    ensureTask(state, task);
    var person = createPerson(state, task);
    applyName(person, task);
    applyAppearance(person, task);
    Object.assign(person, {
      relation: task.status === '已完成' ? '摇篮改造档案' : '摇篮囚徒',
      metCity: person.metCity || '上海',
      currentCity: '上海',
      homeCity: person.homeCity || task.city,
      cradleInmate: task.status !== '已完成',
      cradleImprisoned: task.status !== '已完成',
      cradleStatus: task.status,
      cradleTaskId: task.id,
      cradleBodyProgress: task.bodyProgress,
      cradleMindProgress: task.mindProgress,
      institution: '摇篮改造机构',
    });
    task.characterId = person.id;
    return person;
  }

  function syncPlayer(state, task) {
    var profile = state.profile;
    profile.cradleFormerName = task.originalName;
    profile.birthName = profile.birthName || task.originalName;
    applyAppearance(profile, task);
    profile.cradleBodyProgress = task.bodyProgress;
    profile.cradleMindProgress = task.mindProgress;
    return profile;
  }

  function bodyStage(value) {
    if (value >= 85) return '外观定型';
    if (value >= 60) return '体态重塑';
    if (value >= 30) return '造型调整';
    return '基础检查';
  }

  function mindStage(value) {
    if (value >= 85) return '身份认同固化';
    if (value >= 60) return '日本姓名启用';
    if (value >= 30) return '文化倾向植入';
    return '自我意识完整';
  }

  Game.cradleNetworkCharacters = Object.freeze({
    ensureTask: ensureTask,
    syncTask: syncTask,
    syncPlayer: syncPlayer,
    bodyStage: bodyStage,
    mindStage: mindStage,
  });
}(window));
