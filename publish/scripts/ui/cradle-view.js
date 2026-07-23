(function initCradleView(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  function render(state) {
    var CI = Game.cradleInstitution;
    if (!CI) return '';

    if (CI.isUnderPatron && CI.isUnderPatron(state)) {
      var patronHtml = CI.renderPatron(state);
      if (!patronHtml) return '';
      var goalPanel = document.getElementById('goalPanel');
      if (!goalPanel) return;

      var existing = goalPanel.querySelector('.cradle-patron');
      if (existing) existing.remove();

      var wrapper = document.createElement('div');
      wrapper.innerHTML = patronHtml;
      goalPanel.insertBefore(wrapper.firstChild, goalPanel.firstChild);

      var timeBar = document.getElementById('timeBar');
      if (timeBar) {
        var existingBar = timeBar.querySelector('.cradle-time-warning');
        if (existingBar) existingBar.remove();
        var c = state.cradle;
        var warning = document.createElement('div');
        warning.className = 'cradle-time-warning';
        warning.style.cssText = 'padding:4px 8px;margin:4px 0;font-size:9px;color:#6b4c3b;text-align:center;background:rgba(107,76,59,0.08);border-radius:4px';
        warning.textContent = c.pregnantByPatron ? ('怀孕中 · 已育' + c.childrenWithPatron + '子') : ('金主' + c.patronName + '宅邸 · ' + c.patronWealth);
        timeBar.insertBefore(warning, timeBar.firstChild);
      }
      return;
    }

    var phase = state.cradle ? state.cradle.patronPhase : '';
    if (phase === 'fugitive' || phase === 'escaped') {
      var fugHtml = CI.renderFugitive(state);
      if (!fugHtml) return '';
      var gPanel = document.getElementById('goalPanel');
      if (!gPanel) return;

      var existingF = gPanel.querySelector('.cradle-fugitive');
      if (existingF) existingF.remove();

      var fWrapper = document.createElement('div');
      fWrapper.innerHTML = fugHtml;
      gPanel.insertBefore(fWrapper.firstChild, gPanel.firstChild);

      var tBar = document.getElementById('timeBar');
      if (tBar) {
        var exBar = tBar.querySelector('.cradle-time-warning');
        if (exBar) exBar.remove();
        var c = state.cradle;
        var w = document.createElement('div');
        w.className = 'cradle-time-warning';
        w.style.cssText = 'padding:4px 8px;margin:4px 0;font-size:9px;color:#2d5a4b;text-align:center;background:rgba(45,90,75,0.08);border-radius:4px';
        w.textContent = '逃亡中 · 安全度' + c.patronEscapeProgress + ' · ' + (state.location ? state.location.city : '');
        tBar.insertBefore(w, tBar.firstChild);
      }
      return;
    }

    if (!CI.isImprisoned(state)) return '';
    var prisonHtml = CI.renderPrison(state);
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
