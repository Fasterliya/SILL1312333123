(function initIdolSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.idolCore;
  const Activities = Game.idolActivities;
  const Career = Game.idolCareer;
  const Production = Game.idolProduction;

  function releaseButtons(state, idol) {
    if (idol.stage !== 'debuted') return '';
    return Object.entries(Core.RELEASES).map(([type, item]) => {
      const last = Number.isFinite(idol.lastReleaseMonths[type])
        ? idol.lastReleaseMonths[type] : -item.cooldown;
      const remaining = Math.max(0, item.cooldown - (state.totalMonths - last));
      return `<button data-idol-action="release" data-release-type="${type}">
        ${item.label} · ${Game.view.money(item.cost)}${remaining ? ` · 冷却${remaining}月` : ''}
      </button>`;
    }).join('');
  }

  function releaseSummary(idol) {
    const latest = idol.releases[idol.releases.length - 1];
    const config = latest && Core.RELEASES[latest.type];
    return config
      ? `<p class="empty-state">发行记录 ${idol.releases.length}次 · 最近：${config.label}</p>`
      : '<p class="empty-state">正式出道后可发行单曲、专辑、写真并举办演唱会。</p>';
  }

  function render(state) {
    if (!Core.isIdolJob(state.career.jobId)) return '';
    const idol = Core.ensure(state);
    if (idol.stage === 'trainee') return Game.idolTraineeView.render(state);
    const stages = { trainee: '练习生', debuted: '已出道', retired: '已退役' };
    const securityActive = Core.securityActive(state, idol);
    const securityMonths = securityActive
      ? Math.max(1, idol.securityUntilMonth - state.totalMonths + 1) : 0;
    const securityText = securityActive ? '续聘安保' : '聘请安保';
    return `<section class="creator-card idol-card">
      <header><div><span>${idol.agencyName || ''} · ${stages[idol.stage] || ''}</span>
        <strong>${idol.fans.toLocaleString()} 粉丝</strong></div>
        <b>练习${idol.trainingMonths}月 · ${idol.producerAbuse}次潜规则</b></header>
      <div class="creator-metrics">
        <span>舞蹈 <b>${idol.skills.dance}</b></span>
        <span>声乐 <b>${idol.skills.vocal}</b></span>
        <span>表情 <b>${idol.skills.expression}</b></span>
        <span>制作人信任 <b>${Math.round(idol.producerTrust)}</b></span>
        <span>恋爱合约 <b>${idol.loveBanSigned ? '已签署' : '未签署'}</b></span>
        <span>安保状态 <b>${securityActive ? `剩余${securityMonths}月` : '未启用'}</b></span>
      </div>
      <div class="creator-actions">
        <button data-idol-action="train" data-idol-skill="dance">训练舞蹈</button>
        <button data-idol-action="train" data-idol-skill="vocal">训练声乐</button>
        <button data-idol-action="train" data-idol-skill="expression">训练表情</button>
        <button data-idol-action="evaluate">月末考评</button>
        <button data-idol-action="handshake">握手会</button>
        ${idol.stage !== 'trainee' ? '<button data-idol-action="casting">制作人私约</button>' : ''}
        ${!idol.group?.name ? '<button data-idol-action="formGroup">组建团体</button>' : ''}
        <button data-idol-action="signLoveBan">
          ${idol.loveBanSigned ? '解除' : '签约'}恋爱禁止
        </button>
        <button data-idol-action="hireSecurity">${securityText} · 每月2000</button>
        ${U.age(state) >= 28 ? '<button data-idol-action="graduation">毕业公演</button>' : ''}
        ${releaseButtons(state, idol)}
      </div>
      ${releaseSummary(idol)}
      ${Activities.renderGroup(state)}
    </section>`;
  }

  function actionResult(state, button) {
    const action = button.dataset.idolAction;
    if (action === 'plan') return Game.idolTraineeSchedule.add(state, button.dataset.planType);
    if (action === 'clearPlan') return Game.idolTraineeSchedule.clear(state);
    if (action === 'executePlan') return Game.idolTraineeSchedule.execute(state);
    if (action === 'train') return Activities.train(state, button.dataset.idolSkill);
    if (action === 'evaluate') return Activities.evaluation(state);
    if (action === 'handshake') return Activities.handshake(state);
    if (action === 'casting') return Activities.castingCouch(state);
    if (action === 'formGroup') return Activities.formGroup(state);
    if (action === 'signLoveBan') {
      return Core.ensure(state).loveBanSigned
        ? Career.breakLoveBan(state) : Career.signLoveBan(state);
    }
    if (action === 'hireSecurity') return Production.hireSecurity(state);
    if (action === 'graduation') return Career.graduationConcert(state);
    if (action === 'release') return Production.releaseWork(state, button.dataset.releaseType);
    return null;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-idol-action]');
    if (!button) return false;
    const state = Game._getState?.();
    if (!state) return false;
    const result = actionResult(state, button);
    if (result) {
      Game._refresh();
      Game._save?.();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  Game.idolSystem = Object.freeze({
    ensure: Core.ensure,
    onJobChange: Core.onJobChange,
    isIdolJob: Core.isIdolJob,
    train: Activities.train,
    handshake: Activities.handshake,
    evaluation: Activities.evaluation,
    castingCouch: Activities.castingCouch,
    formGroup: Activities.formGroup,
    groupMonthly: Activities.groupMonthly,
    renderGroup: Activities.renderGroup,
    election: Career.election,
    signLoveBan: Career.signLoveBan,
    breakLoveBan: Career.breakLoveBan,
    graduationConcert: Career.graduationConcert,
    transitionCareer: Career.transitionCareer,
    monthlyAntiCheck: Production.monthlyAntiCheck,
    hireSecurity: Production.hireSecurity,
    releaseWork: Production.releaseWork,
    monthly: Production.monthly,
    render,
    handleClick,
  });
}(window));
