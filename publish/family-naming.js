(function initFamilyNaming(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const western = new Set(['en-US', 'en-GB', 'fr-FR']);

  function cultureOf(person, fallback) {
    return person?.nameCulture || person?.culture || person?.identityCulture || fallback || '华夏';
  }

  function surnameOf(person, fallback, country) {
    if (!person) return fallback || '';
    if (person.surname) return person.surname;
    const locale = Game.worldCulture?.profile(cultureOf(person, country)).locale || 'zh-CN';
    const name = String(person.name || '');
    const found = Game.nameSystem.surnames(locale).find((surname) => (
      western.has(locale) ? name === surname || name.endsWith(` ${surname}`) : name.startsWith(surname)
    ));
    return found || fallback || '';
  }

  function playerParent(state) {
    return {
      name: state.name, surname: state.surname, gender: state.gender,
      culture: state.civic?.identityCulture || state.location.country,
    };
  }

  function identity(state, parents) {
    const list = parents.filter(Boolean);
    const husband = list.find((person) => person.gender === '男') || list[0] || playerParent(state);
    const culture = cultureOf(husband, state.location.country);
    return {
      culture,
      locale: Game.worldCulture.profile(culture).locale,
      surname: surnameOf(husband, state.surname, culture) || state.surname,
    };
  }

  function assign(state, child, item) {
    const used = new Set(Game.people.all(state).map((person) => person.name));
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = Game.nameSystem.makeName(item.surname, child.gender, item.locale);
      if (!used.has(candidate)) {
        child.name = candidate;
        break;
      }
    }
    child.surname = item.surname;
    child.culture = item.culture;
    child.birthName = child.name;
    return child;
  }

  Game.familyNaming = Object.freeze({
    surnameOf,
    forPlayer(state, partner) {
      return identity(state, [playerParent(state), partner]);
    },
    forParents(state, first, second) {
      return identity(state, [first, second]);
    },
    assign,
  });
}(window));
