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

  function appearance(person, age, state) {
    var girl = person.gender === '女';
    var sailorPreference = girl && age >= 12 && age <= 30 && Math.random() < 0.36;
    if (sailorPreference && girl) {
      if (!person.clothing) person.clothing = {};
      person.clothing.top = '水手服迷你裙';
      person.clothing.socks = '白色连裤袜';
      person.clothing.shoes = '乐福鞋';
    }
    if (state && Game.appearancePipeline) {
      Game.appearancePipeline.apply(state, person, 'phase-style');
    } else {
      var tops = girl ? ['品质日常', '针织开衫', '针织开衫连衣裙', '宽松毛衣半身裙'] : ['品质日常', '针织开衫'];
      if (age < 3) tops = ['婴儿连体衣'];
      else if (age < 6) tops = person.culture === '日本' ? ['日式幼稚园制服'] : ['彩色童装'];
      else if (age < 18) tops = girl ? ['水手服迷你裙', '水手服过膝裙', '西式制服百褶裙'] : ['西式制服长裤', '领带衬衫直筒裤'];
      if (!person.clothing) person.clothing = {};
      person.clothing.top = tops[Math.floor(Math.random() * tops.length)];
      person.clothing.socks = age < 18 ? '白色中筒袜' : '船袜';
      person.clothing.shoes = age < 7 ? '白色运动鞋' : (Math.random() < 0.5 ? '帆布鞋' : '乐福鞋');
    }
    Game.geneticsGrowth.applyAppearance(person, person.gender, age, state);
  }

  Game.npcLifeSupport = Object.freeze({ relationships, appearance });
}(window));
