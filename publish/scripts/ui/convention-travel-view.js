(function initConventionTravelView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function roster(model) {
    if (!model.people.length) return '';
    const cards = model.people.map((person) => {
      const costume = Game.cosplayCatalog.find(person.cosplay);
      const selected = person.id === model.selectedId;
      return `<article class="convention-coser${selected ? ' selected' : ''}">
        <button class="person-avatar" type="button" data-character-id="${escape(person.id)}"
          aria-label="查看${escape(person.name)}档案">${Game.portraitSystem.avatar(person)}</button>
        <div><strong>${escape(person.name)}</strong><span>${escape(costume.name)}</span>
        <small>${escape(person.job)} · 好感 ${person.affection}${selected ? ' · 当前同行' : ''}</small></div>
      </article>`;
    }).join('');
    return `<section class="convention-roster"><h3>现场 Coser · ${model.people.length}人</h3>${cards}</section>`;
  }

  function optionCards(model) {
    return model.options.map((option) => (
      `<button class="convention-option" data-travel-choice="${escape(option.id)}"
        ${option.blocked ? 'disabled' : ''}><strong>${escape(option.label)}</strong>
        <small>${escape(option.hint)}${option.blocked ? `<br>${escape(option.blocked)}` : ''}</small></button>`
    )).join('');
  }

  function render(state, ts) {
    const model = Game.conventionTravel.model(state, ts);
    if (!model) {
      state.travel.activeStage = null;
      return '';
    }
    return `<section class="journey-current convention-current">
      <span>${escape(model.eventName)} · 第${model.step}/${model.total}层 · 当前评价 ${model.score}</span>
      <strong>${escape(model.title)}</strong>
      <small>${escape(model.themeName)} · ${escape(model.roleName)} · ${escape(model.intentName)}
      ${model.arrangement ? `<br>现场安排：${escape(model.arrangement)}` : ''}
      <br>${escape(model.text)}<br>上一步：${escape(model.feedback)}</small>
      <div class="journey-progress"><i style="width:${Math.max(0, (model.step - 1) * 100 / model.total)}%"></i></div>
    </section>${roster(model)}<div class="journey-options convention-options">${optionCards(model)}</div>`;
  }

  Game.conventionTravelView = Object.freeze({ render });
}(window));
