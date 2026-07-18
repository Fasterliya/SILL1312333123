(function initSdk(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function sdk() {
    return root.dzmm || null;
  }

  function progress(phase, message) {
    try {
      sdk()?.loading?.progress({ phase, message });
    } catch (_) {
      // 启动遥测不能阻断游戏。
    }
  }

  function ready() {
    try {
      sdk()?.loading?.ready();
    } catch (_) {
      // 本地预览没有 SDK 时直接继续。
    }
  }

  function error(code, message) {
    try {
      sdk()?.loading?.error(code, message);
    } catch (_) {
      // 页面内仍会显示启动错误。
    }
  }

  async function kvGet(key) {
    if (!sdk()?.kv?.get) throw new Error('SDK_UNAVAILABLE');
    const result = await sdk().kv.get(key);
    return result?.value ?? null;
  }

  async function kvPut(key, value) {
    if (!sdk()?.kv?.put) throw new Error('SDK_UNAVAILABLE');
    return sdk().kv.put(key, value, { flush: true });
  }

  Game.sdkAdapter = Object.freeze({
    isOnline: () => Boolean(sdk()),
    progress,
    ready,
    error,
    kvGet,
    kvPut,
  });
}(window));
