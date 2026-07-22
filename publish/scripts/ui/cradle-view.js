(function initCradleView(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  function render(state) {
    if (!Game.cradleInstitution || !Game.cradleInstitution.isImprisoned(state)) return '';
    var prisonHtml = Game.cradleInstitution.renderPrison(state);
    if (!prisonHtml) return '';

    var goalPanel = document.getElementById('goalPanel');
    if (!goalPanel) return;

    var existing = goalPanel.querySelector('.cradle-prison');
    if (existing) existing.remove();

    var wrapper = document.createElement('div');
    wrapper.innerHTML = prisonHtml;
    goalPanel.insertBefore(wrapper.firstChild, goalPanel.firstChild);

    var timeBar = document.getElementById('timeBar');
    if (timeBar) {
      var existingCradle = timeBar.querySelector('.cradle-time-warning');
      if (existingCradle) existingCradle.remove();
      var c = state.cradle;
      var monthsLeft = c.reformProgress >= 100 ? 0 : Math.max(0, Math.ceil((100 - c.reformProgress) / 8));
      var warning = document.createElement('div');
      warning.className = 'cradle-time-warning';
      warning.style.cssText = 'padding:4px 8px;margin:4px 0;font-size:9px;color:#c23b32;text-align:center;background:rgba(194,59,50,0.08);border-radius:4px';
      warning.textContent = monthsLeft > 0 ? ('距离被卖约 ' + monthsLeft + ' 个月') : '改造已完成——等待出货';
      timeBar.insertBefore(warning, timeBar.firstChild);
    }
  }

  Game.cradleView = Object.freeze({ render: render });
}(window));
