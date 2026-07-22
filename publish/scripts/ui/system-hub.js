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
    return (Game.stressSystem?.render(state) || '')
      + (Game.psychology?.render(state) || '')
      + (Game.mentalBreakdown ? renderMentalBuffs(state) : '')
      + (Game.criminalSystem?.render(state) || '')
      + npcSettings(state);
  }

  function renderMentalBuffs(state) {
    var m = Game.mentalBreakdown.ensure(state);
    if (!m.recoveryBuffs.length && !m.breakdownCount) return '';
    var buffs = m.recoveryBuffs.map(function (b) {
      var cls = b.effect && (b.effect.negotiation < 0 || b.effect.social < 0 || b.effect.health < 0) ? ' negative' : '';
      var desc = b.effect ? Object.entries(b.effect).map(function (pair) {
        return (pair[1] < 0 ? '' : '+') + pair[1] + ' ' + pair[0];
      }).join(' · ') : '';
      return '<div class="mental-buff' + cls + '">' + b.name
        + '<span>剩余' + b.months + '个月' + (desc ? ' · ' + desc : '') + '</span></div>';
    }).join('');
    return '<section class="panel mental-breakdown-panel"><div class="panel-title"><h2>精神状态</h2>'
      + '<span>崩坏' + m.breakdownCount + '次 · 阈值' + m.breakdownThreshold + '</span></div>'
      + (buffs ? '<div class="mental-buff-list">' + buffs + '</div>' : '')
      + '</section>';
  }

  function renderFinance(state) {
    return Game.financeEnterpriseView?.render(state)
      || ((Game.bankSystem?.render(state) || '')
        + (Game.companySystem?.render(state) || '')
        + (Game.stockDirector?.render(state) || ''));
  }

  Game.systemHub = Object.freeze({ renderStatus, renderFinance });
}(window));
