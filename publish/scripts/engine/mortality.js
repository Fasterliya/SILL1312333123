(function initMortality(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const MIN_LIFE_MONTHS = 60 * 12;
  const HALF_SPREAD_MONTHS = 15 * 12;

  function hashUnit(value) {
    let hash = 2166136261;
    const text = String(value || 'person');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
  }

  function lifeMonths(id) {
    const first = hashUnit(`${id}:life-a`);
    const second = hashUnit(`${id}:life-b`);
    return MIN_LIFE_MONTHS + Math.floor((first + second) * HALF_SPREAD_MONTHS);
  }

  function ensurePerson(person) {
    if (!person) return person;
    if (!Number.isInteger(person.lifeExpectancyMonths) || person.lifeExpectancyMonths < 1) {
      person.lifeExpectancyMonths = lifeMonths(person.id || person.name);
    }
    person.status ||= '健康';
    person.deceasedAt = Number.isFinite(person.deceasedAt) ? person.deceasedAt : null;
    return person;
  }

  function birthMonth(person) {
    if (Number.isFinite(person.birthMonth)) return person.birthMonth;
    if (Number.isFinite(person.bornAt)) return person.bornAt;
    return -(Math.max(0, Number(person.baseAge) || 0) * 12);
  }

  function hasPortrait(person) {
    const gallery = Array.isArray(person.portraitGallery) ? person.portraitGallery : [];
    const fallback = gallery.find((entry) => typeof entry?.url === 'string' && entry.url)?.url || '';
    if (!person.portraitUrl && fallback) person.portraitUrl = fallback;
    return typeof person.portraitUrl === 'string' && Boolean(person.portraitUrl);
  }

  function isMemorial(person) {
    return Number(person.interactions) > 0 && hasPortrait(person);
  }

  function removeFromCollections(state, id) {
    state.family = state.family.filter((person) => person.id !== id);
    state.contacts = state.contacts.filter((person) => person.id !== id);
    state.worldPeople = (state.worldPeople || []).filter((person) => person.id !== id);
    if (state.matchmaking) {
      state.matchmaking.candidates = (state.matchmaking.candidates || [])
        .filter((person) => person.id !== id);
    }
    if (state.travel) {
      state.travel.encounters = (state.travel.encounters || [])
        .filter((person) => person.id !== id);
      state.travel.activeIds = (state.travel.activeIds || []).filter((activeId) => activeId !== id);
      state.travel.activeId = state.travel.activeIds[0] || null;
    }
  }

  function detachReferences(state, person) {
    if (state.romance?.partnerId === person.id) {
      state.romance.partnerId = null;
      state.romance.married = false;
      state.romance.pendingBirth = 0;
      state.romance.pendingBirthMotherId = null;
    }
    if (state.workplace) {
      state.workplace.rosterIds = (state.workplace.rosterIds || []).filter((id) => id !== person.id);
      state.workplace.reportIds = (state.workplace.reportIds || []).filter((id) => id !== person.id);
      if (state.workplace.leaderId === person.id) state.workplace.leaderId = null;
    }
    Game.people.all(state).forEach((other) => {
      if (other.id === person.id) return;
      if (other.spouseId === person.id) {
        other.spouseId = null;
        other.npcMarried = false;
        other.widowed = true;
      }
      other.childIds = (other.childIds || []).filter((id) => id !== person.id);
      other.parentIds = (other.parentIds || []).filter((id) => id !== person.id);
      other.reportIds = (other.reportIds || []).filter((id) => id !== person.id);
      if (other.managerId === person.id) other.managerId = null;
    });
  }

  function knownToPlayer(state, person) {
    return state.family.some((item) => item.id === person.id)
      || person.phoneUnlocked || person.interactions > 0;
  }

  function markDeceased(state, person, silent) {
    const known = knownToPlayer(state, person);
    const memorial = isMemorial(person);
    person.status = '已故';
    if (!Number.isFinite(person.deceasedAt)) person.deceasedAt = state.totalMonths;
    person.currentCity = '';
    person.phoneUnlocked = false;
    if (person.populationResident) {
      Game.populationRenewal.replaceResident(state, person.id, person.homeCity);
    }
    detachReferences(state, person);
    if (!memorial) removeFromCollections(state, person.id);
    if (!silent && known) {
      Game.lifeDirector.addLog(
        state,
        `${person.name}离世`,
        memorial
          ? `${person.name}走完了人生，留下的立绘与共同经历被收进纪念档案。`
          : `${person.name}走完了自己的人生，人物档案不再显示。`,
        'normal',
      );
    }
  }

  function due(state, person) {
    ensurePerson(person);
    return person.status === '健康'
      && state.totalMonths >= birthMonth(person) + person.lifeExpectancyMonths;
  }

  function processArchives(state) {
    const archives = state.socialWorld?.cityArchives || {};
    const materialized = new Set(Game.people.all(state).map((person) => person.id));
    Object.entries(archives).forEach(([city, records]) => {
      records.slice().forEach((record) => {
        record.l ||= lifeMonths(record.i);
        if (!materialized.has(record.i) && state.totalMonths >= record.b + record.l) {
          Game.populationRenewal.replaceResident(state, record.i, city);
        }
      });
    });
  }

  function monthly(state) {
    Game.people.all(state).slice().forEach((person) => {
      if (due(state, person)) markDeceased(state, person, false);
    });
    processArchives(state);
    Game.socialWorld.rebuild(state);
  }

  function prepare(state) {
    Game.people.all(state).slice().forEach((person) => {
      ensurePerson(person);
      if (person.status === '已故') markDeceased(state, person, true);
    });
    processArchives(state);
    Game.socialWorld.rebuild(state);
  }

  Game.mortality = Object.freeze({
    lifeMonths, ensurePerson, isMemorial, monthly, prepare,
  });
}(window));
