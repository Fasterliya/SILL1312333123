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
    if (person.educationStage === stage && person.educationName) return;
    const city = person.metCity || state.hometown.city;
    person.educationStage = stage;
    if (stage === 'home') person.educationName = '家庭照护';
    else if (stage === 'kindergarten') person.educationName = `${city}向日葵幼儿园`;
    else if (stage === 'primary') person.educationName = `${city}启明小学`;
    else if (stage === 'middle') person.educationName = `${city}新城初级中学`;
    else if (stage === 'high') person.educationName = Math.random() < 0.82 ? `${city}实验中学` : `${city}职业高中`;
    else if (stage === 'university') {
      const school = U.random(C.universities.slice(2));
      person.educationName = Math.random() < 0.78 ? school.name : `${city}职业技术学院`;
    } else person.educationName = '已完成学业';
  }

  function career(state, person, age) {
    if (age >= 60 && person.job && !person.job.startsWith('退休')) {
      person.job = `退休${person.job}`;
      return;
    }
    if (age < 20 || person.job || Math.random() > (age >= 22 ? 0.86 : 0.35)) return;
    const job = U.random(C.jobs.filter((item) => (
      (age >= 22 || item.need <= 58) && (!item.recommendedGender || item.recommendedGender === person.gender)
    )));
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
    if (!person.npcMarried || age < 25 || age > 45 || person.childrenCount >= 3) return;
    const yearsMarried = age - (person.npcMarriedAtAge || age);
    if (yearsMarried >= 1 && Math.random() < 0.16) person.childrenCount += 1;
  }

  function appearance(person, age) {
    const girl = person.gender === '女';
    const sailorPreference = girl && age >= 12 && age <= 30 && Math.random() < 0.36;
    const schoolTops = girl
      ? ['水手服迷你裙', '水手服过膝裙', '西式制服百褶裙', '针织背心衬衫套装']
      : ['西式制服长裤', '学院西装长裤套装', '领带衬衫直筒裤', '校园运动外套'];
    let tops = ['品质日常', '针织开衫', '衬衫牛仔裤套装'];
    if (age < 3) tops = ['婴儿连体衣'];
    else if (age < 6) tops = ['彩色童装'];
    else if (age < 18) tops = schoolTops;
    else if (age < 22) tops = ['校园休闲', '复古学院背带裙', '棒球夹克校服套装'];
    else if (age >= 60) tops = ['舒适棉麻', '针织开衫', '北欧针织冬装'];
    else if (person.job) tops = ['通勤正装', '职业衬衫西装裤', '单排扣西装套装', '品质日常'];
    if (sailorPreference) tops = ['水手服迷你裙'];
    person.clothing.top = U.random(tops);
    person.clothing.socks = sailorPreference ? '白色连裤袜'
      : (age < 3 ? '婴儿袜' : (age < 18 ? '白色中筒袜' : '短棉袜'));
    person.clothing.shoes = age < 3 ? '婴儿软底鞋' : (age < 7 ? '魔术贴童鞋' : U.random(['帆布鞋', '白色运动鞋', '乐福鞋']));
    Game.geneticsGrowth.applyAppearance(person, person.gender, age);
  }

  function updatePerson(state, person) {
    const age = U.personAge(state, person);
    if (person.lastLifeUpdateAge === age) {
      syncGrowth(state, person);
      return;
    }
    person.lastLifeUpdateAge = age;
    education(state, person, age);
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

  function carryClassmates(state, oldSchool, newSchool, stage) {
    if (!oldSchool || ['家中', '已毕业'].includes(oldSchool)) return;
    const old = state.contacts.filter((item) => item.school === oldSchool && item.status === '健康');
    const ranked = old.sort((a, b) => (b.interactions - a.interactions) || (b.affection - a.affection));
    const keep = ranked.filter((item) => item.interactions > 0).slice(0, 6);
    ranked.filter((item) => !keep.includes(item)).slice(0, U.between(3, 7)).forEach((item) => keep.push(item));
    keep.forEach((person) => {
      person.school = newSchool;
      person.educationName = newSchool;
      person.educationStage = stage;
    });
  }

  Game.npcLife = Object.freeze({ update, updateGrowth, syncGrowth, carryClassmates });
}(window));
