(function initIdolTraineeDecisions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function renderDecision(state) {
    const decision = state.pendingDecision;
    if (decision?.type === 'idolTraineePlan') {
      return {
        title: `${decision.year}年度练习生方针`,
        text: '选择后将按月自动执行，本年度可再调整一次。',
        options: Object.entries(Game.idolTraineeSchedule.PLANS)
          .map(([value, plan]) => ({ value, label: plan.label })),
      };
    }
    if (decision?.type !== 'idolTraineeReview') return null;
    return {
      title: `${decision.theme}考核 · 第${decision.rank}/${decision.total}名`,
      text: `本次评分${decision.score}，选择下一阶段的应对方式。`,
      options: [
        { value: 'push', label: '加大训练 · 关注+5、状态-8' },
        { value: 'recover', label: '恢复状态 · 状态+12、关注-2' },
        { value: 'bond', label: '与同期合练 · 团队协作+8' },
      ],
    };
  }

  function resolve(state, value) {
    if (state.pendingDecision?.type === 'idolTraineePlan') {
      return Game.idolTraineeSchedule.setPlan(state, value);
    }
    if (state.pendingDecision?.type !== 'idolTraineeReview') {
      return { ok: false, message: '考核已结束' };
    }
    const idol = Game.idolTraineeState.ensure(state);
    if (value === 'push') {
      idol.attention += 5;
      idol.condition = U.clamp(idol.condition - 8, 0, 100);
    } else if (value === 'recover') {
      idol.condition = U.clamp(idol.condition + 12, 0, 100);
      idol.attention = Math.max(0, idol.attention - 2);
    } else if (value === 'bond') {
      idol.teamwork = U.clamp(idol.teamwork + 8, 0, 100);
    } else return { ok: false, message: '没有这个考核安排' };
    return { ok: true, message: '季度考核安排已确定' };
  }

  Game.idolTraineeDecisions = Object.freeze({ renderDecision, resolve });
}(window));
