(function initSystemHub(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function npcSettings(state) {
    const npc = Game.npcInitiative.ensure(state);
    const labels = { high: '高频', low: '低频', off: '关闭' };
    return `<section class="panel"><div class="panel-title"><h2>NPC主动事件</h2>
      <span>${npc.queue.length}条待处理</span></div>
      <nav class="filter-chips">${Object.keys(labels).map((value) => (
        `<button class="${npc.frequency === value ? 'active' : ''}"
          data-npc-frequency="${value}">${labels[value]}</button>`
      )).join('')}</nav></section>`;
  }

  function renderStatus(state) {
    return (Game.psychology?.render(state) || '')
      + (Game.criminalSystem?.render(state) || '')
      + npcSettings(state);
  }

  function renderFinance(state) {
    return (Game.bankSystem?.render(state) || '')
      + (Game.companySystem?.render(state) || '')
      + (Game.stockDirector?.render(state) || '');
  }

  Game.systemHub = Object.freeze({ renderStatus, renderFinance });
}(window));
