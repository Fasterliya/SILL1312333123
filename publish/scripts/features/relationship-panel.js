(function initRelationshipPanel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Relations = Game.relationshipCore;

  function row(state, current) {
    const person = Game.people.find(state, current.id);
    if (!person) return '';
    const jealousy = Math.round(current.jealousy);
    const label = current.acceptsPoly
      ? '已同意多角关系'
      : (jealousy > 75 ? '危险' : (jealousy > 50 ? '紧张' : (jealousy > 20 ? '平稳' : '安逸')));
    return `<article class="partner-row">
      <div><strong>${person.name}</strong>
        <small>${current.type} · 好感${person.affection}</small></div>
      <div><span>嫉妒 ${jealousy}</span><small>${label}</small></div>
      <div class="partner-actions">
        <button data-partner-action="date" data-partner-id="${current.id}">约会</button>
        <button data-partner-action="discuss" data-partner-id="${current.id}">沟通</button>
        <button data-partner-action="breakup" data-partner-id="${current.id}">分手</button>
      </div>
    </article>`;
  }

  function render(state) {
    const romance = Relations.ensure(state);
    const partners = romance.partners.map((current) => row(state, current)).join('');
    return `<details class="system-fold">
      <summary>伴侣关系 · ${romance.partners.length}人</summary>
      <div class="partner-list">${partners || '<p class="empty-state">暂无伴侣。</p>'}</div>
      <p class="system-note">伴侣数量不设上限；新增关系和偏向约会会提高其他伴侣嫉妒，
        可通过沟通或取得公开同意来稳定关系。</p>
    </details>`;
  }

  function finish(result) {
    Game._refresh?.();
    Game._save?.();
    if (result) Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
  }

  function breakup(state, personId) {
    const current = Relations.entry(state, personId);
    if (!current) return { ok: false, message: '这段关系已经结束' };
    if (current.type === '配偶' && !root.confirm('确定结束婚姻吗？将进行财产结算。')) {
      return { ok: false, message: '取消了离婚' };
    }
    return Game.relationshipConflict.end(state, personId, '由玩家主动结束关系');
  }

  function handleClick(event) {
    const button = event.target.closest('[data-partner-action]');
    if (!button) return false;
    event.stopPropagation();
    const state = Game._getState?.();
    if (!state) return false;
    const personId = button.dataset.partnerId;
    const action = button.dataset.partnerAction;
    let result = null;
    if (action === 'date') result = Game.social.interact(state, personId, 'date');
    if (action === 'discuss') {
      result = Game.relationshipConflict.queue(state, personId, true)
        ? { ok: true, message: '已开始关系沟通' }
        : { ok: false, message: '请先处理当前选择' };
    }
    if (action === 'breakup') result = breakup(state, personId);
    finish(result);
    return true;
  }

  Game.relationshipPanel = Object.freeze({
    ensure: Relations.ensure,
    addPartner: Relations.addPartner,
    removePartner: Relations.removePartner,
    addJealousy: Relations.addJealousy,
    render,
    handleClick,
  });
}(window));
