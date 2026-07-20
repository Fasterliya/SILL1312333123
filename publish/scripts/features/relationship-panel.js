(function initRelationshipPanel(root) {
  'use strict';
  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function ensure(state) {
    state.romance.partners = state.romance.partners && Array.isArray(state.romance.partners) ? state.romance.partners : [];
    if (state.romance.partnerId && !state.romance.partners.some(function(p) {
      return p.id === state.romance.partnerId;
    })) {
      state.romance.partners.push({
        id: state.romance.partnerId,
        type: state.romance.married ? '配偶' : '恋人',
        jealousy: 0,
        startMonth: state.totalMonths,
      });
    }
    return state.romance;
  }

  function addPartner(state, personId, type) {
    var r = ensure(state);
    if (r.partners.some(function(p) { return p.id === personId; })) return false;
    r.partners.push({ id: personId, type: type || '恋人', jealousy: 0, startMonth: state.totalMonths });
    return true;
  }

  function removePartner(state, personId) {
    var r = ensure(state);
    r.partners = r.partners.filter(function(p) { return p.id !== personId; });
  }

  function addJealousy(state, exceptId, amount) {
    var r = ensure(state);
    r.partners.forEach(function(p) {
      if (p.id !== exceptId) p.jealousy = U.clamp((p.jealousy||0) + amount, 0, 100);
    });
  }

  function render(state) {
    var r = ensure(state);
    var partners = r.partners.map(function(p) {
      var person = Game.people.find(state, p.id);
      if (!person) return '';
      var j = Math.round(p.jealousy||0);
      var jLabel = j>75?'危险':(j>50?'紧张':(j>20?'平稳':'安逸'));
      return '<article class="partner-row"><div><strong>' + person.name + '</strong><small>' + (p.type||'恋人') + ' · 好感' + person.affection + '</small></div><div><span>嫉妒 ' + j + '</span><small>' + jLabel + '</small></div><div class="partner-actions"><button data-partner-action="date" data-partner-id="' + p.id + '">约会</button><button data-partner-action="breakup" data-partner-id="' + p.id + '">分手</button></div></article>';
    }).join('');

    return '<details class="system-fold"><summary>伴侣关系 · ' + r.partners.length + '人</summary>' +
      '<div class="partner-list">' + (partners || '<p class="empty-state">暂无伴侣。</p>') + '</div>' +
      '<p class="system-note">每新增一个伴侣，现有伴侣嫉妒值+15。嫉妒>75可能分手或被公开曝光。</p></details>';
  }

  function handleClick(event) {
    var btn = event.target.closest('[data-partner-action]');
    if (!btn) return false;
    event.stopPropagation();
    var state = Game._getState ? Game._getState() : null;
    if (!state) return false;
    var personId = btn.dataset.partnerId;
    var action = btn.dataset.partnerAction;
    if (action === 'date') {
      var person = Game.people.find(state, personId);
      if (person) {
        var result = Game.social.interact(state, personId, 'date');
        if (Game._refresh) Game._refresh();
        if (Game._save) Game._save();
        if (result && result.ok) Game.view.showToast('与' + person.name + '约会完成', 'good');
      }
    } else if (action === 'breakup') {
      var former = Game.people.find(state, personId);
      removePartner(state, personId);
      if (former && former.relation === '恋人') former.relation = '前恋人';
      if (state.romance.partnerId === personId) {
        state.romance.partnerId = null;
        state.romance.married = false;
      }
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      Game.view.showToast('关系已结束', 'normal');
    }
    return true;
  }

  Game.relationshipPanel = Object.freeze({ ensure, addPartner, removePartner, addJealousy, render, handleClick });
}(window));
