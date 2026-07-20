(function initSaveManager(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let api = null;
  let host = null;
  let phase = 'loading';
  let slots = [];
  let busySlot = 0;

  function formatDate(value) {
    if (!value) return '尚未保存';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  function sourceLabel(source) {
    return { kv: '云端+本地', local: '本地缓存', memory: '内存', error: '读取失败' }[source] || '空档';
  }

  function slotCard(slot) {
    if (slot.empty) {
      return `<article class="save-slot empty"><header><strong>档位 ${slot.index}</strong>
        <span>${sourceLabel(slot.source)}</span></header><p>暂无手动存档</p>
        <div><button data-save-action="save" data-save-slot="${slot.index}">保存当前人生</button></div></article>`;
    }
    const age = Math.max(0, Math.floor((slot.totalMonths - slot.playerBornAt) / 12));
    return `<article class="save-slot"><header><strong>档位 ${slot.index} · ${slot.name}</strong>
      <span>${sourceLabel(slot.source)}</span></header>
      <p>第${slot.generation}代 · ${age}岁 · ${slot.city} · ${slot.year}年${slot.month}月</p>
      <small>${formatDate(slot.updatedAt)}</small><div>
      <button data-save-action="save" data-save-slot="${slot.index}">覆盖</button>
      <button data-save-action="load" data-save-slot="${slot.index}">读取</button>
      <button class="danger" data-save-action="delete" data-save-slot="${slot.index}">删除</button></div></article>`;
  }

  function render() {
    if (!host) return;
    const info = Game.storage.status();
    const cacheText = `${info.online ? 'Gamefy KV 已连接' : '离线本地模式'} · 已缓存 ${info.cachedSlots}/3 个档位`;
    const body = phase === 'loading' ? '<p class="save-state">正在读取存档与缓存…</p>'
      : (phase === 'error' ? '<p class="save-state error">存档读取失败，请点击刷新重试。</p>'
        : slots.map(slotCard).join(''));
    host.innerHTML = `<section class="save-overview"><span>自动存档</span>
      <strong>${sourceLabel(info.source)}</strong><small>${cacheText}</small>
      <small>最近写入：${formatDate(info.lastSavedAt)}</small></section>
      <div class="save-toolbar"><button data-save-action="refresh" ${busySlot ? 'disabled' : ''}>刷新存档缓存</button></div>
      <div class="save-slots ${busySlot ? 'busy' : ''}">${body}</div>`;
    host.querySelectorAll('button').forEach((button) => { button.disabled ||= Boolean(busySlot); });
  }

  async function load(force) {
    phase = 'loading';
    render();
    try {
      slots = await Game.storage.slotSummaries(Boolean(force));
      phase = 'ready';
    } catch (err) {
      console.error('读取存档列表失败:', err?.message, err?.stack);
      phase = 'error';
    }
    render();
  }

  async function run(action, index) {
    if (busySlot) return;
    busySlot = index || -1;
    render();
    try {
      if (action === 'save') {
        if (!root.confirm(`确定覆盖档位 ${index} 吗？`)) return;
        await Game.storage.saveSlot(index, api.getState());
        Game.view.showToast(`档位 ${index} 保存成功`, 'good');
      } else if (action === 'load') {
        if (!root.confirm(`确定读取档位 ${index} 吗？当前自动存档会被替换。`)) return;
        const snapshot = await Game.storage.loadSlot(index);
        if (!snapshot) throw new Error('存档不存在');
        await api.restore(snapshot);
        Game.view.showToast(`已读取档位 ${index}`, 'good');
      } else if (action === 'delete') {
        if (!root.confirm(`确定删除档位 ${index} 吗？`)) return;
        await Game.storage.deleteSlot(index);
        Game.view.showToast(`档位 ${index} 已删除`, 'good');
      }
      await load(false);
    } catch (err) {
      console.error('存档操作失败:', err?.message, err?.stack);
      Game.view.showToast(err?.message || '存档操作失败', 'warning');
    } finally {
      busySlot = 0;
      render();
    }
  }

  function handleClick(event) {
    const button = event.target.closest('[data-save-action]');
    if (!button) return false;
    const action = button.dataset.saveAction;
    if (action === 'refresh') load(true);
    else run(action, Number(button.dataset.saveSlot));
    return true;
  }

  function init() {
    host = document.getElementById('saveManager');
    if (!host) throw new Error('存档管理界面缺失');
    render();
  }

  function configure(options) { api = options; }

  Game.saveManager = Object.freeze({ init, configure, load, render, handleClick });
}(window));
