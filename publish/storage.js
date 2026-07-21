(function initStorage(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  let memory = null, remoteWritable = false;
  let queue = Promise.resolve();
  let lastSource = 'memory', lastSavedAt = '';
  const slotCache = new Map();

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function valid(value) {
    return Boolean(
      value
      && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27].includes(value.version)
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

  function readLocal(key) {
    try {
      const raw = root.localStorage.getItem(key || C.storageKey);
      const value = raw ? JSON.parse(raw) : null;
      return valid(value) ? value : null;
    } catch (_) { return null; }
  }

  function writeLocal(value, key) {
    try {
      root.localStorage.setItem(key || C.storageKey, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }

  async function readRemote(key) {
    if (!Game.sdkAdapter.isOnline()) return { status: 'offline', state: null };
    try {
      const value = await Game.sdkAdapter.kvGet(key || C.storageKey);
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
    lastSource = chosen === remote.state ? 'kv' : (chosen === local ? 'local' : 'memory');
    lastSavedAt = chosen?.updatedAt || '';
    return chosen ? clone(chosen) : null;
  }

  function saveNow(value) {
    return async () => {
      const next = Game.populationStorage.compact(clone(value));
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
      lastSource = remoteSaved ? 'kv' : (localSaved ? 'local' : 'memory');
      lastSavedAt = next.updatedAt;
      return lastSource;
    };
  }

  function save(value) {
    const pending = queue.then(saveNow(value));
    queue = pending.catch(() => undefined);
    return pending;
  }

  function reset(value) {
    const pending = queue.then(async () => {
      memory = null;
      try {
        root.localStorage.removeItem(C.storageKey);
      } catch (_) {
        // 沙箱可能禁用本地存储。
      }
      if (!valid(value)) return 'cleared';
      return saveNow(value)();
    });
    queue = pending.catch(() => undefined);
    return pending;
  }

  const slotKey = (index) => `${C.storageKey}:manual:${index}`;
  const validSlot = (index) => Number.isInteger(index) && index >= 1 && index <= 3;

  async function readSlot(index, force) {
    if (!validSlot(index)) throw new Error('INVALID_SAVE_SLOT');
    if (!force && slotCache.has(index)) return slotCache.get(index);
    const key = slotKey(index);
    const local = readLocal(key);
    const remote = await readRemote(key);
    const candidates = [
      local && { state: local, source: 'local' },
      remote.state && { state: remote.state, source: 'kv' },
    ].filter(Boolean).sort((a, b) => (
      Date.parse(b.state.updatedAt || 0) - Date.parse(a.state.updatedAt || 0)
    ));
    const record = candidates[0] || { state: null, source: remote.status === 'error' ? 'error' : 'empty' };
    if (record.state) writeLocal(record.state, key);
    const cached = { state: record.state ? clone(record.state) : null, source: record.source };
    slotCache.set(index, cached);
    return cached;
  }

  function summary(index, record) {
    const state = record.state;
    return state ? {
      index, empty: false, source: record.source, name: state.name,
      year: state.year, month: state.month, totalMonths: state.totalMonths,
      generation: state.generation || 1, city: state.location?.city || '', playerBornAt: state.playerBornAt || 0,
      updatedAt: state.updatedAt || '',
    } : { index, empty: true, source: record.source };
  }

  async function slotSummaries(force) {
    const records = await Promise.all([1, 2, 3].map((index) => readSlot(index, force)));
    return records.map((record, offset) => summary(offset + 1, record));
  }

  function saveSlot(index, value) {
    if (!validSlot(index) || !valid(value)) return Promise.reject(new Error('INVALID_SAVE_SLOT'));
    const pending = queue.then(async () => {
      const key = slotKey(index);
      const next = Game.populationStorage.compact(clone(value));
      next.updatedAt = new Date().toISOString();
      const localSaved = writeLocal(next, key);
      const remote = await readRemote(key);
      let remoteSaved = false;
      if (['hit', 'miss'].includes(remote.status)) {
        try {
          await Game.sdkAdapter.kvPut(key, next);
          remoteSaved = true;
        } catch (_) {
          // 手动档仍保留在本地缓存。
        }
      }
      const source = remoteSaved ? 'kv' : (localSaved ? 'local' : 'memory');
      slotCache.set(index, { state: clone(next), source });
      return source;
    });
    queue = pending.catch(() => undefined);
    return pending;
  }
  async function loadSlot(index) {
    const record = await readSlot(index, false);
    return record.state ? clone(record.state) : null;
  }

  async function deleteSlot(index) {
    if (!validSlot(index)) throw new Error('INVALID_SAVE_SLOT');
    const key = slotKey(index);
    try {
      root.localStorage.removeItem(key);
    } catch (_) { /* 沙箱可能禁用本地缓存。 */ }
    slotCache.set(index, { state: null, source: 'empty' });
    if (Game.sdkAdapter.isOnline()) {
      try {
        await Game.sdkAdapter.kvDelete(key);
      } catch (_) { /* 本地删除已完成，云端失败可稍后重试。 */ }
    }
  }

  const status = () => ({
    online: Game.sdkAdapter.isOnline(), source: lastSource, lastSavedAt,
    cachedSlots: [...slotCache.values()].filter((item) => item.state).length,
  });

  Game.storage = Object.freeze({ load, save, reset, slotSummaries, saveSlot, loadSlot, deleteSlot, status });
}(window));
