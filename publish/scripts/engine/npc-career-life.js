(function initNpcCareerLife(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- individual NPC career monthly handlers ---- */

  function monthlyProstitute(state, person) {
    const age = U.personAge(state, person);
    if (age > 50) { person.job = '退休妓女'; return; }
    const income = Math.round(U.between(1800, 5000));
    person.monthlyIncome = (person.monthlyIncome || 0) + income;
    /* health risk */
    if (state.totalMonths % 6 === 0 && Math.random() < 0.15) {
      /* silent health drain handled by general NPC systems */
    }
  }

  function monthlyWelfare(state, person) {
    const age = U.personAge(state, person);
    if (age > 40) { person.job = '退休福利姬'; return; }
    person.npcCreator = person.npcCreator || { followers: U.between(800, 5000) };
    person.npcCreator.followers += Math.round(person.npcCreator.followers * 0.03 + U.between(-20, 60));
    const income = Math.round(person.npcCreator.followers * 0.04);
    person.monthlyIncome = (person.monthlyIncome || 0) + income;
    if (Math.random() < 0.05) {
      person.npcCreator.followers = Math.max(0, Math.round(person.npcCreator.followers * 0.85));
    }
  }

  function monthlyIdol(state, person) {
    const age = U.personAge(state, person);
    person.npcIdol = person.npcIdol || { stage: 'trainee', fans: 500, trainingMonths: 0 };
    const idol = person.npcIdol;

    if (idol.stage === 'trainee') {
      idol.trainingMonths += 1;
      idol.fans += Math.round(idol.fans * 0.03 + U.between(-10, 30));
      if (idol.trainingMonths >= 18 && idol.fans >= 2000) {
        idol.stage = 'debuted';
        const idolJob = Game.config.jobs.find((j) => j.id === 'idol');
        if (idolJob) { person.job = idolJob.name; person.company = idolJob.company || '偶像事务所'; }
      }
    }

    if (idol.stage !== 'trainee' && idol.stage !== 'retired') {
      idol.fans += Math.round(idol.fans * 0.04 + U.between(-60, 150));
    }

    /* idol decline at 28, forced retire at 32 */
    if (age >= 28) idol.fans = Math.max(0, Math.round(idol.fans * 0.9));
    if (age >= 32 && idol.fans < 1000) { idol.stage = 'retired'; person.job = '前偶像'; }

    const income = Math.round(idol.fans * 0.02);
    person.monthlyIncome = (person.monthlyIncome || 0) + income;
  }

  function monthlyCosplayer(state, person) {
    const income = Math.round(U.between(500, 2000));
    person.monthlyIncome = (person.monthlyIncome || 0) + income;
    if (state.totalMonths % 3 === 0 && Math.random() < 0.3) {
      person.monthlyIncome += U.between(800, 3000);
    }
  }

  function monthlyVtuber(state, person) {
    person.npcCreator = person.npcCreator || { followers: U.between(500, 8000) };
    person.npcCreator.followers += Math.round(person.npcCreator.followers * 0.02 + U.between(-30, 80));
    const income = Math.round(person.npcCreator.followers * 0.03);
    person.monthlyIncome = (person.monthlyIncome || 0) + income;
  }

  function monthlyBeautybLogger(state, person) {
    person.npcCreator = person.npcCreator || { followers: U.between(300, 6000) };
    person.npcCreator.followers += Math.round(person.npcCreator.followers * 0.025 + U.between(-20, 60));
    const income = Math.round(person.npcCreator.followers * 0.03);
    person.monthlyIncome = (person.monthlyIncome || 0) + income;
  }

  /* ---- main monthly dispatcher ---- */

  function monthly(state) {
    Game.people.all(state).forEach((person) => {
      if (person.status !== '健康') return;
      if (U.personAge(state, person) < 18) return;
      person.monthlyIncome = 0;

      const job = person.job || '';
      if (job.includes('妓女') && !job.includes('退休')) monthlyProstitute(state, person);
      else if (job === '福利姬') monthlyWelfare(state, person);
      else if (job === '偶像艺人' || job.includes('偶像练习生')) monthlyIdol(state, person);
      else if (job === '职业Coser') monthlyCosplayer(state, person);
      else if (job === '虚拟主播') monthlyVtuber(state, person);
      else if (job === '美妆博主') monthlyBeautybLogger(state, person);
    });
  }

  Game.npcCareerLife = Object.freeze({ monthly });
}(window));
