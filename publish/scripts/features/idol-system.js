(function initIdolSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.idolCore;
  const Activities = Game.idolActivities;
  const Career = Game.idolCareer;
  const Production = Game.idolProduction;

  function render(state) {
    if (!Core.isIdolJob(state.career.jobId)) return '';
    const idol = Core.ensure(state);
    if (idol.stage === 'trainee') return Game.idolTraineeView.render(state);
    return Game.idolDebutView.render(state);
  }

  function actionResult(state, button) {
    const action = button.dataset.idolAction;
    if (action === 'setTraineePlan') {
      return Game.idolTraineeSchedule.adjustPlan(state, button.dataset.planType);
    }
    if (action === 'setIdolStrategy') {
      return Game.idolProjectCycle.adjustStrategy(state, button.dataset.strategyId);
    }
    if (action === 'chooseIdolProject') return Game.idolProjectCycle.requestProject(state);
    if (action === 'train') return Activities.train(state, button.dataset.idolSkill);
    if (action === 'evaluate') return Activities.evaluation(state);
    if (action === 'handshake') return Activities.handshake(state);
    if (action === 'casting') return Activities.castingCouch(state);
    if (action === 'formGroup') return Activities.formGroup(state);
    if (action === 'signLoveBan') {
      return Core.ensure(state).loveBanSigned
        ? Career.breakLoveBan(state) : Career.signLoveBan(state);
    }
    if (action === 'hireSecurity') return Production.hireSecurity(state);
    if (action === 'graduation') return Career.graduationConcert(state);
    if (action === 'release') return Production.releaseWork(state, button.dataset.releaseType);
    return null;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-idol-action]');
    if (!button) return false;
    const state = Game._getState?.();
    if (!state) return false;
    const result = actionResult(state, button);
    if (result) {
      Game._refresh();
      Game._save?.();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  Game.idolSystem = Object.freeze({
    ensure: Core.ensure,
    onJobChange: Core.onJobChange,
    isIdolJob: Core.isIdolJob,
    train: Activities.train,
    handshake: Activities.handshake,
    evaluation: Activities.evaluation,
    castingCouch: Activities.castingCouch,
    formGroup: Activities.formGroup,
    groupMonthly: Activities.groupMonthly,
    renderGroup: Activities.renderGroup,
    election: Career.election,
    signLoveBan: Career.signLoveBan,
    breakLoveBan: Career.breakLoveBan,
    graduationConcert: Career.graduationConcert,
    transitionCareer: Career.transitionCareer,
    monthlyAntiCheck: Production.monthlyAntiCheck,
    hireSecurity: Production.hireSecurity,
    releaseWork: Production.releaseWork,
    monthly: Production.monthly,
    render,
    handleClick,
  });
}(window));
