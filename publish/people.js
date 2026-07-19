(function initPeople(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function pools(state) {
    return [
      state.matchmaking?.candidates || [],
      state.travel?.encounters || [],
    ];
  }

  function external(state) {
    return pools(state).flat();
  }

  function all(state) {
    const seen = new Set();
    return [...state.family, ...state.contacts, ...external(state)].filter((person) => {
      if (!person?.id || seen.has(person.id)) return false;
      seen.add(person.id);
      return true;
    });
  }

  function find(state, id) {
    return all(state).find((person) => person.id === id) || null;
  }

  function isExternal(state, person) {
    return external(state).some((item) => item.id === person?.id);
  }

  function removeExternal(state, id) {
    if (state.matchmaking) {
      state.matchmaking.candidates = state.matchmaking.candidates.filter((item) => item.id !== id);
    }
    if (state.travel) {
      state.travel.encounters = state.travel.encounters.filter((item) => item.id !== id);
    }
  }

  function addContact(state, person) {
    if (!person) return false;
    removeExternal(state, person.id);
    if (!state.contacts.some((item) => item.id === person.id)) state.contacts.push(person);
    person.phoneUnlocked = true;
    if (person.relation === '相亲对象') person.relation = '朋友';
    else if (['旅途相识', '路人'].includes(person.relation)) {
      person.relation = person.culture && person.culture !== state.location.country ? '海外朋友' : '朋友';
    }
    return true;
  }

  Game.people = Object.freeze({ all, external, find, isExternal, addContact, removeExternal });
}(window));
