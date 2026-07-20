(function initPortraitGallery(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const el = {};
  let api = null;
  let activeKey = '';

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

  function targetFor(key) {
    const state = api.getState();
    if (key === 'player') return Game.hunterMode.identity(state).profile;
    return Game.people.find(state, key);
  }

  function entries(target) {
    target.portraitGallery = Array.isArray(target.portraitGallery)
      ? target.portraitGallery.filter((entry) => safeImage(entry?.url)).slice(0, 8)
      : [];
    if (safeImage(target.portraitUrl) && !target.portraitGallery.some((entry) => entry.url === target.portraitUrl)) {
      target.portraitGallery.unshift({
        url: target.portraitUrl,
        taskId: target.portraitTaskId || null,
        prompt: target.customPrompt || '',
        createdAt: new Date().toISOString(),
      });
    }
    return target.portraitGallery;
  }

  function selectActive(target, entry) {
    target.portraitUrl = entry?.url || null;
    target.portraitTaskId = entry?.taskId || null;
  }

  function render() {
    const target = targetFor(activeKey);
    if (!target) return close();
    const state = api.getState();
    const name = activeKey === 'player' ? Game.hunterMode.identity(state).name : target.name;
    const gallery = entries(target);
    const current = gallery.find((entry) => entry.url === target.portraitUrl) || gallery[0];
    if (current && current.url !== target.portraitUrl) selectActive(target, current);
    el.title.textContent = `${name}的立绘`;
    if (!current) {
      el.content.innerHTML = '<section class="portrait-gallery-empty"><strong>暂无立绘</strong><span>返回角色页后点击生成按钮创建第一张立绘。</span></section>';
      return;
    }
    const main = safeImage(current.url);
    const thumbs = gallery.map((entry, index) => {
      const image = safeImage(entry.url);
      const selected = entry.url === current.url ? ' selected' : '';
      return `<button class="portrait-thumb${selected}" type="button" data-portrait-select="${index}"
        aria-label="设为展示立绘"><img src="${escape(image)}" alt=""></button>`;
    }).join('');
    el.content.innerHTML = `<section class="portrait-gallery">
      <div class="portrait-large"><img src="${escape(main)}" alt="${escape(name)}的大图立绘"></div>
      <div class="portrait-gallery-meta"><strong>当前展示</strong><span>${gallery.length}/8 张缓存</span></div>
      <div class="portrait-thumbs">${thumbs}</div>
      <p>点击缩略图切换角色资料与头像使用的展示立绘。</p>
    </section>`;
  }

  function open(key) {
    if (!targetFor(key)) return;
    activeKey = key;
    render();
    el.screen.hidden = false;
    el.content.scrollTop = 0;
  }

  function close() {
    el.screen.hidden = true;
    el.content.innerHTML = '';
    activeKey = '';
  }

  function add(key, result, prompt) {
    const target = targetFor(key);
    const url = safeImage(result?.images?.[0]);
    if (!target || !url) return false;
    const gallery = entries(target).filter((entry) => entry.url !== url);
    const entry = {
      url,
      taskId: result.taskId || null,
      prompt: prompt || '',
      createdAt: new Date().toISOString(),
    };
    target.portraitGallery = [entry, ...gallery].slice(0, 8);
    selectActive(target, entry);
    return true;
  }

  function remove(key, url) {
    const target = targetFor(key);
    if (!target) return;
    target.portraitGallery = entries(target).filter((entry) => entry.url !== url);
    selectActive(target, target.portraitGallery[0]);
    api.save();
    api.refresh();
    if (activeKey === key) render();
  }

  function handleClick(event) {
    const view = event.target.closest('[data-portrait-view]');
    if (view) {
      open(view.dataset.portraitView);
      return true;
    }
    const choice = event.target.closest('[data-portrait-select]');
    if (!choice || !activeKey) return false;
    const target = targetFor(activeKey);
    const entry = entries(target)[Number(choice.dataset.portraitSelect)];
    if (!entry) return true;
    selectActive(target, entry);
    api.save();
    api.refresh();
    render();
    Game.view.showToast('展示立绘已切换', 'good');
    return true;
  }

  function init() {
    el.screen = document.getElementById('portraitViewer');
    el.title = document.getElementById('portraitViewerTitle');
    el.content = document.getElementById('portraitViewerContent');
    el.back = document.getElementById('portraitViewerBackBtn');
    if (Object.values(el).some((item) => !item)) throw new Error('立绘大图结构不完整');
    el.back.addEventListener('click', close);
  }

  function configure(options) { api = options; }

  Game.portraitGallery = Object.freeze({
    configure, init, open, close, add, remove, handleClick,
  });
}(window));
