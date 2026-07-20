(function initRelationshipSecretsView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function render(state, person) {
    const records = Game.relationshipSecrets.ensure(state).records.filter((record) => (
      record.known && record.participants.includes(person.id)
    ));
    if (!records.length) return '';
    return `<details class="record-section"><summary><span>已知秘密</span><small>${records.length}项</small></summary>
      <div class="memory-list">${records.map((record) => (
        `<div class="memory-row"><span>${record.kind}${record.exposed ? ' · 已曝光' : ''}</span>
        <strong>${record.note}</strong></div>`
      )).join('')}</div></details>`;
  }

  function summary(state) {
    const records = Game.relationshipSecrets.ensure(state).records.filter((record) => (
      record.known && record.participants.includes('player-profile')
    ));
    return records.length ? `<p class="household-secret">个人秘密 ${records.length} 项 · 已曝光
      ${records.filter((record) => record.exposed).length} 项</p>` : '';
  }

  Game.relationshipSecretsView = Object.freeze({ render, summary });
}(window));
