(function initConventionOperations(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const riskFactors = Object.freeze({
    excellent: 0.5, success: 0.75, partial: 1, failed: 1.5,
  });
  function company(state, id) {
    return (state.companies || []).find((item) => item.id === id) || null;
  }
  function phaseDone(operations, phaseId) {
    return operations.decisions.some((entry) => entry.phaseId === phaseId);
  }
  function nextPhase(prep) {
    return Game.conventionCatalog.operationPhases.find((phase) => (
      !phaseDone(prep.operations, phase.id)
    )) || null;
  }
  function model(state, event, companyId) {
    if (!event || event.organizer.companyId !== companyId) return null;
    const prep = Game.conventionCalendar.preparation(state, event);
    const phase = nextPhase(prep);
    return {
      phase, completed: !phase, count: prep.operations.decisions.length,
      score: prep.operations.decisions.length
        ? Math.round(prep.operations.score / prep.operations.decisions.length) : 0,
    };
  }
  function failure(state, event, item, prep, phase, option) {
    if (!item || !event || event.organizer.companyId !== item.id) return '公司没有本届现场运营权限';
    if (Game.conventionCalendar.status(state, event).id !== 'ongoing') return '只有举办月可以处理现场运营';
    if (Game.conventionCompany.nextStage(prep)) return '基础筹备尚未完成';
    if (!phase || !option) return '现场运营阶段已经完成';
    return '';
  }
  function context(item, prep, phase) {
    const reputation = Math.round((item.conventionReputation || 0) / 10);
    const preparation = phase.id === 'entry' ? prep.safety
      : (phase.id === 'peak' ? prep.quality : Math.round((prep.safety + prep.promotion) / 2));
    return Math.min(16, reputation + Math.round((preparation - 50) / 12));
  }
  function adjustedEffects(option, resolution) {
    return Object.fromEntries(Object.entries(option.effects).map(([key, value]) => {
      const factor = value >= 0 ? resolution.multiplier : riskFactors[resolution.tier];
      return [key, Math.round(value * factor)];
    }));
  }
  function choose(state, editionId, companyId, choiceId) {
    const item = company(state, companyId);
    const event = Game.conventionCalendar.find(state, editionId);
    const prep = event ? Game.conventionCalendar.preparation(state, event) : null;
    const phase = prep ? nextPhase(prep) : null;
    const option = phase?.options.find((entry) => entry.id === choiceId);
    const blocked = failure(state, event, item, prep, phase, option);
    if (blocked) return { ok: false, message: blocked };
    const resolution = Game.actionResolver.resolve(state, {
      primary: option.primary, secondary: option.secondary,
      difficulty: option.difficulty, context: context(item, prep, phase),
      variance: 7, label: `${event.name}${phase.name}`,
    });
    const effects = adjustedEffects(option, resolution);
    const patch = {};
    Object.entries(effects).forEach(([key, value]) => { patch[key] = prep[key] + value; });
    Game.conventionCalendar.updatePreparation(
      state, event.id, patch, `operation:${phase.id}:${option.id}`,
    );
    prep.operations.decisions.push({
      phaseId: phase.id, optionId: option.id, score: resolution.score,
      tier: resolution.tier, month: state.totalMonths,
    });
    prep.operations.score += resolution.score;
    prep.operations.completed = !nextPhase(prep);
    Game.characterAttributes.gain(state, option.primary, 0.55, `漫展现场运营:${phase.id}`);
    const progress = prep.operations.completed ? '现场运营全部完成' : `下一阶段：${nextPhase(prep).name}`;
    return { ok: true, actionResolution: resolution,
      message: `${option.name}执行完毕，${progress}；${Game.actionResolver.summary(resolution)}` };
  }

  Game.conventionOperations = Object.freeze({
    model, choose, nextPhase, phaseDone,
  });
}(window));
