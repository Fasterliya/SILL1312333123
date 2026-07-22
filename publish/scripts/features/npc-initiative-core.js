(function initNpcInitiativeCore(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function clamp(value) {
    return U.clamp(Number(value) || 0, 0, 100);
  }

  function ensure(state) {
    const current = state.npcEvents;
    state.npcEvents = current && typeof current === 'object' ? current : {};
    const events = state.npcEvents;
    events.queue = Array.isArray(events.queue) ? events.queue.slice(-12) : [];
    events.frequency = ['high', 'low', 'off'].includes(events.frequency)
      ? events.frequency : 'high';
    events._brothelVisits = events._brothelVisits
      && typeof events._brothelVisits === 'object' ? events._brothelVisits : {};
    events._lastPregnancyMonth = Number.isFinite(events._lastPregnancyMonth)
      ? events._lastPregnancyMonth : -36;
    events._lastGeneratedMonth = Number.isFinite(events._lastGeneratedMonth)
      ? events._lastGeneratedMonth : -1;
    events.supportAgreements = Array.isArray(events.supportAgreements)
      ? events.supportAgreements : [];
    return events;
  }

  function uid() {
    return `ne-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function playerAge(state) {
    return U.age(state);
  }

  function allContacts(state) {
    return state.contacts.filter((person) => (
      person && person.status === '健康' && person.phoneUnlocked
    ));
  }

  function allPeople(state) {
    return Game.people?.all(state).filter((person) => (
      person && person.status === '健康' && person.id !== state.profile?.id
    )) || [];
  }

  function findPerson(state, id) {
    const active = Game.people?.find(state, id);
    if (active) return active;
    const archives = Object.values(state.socialWorld?.cityArchives || {}).flat();
    return archives.find((person) => person?.id === id) || null;
  }

  function hasHistory(person, keywords) {
    if (!Array.isArray(person.memories)) return false;
    return person.memories.some((memory) => keywords.some((keyword) => (
      memory.kind === keyword || memory.text?.includes(keyword)
    )));
  }

  function enqueue(state, event) {
    if (!event) return false;
    const events = ensure(state);
    if (events.queue.some((queued) => (
      queued.type === event.type && queued.data?.personId === event.data?.personId
    ))) return false;
    events.queue.push({
      id: uid(),
      type: event.type,
      title: event.title,
      text: event.text,
      options: event.options,
      data: event.data || {},
      month: state.totalMonths,
    });
    events.queue = events.queue.slice(-12);
    return true;
  }

  function eventCount(state) {
    const events = ensure(state);
    if (events.frequency === 'off') return 0;
    if (events.frequency === 'low') {
      return state.totalMonths % 3 === 0 ? U.between(1, 2) : 0;
    }
    return U.between(2, 5);
  }

  function changeFrequency(state, level) {
    if (!['high', 'low', 'off'].includes(level)) return false;
    const events = ensure(state);
    events.frequency = level;
    if (level === 'off') events.queue = [];
    return true;
  }

  function recordBrothelVisit(state, personId) {
    const visits = ensure(state)._brothelVisits;
    visits[personId] = (visits[personId] || 0) + 1;
  }

  function takeEvent(state, eventId) {
    const queue = ensure(state).queue;
    const index = queue.findIndex((event) => event.id === eventId);
    if (index < 0) return null;
    return queue.splice(index, 1)[0];
  }

  Game.npcInitiativeCore = Object.freeze({
    clamp,
    ensure,
    playerAge,
    allContacts,
    allPeople,
    findPerson,
    hasHistory,
    enqueue,
    eventCount,
    changeFrequency,
    recordBrothelVisit,
    takeEvent,
  });
}(window));
