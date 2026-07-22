(function initFamilyEvents(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function ensure(state) {
    state.familyEvents = Array.isArray(state.familyEvents) ? state.familyEvents.slice(-30) : [];
    state.familyEventsLastMonth = Number.isFinite(state.familyEventsLastMonth) ? state.familyEventsLastMonth : -6;
    return state.familyEvents;
  }

  function addEvent(state, title, text, tone) {
    ensure(state);
    state.familyEvents.push({ title: title, text: text, tone: tone || 'normal', month: state.totalMonths });
    state.familyEvents = state.familyEvents.slice(-30);
  }

  function monthly(state) {
    ensure(state);
    if (state.totalMonths - state.familyEventsLastMonth < 2) return;
    if (Math.random() > 0.25) return;

    var events = [
      tryFamilyDinner,
      tryGenerationConflict,
      tryRelativeVisit,
      tryChildRebellion,
    ];
    U.random(events)(state);
  }

  function tryFamilyDinner(state) {
    var living = state.family.filter(function (p) { return p.status === '健康'; });
    if (living.length < 2) return;
    if (state.money < 300) return;
    state.money = Math.max(0, state.money - 300);
    living.forEach(function (p) {
      p.affection = Math.min(100, (p.affection || 50) + U.between(2, 5));
    });
    addEvent(state, '家族聚餐', '一家人围坐在一起吃了顿饭。' + U.random(['父亲讲了个老笑话。', '母亲做了一道你小时候最爱的菜。', '大家都比平时多说了几句话。']), 'good');
    state.familyEventsLastMonth = state.totalMonths;
    if (Game.lifeDirector) Game.lifeDirector.addLog(state, '家族聚餐', '全家人在忙碌中抽空聚了一次。', 'good');
  }

  function tryGenerationConflict(state) {
    var adultChildren = state.family.filter(function (p) {
      return ['儿子', '女儿'].includes(p.relation) && p.status === '健康' && U.personAge(state, p) >= 18;
    });
    if (!adultChildren.length) return;
    var child = U.random(adultChildren);
    var up = child.upbringing || {};
    if (up.independence < 50 || up.care > 50) return;

    state.pendingDecision = {
      type: 'familyConflict',
      title: '代际冲突',
      text: child.name + '（' + U.personAge(state, child) + '岁）最近与你频繁发生争执。他/她认为你管得太多，渴望独立自主的生活。',
      options: [
        { value: 'gen-respect', label: '尊重选择——给予空间与自由' },
        { value: 'gen-strict', label: '坚持管教——你是为他/她好' },
        { value: 'gen-compromise', label: '折中协商——部分让步但守住底线' },
      ],
    };
    state.timeSpeed = 0;
    addEvent(state, '代际冲突', child.name + '与你发生了激烈争执。', 'warning');
    state.familyEventsLastMonth = state.totalMonths;
  }

  function tryRelativeVisit(state) {
    var living = state.family.filter(function (p) { return p.status === '健康'; });
    if (living.length < 2) return;
    var goodRoll = Math.random() < 0.6;
    if (goodRoll) {
      if (state.household) state.household.cohesion = Math.min(100, (state.household.cohesion || 50) + U.between(3, 8));
      addEvent(state, '亲戚来访', U.random(['远房表姐带来了一篮子家乡特产。', '舅舅一家路过城市顺道看望你们。', '外婆寄来了一封长信和自制的腌菜。']), 'good');
    } else {
      if (state.household) state.household.conflict = Math.min(100, (state.household.conflict || 10) + U.between(3, 6));
      addEvent(state, '亲戚来访', U.random(['远房叔叔又来借钱了，这次的理由听起来不太靠谱。', '某个亲戚在饭桌上说了一些让人不舒服的话。']), 'normal');
    }
    state.familyEventsLastMonth = state.totalMonths;
  }

  function tryChildRebellion(state) {
    var teens = state.family.filter(function (p) {
      var age = U.personAge(state, p);
      return ['儿子', '女儿'].includes(p.relation) && p.status === '健康' && age >= 12 && age <= 17;
    });
    if (!teens.length) return;
    var child = U.random(teens);
    var up = child.upbringing || {};
    if (up.health < 70 || up.care > 30) return;

    var isRunaway = Math.random() < 0.3;
    if (isRunaway) {
      addEvent(state, '子女离家出走', child.name + '留了一张纸条后消失了三天。你报了警，最后在隔壁城市的网吧里找到了他/她。', 'danger');
      child.affection = Math.max(0, (child.affection || 50) - U.between(10, 20));
      if (state.household) state.household.conflict = Math.min(100, (state.household.conflict || 10) + 15);
    } else {
      addEvent(state, '子女逃学', child.name + '连续一周没有去学校。班主任打来了电话。', 'warning');
      if (child.upbringing) child.upbringing.education = Math.max(0, (child.upbringing.education || 0) - U.between(3, 8));
    }
    state.familyEventsLastMonth = state.totalMonths;
  }

  function onMarriage(state, person) {
    addEvent(state, '婚礼', '你与' + (person ? person.name : '伴侣') + '举办了婚礼。两个家庭走到了一起。', 'milestone');
    var family = state.family.filter(function (p) { return p.status === '健康'; });
    family.forEach(function (p) {
      p.affection = Math.min(100, (p.affection || 50) + 3);
    });
  }

  function onDeath(state, person) {
    var name = person ? person.name : '家庭成员';
    addEvent(state, '丧礼', '你为' + name + '举办了葬礼。亲友们从各地赶来送别。', 'milestone');
    state.money = Math.max(0, state.money - U.between(2000, 8000));
    var family = state.family.filter(function (p) { return p.status === '健康' && p.id !== (person ? person.id : '') });
    family.forEach(function (p) {
      p.affection = Math.max(0, (p.affection || 50) - U.between(1, 3));
    });
  }

  function onAdoption(state, child) {
    addEvent(state, '收养', '你正式收养了' + (child ? child.name : '新成员') + '。从此他/她就是你的家人。', 'milestone');
  }

  function resolveGenerationConflict(state, value) {
    var child = state.family.filter(function (p) {
      return ['儿子', '女儿'].includes(p.relation) && p.status === '健康' && U.personAge(state, p) >= 18;
    }).sort(function (a, b) { return (b.upbringing ? b.upbringing.independence : 0) - (a.upbringing ? a.upbringing.independence : 0); })[0];
    if (!child) return { ok: true, message: '冲突已解决' };
    var up = child.upbringing || {};
    if (value === 'gen-respect') {
      up.independence = Math.min(100, up.independence + 15);
      up.care = Math.max(0, up.care - 5);
      child.affection = Math.min(100, (child.affection || 50) + 10);
      addEvent(state, '代际和解', '你决定尊重' + child.name + '的选择。他/她搬了出去，但每周都会打电话回来。', 'good');
    } else if (value === 'gen-strict') {
      up.independence = Math.max(0, up.independence - 10);
      child.affection = Math.max(0, (child.affection || 50) - 15);
      addEvent(state, '代际裂痕', '你坚持要继续管着' + child.name + '。他/她摔门而出，留下了一句"你永远不懂"。', 'warning');
    } else {
      up.independence = Math.min(100, up.independence + 5);
      child.affection = Math.min(100, (child.affection || 50) + 3);
      addEvent(state, '代际协商', '你和' + child.name + '坐下来谈了谈。各退一步，虽然不完全满意但至少关系没有破裂。', 'normal');
    }
    state.pendingDecision = null;
    state.timeSpeed = 1;
    return { ok: true, message: '冲突已处理' };
  }

  Game.familyEvents = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    addEvent: addEvent,
    onMarriage: onMarriage,
    onDeath: onDeath,
    onAdoption: onAdoption,
    resolveGenerationConflict: resolveGenerationConflict,
  });
}(window));
