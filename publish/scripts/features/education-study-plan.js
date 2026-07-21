(function initEducationStudyPlan(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content, Capacity = Game.educationPlanCapacity, Groups = Game.educationSubjectGroups;
  const extras = Object.freeze({
    rest: ['休息', '降低疲劳并改善状态'],
    club: ['社团', '缓解压力并积累交涉经验'],
    tutor: ['补习', '强化当前最弱科目'],
  });
  const isStudent = (state) => Game.subjectPanel.isStudent(state);
  const total = (allocation) => Object.values(allocation || {})
    .reduce((sum, value) => sum + (Number(value) || 0), 0);

  function termInfo(state) {
    const year = Number(state.year) || Game.config.startYear;
    const month = Number(state.month) || 1;
    const stage = state.education.schoolStage;
    const start = month >= 9 ? year : year - 1;
    return { key: `${stage}:${start}-year-groups`, label: `${start}-${start + 1}学年` };
  }

  function subjectKeys(state) {
    return Groups.keys(state);
  }
  function emptyAllocation(state) {
    return Object.fromEntries([...subjectKeys(state), ...Object.keys(extras)].map((key) => [key, 0]));
  }

  function defaultAllocation(state) {
    Game.subjectPanel.ensureSubjects(state);
    const allocation = emptyAllocation(state);
    allocation.rest = 1;
    allocation.club = 1;
    const slotCount = Capacity.slots(state);
    const ranked = subjectKeys(state)
      .sort((left, right) => Groups.progress(state, left) - Groups.progress(state, right));
    for (let index = 0; index < slotCount - 2; index += 1) {
      allocation[ranked[index % ranked.length]] += 1;
    }
    return allocation;
  }
  function draftFromCurrent(state) {
    const current = state.education.semesterPlan;
    if (!current?.allocation) return defaultAllocation(state);
    const draft = emptyAllocation(state);
    Object.keys(draft).forEach((key) => {
      draft[key] = Math.max(0, Math.min(3, Number(current.allocation[key]) || 0));
    });
    if (total(draft) !== Capacity.slots(state)) return defaultAllocation(state);
    return draft;
  }

  function ensureSemester(state) {
    if (!isStudent(state) || state.pendingDecision) return false;
    const term = termInfo(state);
    if (state.education.semesterPlan?.key === term.key) return false;
    state.pendingDecision = {
      type: 'semesterPlan',
      term,
      draft: defaultAllocation(state),
      adjustment: false,
    };
    state.timeSpeed = 0;
    return true;
  }

  function requestAdjustment(state) {
    if (!isStudent(state) || state.pendingDecision) {
      return { ok: false, message: '请先处理当前事件' };
    }
    const plan = state.education.semesterPlan;
    if (!plan || plan.key !== termInfo(state).key) {
      ensureSemester(state);
      return { ok: true, message: '请先制定本学年计划' };
    }
    if ((plan.adjustmentsUsed || 0) >= 1) {
      return { ok: false, message: '本学年的调整机会已经使用' };
    }
    state.pendingDecision = {
      type: 'semesterPlan',
      term: termInfo(state),
      draft: draftFromCurrent(state),
      adjustment: true,
    };
    state.timeSpeed = 0;
    return { ok: true, message: `可以重新分配${Capacity.slots(state)}个时间格` };
  }

  function adjust(state, key, delta) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'semesterPlan' || !(key in decision.draft)) return false;
    const next = (Number(decision.draft[key]) || 0) + Number(delta);
    if (next < 0 || next > 3) return true;
    if (delta > 0 && total(decision.draft) >= Capacity.slots(state)) return true;
    decision.draft[key] = next;
    return true;
  }

  function weakestSubjects(state, count) {
    return Groups.subjects(state).sort((left, right) => {
      const a = state.education.subjects[left] || {};
      const b = state.education.subjects[right] || {};
      const aScore = (Number(a.studyHours) || 0) + (Number(a.aptitude) || 0) * 0.4;
      const bScore = (Number(b.studyHours) || 0) + (Number(b.aptitude) || 0) * 0.4;
      return aScore - bScore;
    }).slice(0, count);
  }

  function applyMonth(state) {
    const plan = state.education.semesterPlan;
    if (!plan || plan.key !== termInfo(state).key || plan.lastAppliedMonth === state.totalMonths) return null;
    Game.subjectPanel.ensureSubjects(state);
    let gained = 0;
    Groups.subjects(state).forEach((subject) => {
      const data = state.education.subjects[subject];
      const aptitudeBonus = data.aptitude >= 75 ? 1 : 0;
      const gain = 2 + aptitudeBonus + Groups.allocationFor(state, plan.allocation, subject) * 5;
      const previous = Number(data.studyHours) || 0;
      data.studyHours = Math.min(200, previous + gain);
      gained += data.studyHours - previous;
    });
    const tutor = plan.allocation.tutor || 0;
    weakestSubjects(state, 2).forEach((subject) => {
      const data = state.education.subjects[subject];
      const previous = data.studyHours;
      data.studyHours = Math.min(200, previous + tutor * 4);
      gained += data.studyHours - previous;
    });
    const rest = plan.allocation.rest || 0;
    const club = plan.allocation.club || 0;
    const academic = subjectKeys(state).reduce((sum, key) => sum + (plan.allocation[key] || 0), 0) + tutor;
    state.education.burnout = U.clamp((state.education.burnout || 0)
      + Math.max(0, academic - 3) * 3 - rest * 5 - club * 2, 0, 100);
    state.education.examTechnique = U.clamp((state.education.examTechnique || 20) + tutor, 0, 100);
    state.stats.心情 = U.clamp((state.stats.心情 || 0) + club * 2 + rest, 0, 100);
    if (club) Game.characterAttributes.gain(state, '交涉', club * 0.35, '社团活动');
    plan.lastAppliedMonth = state.totalMonths;
    plan.monthsExecuted = (plan.monthsExecuted || 0) + 1;
    plan.lastGain = gained;
    return { gained };
  }

  function resolve(state) {
    const decision = state.pendingDecision;
    const slotCount = Capacity.slots(state);
    if (decision?.type !== 'semesterPlan' || total(decision.draft) !== slotCount) {
      return { ok: false, message: `需要正好分配${slotCount}个时间格` };
    }
    const previous = state.education.semesterPlan;
    state.education.semesterPlan = {
      key: decision.term.key,
      label: decision.term.label,
      allocation: { ...decision.draft },
      slotCount,
      adjustmentsUsed: decision.adjustment ? (previous?.adjustmentsUsed || 0) + 1 : 0,
      lastAppliedMonth: decision.adjustment ? previous?.lastAppliedMonth : null,
      monthsExecuted: decision.adjustment ? previous?.monthsExecuted || 0 : 0,
    };
    state.pendingDecision = null;
    applyMonth(state);
    return { ok: true, message: `${decision.term.label}学习计划已生效` };
  }

  function decisionModel(state) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'semesterPlan') return null;
    return {
      used: total(decision.draft),
      limit: Capacity.slots(state),
      intelligence: Capacity.intelligence(state),
      rows: [...subjectKeys(state), ...Object.keys(extras)].map((key) => ({
        key,
        count: decision.draft[key] || 0,
        label: extras[key]?.[0] || key,
        hint: extras[key]?.[1] || Groups.hint(state, key),
      })),
    };
  }

  function status(state) {
    const plan = state.education.semesterPlan;
    const active = Boolean(plan && plan.key === termInfo(state).key);
    return {
      active,
      label: active ? plan.label : '等待制定计划',
      allocation: active ? plan.allocation : {},
      months: active ? plan.monthsExecuted || 0 : 0,
      limit: active ? plan.slotCount || total(plan.allocation) : Capacity.slots(state),
      canAdjust: Boolean(active && (plan.adjustmentsUsed || 0) < 1),
    };
  }
  Game.educationStudyPlan = Object.freeze({
    slotCount: Capacity.slots, extras, termInfo, ensureSemester, requestAdjustment, applyMonth,
    adjust, resolve, decisionModel, status,
  });
}(window));
