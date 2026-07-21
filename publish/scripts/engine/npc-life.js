(function initNpcLife(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  const schoolStage = (age) => {
    if (age < 3) return ['home', '家庭照护'];
    if (age < 6) return ['kindergarten', '幼儿园'];
    if (age < 12) return ['primary', '小学'];
    if (age < 15) return ['middle', '初中'];
    if (age < 18) return ['high', '高中'];
    if (age < 22) return ['university', '大学'];
    return ['graduate', '已毕业'];
  };

  function updateGrowth(person, age) {
    Game.geneticsGrowth.updateGrowth(person, person.gender, Math.max(0, age), false);
  }

  function syncGrowth(state, person) {
    const age = U.personAge(state, person);
    updateGrowth(person, age);
    Game.femaleYouthStyle.apply(person, person.gender, age);
  }

  function education(state, person, age) {
    const [stage] = schoolStage(age);
    if (person.school === state.education.school && !['家中', '已毕业'].includes(person.school)) {
      person.educationStage = state.education.schoolStage;
      person.educationName = person.school;
      return;
    }
    Game.educationSystem.ensurePerson(person);
    if (age >= 18 && age < 22 && person.educationStage === 'workforce') return;
    if (person.educationStage === stage && person.educationName) return;
    const city = person.currentCity || person.metCity || state.location.city || state.hometown.city;
    const variation = U.between(-10, 10) + U.between(-10, 10);
    const score = U.clamp(person.academicAbility * 0.58 + person.studyHabit * 0.32 + variation, 0, 100);
    person.academicScore = Math.round(score);
    person.educationStage = stage;
    if (stage === 'home') person.educationName = '家庭照护';
    else if (stage === 'kindergarten') person.educationName = `${city}向日葵幼儿园`;
    else if (stage === 'primary') person.educationName = `${city}启明小学`;
    else if (stage === 'middle') person.educationName = `${city}新城初级中学`;
    else if (stage === 'high') {
      if (score >= 70) person.educationName = `${city}实验中学`;
      else if (score >= 47) person.educationName = `${city}新区高级中学`;
      else if (score >= 29) person.educationName = `${city}现代服务职业高中`;
      else person.educationName = `${city}职业技能培训中心`;
      person.educationLevel = score >= 29 ? 1 : 0;
    }
    else if (stage === 'university') {
      if (score >= 74) {
        person.educationName = U.random(C.universities.slice(0, 5)).name;
        person.educationLevel = 3;
      } else if (score >= 56) {
        person.educationName = U.random(C.universities.slice(5, 11)).name;
        person.educationLevel = 3;
      } else if (score >= 37) {
        person.educationName = `${city}职业技术学院`;
        person.educationLevel = 2;
      } else {
        person.educationName = score >= 23 ? '高中毕业后直接就业' : '技能培训后进入社会';
        person.educationStage = 'workforce';
        person.educationLevel = score >= 23 ? 1 : 0;
      }
    } else {
      if (person.educationLevel >= 2 && !person.educationName.endsWith('毕业')) {
        person.educationName += '毕业';
      }
      person.educationStage = 'graduate';
    }
  }

  function career(state, person, age) {
    if (age >= 60 && person.job && !person.job.startsWith('退休')) {
      person.job = `退休${person.job}`;
      return;
    }
    if (person.populationResident && !person.job) return;
    const available = person.educationStage === 'workforce' || person.educationStage === 'graduate';
    if (age < 18 || !available || person.job || Math.random() > (age >= 22 ? 0.88 : 0.72)) return;

    /* ---- weighted career selection for female NPCs ---- */
    if (person.gender === '女') {
      const charm = person.charm || 50;
      const intelligence = Game.genetics?.growthModel
        ? 50 : 50; /* approximate: use education level as proxy */
      const eduLevel = person.educationLevel || 0;
      const isYoung = age >= 18 && age <= 28;
      const isPetite = ['娇小纤细', '小胸'].includes(person.bodyType || '');
      const isCute = ['青涩', '灵动', '明快'].includes(person.temperament || '');
      const hasCosplayInterest = (person.fashion?.cosplayInterest || 0) > 40;
      const hasProstituteFlag = person.sexWork?.isProstitute;

      /* Build weighted job pool */
      const pool = [];
      const jobs = Game.companyCatalog.jobsInCity(person.currentCity || person.metCity || state.location.city).filter((item) => (
        (item.education || 0) <= eduLevel
        && (!item.adultOnly || age >= 18)
        && (!item.recommendedGender || item.recommendedGender === person.gender)
      ));

      const weighted = jobs.map((job) => {
        let weight = 100;
        if (hasProstituteFlag && job.id === 'prostitute') weight = 400;
        else if (job.id === 'prostitute' && isYoung && eduLevel <= 1) weight = charm > 55 ? 180 : 120;
        else if (job.id === 'welfare' && isYoung && isCute) weight = charm > 50 ? 200 : 140;
        else if (job.id === 'welfare' && isYoung && isPetite) weight = 160;
        else if (job.id === 'idoltrainee' && isYoung && age <= 20 && charm > 55) weight = 180;
        else if (job.id === 'idol' && isYoung && charm > 60 && (person.fashion?.cosplayInterest || 0) > 30) weight = 150;
        else if (job.id === 'coser' && hasCosplayInterest) weight = 170;
        else if (job.id === 'vtuber' && isCute && isYoung) weight = 130;
        else if (job.id === 'beautyblog' && charm > 55) weight = 120;
        return { job, weight };
      });
      const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
      let cursor = Math.random() * totalWeight;
      const chosen = weighted.find((w) => (cursor -= w.weight) < 0);
      if (chosen) {
        const job = chosen.job;
        const id = job.id;
        person.job = job.name;
        person.company = job.company || '城市企业';
        person.companyId = job.companyId || '';
        person.departmentId = Game.workplace.departmentId(job);
        person.departmentName = Game.workplace.departmentName(job);
        person.careerRank = age >= 35 ? 2 : (age >= 27 ? 1 : 0);
        person.careerCity = job.cities?.length ? U.random(job.cities) : (person.metCity || state.location.city);

        /* Init NPC idol state */
        if (id === 'idoltrainee' || id === 'idol') {
          person.npcIdol = person.npcIdol || {
            stage: id === 'idoltrainee' ? 'trainee' : 'debuted',
            fans: U.between(100, id === 'idol' ? 5000 : 500),
            trainingMonths: id === 'idol' ? U.between(12, 36) : 0,
            debutAge: age,
          };
        }
        /* Tag prostitute */
        if (id === 'prostitute') {
          person.sexWork.isProstitute = true;
          person.sexWork.brothelVisits = person.sexWork.brothelVisits || 0;
        }
        return;
      }
    }

    /* fallback: standard random selection for male NPCs or if weighted pool empty */
    const job = U.random(Game.companyCatalog.jobsInCity(person.currentCity || person.metCity || state.location.city).filter((item) => (
      (item.education || 0) <= person.educationLevel
      && (!item.adultOnly || age >= 18)
      && (!item.recommendedGender || item.recommendedGender === person.gender)
    )));
    if (!job) return;
    person.job = job.name;
    person.company = job.company || '城市企业';
    person.companyId = job.companyId || '';
    person.departmentId = Game.workplace.departmentId(job);
    person.departmentName = Game.workplace.departmentName(job);
    person.careerRank = age >= 35 ? 2 : (age >= 27 ? 1 : 0);
    person.careerCity = job.cities?.length ? U.random(job.cities) : (person.metCity || state.location.city);
  }

  function updatePerson(state, person) {
    const age = U.personAge(state, person);
    Game.npcFashion.ensurePerson(state, person);
    const firstUpdate = person.lastLifeUpdateAge === null;
    const previousEducation = `${person.educationStage}|${person.educationName}`;
    education(state, person, age);
    const educationChanged = previousEducation !== `${person.educationStage}|${person.educationName}`;
    if (person.lastLifeUpdateAge === age && !educationChanged) {
      Game.npcCulturalStyle.update(state, person, age);
      syncGrowth(state, person);
      return;
    }
    person.lastLifeUpdateAge = age;
    career(state, person, age);
    Game.npcLifeSupport.relationships(state, person, age);
    if (person.gender !== '女' || age < 18 || firstUpdate || person.femaleYouthStyleStage) {
      Game.npcLifeSupport.appearance(person, age);
    }
    Game.npcCulturalStyle.update(state, person, age);
    syncGrowth(state, person);
  }

  function update(state) {
    Game.people.all(state).forEach((person) => {
      if (person.status === '健康') updatePerson(state, person);
    });
  }

  Game.npcLife = Object.freeze({ update, updatePerson, updateGrowth, syncGrowth });
}(window));
