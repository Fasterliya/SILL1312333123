(function initUndergroundIdolView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.undergroundIdolCore;

  function showTab(state, underground) {
    const canSpecial = state.totalMonths - underground.lastSpecialShowMonth >= 3
      && state.stats.健康 >= 25;
    const canShow = state.totalMonths > underground.lastShowMonth;
    return `<div class="creator-actions underground-actions">
      <button data-ug-action="monthlyShow"${canShow ? '' : ' disabled'}>
        Livehouse演出 · ${canShow ? '本月可演' : '已演过'}
      </button>
      <button data-ug-action="specialShow"${canSpecial ? '' : ' disabled'}>
        特殊公演${canSpecial ? ' · 健康-20 · 收入x2' : ' · 冷却中或健康不足'}
      </button>
    </div>
    <p class="empty-state underground-note">
      特殊公演每3个月可办一次；常规Livehouse演出每月自动进行，也可手动触发。
    </p>`;
  }

  function trainTab(underground, totalSkill) {
    return `<div class="creator-actions underground-actions">
      <button data-ug-action="train" data-ug-skill="dance">
        训练舞蹈 · ${underground.skills.dance}
      </button>
      <button data-ug-action="train" data-ug-skill="vocal">
        训练声乐 · ${underground.skills.vocal}
      </button>
      <button data-ug-action="train" data-ug-skill="expression">
        训练表情 · ${underground.skills.expression}
      </button>
    </div>
    <p class="empty-state underground-note">
      地下训练效率为正规偶像的70% · 综合技能 ${totalSkill}/300 ·
      累计训练 ${underground.trainingMonths}个月
    </p>`;
  }

  function groupTab(state, underground) {
    const group = underground.group;
    return `<div class="underground-detail">
      <p><b>所属团体</b><span>${group?.name || '独立偶像'}</span></p>
      <p><b>团体状态</b><span>${group ? `${group.members}人 · 凝聚力${Math.round(group.cohesion)}` : '独立活动'}</span></p>
      <p><b>阶段</b><span>${Core.STAGE_LABELS[underground.stage] || '未知'}</span></p>
      <p><b>派生魅力</b><span>${Math.round(state.stats.魅力 || 0)} · 受外貌、气质与交涉影响</span></p>
      <p><b>业内交易</b><span>${underground.producerAbuse}次</span></p>
      <p><b>强迫伤害</b><span>${underground.corruptionFromForced}次</span></p>
    </div>`;
  }

  function careerTab(state, underground) {
    const charm = Math.round(state.stats.魅力 || 0);
    const cost = Math.round(30000 + underground.producerAbuse * 5000);
    const canPromote = underground.fans >= 20000
      && charm >= 55
      && state.money >= cost;
    const conditions = [
      `粉丝 ${underground.fans.toLocaleString()}/20,000`,
      `魅力 ${charm}/55`,
      `资金 ${Game.view.money(state.money)}/${Game.view.money(cost)}`,
    ];
    return `<div class="underground-career">
      <strong>正规出道条件</strong>
      <ul>${conditions.map((condition) => `<li>${condition}</li>`).join('')}</ul>
      <div class="creator-actions">
        <button data-ug-action="tryPromotion"${canPromote ? '' : ' disabled'}>
          ${canPromote ? `寻求出道 · ${Game.view.money(cost)}` : '条件不足，无法出道'}
        </button>
        <button data-ug-action="castingCouch">查看业内邀约 · 间隔3个月</button>
      </div>
      ${underground.fallBufferMonths > 0 ? `<p class="underground-warning">
        坠落危机 ${underground.fallBufferMonths}/3月，需尽快提升人气或收入。
      </p>` : ''}
      <p class="empty-state underground-note">出道后继承60%粉丝到正规偶像生涯。</p>
    </div>`;
  }

  function pendingDecision(underground) {
    const decision = underground._pendingDecision;
    return `<div class="underground-decision">
      <strong>待决定：${decision.title}</strong>
      <p>${decision.intro}</p>
      <div class="creator-actions">
        <button data-ug-action="acceptDecision">
          接受 · ${Game.view.money(decision.income)} · +${decision.fanBoost}粉
        </button>
        <button data-ug-action="rejectDecision">拒绝 · 资源减少并可能遭报复</button>
      </div>
    </div>`;
  }

  function fallen(underground) {
    const label = Core.FELL_LABELS[underground.fellTo] || '未知';
    return `<section class="creator-card idol-card underground-fallen">
      <header><div><span>地下偶像生涯已终结</span>
        <strong>转为${label}</strong></div>
        <b>曾拥有${underground.fans.toLocaleString()}粉丝 ·
          ${underground.producerAbuse}次业内交易</b></header>
      <p class="empty-state underground-note">舞台生涯结束，新的职业路线已经开启。</p>
    </section>`;
  }

  function tabContent(state, underground, tab, totalSkill) {
    if (tab === 'train') return trainTab(underground, totalSkill);
    if (tab === 'group') return groupTab(state, underground);
    if (tab === 'career') return careerTab(state, underground);
    return showTab(state, underground);
  }

  function render(state) {
    if (!Core.isUndergroundIdol(state) && !state.undergroundIdol?.fellTo) return '';
    const underground = Core.ensure(state);
    if (underground.fellTo) return fallen(underground);
    const totalSkill = underground.skills.dance
      + underground.skills.vocal
      + underground.skills.expression;
    const tab = state._ugTab || 'show';
    const tabs = [
      ['show', '演出'],
      ['train', '训练'],
      ['group', '团体'],
      ['career', '职业规划'],
    ];
    return `<section class="creator-card idol-card underground-idol-card">
      <header><div><span>${underground.agencyName || '地下Livehouse'} ·
        ${Core.STAGE_LABELS[underground.stage] || ''}</span>
        <strong>${underground.fans.toLocaleString()} 粉丝</strong></div>
        <b>训练${underground.trainingMonths}月 · ${underground.producerAbuse}次业内交易
          ${underground.fallBufferMonths > 0 ? ` · 危机${underground.fallBufferMonths}/3月` : ''}
        </b></header>
      <div class="creator-metrics">
        <span>舞蹈 <b>${underground.skills.dance}</b></span>
        <span>声乐 <b>${underground.skills.vocal}</b></span>
        <span>表情 <b>${underground.skills.expression}</b></span>
        <span>综合 <b>${totalSkill}</b></span>
      </div>
      <nav class="tab-nav underground-tabs">
        ${tabs.map(([id, label]) => `<button class="tab-btn${tab === id ? ' active' : ''}"
          data-ug-tab="${id}">${label}</button>`).join('')}
      </nav>
      ${tabContent(state, underground, tab, totalSkill)}
      ${underground._pendingDecision ? pendingDecision(underground) : ''}
    </section>`;
  }

  Game.undergroundIdolView = Object.freeze({ render });
}(window));
