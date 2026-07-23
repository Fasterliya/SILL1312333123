(function initPortraitTargets(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const orphanPrefix = 'orphan:';

  function isOrphanKey(key) {
    return typeof key === 'string' && key.startsWith(orphanPrefix);
  }

  function orphanId(key) {
    return isOrphanKey(key) ? key.slice(orphanPrefix.length) : '';
  }

  function find(state, key) {
    if (key === 'player') return Game.hunterMode.identity(state).profile;
    if (isOrphanKey(key)) return Game.adoptionSystem?.findOrphan(state, orphanId(key)) || null;
    return Game.people.find(state, key);
  }

  Game.portraitTargets = Object.freeze({ find, isOrphanKey, orphanId });
}(window));
