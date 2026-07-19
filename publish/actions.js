(function initActions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
  let api = null;

  function state() {
    return api.getState();
  }

  function done() {
    api.refresh();
    api.save();
  }

  function trade(name, mode) {
    const current = state();
    if (U.age(current) < 18) return Game.view.showToast('成年后才能进入股票市场', 'warning');
    const stock = current.assets.stocks[name];
    const cost = Math.round(stock.price * 100);
    if (mode === 'buy') {
      if (current.money < cost) return Game.view.showToast('现金不足', 'warning');
      current.money -= cost;
      stock.shares += 100;
    } else {
      if (stock.shares < 100) return Game.view.showToast('持仓不足', 'warning');
      current.money += cost;
      stock.shares -= 100;
    }
    Game.view.showToast(`${mode === 'buy' ? '买入' : '卖出'}${name} 100股`, 'good');
    done();
  }

  function buyHouse(index) {
    const current = state();
    const house = C.houses[index];
    const down = Math.round(house.price * 0.3);
    if (U.age(current) < 18) return Game.view.showToast('成年后才能购买房产', 'warning');
    if (current.assets.house) return Game.view.showToast('当前已有住房', 'warning');
    if (current.money < down) return Game.view.showToast(`首付需要 ${Game.view.money(down)}`, 'warning');
    current.money -= down;
    current.assets.house = house;
    current.assets.mortgage = Math.round(house.price * 0.7 / 240);
    current.stats.心情 = U.clamp(current.stats.心情 + house.comfort, 0, 100);
    Game.lifeDirector.addLog(current, '安家置业', `你支付首付，买下了${house.name}。`, 'milestone');
    done();
  }

  function renderHouseActions() {
    const current = state();
    const host = document.getElementById('houseActions');
    if (!host || current.assets.house) return;
    host.innerHTML = C.houses.map((house, index) => (
      `<button data-house="${index}">${house.name}<small>首付 ${Game.view.money(house.price * 0.3)}</small></button>`
    )).join('');
  }

  function decide(value) {
    const current = state();
    const decision = current.pendingDecision;
    if (!decision) return;
    if (decision.type === 'highSchool') {
      const school = C.highSchools.find((item) => `${current.hometown.city}${item.suffix}` === value)
        || C.highSchools[C.highSchools.length - 1];
      const schoolName = `${current.hometown.city}${school.suffix}`;
      Game.social.enterSchool(current, schoolName, 'high', 5);
      Game.lifeDirector.addLog(current, '高中录取', `你填报并被${schoolName}录取，学校类型为${school.type}。`, 'milestone');
    } else if (decision.type === 'track') {
      const [track, electives] = value.split('|');
      current.education.track = track;
      current.education.electives = electives.split(',');
      Game.lifeDirector.addLog(current, '完成选科', `你选择了${track}，再选${electives.replace(',', '、')}。`, 'milestone');
    } else if (decision.type === 'volunteer') {
      const school = C.universities.find((item) => item.name === value);
      current.education.university = school.name;
      current.education.universityType = school.type;
      current.education.major = school.major;
      Game.social.enterSchool(current, school.name, 'university', 6);
      const city = C.cities.find((item) => item.city === school.city);
      if (city) current.location = { province: city.province, city: city.city, country: city.country };
      Game.lifeDirector.addLog(current, '大学录取', `你被${school.name}${school.major}专业录取，前往${school.city}求学。`, 'milestone');
    }
    current.pendingDecision = null;
    done();
  }

  function renderDecision() {
    const current = state();
    const d = current.pendingDecision;
    Game.view.el.decision.hidden = !d;
    if (!d) return;
    let options = [];
    if (d.type === 'highSchool') {
      Game.view.el.decisionTitle.textContent = `中考 ${d.score} 分，填报本地高中`;
      Game.view.el.decisionText.textContent = `户籍地为${current.hometown.city}，可填报达到录取线的本地学校。`;
      options = C.highSchools.filter((item) => d.score >= item.min)
        .map((item) => ({
          value: `${current.hometown.city}${item.suffix}`,
          label: `${current.hometown.city}${item.suffix} · ${item.type} · 线${item.min}`,
        }));
      if (!options.length) {
        const school = C.highSchools[C.highSchools.length - 1];
        options = [{ value: `${current.hometown.city}${school.suffix}`, label: `${current.hometown.city}${school.suffix} · ${school.type}` }];
      }
    } else if (d.type === 'track') {
      Game.view.el.decisionTitle.textContent = '高考选科';
      Game.view.el.decisionText.textContent = '物理/历史二选一，再从化学、生物、地理、政治中选两门。';
      const pairs = [['化学', '生物'], ['化学', '地理'], ['化学', '政治'], ['生物', '地理'], ['生物', '政治'], ['地理', '政治']];
      options = ['物理', '历史'].flatMap((track) => pairs.map((pair) => ({
        value: `${track}|${pair.join(',')}`, label: `${track} + ${pair.join(' + ')}`,
      })));
    } else if (d.type === 'volunteer') {
      Game.view.el.decisionTitle.textContent = `高考 ${d.score} 分，填报志愿`;
      Game.view.el.decisionText.textContent = '可选择达到投档线的院校与专业。';
      options = C.universities.filter((item) => d.score >= item.min)
        .map((item) => ({ value: item.name, label: `${item.name} · ${item.type} · ${item.major} · ${item.city}` }));
      if (!options.length) options = [{ value: '城市职业学院', label: '城市职业学院 · 高职专科 · 机电技术 · 郑州' }];
    }
    Game.view.el.decisionBody.innerHTML = options.map((item) => (
      `<button data-choice="${item.value}">${item.label}</button>`
    )).join('');
  }

  function configure(options) {
    api = options;
  }

  Game.actions = Object.freeze({
    configure, trade, buyHouse, decide, renderHouseActions, renderDecision,
  });
}(window));
