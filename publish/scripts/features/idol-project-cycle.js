(function initIdolProjectCycle(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const STRATEGIES = Object.freeze({
    growth: { label: '上升冲刺', heat: 4, reputation: 0, condition: -4, quality: 0.08 },
    stable: { label: '稳定运营', heat: 1, reputation: 2, condition: -1, quality: 0.04 },
    acclaim: { label: '口碑作品', heat: 0, reputation: 4, condition: -3, quality: 0.12 },
    commercial: { label: '商业曝光', heat: 5, reputation: -1, condition: -5, quality: 0.02 },
    overseas: { label: '海外拓展', heat: 2, reputation: 3, condition: -5, quality: 0.09 },
    recovery: { label: '健康优先', heat: -2, reputation: 1, condition: 6, quality: -0.03 },
  });
  const PROJECTS = Object.freeze({
    single: { label: '单曲企划', type: 'single', condition: 2, heat: 6, reputation: 1 },
    album: { label: '专辑企划', type: 'album', condition: 4, heat: 4, reputation: 5 },
    photobook: { label: '写真企划', type: 'photobook', condition: 3, heat: 7, reputation: 0 },
    concert: { label: '演唱会企划', type: 'concert', condition: 6, heat: 8, reputation: 3 },
    recovery: { label: '休整季度', type: null, condition: -8, heat: -2, reputation: 1 },
  });

  function ensure(state) {
    const idol = Game.idolCore.ensure(state);
    idol.strategyId = STRATEGIES[idol.strategyId] ? idol.strategyId : 'stable';
    idol.strategyYear = Number.isFinite(idol.strategyYear) ? idol.strategyYear : -1;
    idol.strategyAdjustments = Math.max(0, Number(idol.strategyAdjustments) || 0);
    idol.strategyConfirmed = idol.strategyConfirmed === true;
    idol.projectHistory = Array.isArray(idol.projectHistory) ? idol.projectHistory.slice(-12) : [];
    idol.activeProject = idol.activeProject && typeof idol.activeProject === 'object'
      ? idol.activeProject : null;
    idol.nextProjectMonth = Number.isFinite(idol.nextProjectMonth)
      ? idol.nextProjectMonth : state.totalMonths;
    return idol;
  }

  function syncYear(state, idol) {
    if (idol.strategyYear === state.year) return;
    idol.strategyYear = state.year;
    idol.strategyAdjustments = 0;
    idol.strategyConfirmed = false;
  }

  function requestAnnualPlan(state) {
    const idol = ensure(state);
    syncYear(state, idol);
    if (idol.stage !== 'debuted' || idol.strategyConfirmed || state.pendingDecision) return false;
    state.pendingDecision = { type: 'idolCareerPlan', year: state.year };
    state.timeSpeed = 0;
    return true;
  }

  function setStrategy(state, id) {
    const idol = ensure(state);
    syncYear(state, idol);
    if (!STRATEGIES[id]) return { ok: false, message: '没有这个年度策略' };
    if (idol.strategyConfirmed && idol.strategyAdjustments >= 1) {
      return { ok: false, message: '本年度策略已经锁定' };
    }
    if (idol.strategyConfirmed && idol.strategyId !== id) idol.strategyAdjustments += 1;
    idol.strategyId = id;
    idol.strategyConfirmed = true;
    return { ok: true, message: `${STRATEGIES[id].label}将持续到本年结束` };
  }

  function adjustStrategy(state, id) {
    const idol = ensure(state);
    if (idol.strategyId === id && idol.strategyConfirmed) {
      return { ok: true, message: `继续执行${STRATEGIES[id]?.label || '当前策略'}` };
    }
    return setStrategy(state, id);
  }

  function requestProject(state) {
    const idol = ensure(state);
    if (idol.stage !== 'debuted' || idol.activeProject || state.pendingDecision) {
      return { ok: false, message: idol.activeProject ? '当前季度企划仍在制作' : '暂时无法选择企划' };
    }
    state.pendingDecision = { type: 'idolProjectSelect' };
    state.timeSpeed = 0;
    return { ok: true, message: '请选择下一季度企划' };
  }

  function validateProject(state, idol, project) {
    if (!project.type) return null;
    const config = Game.idolCore.RELEASES[project.type];
    const last = Number.isFinite(idol.lastReleaseMonths[project.type])
      ? idol.lastReleaseMonths[project.type] : -config.cooldown;
    const remaining = config.cooldown - (state.totalMonths - last);
    if (remaining > 0) return `${config.label}还需等待${remaining}个月`;
    if (idol.fans < config.minFans) return `${config.label}需要${config.minFans.toLocaleString()}粉丝`;
    if (state.money < config.cost) return `启动企划需要${Game.view.money(config.cost)}`;
    if (state.stats.健康 < config.health) return `健康不足，无法启动${config.label}`;
    return null;
  }

  function startProject(state, id) {
    const idol = ensure(state);
    const project = PROJECTS[id];
    if (!project) return { ok: false, message: '没有这个季度企划' };
    if (idol.activeProject) return { ok: false, message: '当前季度企划仍在制作' };
    const error = validateProject(state, idol, project);
    if (error) return { ok: false, message: error };
    const cost = project.type ? Game.idolCore.RELEASES[project.type].cost : 0;
    state.money -= cost;
    idol.activeProject = {
      id, startedMonth: state.totalMonths, progress: 0, lastProgressMonth: state.totalMonths,
      prepaidCost: cost,
    };
    return { ok: true, message: `${project.label}启动，将自动筹备三个月` };
  }

  function complete(state, idol, project) {
    let result;
    if (project.type) {
      const strategy = STRATEGIES[idol.strategyId];
      result = Game.idolProduction.releaseWork(state, project.type, {
        prepaid: true, qualityBonus: strategy.quality,
      });
    } else {
      idol.condition = U.clamp(idol.condition + 18, 0, 100);
      state.stats.健康 = U.clamp(state.stats.健康 + 5, 0, 100);
      result = { ok: true, label: project.label, fans: 0, income: 0, quality: 1,
        message: '休整季度完成，状态和健康得到恢复' };
    }
    idol.heat = U.clamp(idol.heat + project.heat, 0, 100);
    idol.reputation = U.clamp(idol.reputation + project.reputation, 0, 100);
    idol.projectHistory.push({
      month: state.totalMonths, id: project.type || 'recovery',
      quality: result.quality || 1, fans: result.fans || 0,
    });
    idol.projectHistory = idol.projectHistory.slice(-12);
    idol.activeProject = null;
    idol.nextProjectMonth = state.totalMonths;
    state.pendingDecision = {
      type: 'idolProjectReview', label: result.label || project.label,
      fans: result.fans || 0, income: result.income || 0, quality: result.quality || 1,
    };
    state.timeSpeed = 0;
  }

  function monthly(state) {
    const idol = ensure(state);
    if (idol.stage !== 'debuted' || requestAnnualPlan(state)) return;
    if (!idol.activeProject) {
      if (!state.pendingDecision && state.totalMonths >= idol.nextProjectMonth) requestProject(state);
      return;
    }
    if (idol.activeProject.lastProgressMonth === state.totalMonths) return;
    const strategy = STRATEGIES[idol.strategyId];
    const project = PROJECTS[idol.activeProject.id];
    idol.heat = U.clamp(idol.heat + strategy.heat, 0, 100);
    idol.reputation = U.clamp(idol.reputation + strategy.reputation, 0, 100);
    idol.condition = U.clamp(idol.condition + strategy.condition - project.condition, 0, 100);
    idol.group && (idol.group.cohesion = U.clamp(idol.group.cohesion
      + (idol.strategyId === 'stable' ? 2 : -1), 0, 100));
    idol.activeProject.progress += 1;
    idol.activeProject.lastProgressMonth = state.totalMonths;
    if (idol.activeProject.progress >= 3) complete(state, idol, project);
  }

  Game.idolProjectCycle = Object.freeze({
    STRATEGIES, PROJECTS, ensure, requestAnnualPlan, setStrategy,
    adjustStrategy, requestProject, startProject, monthly,
  });
}(window));
