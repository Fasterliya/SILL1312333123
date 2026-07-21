(function initHealthView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const hasMonth = (value) => Number.isFinite(value);
  const active = (state) => (state.health.diseases || []).filter((item) => !hasMonth(item.healedAt));

  function diseaseRows(state) {
    const rows = active(state).filter((item) => hasMonth(item.discoveredAt)).map((disease) => {
      const def = Game.healthData.get(disease.id);
      if (!def) return '';
      const managed = hasMonth(disease.treatedAt);
      const penalty = Math.round(def.healthPenalty * (managed ? 25 : 100));
      const status = managed ? `已控制 · 健康上限 -${penalty}%` : `活动中 · 健康上限 -${penalty}%`;
      const button = managed ? '' : `<button data-health-action="treat"
        data-health-value="${disease.id}">治疗 · ${Game.view.money(def.treatCost)}</button>`;
      return `<article class="disease-row"><div><strong>${disease.name}</strong>
        <small>${status}</small></div>${button}</article>`;
    }).join('');
    return rows || '<p class="empty-state">目前没有已发现疾病。健康上限不会被未发现项目直接写死，定期检测可确认状态。</p>';
  }

  function checkupText(state) {
    const last = Number(state.health.lastCheckupMonth);
    if (!Number.isFinite(last) || last < 0) return '从未检测';
    const elapsed = Math.max(0, state.totalMonths - last);
    return elapsed === 0 ? '本月已检测' : `${elapsed}个月前`;
  }

  function focusText(state, item, known) {
    if (known > 0) return '优先处理已发现疾病，恢复健康上限';
    if (state.health.sleep < 7) return '睡眠偏少，充分休息可改善生命力';
    if (item.current < item.ceiling * 0.75) return '当前健康低于上限，可通过运动与休息恢复';
    return '状态稳定，保持规律作息并按期检测';
  }

  function overview(state, item, status, known) {
    const stress = Game.stressSystem?.ensure(state);
    const stressLabel = stress ? `${Math.round(stress.value || 0)}/399` : '稳定';
    return `<section class="health-overview">
      <header><div><span class="health-kicker">身体状态</span><h3>${status}</h3>
        <p>${focusText(state, item, known)}</p></div><strong>${item.current}<small>/100</small></strong></header>
      <div class="health-meter" role="meter" aria-label="当前健康" aria-valuemin="0"
        aria-valuemax="100" aria-valuenow="${item.current}"><i style="width:${item.current}%"></i>
        <b style="left:${item.ceiling}%"></b></div>
      <div class="health-metric-grid">
        <div><span>健康上限</span><strong>${item.ceiling}%</strong><small>疾病与年龄影响</small></div>
        <div><span>睡眠</span><strong>${state.health.sleep}小时</strong><small>建议 7–9 小时</small></div>
        <div><span>医疗照护</span><strong>${Math.round(state.health.careLevel)}</strong><small>检测 ${checkupText(state)}</small></div>
        <div><span>压力</span><strong>${stressLabel}</strong><small>压力会降低健康</small></div>
      </div></section>`;
  }

  function render(state) {
    const item = Game.healthModel.sync(state);
    const known = active(state).filter((entry) => hasMonth(entry.discoveredAt)).length;
    const status = Game.healthModel.status(item.current);
    const surgery = Game.plasticSurgery ? Game.plasticSurgery.render(state) : '';
    const disabled = state.health.lastLifestyleMonth === state.totalMonths ? 'disabled' : '';
    return `${overview(state, item, status, known)}
      <section class="health-module"><header><span>01</span><div><h3>日常维护</h3>
      <small>检测用于发现问题；每月可选择一次运动或休息</small></div></header>
      <div class="health-action-stack"><button class="health-primary" data-health-action="checkup">
        <span>健康检测</span><small>${checkupText(state)} · ${Game.view.money(1200)}</small></button>
      <div class="study-actions"><button data-health-action="lifestyle" data-health-value="exercise" ${disabled}>
        规律运动</button><button data-health-action="lifestyle" data-health-value="rest" ${disabled}>
        充分休息</button></div></div></section>
      <section class="health-module"><header><span>02</span><div><h3>疾病与治疗</h3>
      <small>${known ? `已发现 ${known} 项需要关注` : '当前没有已发现疾病'}</small></div></header>
      <div class="disease-list">${diseaseRows(state)}</div></section>
      <section class="health-module"><header><span>03</span><div><h3>外貌调整</h3>
      <small>手术 100% 完成，通过恢复期与冷却体现过程</small></div></header>${surgery}</section>`;
  }

  Game.healthView = Object.freeze({ render });
}(window));
