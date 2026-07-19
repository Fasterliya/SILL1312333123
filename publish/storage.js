(function initStorage(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  let memory = null;
  let queue = Promise.resolve();
  let remoteWritable = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function valid(value) {
    return Boolean(
      value
      && [1, 2, 3, 4, 5, 6, 7, 8].includes(value.version)
      && typeof value.name === 'string'
      && Number.isInteger(value.totalMonths)
      && value.totalMonths >= 0
      && value.stats
      && Array.isArray(value.family)
      && value.education
      && value.career
      && value.assets
      && Array.isArray(value.logs),
    );
  }

  function readLocal() {
    try {
      const raw = root.localStorage.getItem(C.storageKey);
      const value = raw ? JSON.parse(raw) : null;
      return valid(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function writeLocal(value) {
    try {
      root.localStorage.setItem(C.storageKey, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  async function readRemote() {
    if (!Game.sdkAdapter.isOnline()) return { status: 'offline', state: null };
    try {
      const value = await Game.sdkAdapter.kvGet(C.storageKey);
      if (value === null) return { status: 'miss', state: null };
      return valid(value)
        ? { status: 'hit', state: value }
        : { status: 'invalid', state: null };
    } catch (_) {
      return { status: 'error', state: null };
    }
  }

  async function load() {
    const local = readLocal();
    const remote = await readRemote();
    remoteWritable = remote.status === 'hit' || remote.status === 'miss';
    const candidates = [memory, local, remote.state].filter(valid);
    const chosen = candidates.sort((a, b) => (
      Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)
    ))[0] || null;
    memory = chosen ? clone(chosen) : null;
    if (chosen) writeLocal(chosen);
    return chosen ? clone(chosen) : null;
  }

  function saveNow(value) {
    return async () => {
      const next = clone(value);
      next.updatedAt = new Date().toISOString();
      memory = next;
      const localSaved = writeLocal(next);
      let remoteSaved = false;
      if (remoteWritable) {
        try {
          await Game.sdkAdapter.kvPut(C.storageKey, next);
          remoteSaved = true;
        } catch (_) {
          // 本地和内存副本已保留。
        }
      }
      return remoteSaved ? 'kv' : (localSaved ? 'local' : 'memory');
    };
  }

  function save(value) {
    const pending = queue.then(saveNow(value));
    queue = pending.catch(() => undefined);
    return pending;
  }

  async function reset() {
    memory = null;
    try {
      root.localStorage.removeItem(C.storageKey);
    } catch (_) {
      // 沙箱可能禁用本地存储。
    }
  }

  Game.storage = Object.freeze({ load, save, reset });
}(window));
