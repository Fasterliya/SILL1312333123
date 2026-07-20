(function initNpcInitiativeView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.npcInitiativeCore;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function badge(state) {
    const count = Core.ensure(state).queue.length;
    if (!count) return '';
    return `<button class="event-queue-btn" type="button" data-npc-event-open
      aria-label="打开NPC主动事件，${count}条待处理">
      <span class="event-queue-icon" aria-hidden="true">信</span>
      <span class="event-badge">${count > 99 ? '99+' : count}</span>
    </button>`;
  }

  function sheet(state) {
    const events = Core.ensure(state);
    const event = events.queue[0];
    if (!event || !events.active) return '';
    const options = event.options.map((option, index) => (
      `<button class="event-option-btn" type="button"
        data-npc-event-option="${index}" data-npc-event-id="${escape(event.id)}">
        ${escape(option.label)}
      </button>`
    )).join('');
    return `<div class="npc-event-overlay" data-npc-event-close></div>
      <section class="npc-event-sheet" role="dialog" aria-modal="true"
        aria-labelledby="npcEventTitle">
        <span class="sheet-handle" aria-hidden="true"></span>
        <header><div><small>NPC主动互动</small>
          <h2 id="npcEventTitle">${escape(event.title)}</h2></div>
          <span>${events.queue.length}条待处理</span></header>
        <p>${escape(event.text)}</p>
        <div class="npc-event-options">${options}</div>
        <button class="npc-event-close" type="button" data-npc-event-close>稍后处理</button>
      </section>`;
  }

  function render(state) {
    return badge(state) + sheet(state);
  }

  function container() {
    return document.getElementById('npcEventContainer');
  }

  function refresh(state) {
    const host = container();
    if (host) host.innerHTML = render(state);
  }

  Game.npcInitiativeView = Object.freeze({
    badge,
    render,
    refresh,
  });
}(window));
