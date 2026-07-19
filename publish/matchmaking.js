(function initMatchmaking(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function createMatches(state) {
    if (U.age(state) < 20) return { ok: false, message: '20岁后可以参加相亲活动' };
    if (state.romance.partnerId) return { ok: false, message: '已有稳定关系，不需要刷新相亲名单' };
    if (state.money < 500) return { ok: false, message: '整理相亲名单需要 ¥500' };
    state.money -= 500;
    state.contacts = state.contacts.filter((item) => item.relation !== '相亲对象');
    for (let index = 0; index < 10; index += 1) {
      const person = U.person('相亲对象', U.random(C.surnames), U.between(-4, 8));
      if (state.location.country === '日本') person.name = Game.worldData.japaneseName();
      person.affection = U.between(38, 58);
      person.phoneUnlocked = true;
      person.metCity = state.location.city;
      state.contacts.push(person);
    }
    return { ok: true, message: '新的相亲名单已经整理好' };
  }

  function render(state) {
    if (U.age(state) < 20) return '<p class="empty-state">20岁后开放相亲活动。</p>';
    const matches = state.contacts.filter((item) => item.relation === '相亲对象');
    const head = `<section class="list-guide"><strong>城市相亲会</strong><span>见面、约会并培养好感，关系成熟后可以告白。</span></section>
      <button class="wide-action" data-create-matches>刷新10位相亲对象 · ¥500</button>`;
    return head + (matches.length ? matches.map((item) => (
      Game.social.card(item, [['chat', '聊天'], ['date', '约会']])
    )).join('') : '<p class="empty-state">点击上方按钮生成本地相亲名单。</p>');
  }

  Game.matchmaking = Object.freeze({ createMatches, render });
}(window));
