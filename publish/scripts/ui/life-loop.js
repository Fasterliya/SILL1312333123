(function initLifeLoop(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const el = {};

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function nextExam(state) {
    const month = state.month;
    const candidates = [1, 6].map((target) => {
      const distance = (target - month + 12) % 12;
      return { target, distance: distance || 12 };
    }).sort((a, b) => a.distance - b.distance);
    return candidates[0];
  }

  function decisionGoal(state) {
    const type = state.pendingDecision?.type;
    const goals = {
      highSchool: ['完成高中志愿', '根据中考成绩选择高中或职业教育方向'],
      track: ['完成高考选科', '选择主科与两门再选科目'],
      volunteer: ['完成大学志愿', '筛选院校并选择具体专业'],
      vocationalExit: ['选择职高毕业去向', '决定直接就业或继续高职升学'],
      lifeEvent: ['处理人生事件', '完成当前事件选择后继续推进时间'],
      succession: ['选择下一代角色', '确认下一代人生后继续时间'],
    };
    const item = goals[type];
    return item ? { title: item[0], detail: item[1], value: 0, target: 1 } : null;
  }

  function goal(state) {
    const years = U.age(state);
    const pending = decisionGoal(state);
    if (pending) return pending;
    if (years < 3) return { title: '健康成长', detail: '保持健康达到80', value: state.stats.健康, target: 80 };
    if (years < 6) return { title: '探索世界', detail: '将压力维持在低位',
      value: Math.max(0, 100 - Game.stressSystem.ensure(state).value), target: 70 };
    if (['primary', 'middle', 'high', 'vocational'].includes(state.education.schoolStage)) {
      const exam = nextExam(state);
      const target = state.education.schoolStage === 'primary' ? 45
        : (state.education.schoolStage === 'middle' ? 65 : 85);
      return {
        title: `${exam.distance}个月后${exam.target === 1 ? '期末考试' : '期中考试'}`,
        detail: `综合备考度目标 ${target}`,
        value: Game.educationSystem.readiness(state),
        target,
      };
    }
    if (state.education.university && !state.education.graduated) {
      return { title: '完成大学学业',
        detail: `${state.education.university} · ${state.education.major || '专业学习'}`,
        value: Game.timeSystem.educationElapsed(state),
        target: state.education.durationMonths || 48 };
    }
    if (years >= 60 && state.health.retired) {
      return { title: '经营晚年生活', detail: '保持健康并维系家庭关系',
        value: state.stats.健康, target: 75 };
    }
    const growing = state.family.find((person) => ['儿子', '女儿'].includes(person.relation)
      && U.personAge(state, person) < 18 && person.status === '健康');
    if (growing && growing.upbringing.care < 70) {
      return { title: `陪伴${growing.name}成长`, detail: '关爱成长达到70',
        value: growing.upbringing.care, target: 70 };
    }
    if (!state.career.job) return { title: '寻找人生方向', detail: '进入求职菜单并获得一份工作', value: 0, target: 1 };
    if (Game.creatorCareer.isCreator(state) && state.creator.followers < 10000) {
      return { title: '扩大频道影响力', detail: '粉丝达到10000',
        value: state.creator.followers, target: 10000 };
    }
    if (state.career.performance < 70) {
      return { title: '积累职业表现', detail: '绩效达到70后申请晋升', value: state.career.performance, target: 70 };
    }
    return { title: '建立生活储备', detail: '现金达到10万元', value: state.money, target: 100000 };
  }

  function render(state) {
    const currentGoal = goal(state);
    const percent = U.clamp(Math.round(currentGoal.value / currentGoal.target * 100), 0, 100);
    el.goal.innerHTML = `<div><span>近期目标</span><strong>${escape(currentGoal.title)}</strong>
      <small>${escape(currentGoal.detail)}</small></div><b>${percent}%</b>
      <i><em style="width:${percent}%"></em></i>`;
  }

  function init() {
    el.goal = document.getElementById('goalPanel');
    if (!el.goal) throw new Error('人生循环界面结构不完整');
  }

  Game.lifeLoop = Object.freeze({ init, render });
}(window));
