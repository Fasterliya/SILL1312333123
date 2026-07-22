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
    Game.characterAttributes.ensurePerson(person, age);
    Game.femaleYouthStyle.apply(person, person.gender, age);
  }

  function schoolQualityFor(person, city) {
    const tier = person.educationStage === 'high' || person.educationName?.includes('实验')
      || person.educationName?.includes('示范') ? 72 : person.educationName?.includes('职业')
      ? 55 : person.educationName?.includes('培训') ? 40 : 62;
    return U.clamp(tier + U.between(-4, 4), 30, 90);
  }

  function accumulateYear(state, person, age, city) {
    if (age < 6 || age > 18) return;
    if (person.droppedOut || person.educationStage === 'dropout') return;
    const currentYear = Number(state.year);
    if (person._lastEducationYear === currentYear) return;
    person._lastEducationYear = currentYear;
    person._educationAccumulated = (person._educationAccumulated || 0) + 1;
    const learningCheck = Game.learningAttribute.checkValue(
      Game.characterAttributes.personValue(person, '学识'),
    );
    const habit = Number(person.studyHabit) || 50;
    const upbringing = Number(person.upbringing?.education ?? 20);
    const quality = schoolQualityFor(person, city);
    const variation = U.between(-4, 4) + U.between(-3, 3);
    const yearly = learningCheck * 0.22 + (habit / 100) * 8 + upbringing * 0.12
      + quality * 0.10 + variation;
    person.educationProgress = U.clamp(
      (person.educationProgress || 0) + yearly, 0, 400,
    );
  }

  function educationPath(person, age) {
    const progress = Number(person.educationProgress) || 0;
    const wealth = Number(person.upbringing?.wealthFamily ?? 30);
    const wealthBoost = wealth >= 70 ? 12 : wealth >= 45 ? 6 : 0;
    const adjustedProgress = progress + wealthBoost;
    const learningCheck = Game.learningAttribute.checkValue(
      Game.characterAttributes.personValue(person, '学识'),
    );
    if (adjustedProgress >= 260 || (learningCheck >= 35 && adjustedProgress >= 220)) {
      return { track: 'elite', label: '精英学术' };
    }
    if (adjustedProgress >= 170) {
      return { track: 'academic', label: '普通学术' };
    }
    if (adjustedProgress >= 90) {
      return { track: 'vocational', label: '职业路径' };
    }
    return { track: 'early_work', label: '早就业' };
  }

  function assignHighSchool(person, city, path) {
    if (path.track === 'elite') {
      if (Math.random() < 0.6) {
        person.educationName = `${city}第一中学`;
        person.educationLevel = 1;
        return;
      }
    }
    if (path.track === 'elite' || path.track === 'academic') {
      person.educationName = `${city}实验中学`;
      person.educationLevel = 1;
      return;
    }
    if (path.track === 'vocational') {
      person.educationName = `${city}现代服务职业高中`;
      person.educationLevel = 1;
      return;
    }
    person.educationName = `${city}职业技能培训中心`;
    person.educationLevel = 0;
  }

  function assignUniversity(person, city, path) {
    if (path.track === 'elite') {
      const top = C.universities.slice(0, 5);
      person.educationName = U.random(top).name;
      person.educationLevel = 3;
    } else if (path.track === 'academic') {
      const mid = C.universities.slice(5, 11);
      person.educationName = U.random(mid).name;
      person.educationLevel = 3;
    } else if (path.track === 'vocational') {
      person.educationName = `${city}职业技术学院`;
      person.educationLevel = 2;
    } else {
      person.educationName = person.academicScore >= 23
        ? '高中毕业后直接就业'
        : '技能培训后进入社会';
      person.educationStage = 'workforce';
      person.educationLevel = person.academicScore >= 23 ? 1 : 0;
    }
  }

  function education(state, person, age) {
    const [stage] = schoolStage(age);
    Game.educationSystem.ensurePerson(person, age);
    const city = person.currentCity || person.metCity || state.location.city || state.hometown.city;
    if (person.droppedOut) return;
    if (person.school === state.education.school && !['家中', '已毕业'].includes(person.school)) {
      accumulateYear(state, person, age, city);
      if (Game.npcEducationPaths.maybeDropout(state, person, age, city)) return;
      person.educationStage = state.education.schoolStage;
      person.educationName = person.school;
      return;
    }
    if (age >= 18 && age < 22 && person.educationStage === 'workforce') return;

    accumulateYear(state, person, age, city);
    if (Game.npcEducationPaths.maybeDropout(state, person, age, city)) return;

    const rebalance = person.educationBalanceVersion !== 3
      && ['high', 'university'].includes(stage);
    if (person.educationStage === stage && person.educationName && !rebalance) return;

    const path = educationPath(person, age);
    person.educationTrack = path.track;
    person.academicScore = Math.round(U.clamp(person.educationProgress / 4, 0, 100));
    person.educationBalanceVersion = 3;
    person.educationStage = stage;

    if (stage === 'home') person.educationName = '家庭照护';
    else if (stage === 'kindergarten') person.educationName = `${city}向日葵幼儿园`;
    else if (stage === 'primary') person.educationName = `${city}启明小学`;
    else if (stage === 'middle') person.educationName = `${city}新城初级中学`;
    else if (stage === 'high') assignHighSchool(person, city, path);
    else if (stage === 'university') assignUniversity(person, city, path);
    else {
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

    /* ---- weighted creator-career selection ---- */
    const feminineCandidate = person.gender === '男'
      && Game.companyCatalog.jobsInCity(person.currentCity || person.metCity || state.location.city)
        .some((item) => Game.npcFemboyCareer?.allowsJob(person, item, age));
    if (person.gender === '女' || feminineCandidate) {
      const eduLevel = person.educationLevel || 0;
      const jobs = Game.companyCatalog.jobsInCity(person.currentCity || person.metCity || state.location.city).filter((item) => (
        (item.education || 0) <= eduLevel
        && (!item.adultOnly || age >= 18)
        && (!item.recommendedGender || item.recommendedGender === person.gender
          || Game.npcFemboyCareer?.allowsJob(person, item, age))
        && Game.jobMarket.canNpcEnter(state, person, item)
      ));

      const weighted = jobs.map((job) => ({
        job, weight: Game.npcEducationPaths.jobWeight(person, job, age),
      }));
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
        Game.npcFemboyCareer?.onJobAssigned(state, person, job);

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
      && (!item.recommendedGender || item.recommendedGender === person.gender
        || Game.npcFemboyCareer?.allowsJob(person, item, age))
      && Game.jobMarket.canNpcEnter(state, person, item)
    )));
    if (!job) return;
    person.job = job.name;
    person.company = job.company || '城市企业';
    person.companyId = job.companyId || '';
    person.departmentId = Game.workplace.departmentId(job);
    person.departmentName = Game.workplace.departmentName(job);
    person.careerRank = age >= 35 ? 2 : (age >= 27 ? 1 : 0);
    person.careerCity = job.cities?.length ? U.random(job.cities) : (person.metCity || state.location.city);
    Game.npcFemboyCareer?.onJobAssigned(state, person, job);
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
