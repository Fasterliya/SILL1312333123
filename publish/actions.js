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

  function enterWorkforce(current, path) {
    Game.social.archiveSchool(current);
    current.education.university = null;
    current.education.universityType = null;
    current.education.major = current.education.vocationalMajor || null;
    current.education.graduated = true;
    current.education.school = '已毕业';
    current.education.schoolStage = 'workforce';
    current.education.path = path;
    Game.lifeDirector.addLog(current, '进入职业社会', `你完成${path}阶段，开始直接寻找工作机会。`, 'milestone');
  }

  function decide(value) {
    const current = state();
    const decision = current.pendingDecision;
    if (!decision) return;
    if (['lifeEvent', 'succession'].includes(decision.type)) {
      const system = decision.type === 'lifeEvent' ? Game.lifeEvents : Game.legacySystem;
      const result = system.resolve(current, value);
      current.pendingDecision = null;
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return done();
    }
    if (decision.type === 'highSchool') {
      const schools = Game.schoolLines.localHighSchools(current);
      const school = schools.find((item) => Game.schoolLines.schoolName(current, item) === value)
        || schools[schools.length - 1];
      const line = Game.schoolLines.highSchoolLine(current, school);
      const hasEligible = schools.some((item) => (
        decision.score >= Game.schoolLines.highSchoolLine(current, item)
      ));
      if (decision.score < line && hasEligible) {
        return Game.view.showToast('中考分数未达到该校当年录取线', 'warning');
      }
      const schoolName = Game.schoolLines.schoolName(current, school);
      const vocational = school.program === 'vocational';
      Game.social.enterSchool(current, schoolName, vocational ? 'vocational' : 'high', 5);
      current.education.highSchoolType = school.type;
      current.education.vocationalMajor = vocational ? school.major : null;
      current.education.path = vocational ? `职业高中 · ${school.major}` : '普通高中';
      current.education.track = vocational ? '职教' : null;
      current.education.electives = [];
      Game.lifeDirector.addLog(current, '高中录取', `你填报并被${schoolName}录取，学校类型为${school.type}。`, 'milestone');
    } else if (decision.type === 'track') {
      const [track, electives] = value.split('|');
      current.education.track = track;
      current.education.electives = electives.split(',');
      Game.lifeDirector.addLog(current, '完成选科', `你选择了${track}，再选${electives.replace(',', '、')}。`, 'milestone');
    } else if (decision.type === 'volunteer') {
      if (value === 'workforce') enterWorkforce(current, '普通高中毕业');
      else {
        const result = Game.admissions.enroll(current, value);
        if (!result.ok) return Game.view.showToast(result.message, 'warning');
        Game.view.showToast(result.message, 'good');
      }
    } else if (decision.type === 'vocationalExit') {
      if (value === 'vocational-work') enterWorkforce(current, `职高${current.education.vocationalMajor || '技能'}专业毕业`);
      else {
        const result = Game.admissions.enroll(current, Game.admissions.vocationalToken(), true);
        if (!result.ok) return Game.view.showToast(result.message, 'warning');
        Game.view.showToast(result.message, 'good');
      }
    }
    current.pendingDecision = null;
    done();
  }

  function renderDecision() {
    const current = state();
    const d = current.pendingDecision;
    Game.view.el.decision.hidden = !d;
    if (!d) return;
    if (['lifeEvent', 'succession'].includes(d.type)) {
      const content = d.type === 'lifeEvent' ? Game.lifeEvents.render(current) : Game.legacySystem.renderDecision(current);
      if (!content) return;
      Game.view.el.decisionTitle.textContent = content.title;
      Game.view.el.decisionText.textContent = content.text;
      Game.view.el.decisionBody.innerHTML = content.options.map((item) => (
        `<button data-choice="${item.value}">${item.label}</button>`
      )).join('');
      return;
    }
    let options = [];
    if (d.type === 'highSchool') {
      Game.view.el.decisionTitle.textContent = `中考 ${d.score} 分，填报本地高中`;
      const paper = Game.schoolLines.examContext(current, 'middle');
      Game.view.el.decisionText.textContent = `${paper.year}年${paper.area}卷${paper.label}，录取线结合当地教育资源动态调整。`;
      const schools = Game.schoolLines.localHighSchools(current);
      options = schools.filter((item) => d.score >= Game.schoolLines.highSchoolLine(current, item))
        .map((item) => ({
          value: Game.schoolLines.schoolName(current, item),
          label: `${Game.schoolLines.schoolName(current, item)} · ${item.type}${item.major ? ` · ${item.major}` : ''} · 线${Game.schoolLines.highSchoolLine(current, item)}`,
        }));
      if (!options.length) {
        const school = schools[schools.length - 1];
        options = [{ value: Game.schoolLines.schoolName(current, school),
          label: `${Game.schoolLines.schoolName(current, school)} · ${school.type} · 补录通道` }];
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
      Game.view.el.decisionText.textContent = '按国家、城市、院校类型和专业筛选，展开院校后选择具体专业。';
      Game.view.el.decisionBody.innerHTML = Game.admissions.render(current, d.score);
      return;
    } else if (d.type === 'vocationalExit') {
      Game.view.el.decisionTitle.textContent = '职高毕业去向';
      Game.view.el.decisionText.textContent = `你完成了${current.education.vocationalMajor || '职业技能'}学习，可以直接就业或继续读高职。`;
      options = [
        { value: 'vocational-work', label: '直接就业 · 技能岗位与自由职业' },
        { value: 'vocational-college', label: '高职升学 · 城市职业学院' },
      ];
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
