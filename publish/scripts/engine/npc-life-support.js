(function initNpcLifeSupport(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function ensureChildByForty(state, person, age) {
    if (age < 40 || person.childrenCount > 0 || person.status !== '健康') return;
    person.childrenCount = 1;
    if (person.gender === '女') person.birthsGiven = Math.max(1, Number(person.birthsGiven) || 0);
    const spouse = Game.people.find(state, person.spouseId);
    if (spouse) spouse.childrenCount = Math.max(1, Number(spouse.childrenCount) || 0);
  }

  function relationships(state, person, age) {
    ensureChildByForty(state, person, age);
    if (['父亲', '母亲', '配偶'].includes(person.relation)) return;
    if (state.romance.partnerId === person.id || person.relation === '恋人') return;
    if (person.populationResident) return;
    if (!person.npcMarried && age >= 23
      && Math.random() < Game.demography.npcMarriageChance(state, person, age)) {
      person.npcMarried = true;
      person.npcMarriedAtAge = age;
      const locale = Game.worldCulture.profile(person.culture || state.location.country).locale;
      person.spouseName = U.makeName('', person.gender === '男' ? '女' : '男', locale);
    }
    if (person.spouseId && person.id > person.spouseId) return;
    if (!person.npcMarried || age < 25 || person.childrenCount >= 3) return;
    const yearsMarried = age - (person.npcMarriedAtAge || age);
    const spouse = Game.people.find(state, person.spouseId);
    const woman = person.gender === '女' ? person : (spouse?.gender === '女' ? spouse : null);
    const womanAge = woman ? U.personAge(state, woman) : age;
    const base = woman ? (Game.demography.ensureWoman(woman), woman.fertilityBase)
      : Game.demography.baseFertility(`${person.id}-spouse`);
    const chance = Game.demography.fertilityAt(base, womanAge, person.childrenCount);
    if (yearsMarried >= 1 && Math.random() * 100 < chance) {
      person.childrenCount = Math.min(3, person.childrenCount
        + Game.demography.twinCountAt(womanAge, person.childrenCount));
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
    else if (age < 6) tops = person.culture === '日本'
      ? ['日式幼稚园制服'] : ['彩色童装', '日式幼稚园制服'];
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
      : (age < 3 ? '婴儿袜' : (age < 18 ? '白色中筒袜' : '船袜'));
    person.clothing.shoes = age < 3 ? '婴儿软底鞋'
      : (age < 7 ? '魔术贴童鞋' : U.random(['帆布鞋', '白色运动鞋', '乐福鞋']));
    Game.geneticsGrowth.applyAppearance(person, person.gender, age);
  }

  Game.npcLifeSupport = Object.freeze({ relationships, appearance });
}(window));
