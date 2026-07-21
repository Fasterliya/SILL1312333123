(function initTimeBarView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const speeds = [
    { value: 0, button: 'Ⅱ', label: '暂停', detail: '时间暂停' },
    { value: 1, button: '1×', label: '正常', detail: '1秒/天' },
    { value: 5, button: '5×', label: '快速', detail: '0.4秒/天' },
    { value: 10, button: '10×', label: '极速', detail: '0.2秒/天' },
  ];

  function shell() {
    const buttons = speeds.map((item) => (
      `<button type="button" data-time-speed="${item.value}"
        aria-label="${item.label}，${item.detail}" aria-pressed="false"
        title="${item.label} · ${item.detail}"><b>${item.button}</b><small>${item.label}</small></button>`
    )).join('');
    return `<div class="time-overview">
      <time class="time-date"><strong data-time-date></strong><small data-time-year></small></time>
      <div class="time-progress"><div><span>本月进度</span><strong data-time-status></strong></div>
        <i class="bar-track"><b data-time-fill></b></i><small data-time-remaining></small></div>
    </div><div class="time-controls" role="group" aria-label="时间速度">${buttons}</div>`;
  }

  function render(element, state) {
    if (!element.querySelector('[data-time-date]')) element.innerHTML = shell();
    const day = Math.max(1, Math.min(30, Number(state.day) || 1));
    const active = speeds.find((item) => item.value === (state.timeSpeed || 0)) || speeds[0];
    element.querySelector('[data-time-date]').textContent = `${state.month}月${day}日`;
    element.querySelector('[data-time-year]').textContent = `${state.year}年`;
    element.querySelector('[data-time-status]').textContent = `${active.label} · ${active.detail}`;
    element.querySelector('[data-time-fill]').style.width = `${day / 30 * 100}%`;
    element.querySelector('[data-time-remaining]').textContent = `剩余 ${30 - day} 天`;
    element.querySelectorAll('[data-time-speed]').forEach((button) => {
      const selected = Number(button.dataset.timeSpeed) === active.value;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  Game.timeBarView = Object.freeze({ render });
}(window));
