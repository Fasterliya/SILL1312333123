(function initSupernaturalView(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  function render(state) {
    var specter = Game.supernaturalSpecter;
    if (!specter) return;
    var html = '';

    var combatHtml = specter.renderCombat(state);
    if (combatHtml) {
      var container = document.getElementById('encounterOverlayContainer');
      if (container) {
        container.innerHTML = '<div class="encounter-overlay active" style="display:flex"><div class="encounter-card">' + combatHtml + '</div></div>';
      }
      if (Game._setTimeSpeed) Game._setTimeSpeed(0);
      return;
    }

    var container = document.getElementById('encounterOverlayContainer');
    if (container) container.innerHTML = '';

    html += specter.renderSpecterClues(state);

    var goalPanel = document.getElementById('goalPanel');
    if (goalPanel && state.supernatural && state.supernatural.specters && state.supernatural.specters.length > 0) {
      var existing = goalPanel.querySelector('.supernatural-status');
      if (existing) existing.remove();
      var playerAwareness = state.supernatural.playerAwareness || 0;
      var spiritCorruption = state.supernatural.spiritCorruption || 0;
      if (playerAwareness >= 40) {
        var statusHtml = '<div class="supernatural-status" style="margin-top:8px;padding:8px;border:1px solid rgba(180,40,40,0.3);border-radius:6px;background:rgba(180,40,40,0.08)">';
        statusHtml += '<p style="margin:0 0 4px;color:var(--danger, #c0392b);font-weight:bold">⚠ 异常感知: ' + playerAwareness + '/100</p>';
        statusHtml += '<p style="margin:0;font-size:0.85em">你察觉到这座城市并不平静。某些人的行为透着非人的寒意。</p>';
        if (spiritCorruption > 0) {
          statusHtml += '<p style="margin:4px 0 0;font-size:0.85em">精神污染: ' + spiritCorruption + '/100</p>';
        }
        statusHtml += '</div>';
        goalPanel.insertAdjacentHTML('beforeend', statusHtml);
      }
    }

    if (html) {
      var goalPanel2 = document.getElementById('goalPanel');
      if (goalPanel2) {
        var existing2 = goalPanel2.querySelector('.supernatural-clues');
        if (existing2) existing2.remove();
        var wrapper = document.createElement('div');
        wrapper.className = 'supernatural-clues';
        wrapper.innerHTML = html;
        goalPanel2.appendChild(wrapper);
      }
    }
  }

  function ensureCombatClose(state) {
    if (state.supernatural && state.supernatural.combat) {
      state.supernatural.combat.active = false;
      state.supernatural.combat.specterIndex = -1;
      state.supernatural.combat.specterHp = 0;
      state.supernatural.combat.playerHp = 100;
      state.supernatural.combat.round = 0;
      state.supernatural.combat.log = [];
    }
    var container = document.getElementById('encounterOverlayContainer');
    if (container) container.innerHTML = '';
  }

  Game.supernaturalView = Object.freeze({ render: render, ensureCombatClose: ensureCombatClose });
}(window));
