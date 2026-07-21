(function initIdolTraineeState(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const COHORT_SIZE = 10;

  function isSchoolPeer(person) {
    return person.relation === '同学' || person.relation === '校友'
      || Boolean(person.schoolHistory?.length);
  }

  function scoreCandidate(state, person) {
    const ageGap = Math.abs(U.personAge(state, person) - U.age(state));
    return (isSchoolPeer(person) ? 1000 : 0)
      + (person.school === state.education.school ? 300 : 0)
      + (person.phoneUnlocked ? 50 : 0) - ageGap * 20 + (person.affection || 0);
  }

  function ensureNpc(state, person, index) {
    const seed = [...String(person.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    person.npcIdol = person.npcIdol && typeof person.npcIdol === 'object'
      ? person.npcIdol : {};
    const idol = person.npcIdol;
    idol.stage ||= 'trainee';
    idol.cohortManaged = true;
    idol.skills ||= {
      dance: 20 + (seed * 3 + index * 7) % 31,
      vocal: 20 + (seed * 5 + index * 3) % 31,
      expression: 20 + (seed * 7 + index * 5) % 31,
    };
    idol.attention = Number.isFinite(idol.attention) ? idol.attention : 10 + seed % 31;
    idol.condition = Number.isFinite(idol.condition) ? idol.condition : 58 + seed % 29;
    idol.trainingMonths = Number.isFinite(idol.trainingMonths) ? idol.trainingMonths : 0;
    idol.debutPoints = Math.max(0, Number(idol.debutPoints) || 0);
    idol.warnings = Math.max(0, Number(idol.warnings) || 0);
    idol.teamwork = Number.isFinite(idol.teamwork) ? idol.teamwork : 35 + seed % 36;
    idol.planId ||= ['balanced', 'performance', 'vocal', 'exposure', 'teamwork'][seed % 5];
    idol.originalCareer ||= {
      job: person.job || '', jobId: person.jobId || '', company: person.company || '',
      companyId: person.companyId || '',
    };
    person.job = idol.stage === 'debuted' ? '偶像艺人' : '偶像练习生';
    person.jobId = idol.stage === 'debuted' ? 'idol' : 'idoltrainee';
    person.company = state.idol.agencyName || state.career.company;
    person.companyId = state.workplace?.companyId || person.companyId || '';
    person.careerCity = state.location.city;
    person.currentCity = state.location.city;
    return idol;
  }

  function candidates(state) {
    Game.socialWorld.ensure(state);
    const city = state.location.city;
    const playerAge = U.age(state);
    return Game.people.all(state).filter((person) => {
      const age = U.personAge(state, person);
      const available = !person.job || person.jobId === 'idoltrainee';
      return person.status === '健康'
        && person.currentCity === city
        && person.gender === state.gender
        && available
        && !['debuted', 'retired'].includes(person.npcIdol?.stage)
        && age >= 12 && age <= 29
        && Math.abs(age - playerAge) <= 6;
    }).sort((a, b) => scoreCandidate(state, b) - scoreCandidate(state, a));
  }

  function ensure(state) {
    const idol = Game.idolCore.ensure(state);
    idol.cohortIds = Array.isArray(idol.cohortIds)
      ? idol.cohortIds.filter((id) => {
        const person = Game.people.find(state, id);
        return person && !['debuted', 'released', 'retired'].includes(person.npcIdol?.stage);
      }) : [];
    idol.cohortAlumniIds = Array.isArray(idol.cohortAlumniIds)
      ? idol.cohortAlumniIds.filter((id) => Game.people.find(state, id)).slice(-20) : [];
    if (idol.stage === 'trainee') {
      const selected = new Set(idol.cohortIds);
      for (const person of candidates(state)) {
        if (selected.has(person.id)) continue;
        idol.cohortIds.push(person.id);
        selected.add(person.id);
        if (idol.cohortIds.length >= COHORT_SIZE - 1) break;
      }
      idol.cohortIds = idol.cohortIds.slice(0, COHORT_SIZE - 1);
      idol.cohortIds.forEach((id, index) => {
        const person = Game.people.find(state, id);
        if (person) ensureNpc(state, person, index);
      });
    }
    idol.nextEvaluationMonth = Number.isFinite(idol.nextEvaluationMonth)
      ? idol.nextEvaluationMonth : state.totalMonths + 3;
    idol.evaluationHistory = Array.isArray(idol.evaluationHistory)
      ? idol.evaluationHistory.slice(-8) : [];
    idol.condition = Number.isFinite(idol.condition) ? idol.condition : 72;
    idol.attention = Number.isFinite(idol.attention) ? idol.attention : Math.min(45, idol.fans || 0);
    idol.debutPoints = Math.max(0, Number(idol.debutPoints) || 0);
    idol.warnings = Math.max(0, Number(idol.warnings) || 0);
    idol.teamwork = Number.isFinite(idol.teamwork) ? idol.teamwork : 50;
    return idol;
  }

  function members(state) {
    const idol = ensure(state);
    return idol.cohortIds.map((id) => Game.people.find(state, id)).filter(Boolean);
  }

  Game.idolTraineeState = Object.freeze({ ensure, members, isSchoolPeer });
}(window));
