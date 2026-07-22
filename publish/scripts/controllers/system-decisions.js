(function initSystemDecisions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const systems = {
    psychology: () => Game.psychology,
    taxFiling: () => Game.taxSystem,
    boardVote: () => Game.stockDirector,
    familyConflict: () => Game.familyConflict,
    relationshipConflict: () => Game.relationshipConflict,
    stress: () => Game.stressSystem,
    examPrep: () => Game.educationExamPrep,
    idolTraineePlan: () => Game.idolTraineeDecisions,
    idolTraineeReview: () => Game.idolTraineeDecisions,
    idolCareerPlan: () => Game.idolProjectDecisions,
    idolProjectSelect: () => Game.idolProjectDecisions,
    idolProjectReview: () => Game.idolProjectDecisions,
    mental_breakdown: () => Game.mentalBreakdown,
    stalking: () => Game.conventionRisk,
    kept_proposal: () => Game.welfareCareer,
  };

  function content(state) {
    const decision = state.pendingDecision;
    if (!decision) return null;
    if (decision.type === 'thesisRetry') {
      return {
        title: decision.title || '论文答辩未通过',
        text: decision.text || '修改论文后可重新申请答辩。',
        options: decision.options || [{ value: 'ok', label: '知道了' }],
      };
    }
    const system = systems[decision.type]?.();
    return system?.renderDecision?.(state) || null;
  }

  function resolve(state, value) {
    const decision = state.pendingDecision;
    if (!decision) return null;
    if (decision.type === 'thesisRetry') {
      state.pendingDecision = null;
      return { ok: true, message: '已记录论文修改安排，六个月后重新答辩' };
    }
    const system = systems[decision.type]?.();
    if (!system?.resolve) return null;
    const result = system.resolve(state, value);
    if (result?.ok && state.pendingDecision === decision) state.pendingDecision = null;
    return result;
  }

  Game.systemDecisions = Object.freeze({ content, resolve });
}(window));
