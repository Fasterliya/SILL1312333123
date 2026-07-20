(function initDrawSettings(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const fallback = Object.freeze([
    Object.freeze({ id: 'anime', displayName: 'Anime', description: '标准动漫立绘模型', isDefault: true }),
    Object.freeze({ id: 'iroha', displayName: 'Iroha', description: '细腻二次元立绘模型', isDefault: false }),
  ]);
  let models = fallback.slice();
  let status = 'idle';
  let errorText = '';
  let pending = null;
  let api = null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function normalize(item) {
    const id = String(item?.id || '');
    if (!/^[A-Za-z0-9._:-]{1,64}$/.test(id)) return null;
    return {
      id,
      displayName: String(item.displayName || id).slice(0, 80),
      description: String(item.description || '文生图模型').slice(0, 160),
      isDefault: Boolean(item.isDefault),
    };
  }

  function selected(state) {
    return state?.settings?.drawModel || 'anime';
  }

  function current(state) {
    const id = selected(state);
    return models.find((item) => item.id === id)
      || fallback.find((item) => item.id === id)
      || models[0] || fallback[0];
  }

  function label(state) {
    return current(state).displayName;
  }

  function ensureSelection(state, preferred) {
    if (!state?.settings) return false;
    if (models.some((item) => item.id === state.settings.drawModel)) return false;
    const next = models.find((item) => item.id === preferred)
      || models.find((item) => item.isDefault) || models[0] || fallback[0];
    state.settings.drawModel = next.id;
    return true;
  }

  function render(state) {
    const host = document.getElementById('drawModelSettings');
    if (!host) return;
    const chosen = selected(state);
    const note = status === 'loading' ? '正在读取可用模型…'
      : (status === 'error' ? errorText : `${models.length} 个模型可用`);
    host.innerHTML = `<section class="draw-model-summary"><span>当前绘画模型</span>
      <strong>${escape(label(state))}</strong><small>${escape(note)}</small></section>
      <div class="draw-model-list" role="radiogroup" aria-label="绘画模型">${models.map((item) => (
        `<button class="draw-model-option ${chosen === item.id ? 'active' : ''}" type="button"
          role="radio" aria-checked="${chosen === item.id}" data-draw-model="${escape(item.id)}">
          <strong>${escape(item.displayName)}</strong><small>${escape(item.description)}</small>
          <b>${chosen === item.id ? '使用中' : '选择'}</b></button>`
      )).join('')}</div>
      <button class="draw-model-refresh" type="button" data-draw-model-refresh
        ${status === 'loading' ? 'disabled' : ''}>刷新模型列表</button>`;
  }

  async function load(force) {
    if (pending) return pending;
    if (status === 'ready' && !force) return models;
    status = 'loading';
    errorText = '';
    render(api?.getState());
    pending = Game.sdkAdapter.drawGenerateModels().then((result) => {
      const available = result.models.map(normalize).filter(Boolean);
      if (!available.length) throw Object.assign(new Error('平台没有返回可用绘画模型'), {
        code: 'INVALID_MODEL_LIST',
      });
      models = available;
      status = 'ready';
      const state = api?.getState();
      if (ensureSelection(state, result.defaultModel)) api.save();
      render(state);
      return models;
    }).catch((err) => {
      if (err?.code !== 'SDK_UNAVAILABLE') {
        console.error('读取绘画模型失败:', err?.code, err?.message, err?.stack);
      }
      models = fallback.slice();
      status = 'error';
      errorText = '模型列表暂不可用，已显示基础模型';
      const state = api?.getState();
      if (ensureSelection(state, 'anime')) api.save();
      render(state);
      return models;
    }).finally(() => {
      pending = null;
    });
    return pending;
  }

  function setModel(id) {
    const state = api?.getState();
    if (!state || !models.some((item) => item.id === id)) return;
    state.settings.drawModel = id;
    render(state);
    api.save();
    Game.view.showToast(`绘画模型已切换为 ${label(state)}`, 'good');
  }

  function handleClick(event) {
    const option = event.target.closest('[data-draw-model]');
    if (option) {
      setModel(option.dataset.drawModel);
      return true;
    }
    if (event.target.closest('[data-draw-model-refresh]')) {
      load(true);
      return true;
    }
    return false;
  }

  function configure(options) { api = options; }

  Game.drawSettings = Object.freeze({
    configure, load, render, handleClick, selected, label,
  });
}(window));
