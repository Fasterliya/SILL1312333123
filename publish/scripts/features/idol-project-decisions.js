(function initIdolProjectDecisions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function projectOptions(state) {
    const idol = Game.idolProjectCycle.ensure(state);
    return Object.entries(Game.idolProjectCycle.PROJECTS).map(([value, project]) => {
      const config = project.type && Game.idolCore.RELEASES[project.type];
      const cost = config ? ` · ${Game.view.money(config.cost)}` : '';
      const fans = config?.minFans ? ` · 需${config.minFans.toLocaleString()}粉` : '';
      return { value, label: `${project.label}${cost}${fans}` };
    });
  }

  function renderDecision(state) {
    const decision = state.pendingDecision;
    if (decision?.type === 'idolCareerPlan') {
      return {
        title: `${decision.year}年度偶像策略`,
        text: '策略每月自动生效，本年度可以再调整一次。',
        options: Object.entries(Game.idolProjectCycle.STRATEGIES)
          .map(([value, item]) => ({ value, label: item.label })),
      };
    }
    if (decision?.type === 'idolProjectSelect') {
      return {
        title: '选择季度企划',
        text: '企划启动后将自动筹备三个月，制作费现在支付。',
        options: projectOptions(state),
      };
    }
    if (decision?.type !== 'idolProjectReview') return null;
    return {
      title: `${decision.label}完成`,
      text: `质量${Math.round(decision.quality * 100)}% · 新增${decision.fans.toLocaleString()}粉丝`
        + ` · 收入${Game.view.money(decision.income)}`,
      options: [
        { value: 'promote', label: '追加宣传 · 热度+5、状态-6' },
        { value: 'reputation', label: '沉淀口碑 · 口碑+5' },
        { value: 'recover', label: '安排休息 · 状态+12、热度-3' },
      ],
    };
  }

  function queueProject(state) {
    state.pendingDecision = { type: 'idolProjectSelect' };
    state.timeSpeed = 0;
  }

  function resolve(state, value) {
    const type = state.pendingDecision?.type;
    if (type === 'idolCareerPlan') {
      const result = Game.idolProjectCycle.setStrategy(state, value);
      if (result.ok) queueProject(state);
      return result;
    }
    if (type === 'idolProjectSelect') return Game.idolProjectCycle.startProject(state, value);
    if (type !== 'idolProjectReview') return { ok: false, message: '企划决定已经失效' };
    const idol = Game.idolProjectCycle.ensure(state);
    if (value === 'promote') {
      idol.heat = U.clamp(idol.heat + 5, 0, 100);
      idol.condition = U.clamp(idol.condition - 6, 0, 100);
    } else if (value === 'reputation') {
      idol.reputation = U.clamp(idol.reputation + 5, 0, 100);
    } else if (value === 'recover') {
      idol.condition = U.clamp(idol.condition + 12, 0, 100);
      idol.heat = U.clamp(idol.heat - 3, 0, 100);
    } else return { ok: false, message: '没有这个结算安排' };
    queueProject(state);
    return { ok: true, message: '企划复盘完成，请选择下一季度企划' };
  }

  Game.idolProjectDecisions = Object.freeze({ renderDecision, resolve });
}(window));
