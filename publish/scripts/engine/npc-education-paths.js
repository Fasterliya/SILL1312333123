(function initNpcEducationPaths(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function dropoutRisk(person, age) {
    if (person.droppedOut || age < 15 || age > 20) return 0;
    const ability = Game.learningAttribute.checkValue(
      Game.characterAttributes.personValue(person, '学识'),
    );
    const habit = Number(person.studyHabit) || 50;
    const base = age < 18 ? 0.04 : 0.025;
    const risk = base + Math.max(0, 52 - ability) * 0.004
      + Math.max(0, 45 - habit) * 0.004;
    return U.clamp(age >= 18 ? risk * 0.7 : risk, 0.02, age < 18 ? 0.3 : 0.18);
  }

  function maybeDropout(state, person, age, city) {
    const risk = dropoutRisk(person, age);
    if (!risk || person.lastDropoutCheckAge === age) return false;
    person.lastDropoutCheckAge = age;
    if (Math.random() >= risk) return false;
    const school = person.educationName || person.school || `${city}学校`;
    person.schoolHistory ||= [];
    if (!person.schoolHistory.some((item) => item.school === school)) {
      person.schoolHistory.push({ school, city, endedAt: state.totalMonths });
      person.schoolHistory = person.schoolHistory.slice(-8);
    }
    person.droppedOut = true;
    person.dropoutAge = age;
    person.dropoutSchool = school;
    person.school = '辍学';
    person.educationName = `${school}辍学`;
    person.educationStage = 'workforce';
    person.educationLevel = age >= 18 ? Math.min(1, person.educationLevel || 1) : 0;
    Game.lifeResume?.backfillResume?.(state, person);
    if (!person.lifeResume?.some((entry) => entry.event === '辍学')) {
      Game.lifeResume?.recordEvent?.(state, person, '辍学', `离开${school}进入社会`);
    }
    return true;
  }

  function jobWeight(person, job, age) {
    const charm = Game.characterAttributes.derivedCharm(person);
    const education = Number(person.educationLevel) || 0;
    const young = age >= 18 && age <= 28;
    const petite = ['娇小纤细', '小胸'].includes(person.bodyType || '');
    const cute = ['青涩', '灵动', '明快'].includes(person.temperament || '');
    const cosplay = (person.fashion?.cosplayInterest || 0) > 40;
    if (person.sexWork?.isProstitute && job.id === 'prostitute') return 400;
    if (job.id === 'idol-underground' && young) {
      if (person.droppedOut) return charm > 55 ? 620 : 460;
      return charm > 55 ? 150 : 110;
    }
    if (job.id === 'prostitute' && young && education <= 1) return charm > 55 ? 180 : 120;
    if (job.id === 'welfare' && young && cute) return charm > 50 ? 200 : 140;
    if (job.id === 'welfare' && young && petite) return 160;
    if (job.id === 'idoltrainee' && young && age <= 20 && charm > 55) return 180;
    if (job.id === 'idol' && young && charm > 60 && (person.fashion?.cosplayInterest || 0) > 30) return 150;
    if (job.id === 'coser' && cosplay) return 170;
    if (job.id === 'vtuber' && cute && young) return 130;
    if (job.id === 'beautyblog' && charm > 55) return 120;
    return 100;
  }

  Game.npcEducationPaths = Object.freeze({ dropoutRisk, maybeDropout, jobWeight });
}(window));
