(function initIdolTraineeView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const State = Game.idolTraineeState;
  const Schedule = Game.idolTraineeSchedule;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function metric(label, value, max) {
    const width = Math.max(0, Math.min(100, value / (max || 100) * 100));
    return `<div class="trainee-metric"><span>${label}<b>${Math.round(value)}</b></span>
      <i><em style="width:${width}%"></em></i></div>`;
  }

  function plan(state, idol) {
    const done = idol.lastScheduleMonth === state.totalMonths;
    const slots = [0, 1, 2].map((index) => {
      const type = idol.schedule[index];
      return `<span class="${type ? 'filled' : ''}">${type
        ? Schedule.OPTIONS[type].label : `训练格 ${index + 1}`}</span>`;
    }).join('');
    return `<section class="trainee-plan">
      <div class="trainee-section-title"><strong>本月排程</strong>
        <span>${done ? '本月已执行' : `${idol.schedule.length}/3`}</span></div>
      <div class="trainee-slots">${slots}</div>
      <div class="trainee-options">${Object.entries(Schedule.OPTIONS).map(([id, item]) => (
        `<button data-idol-action="plan" data-plan-type="${id}" ${done ? 'disabled' : ''}>${item.label}</button>`
      )).join('')}</div>
      <div class="trainee-confirm">
        <button data-idol-action="clearPlan" ${done || !idol.schedule.length ? 'disabled' : ''}>清空</button>
        <button class="primary" data-idol-action="executePlan"
          ${done || idol.schedule.length !== 3 ? 'disabled' : ''}>执行本月排程</button>
      </div>
    </section>`;
  }

  function ranking(state, idol) {
    const latest = idol.evaluationHistory.at(-1);
    if (!latest) {
      return `<section class="trainee-ranking"><div class="trainee-section-title">
        <strong>季度考评</strong><span>剩余${Math.max(0, idol.nextEvaluationMonth - state.totalMonths)}月</span>
        </div><p class="empty-state">每季度按综合表现排名，前2名且达标可获得出道席位。</p></section>`;
    }
    return `<section class="trainee-ranking"><div class="trainee-section-title">
      <strong>最近考评</strong><span>第${latest.rank}/${latest.total}名 · ${latest.score}分</span></div>
      <div class="trainee-leaders">${latest.leaders.map((entry) => (
        `<span><b>${entry.rank}</b>${escape(entry.name)}<em>${entry.score}</em></span>`
      )).join('')}</div></section>`;
  }

  function cohort(state) {
    const members = State.members(state);
    return `<details class="trainee-cohort"><summary>同期练习生 · ${members.length + 1}人</summary>
      <div>${members.map((person) => {
        const idol = person.npcIdol;
        const relation = State.isSchoolPeer(person) ? '同窗' : '同城';
        return `<button type="button" data-character-id="${escape(person.id)}">
          <span>${Game.portraitSystem.avatar(person)}</span><strong>${escape(person.name)}</strong>
          <small>${relation} · ${idol.stage === 'debuted' ? '已出道' : `关注${idol.attention}`}</small>
        </button>`;
      }).join('')}</div></details>`;
  }

  function render(state) {
    const idol = State.ensure(state);
    const months = Math.max(0, idol.nextEvaluationMonth - state.totalMonths);
    return `<section class="creator-card idol-card trainee-card">
      <header><div><span>${escape(idol.agencyName)} · 练习生</span>
        <strong>${Number.isFinite(idol.lastRank) ? `同期第${idol.lastRank}名` : '等待首次排名'}</strong></div>
        <b>${months ? `${months}个月后考评` : '本月考评'}</b></header>
      <div class="trainee-metrics">
        ${metric('舞蹈', idol.skills.dance)}${metric('声乐', idol.skills.vocal)}
        ${metric('镜头', idol.skills.expression)}${metric('状态', idol.condition)}
      </div>
      <p class="trainee-attention">关注度 <b>${Math.round(idol.attention)}</b> · 已完成${idol.trainingMonths}个月排程</p>
      ${plan(state, idol)}${ranking(state, idol)}${cohort(state)}
    </section>`;
  }

  Game.idolTraineeView = Object.freeze({ render });
}(window));
