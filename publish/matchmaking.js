(function initMatchmaking(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function createMatches(state) {
    if (U.age(state) < 20) return { ok: false, message: '20岁后可以参加相亲活动' };
    if (state.romance.partnerId) return { ok: false, message: '已有稳定关系，不需要刷新相亲名单' };
    Game.economy.spend(state, 500);
    state.matchmaking.candidates = [];
    for (let index = 0; index < 10; index += 1) {
      const person = U.person('相亲对象', U.random(Game.nameSystem.surnames()), U.between(-4, 8), null, state.playerBornAt);
      Game.worldCulture.applyPerson(person, state.location.country);
      U.setUniqueName(state, person, Game.worldCulture.profile(state.location.country).locale);
      person.affection = U.between(38, 58);
      person.phoneUnlocked = false;
      person.metCity = state.location.city;
      Game.npcLife.syncGrowth(state, person);
      state.matchmaking.candidates.push(person);
    }
    return { ok: true, message: Game.economy.message(state, '新的相亲名单已经整理好') };
  }

  function render(state) {
    if (U.age(state) < 20) return '<p class="empty-state">20岁后开放相亲活动。</p>';
    const matches = state.matchmaking.candidates;
    const head = `<section class="list-guide"><strong>城市相亲会</strong><span>见面、约会并培养好感，关系成熟后可以告白。</span></section>
      <button class="wide-action" data-create-matches>刷新10位相亲对象 · ¥500
      · ${Game.worldCulture.format(500, state.location.country)}</button>`;
    return head + (matches.length ? matches.map((item) => (
      Game.social.card(item, [['chat', '聊天'], ['date', '约会'], ['exchange', '加联系人']])
    )).join('') : '<p class="empty-state">点击上方按钮生成本地相亲名单。</p>');
  }

  Game.matchmaking = Object.freeze({ createMatches, render });
}(window));
