(function initPortraitSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const drawing = new Set();
  const latest = new Map();
  const errors = new Map();
  let api = null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function safeImage(url) {
    if (typeof url !== 'string') return '';
    try {
      const parsed = new URL(url, root.location?.href || 'https://game.local');
      return ['https:', 'http:', 'data:', 'blob:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function findTarget(key) {
    const state = api.getState();
    if (key === 'player') return state.profile;
    return [...state.family, ...state.contacts].find((person) => person.id === key) || null;
  }

  function description(state, target, key, custom) {
    return Game.portraitPrompt.build(state, target, key, custom);
  }

  async function retryDraw(input) {
    const retryable = new Set(['RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT', 'DRAW_TIMEOUT', 'CREATE_TASK_FAILED', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE']);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await Game.sdkAdapter.drawGenerate(input);
      } catch (err) {
        if (!retryable.has(err?.code) || !err?.retryable || attempt === 1) throw err;
        await new Promise((resolve) => root.setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
    return null;
  }

  function guidance(err) {
    return {
      SDK_UNAVAILABLE: '请在 Game Studio 预览中生成立绘',
      SENSITIVE_CONTENT_DETECTED: '提示词未通过内容检查，请先清空附加提示词，或更换COS后重试',
      QUOTA_EXHAUSTED: '今日绘图额度或积分不足',
      VIP_REQUIRED: '当前模型需要会员权限',
      UNAUTHORIZED: '登录状态失效，请重新进入游戏',
      TOKEN_EXPIRED: '登录状态失效，请重新进入游戏',
    }[err?.code] || '生成失败，点击按钮可以重试';
  }

  async function generate(key, rawCustom) {
    if (drawing.has(key)) return;
    if (drawing.size >= 2) {
      Game.view.showToast('已有两张立绘正在生成，请稍候', 'warning');
      return;
    }
    const target = findTarget(key);
    if (!target) return;
    if (key !== 'player') Game.npcLife.syncGrowth(api.getState(), target);
    const custom = Game.portraitPrompt.clean(
      String(rawCustom || '').replace(/[\u0000-\u001f]/g, ' ')
    ).slice(0, 120);
    target.customPrompt = custom;
    drawing.add(key);
    errors.delete(key);
    const requestId = (latest.get(key) || 0) + 1;
    latest.set(key, requestId);
    api.refresh();
    try {
      const state = api.getState();
      const result = await retryDraw({
        prompt: description(state, target, key, custom),
        dimension: '2:3',
        model: 'anime',
      });
      if (latest.get(key) !== requestId || findTarget(key) !== target) return;
      if (!Game.portraitGallery.add(key, result, custom)) throw new Error('绘图结果没有有效图片');
      await api.save();
    } catch (err) {
      if (latest.get(key) !== requestId) return;
      console.error('立绘生成失败:', err?.code, err?.message, err?.stack);
      errors.set(key, guidance(err));
    } finally {
      if (latest.get(key) === requestId) drawing.delete(key);
      api.refresh();
    }
  }

  function portraitMarkup(target, key, name, npc) {
    const image = safeImage(target.portraitUrl);
    const waiting = drawing.has(key);
    const slotAttr = `data-portrait-view="${escape(key)}"`;
    const slot = image ? `<img src="${escape(image)}" alt="${escape(name)}的角色立绘">`
      : `<div class="portrait-empty"><b>${escape(name.slice(-1))}</b><span>尚未生成立绘</span></div>`;
    return `<button class="portrait-slot ${npc ? 'npc-portrait-slot' : ''}" ${slotAttr}
      type="button" aria-label="查看${escape(name)}的立绘大图">${slot}</button>
      <div class="portrait-actions"><p>${waiting ? '角色立绘生成中，预计约30-60秒' : (errors.get(key) || '文生图固定画风 · 自定义描述权重1.8')}</p>
      <label class="prompt-field"><span>附加提示词 · 权重1.8</span>
      <input maxlength="120" value="${escape(target.customPrompt)}" ${npc ? 'data-npc-prompt' : 'id="portraitPromptInput"'}
        placeholder="例如：戴金丝眼镜、手持书本"></label>
      ${npc ? `<button data-npc-generate="${escape(key)}" ${waiting ? 'disabled' : ''}>${image ? '重新生成' : '生成立绘'}</button>` : ''}</div>`;
  }

  function renderPlayer(state, elements) {
    const target = state.profile;
    const image = safeImage(target.portraitUrl);
    const waiting = drawing.has('player');
    elements.portraitSlot.innerHTML = image
      ? `<img src="${escape(image)}" alt="${escape(state.name)}的角色立绘">`
      : `<div class="portrait-empty"><b>${escape(state.name.slice(-1))}</b><span>尚未生成立绘</span></div>`;
    elements.portraitSlot.querySelector('img')?.addEventListener('error', () => {
      if (target.portraitUrl !== image) return;
      errors.set('player', '原立绘地址已失效，已切换其他缓存');
      Game.portraitGallery.remove('player', image);
    }, { once: true });
    elements.portraitStatus.textContent = waiting ? '角色立绘生成中，预计约30-60秒'
      : (errors.get('player') || '文生图固定画风 · 自定义描述权重1.8');
    elements.portraitSlot.disabled = false;
    elements.generatePortraitBtn.disabled = waiting;
    elements.generatePortraitBtn.textContent = waiting ? '生成中…约30-60秒' : (image ? '重新生成立绘' : '生成角色立绘');
    if (document.activeElement !== elements.portraitPromptInput) {
      elements.portraitPromptInput.value = target.customPrompt || '';
    }
  }

  function npcHtml(state, person) {
    return `<section class="panel portrait-panel npc-panel">${portraitMarkup(person, person.id, person.name, true)}</section>`;
  }

  function avatar(person) {
    const image = safeImage(person.portraitUrl);
    return image ? `<img src="${escape(image)}" alt="">` : escape(person.name.slice(-1));
  }

  function configure(options) { api = options; }
  function generatePlayer(custom) { return generate('player', custom); }
  function generateNpc(id, custom) { return generate(id, custom); }
  function cancelAll() {
    latest.forEach((value, key) => latest.set(key, value + 1));
    drawing.clear();
  }

  Game.portraitSystem = Object.freeze({
    configure, renderPlayer, npcHtml, avatar, generatePlayer, generateNpc, cancelAll, description,
  });
}(window));
