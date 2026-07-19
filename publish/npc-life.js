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
    updateGrowth(person, U.personAge(state, person));
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
    const city = person.metCity || state.hometown.city;
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
    const available = person.educationStage === 'workforce' || person.educationStage === 'graduate';
    if (age < 18 || !available || person.job || Math.random() > (age >= 22 ? 0.88 : 0.72)) return;
    const job = U.random(C.jobs.filter((item) => (
      (item.education || 0) <= person.educationLevel
      && (!item.adultOnly || age >= 18)
      && (!item.recommendedGender || item.recommendedGender === person.gender)
    )));
    if (!job) return;
    person.job = job.name;
    person.company = job.company || '城市企业';
    person.careerCity = job.cities?.length ? U.random(job.cities) : (person.metCity || state.location.city);
  }

  function relationships(state, person, age) {
    if (['父亲', '母亲', '配偶'].includes(person.relation)) return;
    if (state.romance.partnerId === person.id || person.relation === '恋人') return;
    if (!person.npcMarried && age >= 24 && Math.random() < Math.min(0.22, 0.055 + (age - 24) * 0.009)) {
      person.npcMarried = true;
      person.npcMarriedAtAge = age;
      person.spouseName = U.makeName('', person.gender === '男' ? '女' : '男');
    }
    if (person.spouseId && person.id > person.spouseId) return;
    if (!person.npcMarried || age < 25 || age > 45 || person.childrenCount >= 3) return;
    const yearsMarried = age - (person.npcMarriedAtAge || age);
    if (yearsMarried >= 1 && Math.random() < 0.16) {
      person.childrenCount += 1;
      const spouse = Game.people.find(state, person.spouseId);
      if (spouse) spouse.childrenCount = person.childrenCount;
    }
  }

  function appearance(person, age) {
    const girl = person.gender === '女';
    const sailorPreference = girl && age >= 12 && age <= 30 && Math.random() < 0.36;
    const schoolTops = girl
      ? ['水手服迷你裙', '水手服过膝裙', '西式制服百褶裙', '针织背心衬衫套装']
      : ['西式制服长裤', '学院西装长裤套装', '领带衬衫直筒裤', '校园运动外套'];
    let tops = girl
      ? ['品质日常', '针织开衫', '针织开衫连衣裙', '宽松毛衣半身裙', '衬衫牛仔裤套装']
      : ['品质日常', '针织开衫', '衬衫牛仔裤套装'];
    if (age < 3) tops = ['婴儿连体衣'];
    else if (age < 6) tops = ['彩色童装'];
    else if (age < 18) tops = schoolTops;
    else if (age < 22) tops = girl
      ? ['校园休闲', '复古学院背带裙', '针织开衫连衣裙', '棒球夹克校服套装']
      : ['校园休闲', '棒球夹克校服套装', '衬衫牛仔裤套装'];
    else if (age >= 60) tops = ['舒适棉麻', '针织开衫', '北欧针织冬装'];
    else if (person.job) tops = girl
      ? ['通勤正装', '职业衬衫铅笔裙', '都市西装连衣裙', '法式小香套装', '职业衬衫西装裤']
      : ['通勤正装', '职业衬衫西装裤', '单排扣西装套装', '品质日常'];
    if (sailorPreference) tops = ['水手服迷你裙'];
    person.clothing.top = U.random(tops);
    person.clothing.socks = sailorPreference ? '白色连裤袜'
      : (age < 3 ? '婴儿袜' : (age < 18 ? '白色中筒袜' : '短棉袜'));
    person.clothing.shoes = age < 3 ? '婴儿软底鞋' : (age < 7 ? '魔术贴童鞋' : U.random(['帆布鞋', '白色运动鞋', '乐福鞋']));
    Game.geneticsGrowth.applyAppearance(person, person.gender, age);
  }

  function updatePerson(state, person) {
    const age = U.personAge(state, person);
    const previousEducation = `${person.educationStage}|${person.educationName}`;
    education(state, person, age);
    const educationChanged = previousEducation !== `${person.educationStage}|${person.educationName}`;
    if (person.lastLifeUpdateAge === age && !educationChanged) {
      syncGrowth(state, person);
      return;
    }
    person.lastLifeUpdateAge = age;
    career(state, person, age);
    relationships(state, person, age);
    appearance(person, age);
    syncGrowth(state, person);
  }

  function update(state) {
    Game.people.all(state).forEach((person) => {
      if (person.status === '健康') updatePerson(state, person);
    });
  }

  Game.npcLife = Object.freeze({ update, updateGrowth, syncGrowth });
}(window));
