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

  async function drawGenerate(options) {
    if (!sdk()?.draw?.generate) throw Object.assign(new Error('当前环境不支持立绘生成'), {
      code: 'SDK_UNAVAILABLE',
      retryable: false,
    });
    const result = await sdk().draw.generate(options);
    if (!result || !Array.isArray(result.images) || typeof result.images[0] !== 'string') {
      throw Object.assign(new Error('图片服务没有返回有效立绘'), {
        code: 'NO_OUTPUT_IMAGES',
        retryable: true,
      });
    }
    return result;
  }

  async function drawGenerateModels() {
    if (!sdk()?.draw?.generateModels) throw Object.assign(new Error('当前环境无法读取绘画模型'), {
      code: 'SDK_UNAVAILABLE',
      retryable: false,
    });
    const result = await sdk().draw.generateModels();
    if (!result || !Array.isArray(result.models)) {
      throw Object.assign(new Error('绘画模型列表无效'), {
        code: 'INVALID_MODEL_LIST',
        retryable: true,
      });
    }
    return result;
  }

  Game.sdkAdapter = Object.freeze({
    isOnline: () => Boolean(sdk()),
    progress,
    ready,
    error,
    kvGet,
    kvPut,
    drawGenerate,
    drawGenerateModels,
  });
}(window));
