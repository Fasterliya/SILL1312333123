(function initDecisionRegistry(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  var registry = {
    'stress': {
      resolve: function (state, value) { return Game.stressSystem?.resolve?.(state, value); },
      render: function (state, d) { return Game.stressSystem?.render?.(state, d); },
    },
    'psychology': {
      resolve: function (state, value) { return Game.psychology?.resolve?.(state, value); },
      render: function (state, d) { return Game.psychology?.render?.(state, d); },
    },
    'nightmare_incest': {
      resolve: function (state, value) { return resolveNightmareIncest(state, value); },
      render: function (state, d) { return d.title ? { title: d.title, text: d.text, html: renderOptions(d.options) } : null; },
    },
    'lifeEvent': {
      resolve: function (state, value) { return Game.lifeEvents?.resolve?.(state, value); },
      render: function (state, d) { return Game.lifeEvents?.render?.(state, d); },
    },
    'stalking': {
      resolve: function (state, value) { return Game.conventionRisk?.resolve?.(state, value); },
      render: function (state, d) { return Game.conventionRisk?.render?.(state, d); },
    },
    'kept_proposal': {
      resolve: function (state, value) { return Game.welfareCareer?.resolve?.(state, value); },
      render: function (state, d) { return Game.welfareCareer?.render?.(state, d); },
    },
    'mental_breakdown': {
      resolve: function (state, value) { return Game.mentalBreakdown?.resolve?.(state, value); },
      render: function (state, d) { return Game.mentalBreakdown?.render?.(state, d); },
    },
    'boardVote': {
      resolve: function (state, value) { return Game.stockDirector?.resolve?.(state, value); },
      render: function (state, d) { return Game.stockDirector?.render?.(state, d); },
    },
    'familyConflict': {
      resolve: function (state, value) { return Game.familyConflict?.resolve?.(state, value); },
      render: function (state, d) { return Game.familyConflict?.render?.(state, d); },
    },
    'relationshipConflict': {
      resolve: function (state, value) { return Game.relationshipConflict?.resolve?.(state, value); },
      render: function (state, d) { return Game.relationshipConflict?.render?.(state, d); },
    },
    'idolTraineePlan': {
      resolve: function (state, value) { return Game.idolTraineeDecisions?.resolve?.(state, value); },
      render: function (state, d) { return Game.idolTraineeDecisions?.render?.(state, d); },
    },
    'idolTraineeReview': {
      resolve: function (state, value) { return Game.idolTraineeDecisions?.resolve?.(state, value); },
      render: function (state, d) { return Game.idolTraineeDecisions?.render?.(state, d); },
    },
    'idolCareerPlan': {
      resolve: function (state, value) { return Game.idolProjectDecisions?.resolve?.(state, value); },
      render: function (state, d) { return Game.idolProjectDecisions?.render?.(state, d); },
    },
    'idolProjectSelect': {
      resolve: function (state, value) { return Game.idolProjectDecisions?.resolve?.(state, value); },
      render: function (state, d) { return Game.idolProjectDecisions?.render?.(state, d); },
    },
    'idolProjectReview': {
      resolve: function (state, value) { return Game.idolProjectDecisions?.resolve?.(state, value); },
      render: function (state, d) { return Game.idolProjectDecisions?.render?.(state, d); },
    },
    'examPrep': {
      resolve: function (state, value) { return Game.educationExamPrep?.resolve?.(state, value); },
      render: function (state, d) { return Game.educationExamPrep?.render?.(state, d); },
    },
    'internship': {
      resolve: function (state, value) { Game.universityLife?.resolveInternship?.(state, value); return { ok: true, message: '' }; },
      render: function (state, d) { return d.title ? { title: d.title, text: d.text, html: renderOptions(d.options) } : null; },
    },
    'thesisRetry': {
      resolve: function (state, value) { state.education.nextThesisMonth = state.totalMonths + 6; return { ok: true, message: '已记录论文修改安排，六个月后重新答辩' }; },
      render: function (state, d) { return d.title ? { title: d.title, text: d.text, html: renderOptions(d.options) } : null; },
    },
    'idolTransition': {
      resolve: function (state, value) { return Game.idolSystem?.transitionCareer?.(state, value); },
      render: function (state, d) { return d.title ? { title: d.title, text: d.text, html: renderOptions(d.options) } : null; },
    },
    'succession': {
      resolve: function (state, value) { return Game.legacySystem?.resolve?.(state, value); },
      render: function (state, d) { return Game.legacySystem?.renderDecision?.(state, d); },
    },
    'mgContract': {
      resolve: function (state, value) {
        if (value === 'accept-mg') return Game.magicalGirlContract?.acceptContract?.(state);
        if (value === 'decline-mg') return Game.magicalGirlContract?.declineContract?.(state);
        return { ok: false, message: '未知选择' };
      },
      render: function (state, d) { return d.title ? { title: d.title, text: d.text, html: renderOptions(d.options) } : null; },
    },
    'highSchool': {
      resolve: function (state, value) { return resolveHighSchool(state, value); },
      render: function (state, d) {
        var schools = Game.schoolLines?.localHighSchools?.(state) || [];
        var opts = schools.filter(function (s) { return d.score >= Game.schoolLines?.highSchoolLine?.(state, s); })
          .map(function (s) {
            var name = Game.schoolLines?.schoolName?.(state, s) || s.name;
            return { value: name, label: name + ' · ' + (s.type || '') + ' · ' + (s.major || '') + ' · ' + Game.schoolLines?.highSchoolLine?.(state, s) + '分' };
          });
        return { title: '中考 ' + d.score + '分，填报本地高中', text: '', html: renderOptions(opts) };
      },
    },
    'track': {
      resolve: function (state, value) {
        var parts = value.split('|');
        state.education.track = parts[0];
        state.education.electives = parts[1] ? parts[1].split(',') : [];
        Game.eventBus.log(state, { title: '完成选科', text: '你选择了' + parts[0] + '，再选' + (parts[1] || '').replace(',', '、') + '。', tone: 'milestone' });
        return { ok: true, message: '选科完成' };
      },
      render: function (state, d) {
        var combos = [];
        ['物理', '历史'].forEach(function (t) {
          ['化学,生物', '化学,地理', '化学,政治', '生物,地理', '生物,政治', '地理,政治'].forEach(function (e) {
            combos.push({ value: t + '|' + e, label: t + ' + ' + e.replace(',', '、') });
          });
        });
        return { title: '高考选科', text: '物理/历史二选一，再从化学、生物、地理、政治中选两门。', html: renderOptions(combos) };
      },
    },
    'volunteer': {
      resolve: function (state, value) {
        if (value === 'workforce') return enterWorkforceFallback(state);
        return Game.admissions?.enroll?.(state, value) || { ok: false, message: '录取系统未加载' };
      },
      render: function (state, d) { return Game.admissions?.render?.(state, d); },
    },
    'vocationalExit': {
      resolve: function (state, value) {
        if (value === 'vocational-work') return enterWorkforceFallback(state);
        return Game.admissions?.enroll?.(state, value) || { ok: false, message: '录取系统未加载' };
      },
      render: function (state, d) {
        return { title: '职高毕业去向', text: '', html: renderOptions([
          { value: 'vocational-work', label: '直接就业 · 技能岗位与自由职业' },
          { value: 'vocational-college', label: '高职升学 · 城市职业学院' },
        ]) };
      },
    },
  };

  function renderOptions(opts) {
    if (!opts || !opts.length) return '<p class="empty-state">暂无可选项</p>';
    return '<div class="decision-options">' + opts.map(function (o) {
      return '<button type="button" data-choice="' + o.value + '" style="display:block;width:100%;min-height:36px;padding:6px 10px;margin:4px 0;border:1px solid var(--ui-line);border-radius:4px;background:var(--ui-paper);font-size:10px;text-align:left;cursor:pointer">' + (o.label || o.value) + '</button>';
    }).join('') + '</div>';
  }

  function resolveNightmareIncest(state, value) {
    var incestFamily = state.supernatural?._lastIncestFamily;
    var theOther = incestFamily ? (Game.people?.find?.(state, incestFamily.maleId === 'player-profile' ? incestFamily.femaleId : incestFamily.maleId)) : null;
    var oName = theOther ? theOther.name : '那个人';
    var U = Game.content;
    if (value === 'resist') {
      state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(5, 10));
      state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(10, 18));
      state.stats['健康'] = Math.max(10, state.stats['健康'] - U.between(3, 7));
      Game.eventBus.log(state, { title: '抵抗梦魇', text: '你咬破了自己的嘴唇。血的味道让你短暂地清醒——你推开了' + oName + '。梦魇的触手从你的意识中抽离，留下了一阵深入骨髓的寒意。你赢了——但你不确定下次还能不能赢。', tone: 'warning' });
      return { ok: true, message: '你用疼痛守住了一线清醒。' };
    }
    state.supernatural.spiritCorruption = Math.min(100, state.supernatural.spiritCorruption + U.between(15, 25));
    state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(5, 10));
    if (Game.relationshipSecretsCore && incestFamily) {
      var record = Game.relationshipSecretsCore.addRecord(state, { kind: '梦魇乱伦（玩家卷入）', participants: [incestFamily.maleId, incestFamily.femaleId], known: true, note: '玩家与' + oName + '（' + (incestFamily.label || '') + '）在梦魇中跨越了乱伦禁忌' });
      var playerPerson = Game.people.find(state, 'player-profile');
      if (playerPerson && incestFamily.femaleId === 'player-profile') Game.relationshipSecretsCore.schedulePregnancy(state, playerPerson, theOther, record);
      else if (theOther && incestFamily.femaleId === theOther.id) { var playerMale = Game.people.find(state, 'player-profile'); Game.relationshipSecretsCore.schedulePregnancy(state, theOther, playerMale || theOther, record); }
    }
    Game.eventBus.log(state, { title: '沉入梦魇', text: '你放弃了抵抗。' + oName + '的身体和你的身体在梦魇的潮水中纠缠在一起——你分不清是谁的呼吸、谁的体温、谁的愧疚。当意识恢复时，一切都已发生。你看着' + oName + '，你们的目光交汇——然后同时移开了。', tone: 'danger' });
    return { ok: true, message: '你在梦魇中沉沦了。' };
  }

  function resolveHighSchool(state, value) {
    var schools = Game.schoolLines?.localHighSchools?.(state) || [];
    var school = schools.find(function (s) { return (Game.schoolLines?.schoolName?.(state, s) || s.name) === value; }) || schools[schools.length - 1];
    var line = Game.schoolLines?.highSchoolLine?.(state, school);
    var d = state.pendingDecision;
    if (d && d.score < line && schools.some(function (s) { return d.score >= Game.schoolLines?.highSchoolLine?.(state, s); })) {
      return { ok: false, message: '中考分数未达到该校当年录取线' };
    }
    var schoolName = Game.schoolLines?.schoolName?.(state, school) || value;
    var vocational = school.program === 'vocational';
    Game.social?.enterSchool?.(state, schoolName, vocational ? 'vocational' : 'high', 5);
    state.education.highSchoolType = school.type;
    state.education.vocationalMajor = vocational ? school.major : null;
    state.education.path = vocational ? '职业高中 · ' + school.major : '普通高中';
    state.education.track = vocational ? '职教' : null;
    state.education.electives = [];
    Game.eventBus.log(state, { title: '高中录取', text: '你填报并被' + schoolName + '录取，学校类型为' + school.type + '。', tone: 'milestone' });
    return { ok: true, message: '已录取' };
  }

  function enterWorkforceFallback(state) {
    if (state.career) state.career.job = '';
    Game.eventBus.log(state, { title: '进入职业社会', text: '不升大学 · 直接进入职业社会', tone: 'milestone' });
    return { ok: true, message: '已进入职业社会' };
  }

  Object.keys(registry).forEach(function (type) {
    Game.eventBus.register(type, registry[type]);
  });

  Game.decisionRegistry = Object.freeze(registry);
}(window));
