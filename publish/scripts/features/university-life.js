(function initUniversityLife(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function isUniversityStudent(state) {
    return state.education.schoolStage === 'university';
  }

  function monthly(state) {
    if (!isUniversityStudent(state)) return;

    state.education.universityMonth = (state.education.universityMonth || 0) + 1;
    state.education.universityYear = Math.ceil(state.education.universityMonth / 12);

    var month = state.education.universityMonth;

    // Year 3 (months 25-36): 15% chance per month to trigger internship
    if (month >= 25 && month <= 36 && !state.education._internshipTriggered) {
      if (Math.random() < 0.15) {
        state.education._internshipTriggered = true;
        triggerInternship(state);
      }
    }

    // Year 4 (month 42): trigger thesis
    if (month === 42 && !state.education._thesisTriggered) {
      state.education._thesisTriggered = true;
      triggerThesis(state);
    }

    // Thesis retry: re-trigger when 6-month wait has elapsed and old decision was dismissed
    if (state.education.nextThesisMonth && state.totalMonths >= state.education.nextThesisMonth
        && !state.education.graduated && !state.pendingDecision) {
      triggerThesis(state);
    }
  }

  function triggerInternship(state) {
    state.pendingDecision = {
      type: 'internship',
      title: '大三实习招聘',
      text: '各大公司来校园招聘。选择一个方向——',
      options: [
        {value:'bigtech', label:'冲刺大厂 (风险高, 成功起薪x1.3)'},
        {value:'normal', label:'选择普通公司 (稳妥, +5经验)'},
        {value:'skip', label:'不找实习 (省钱省时间)'},
      ]
    };
  }

  function triggerThesis(state) {
    if (state.stats.智力 > 25) {
      state.education.graduated = true;
      state.education.nextThesisMonth = 0;
      state.pendingDecision = null;
      Game.lifeDirector.addLog(state, '论文答辩', '论文答辩通过！你正式毕业了。', 'milestone');
    } else {
      state.education.nextThesisMonth = state.totalMonths + 6;
      state.pendingDecision = {
        type: 'thesisRetry',
        title: '论文答辩未通过',
        text: '你的论文准备不足，答辩委员会要求修改后重新答辩。6个月后可重新申请。',
        options: [{value:'ok', label:'知道了'}]
      };
      Game.lifeDirector.addLog(state, '论文答辩', '答辩未通过。导师要求修改论文，6个月后重新答辩。', 'normal');
    }
  }

  function resolveInternship(state, value) {
    if (value === 'bigtech') {
      var university = Game.config.universities.find(function(school) {
        return school.id === state.education.universityId || school.name === state.education.university;
      });
      var prestige = university && Game.schoolLines ? Game.schoolLines.institutionResource(university) : 50;
      var intellect = state.stats.智力 || 50;
      var successRate = U.clamp(prestige / 100 * 0.45 + intellect / 100 * 0.35 + 0.05, 0.1, 0.9);

      if (Math.random() < successRate) {
        state.career._internshipBonus = true;
        Game.lifeDirector.addLog(state, '实习结果', '成功拿下大厂实习offer！未来求职时起薪将提升30%。', 'good');
      } else {
        state.stats.心情 = U.clamp((state.stats.心情 || 50) - 5, 0, 100);
        Game.lifeDirector.addLog(state, '实习结果', '大厂面试失败，未获得实习机会。', 'normal');
      }
    } else if (value === 'normal') {
      state.career.exp = (state.career.exp || 0) + 5;
      state.stats.心情 = U.clamp((state.stats.心情 || 50) + 2, 0, 100);
      Game.lifeDirector.addLog(state, '实习结果', '在普通公司完成实习，积累了宝贵的工作经验。', 'good');
    }
    // skip: nothing happens
  }

  function render(state) {
    return '';
  }

  Game.universityLife = Object.freeze({
    isUniversityStudent, monthly, triggerInternship, triggerThesis, resolveInternship, render,
  });
}(window));
