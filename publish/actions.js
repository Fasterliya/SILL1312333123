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

  function interact(id) {
    const current = state();
    const person = current.family.find((item) => item.id === id);
    if (!person) return;
    const partner = current.romance.partnerId === id;
    if (person.relation === '朋友' && person.affection >= 68 && !current.romance.partnerId) {
      current.romance.partnerId = id;
      person.relation = '恋人';
      Game.lifeDirector.addLog(current, '恋爱开始', `你向${person.name}表达心意，你们开始认真交往。`, 'milestone');
    } else if (partner && !current.romance.married && person.affection >= 80) {
      const legalAge = current.gender === '男' ? 22 : 20;
      if (U.age(current) < legalAge) {
        return Game.view.showToast(`${legalAge}岁后才能登记结婚`, 'warning');
      }
      if (current.money < 20000) return Game.view.showToast('准备婚礼至少需要 ¥20,000', 'warning');
      current.money -= 20000;
      current.romance.married = true;
      person.relation = '配偶';
      Game.lifeDirector.addLog(current, '步入婚姻', `你与${person.name}举办了婚礼，组成新的家庭。`, 'milestone');
    } else {
      person.affection = U.clamp(person.affection + U.between(4, 8), 0, 100);
      current.stats.心情 = U.clamp(current.stats.心情 + 2, 0, 100);
      Game.lifeDirector.addLog(current, `与${person.name}相处`, '你们分享了近况，彼此关系更加亲近。', 'good');
    }
    done();
  }

  function planChild() {
    const current = state();
    if (!current.romance.married) return Game.view.showToast('结婚后才能共同计划孩子', 'warning');
    const partner = current.family.find((item) => item.id === current.romance.partnerId);
    if (!partner || partner.status !== '健康') return Game.view.showToast('当前家庭状态无法计划孩子', 'warning');
    if (current.romance.pendingBirth) return Game.view.showToast('新生命已经在期待中', 'warning');
    if (current.money < 8000) return Game.view.showToast('养育准备金至少需要 ¥8,000', 'warning');
    current.money -= 8000;
    current.romance.pendingBirth = 9;
    Game.lifeDirector.addLog(current, '家庭计划', '你们开始期待一个新生命，预计九个月后迎来变化。', 'milestone');
    done();
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
    if (decision.type === 'track') {
      const [track, electives] = value.split('|');
      current.education.track = track;
      current.education.electives = electives.split(',');
      Game.lifeDirector.addLog(current, '完成选科', `你选择了${track}，再选${electives.replace(',', '、')}。`, 'milestone');
    } else if (decision.type === 'volunteer') {
      const school = C.universities.find((item) => item.name === value);
      current.education.university = school.name;
      current.education.major = school.major;
      current.education.school = school.name;
      Game.lifeDirector.addLog(current, '大学录取', `你被${school.name}${school.major}专业录取。`, 'milestone');
    } else {
      const job = C.jobs.find((item) => item.name === value);
      current.career = { job: job.name, salary: job.salary, level: 0, exp: 0 };
      Game.lifeDirector.addLog(current, '职业起点', `你成为${job.name}，第一份月薪是 ¥${job.salary.toLocaleString()}。`, 'milestone');
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
    if (d.type === 'track') {
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
        .map((item) => ({ value: item.name, label: `${item.name} · ${item.major}` }));
      if (!options.length) options = [{ value: '城市职业学院', label: '城市职业学院 · 现代服务' }];
    } else {
      Game.view.el.decisionTitle.textContent = '选择第一份工作';
      Game.view.el.decisionText.textContent = '专业、能力与收入各有取舍，之后仍会获得晋升。';
      const ability = current.stats.智力 + current.education.study / 4;
      options = C.jobs.filter((job) => ability >= job.need || job.majors.includes(current.education.major))
        .slice(0, 5).map((job) => ({ value: job.name, label: `${job.name} · ¥${job.salary.toLocaleString()}/月` }));
    }
    Game.view.el.decisionBody.innerHTML = options.map((item) => (
      `<button data-choice="${item.value}">${item.label}</button>`
    )).join('');
  }

  function configure(options) {
    api = options;
  }

  Game.actions = Object.freeze({
    configure, interact, planChild, trade, buyHouse, decide, renderHouseActions, renderDecision,
  });
}(window));
