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
    return `<section class="convention-roster"><header><div><span>现场角色</span>
      <h3>Coser 阵容</h3></div><b>${model.people.length}人</b></header>
      <div class="convention-roster-grid">${cards}</div></section>`;
  }

  function optionCards(model) {
    return model.options.map((option) => (
      `<button class="convention-option" data-travel-choice="${escape(option.id)}"
        ${option.blocked ? 'disabled' : ''}><strong>${escape(option.label)}</strong>
        <small>${escape(option.hint)}</small>
        ${option.blocked ? `<span>${escape(option.blocked)}</span>` : '<span>选择此路线</span>'}</button>`
    )).join('');
  }

  function careerStatus(model) {
    const career = model.career;
    if (!career) return '';
    return `<section class="convention-career-status"><header><div><span>职业联动</span>
      <strong>${escape(career.title)}</strong></div><b>检定 +${career.bonus}</b></header>
      <dl><div><dt>频道粉丝</dt><dd>${Game.creatorEconomy.compact(career.followers)}</dd></div>
      <div><dt>职业绩效</dt><dd>${career.performance}/100</dd></div>
      <div><dt>本届项目</dt><dd>${career.actions} 项</dd></div></dl></section>`;
  }

  function render(state, ts) {
    const model = Game.conventionTravel.model(state, ts);
    if (!model) {
      state.travel.activeStage = null;
      return '';
    }
    return `<section class="journey-current convention-current">
      <header><div><span>${escape(model.eventName)} · 路线 ${model.step}/${model.total}</span>
      <strong>${escape(model.title)}</strong></div><b>评价 ${model.score}</b></header>
      <div class="convention-context"><span>${escape(model.themeName)}</span>
      <span>${escape(model.roleName)}</span><span>${escape(model.intentName)}</span></div>
      ${model.arrangement ? `<p class="convention-arrangement"><b>现场安排</b>${escape(model.arrangement)}</p>` : ''}
      <p class="convention-scene">${escape(model.text)}</p>
      <p class="convention-feedback"><b>上一步</b>${escape(model.feedback)}</p>
      <div class="journey-progress"><i style="width:${Math.max(0, (model.step - 1) * 100 / model.total)}%"></i></div>
    </section>${careerStatus(model)}${roster(model)}
      <div class="journey-options convention-options">${optionCards(model)}</div>`;
  }

  Game.conventionTravelView = Object.freeze({ render });
}(window));
