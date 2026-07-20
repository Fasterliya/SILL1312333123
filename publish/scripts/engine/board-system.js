(function initBoardSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const seats = ['董事长', '执行董事', '财务董事', '独立董事', '员工董事'];

  function addWorld(state, person) {
    if (!state.worldPeople.some((item) => item.id === person.id)) state.worldPeople.push(person);
    Game.systemsState.ensurePerson(state, person);
  }

  function createDirector(state, company, title, index) {
    const age = U.between(36 + index, 62);
    const person = U.person('公司董事', U.random(Game.nameSystem.surnames()), age, null, state.totalMonths);
    U.setUniqueName(state, person);
    person.boardTitle = title;
    person.company = company.name;
    person.companyId = company.id;
    person.job = title;
    person.careerRank = 4 + Math.floor(index / 2);
    person.currentCity = company.city === '全国' ? state.location.city : company.city;
    person.careerCity = person.currentCity;
    person.phoneUnlocked = false;
    Game.npcLife.syncGrowth(state, person);
    addWorld(state, person);
    return person;
  }

  function ensure(state, companyId) {
    const stock = Game.companyMarket.record(state, companyId);
    const company = Game.companyCatalog.find(companyId);
    if (!stock || !company) return [];
    const bySeat = new Map(stock.boardIds.map((id) => Game.people.find(state, id))
      .filter((person) => person?.companyId === companyId && seats.includes(person.boardTitle))
      .map((person) => [person.boardTitle, person]));
    let changed = false;
    const directors = seats.map((title, index) => {
      if (bySeat.has(title)) return bySeat.get(title);
      changed = true;
      return createDirector(state, company, title, index);
    });
    stock.boardIds = directors.map((person) => person.id);
    if (changed) Game.socialWorld.rebuild(state);
    return directors;
  }

  function render(state, companyId) {
    const stock = Game.companyMarket.record(state, companyId);
    const directors = ensure(state, companyId);
    const player = Game.companyMarket.isDirector(stock)
      ? '<div class="board-player"><span>股东董事</span><strong>你</strong><small>持股达到5%，获得董事会席位</small></div>' : '';
    return `<section class="board-section"><h3>董事会 · ${directors.length + (player ? 1 : 0)}席</h3>
      ${player}<div class="board-list">${directors.map((person) => (
        `<button type="button" data-character-id="${person.id}"><span>${person.boardTitle}</span>
        <strong>${person.name}</strong><small>查看董事档案</small></button>`
      )).join('')}</div></section>`;
  }

  Game.boardSystem = Object.freeze({ ensure, render });
}(window));
