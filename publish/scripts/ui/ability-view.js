(function initAbilityView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  function fatigue(state) {
    const max = Math.max(1, Number(state.stamina?.max) || 100);
    return clamp(100 - (Number(state.stamina?.current) || 0) / max * 100);
  }

  function abilityRows(target, state) {
    Game.characterAttributes.ensure(target, state?.stats || target.stats, state?.education);
    const rows = Game.characterAttributes.abilities.map((ability) => {
      const progress = Game.characterAttributes.progress(target, ability);
      return [ability, `${progress.current} · 经验 ${progress.xp}/100 · 潜力 ${progress.potential}`];
    });
    rows.push(['派生魅力', `${Game.characterAttributes.derivedCharm(target)} · 外貌、气质与交涉共同形成`]);
    return rows;
  }

  function traitRows(target) {
    const traits = Game.structuredTraits.display(target);
    return [
      ['人格特质', traits.personality.join(' · ') || '尚未形成'],
      ['教育特质', traits.education],
      ['经历特质', traits.experience.join(' · ') || '暂无'],
      ['儿童倾向', traits.childhood || '6岁后形成'],
    ];
  }

  function cards(state) {
    Game.characterAttributes.ensurePlayer(state);
    const stress = Game.stressSystem.ensure(state);
    const states = [
      ['健康', clamp(state.stats.健康), `${clamp(state.stats.健康)}%`],
      ['压力', clamp(stress.value / 3.99), `Lv${stress.level} · ${stress.value}`],
      ['疲劳', fatigue(state), fatigue(state)],
    ];
    const abilityCards = Game.characterAttributes.abilities.map((ability) => {
      const item = Game.characterAttributes.progress(state.profile, ability);
      return [ability, item.current, item.current];
    });
    abilityCards.push(['魅力', Game.characterAttributes.derivedCharm(state.profile),
      `${Game.characterAttributes.derivedCharm(state.profile)} · 派生`]);
    return [...states, ...abilityCards].map(([name, value, text]) => (
      `<div class="stat-item"><span>${name}</span><strong>${text}</strong>`
      + `<i><b style="width:${clamp(value)}%"></b></i></div>`
    )).join('');
  }

  Game.abilityView = Object.freeze({ abilityRows, traitRows, cards, fatigue });
}(window));
