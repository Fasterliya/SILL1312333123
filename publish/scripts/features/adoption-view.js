(function initAdoptionView(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function stat(label, value) {
    var score = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    return '<div class="roster-stat"><span>' + label + '</span><progress max="100" value="'
      + score + '"></progress><strong>' + score + '</strong></div>';
  }

  function card(state, orphan, index) {
    var key = 'orphan:' + orphan.id;
    var portrait = Game.portraitSystem.status(key);
    var oldEnough = U.age(state) >= 25;
    var affordable = state.money >= Game.adoptionSystem.cost;
    var disabled = !oldEnough || !affordable || portrait.drawing;
    var reason = !oldEnough ? '年满25岁后可办理收养'
      : (!affordable ? '当前资金不足' : '符合收养申请条件');
    var appearance = [orphan.hairColor, orphan.hairstyle, orphan.temperament]
      .filter(Boolean).join(' · ');
    var generateLabel = portrait.drawing ? '生成中…约30-60秒'
      : (orphan.portraitUrl ? '重新生成立绘' : '生成角色立绘');
    return '<article class="character-roster-card orphan-roster-card '
      + (portrait.drawing ? 'is-drawing' : '') + '">'
      + '<button class="character-roster-portrait" type="button" data-portrait-view="' + escape(key)
      + '" aria-label="查看' + escape(orphan.name) + '的立绘">' + Game.portraitSystem.avatar(orphan)
      + (portrait.drawing ? '<span class="roster-portrait-pending">绘制中</span>' : '') + '</button>'
      + '<div class="character-roster-info"><header><div><strong>' + escape(orphan.name)
      + '</strong><span>待收养</span></div><button type="button" class="roster-file-button" data-portrait-view="'
      + escape(key) + '">立绘</button></header>'
      + '<div class="character-roster-tags"><span>' + escape(orphan.gender) + '</span><span>'
      + orphan.age + '岁</span><span>' + escape(orphan.personality) + '</span><span>'
      + escape(orphan.trait) + '</span></div>'
      + '<p class="character-roster-meta">' + escape(appearance || '外貌资料待完善') + '</p>'
      + '<div class="orphan-stat-grid">' + stat('健康', orphan.stats.健康)
      + stat('智力', orphan.stats.智力) + stat('魅力', orphan.stats.魅力) + '</div>'
      + '<small class="character-roster-status">' + escape(reason) + '</small>'
      + (portrait.error ? '<small class="character-roster-error">' + escape(portrait.error) + '</small>' : '')
      + '<details class="character-roster-actions"><summary>档案与收养</summary><div>'
      + '<button type="button" data-portrait-view="' + escape(key) + '">查看立绘</button>'
      + '<button type="button" data-npc-generate="' + escape(key) + '" '
      + (portrait.drawing ? 'disabled' : '') + '>' + generateLabel + '</button>'
      + '<button type="button" class="roster-primary-action" data-adoption-adopt="' + index + '" '
      + (disabled ? 'disabled' : '') + '>收养 · ' + Game.view.money(Game.adoptionSystem.cost) + '</button>'
      + '</div></details></div></article>';
  }

  function overview(state, adoption) {
    var months = Math.max(0, 6 - (state.totalMonths - adoption.lastRefreshMonth));
    return '<section class="roster-overview orphanage-overview">'
      + '<div><strong>' + adoption.orphans.length + '</strong><span>等待家庭</span></div>'
      + '<div><strong>' + adoption.adoptedCount + '</strong><span>已收养</span></div>'
      + '<div><strong>' + months + '</strong><span>月后更新</span></div>'
      + '<p>手续费用 ' + Game.view.money(Game.adoptionSystem.cost)
      + ' · 申请人需年满25岁 · 立绘会随收养档案保留</p></section>';
  }

  function render(state) {
    var host = document.getElementById('orphanageList');
    if (!host) return;
    var adoption = Game.adoptionSystem.ensure(state);
    var content = adoption.orphans.length
      ? adoption.orphans.map(function (orphan, index) { return card(state, orphan, index); }).join('')
      : '<p class="empty-state">福利院暂无可收养的孩童。下一批档案会在周期更新后到达。</p>';
    host.innerHTML = '<div class="character-roster-shell">' + overview(state, adoption)
      + '<div class="character-roster-list">' + content + '</div></div>';
  }

  function handleClick(event) {
    var button = event.target.closest('[data-adoption-adopt]');
    if (!button) return false;
    var state = Game._getState ? Game._getState() : null;
    if (!state) return true;
    var index = Number(button.dataset.adoptionAdopt);
    var orphan = state.adoption?.orphans?.[index];
    if (!orphan) {
      Game.view.showToast('这份收养档案已经更新', 'warning');
      Game._refresh?.();
      return true;
    }
    if (!root.confirm('确认支付' + Game.view.money(Game.adoptionSystem.cost)
      + '办理手续并收养' + orphan.name + '吗？')) return true;
    var result = Game.adoptionSystem.adopt(state, index);
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    Game._refresh?.();
    return true;
  }

  Game.adoptionView = Object.freeze({ render, handleClick });
}(window));
