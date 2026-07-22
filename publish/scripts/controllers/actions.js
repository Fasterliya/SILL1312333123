(function initActions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  let api = null;

  function state() {
    return api.getState();
  }
  function done() {
    Game.educationStudyPlan?.ensureSemester(state());
    api.refresh();
    api.save();
  }

  function trade(name, mode, lot) {
    const current = state();
    if (U.age(current) < 18) return Game.view.showToast('成年后才能进入股票市场', 'warning');
    const result = Game.companyMarket.trade(current, name, mode, Number(lot) || 100);
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    if (!result.ok) return;
    done();
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
    if (decision.type === 'semesterPlan') {
      const result = Game.educationStudyPlan.resolve(current);
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      if (result.ok) done();
      return;
    }
    const systemResult = Game.systemDecisions?.resolve(current, value);
    if (systemResult) {
      Game.view.showToast(systemResult.message, systemResult.ok ? 'good' : 'warning');
      if (systemResult.ok) done();
      return;
    }
    if (['gen-respect', 'gen-strict', 'gen-compromise'].includes(value)) {
      var genResult = Game.familyEvents.resolveGenerationConflict(current, value);
      Game.view.showToast(genResult.message, genResult.ok ? 'good' : 'warning');
      if (genResult.ok) done();
      return;
    }
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
    } else if (decision.type === 'idolTransition') {
      var result = Game.idolSystem.transitionCareer(current, value);
      if (!result.ok) return Game.view.showToast(result.message, 'warning');
      Game.view.showToast(result.message, 'good');
    } else if (decision.type === 'internship') {
      Game.universityLife.resolveInternship(current, value);
    } else if (decision.type === 'mgContract') {
      if (value === 'accept-mg') {
        var mgResult = Game.magicalGirlContract.acceptContract(current, decision.data);
        Game.view.showToast(mgResult.message, mgResult.ok ? 'good' : 'warning');
      } else {
        var declineResult = Game.magicalGirlContract.declineContract(current, decision.data);
        Game.view.showToast(declineResult.message, declineResult.ok ? 'good' : 'warning');
      }
    }
    current.pendingDecision = null;
    done();
  }

  function renderDecision() {
    const current = state();
    const d = current.pendingDecision;
    const visible = Boolean(d);
    Game.view.el.decision.hidden = !visible;
    if (!visible) return;
    if (d.type === 'semesterPlan') {
      Game.view.el.decisionTitle.textContent = d.adjustment ? '调整本学年计划' : '制定本学年计划';
      Game.view.el.decisionText.textContent = `${d.term.label}：把${Game.educationStudyPlan.slotCount(current)}个时间格分配给科目与生活安排。`;
      Game.view.el.decisionBody.innerHTML = Game.educationPlanView.renderDecision(current);
      return;
    }
    const systemContent = Game.systemDecisions?.content(current);
    if (systemContent) {
      Game.view.el.decisionTitle.textContent = systemContent.title;
      Game.view.el.decisionText.textContent = systemContent.text;
      Game.view.el.decisionBody.innerHTML = systemContent.options.map((item) => (
        `<button data-choice="${item.value}">${item.label}</button>`
      )).join('');
      return;
    }
    if (['lifeEvent', 'succession'].includes(d.type)) {
      const content = d.type === 'lifeEvent' ? Game.lifeEvents.render(current) : Game.legacySystem.renderDecision(current);
      if (!content) {
        current.pendingDecision = null;
        Game.view.el.decision.hidden = true;
        api.save();
        return;
      }
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
    if (!options.length && d.options) {
      Game.view.el.decisionTitle.textContent = d.title || '';
      Game.view.el.decisionText.textContent = d.text || '';
      options = d.options;
    }
    Game.view.el.decisionBody.innerHTML = options.map((item) => (
      `<button data-choice="${item.value}">${item.label}</button>`
    )).join('');
  }

  function configure(options) {
    api = options;
  }

  Game.actions = Object.freeze({
    configure, trade, decide, renderDecision,
  });
}(window));
