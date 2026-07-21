(function initIdolDebutView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function strategy(idol) {
    const Cycle = Game.idolProjectCycle;
    const locked = idol.strategyConfirmed && idol.strategyAdjustments >= 1;
    return `<section class="idol-cycle-section"><div class="idol-cycle-title">
      <strong>年度运营策略</strong><span>${locked ? '本年已锁定' : '可调整一次'}</span></div>
      <div class="idol-strategies">${Object.entries(Cycle.STRATEGIES).map(([id, item]) => (
        `<button class="${idol.strategyId === id ? 'active' : ''}" data-idol-action="setIdolStrategy"
          data-strategy-id="${id}" ${locked && idol.strategyId !== id ? 'disabled' : ''}>${item.label}</button>`
      )).join('')}</div></section>`;
  }

  function project(state, idol) {
    const active = idol.activeProject;
    if (!active) {
      return `<section class="idol-cycle-section"><div class="idol-cycle-title">
        <strong>季度企划</strong><span>等待选择</span></div>
        <button class="idol-project-pick" data-idol-action="chooseIdolProject">选择下一季度企划</button>
      </section>`;
    }
    const item = Game.idolProjectCycle.PROJECTS[active.id];
    const progress = Math.min(3, active.progress || 0);
    return `<section class="idol-cycle-section"><div class="idol-cycle-title">
      <strong>${item.label}</strong><span>${progress}/3个月</span></div>
      <div class="idol-project-progress"><b style="width:${progress / 3 * 100}%"></b></div>
      <p class="empty-state">制作中，月度结算时自动推进。</p></section>`;
  }

  function secondary(state, idol) {
    const security = Game.idolCore.securityActive(state, idol);
    const months = security ? Math.max(1, idol.securityUntilMonth - state.totalMonths + 1) : 0;
    return `<details class="idol-secondary"><summary>合约、活动与安全</summary>
      <div class="creator-actions">
        <button data-idol-action="handshake">举办握手会</button>
        <button data-idol-action="casting">制作人私约</button>
        <button data-idol-action="signLoveBan">${idol.loveBanSigned ? '解除' : '签署'}恋爱禁止</button>
        <button data-idol-action="hireSecurity">${security ? `续聘安保 · ${months}月` : '聘请安保 · 2000'}</button>
        ${U.age(state) >= 28 ? '<button data-idol-action="graduation">举办毕业公演</button>' : ''}
      </div></details>`;
  }

  function render(state) {
    const idol = Game.idolProjectCycle.ensure(state);
    const latest = idol.projectHistory.at(-1);
    return `<section class="creator-card idol-card idol-career-card">
      <header><div><span>${idol.agencyName || '偶像事务所'} · 正式偶像</span>
        <strong>${idol.fans.toLocaleString()} 粉丝</strong></div>
        <b>${idol.lastElectionRank ? `总选第${idol.lastElectionRank}名` : '尚无年度排名'}</b></header>
      <div class="idol-career-metrics">
        <span>热度<b>${Math.round(idol.heat)}</b></span>
        <span>口碑<b>${Math.round(idol.reputation)}</b></span>
        <span>状态<b>${Math.round(idol.condition)}</b></span>
        <span>团队<b>${Math.round(idol.group?.cohesion || 0)}</b></span>
      </div>
      ${strategy(idol)}${project(state, idol)}
      <p class="idol-career-note">${latest
        ? `最近企划：${Game.idolProjectCycle.PROJECTS[latest.id]?.label || '休整季度'} · 质量${Math.round(latest.quality * 100)}%`
        : '完成季度企划后，作品质量会影响涨粉、口碑和年度总选。'}</p>
      ${Game.idolActivities.renderGroup(state)}
      ${secondary(state, idol)}
    </section>`;
  }

  Game.idolDebutView = Object.freeze({ render });
}(window));
