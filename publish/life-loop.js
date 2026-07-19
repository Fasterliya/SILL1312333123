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

  function goal(state) {
    const years = U.age(state);
    if (years < 3) return { title: '健康成长', detail: '保持健康达到80', value: state.stats.健康, target: 80 };
    if (years < 6) return { title: '探索世界', detail: '保持心情达到80', value: state.stats.心情, target: 80 };
    if (years < 18) {
      const exam = nextExam(state);
      const target = years < 12 ? 45 : (years < 15 ? 65 : 85);
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
        value: Math.max(0, years - 18), target: 4 };
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
