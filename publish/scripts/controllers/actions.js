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
    var current = state();
    var decision = current.pendingDecision;
    if (!decision) return;

    if (decision.type === 'semesterPlan') {
      var result = Game.educationStudyPlan.resolve(current);
      Game.eventBus.notify(current, result.message, result.ok ? 'good' : 'warning');
      if (result.ok) done();
      return;
    }

    if (['gen-respect', 'gen-strict', 'gen-compromise'].includes(value)) {
      var genResult = Game.familyEvents.resolveGenerationConflict(current, value);
      Game.eventBus.notify(current, genResult.message, genResult.ok ? 'good' : 'warning');
      if (genResult.ok) done();
      return;
    }

    var result = Game.eventBus.resolveDecision(current, value);
    if (result) {
      Game.eventBus.notify(current, result.message, result.ok ? 'good' : 'warning');
    }
    current.pendingDecision = null;
    done();
  }

  function renderDecision() {
    var current = state();
    var d = current.pendingDecision;
    var visible = Boolean(d);
    Game.view.el.decision.hidden = !visible;
    if (!visible) return;

    if (d.type === 'semesterPlan') {
      Game.view.el.decisionTitle.textContent = d.adjustment ? '调整本学年计划' : '制定本学年计划';
      Game.view.el.decisionText.textContent = d.term.label + '：把' + Game.educationStudyPlan.slotCount(current) + '个时间格分配给科目与生活安排。';
      Game.view.el.decisionBody.innerHTML = Game.educationPlanView.renderDecision(current);
      return;
    }

    var content = Game.eventBus.renderDecision(current);
    if (!content) {
      current.pendingDecision = null;
      Game.view.el.decision.hidden = true;
      if (api.save) api.save();
      return;
    }
    Game.view.el.decisionTitle.textContent = content.title || '';
    Game.view.el.decisionText.textContent = content.text || '';
    if (content.html) {
      Game.view.el.decisionBody.innerHTML = content.html;
    } else if (content.options) {
      Game.view.el.decisionBody.innerHTML = content.options.map(function (item) {
        return '<button data-choice="' + item.value + '">' + item.label + '</button>';
      }).join('');
    }
  }

  function configure(options) {
    api = options;
  }

  Game.actions = Object.freeze({
    configure, trade, decide, renderDecision,
  });
}(window));
