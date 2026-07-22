(function initMagicalGirlContract(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var CONTRACTS = [
    {
      familiar: '露娜',
      approach: '一个银发的少女出现在你的梦境中。她的瞳孔映着月光，声音轻柔但带着不容置疑的权威。',
      offer: '"你周围潜藏着非人之物。它们已经盯上了你——而你，拥有成为猎手的资质。与我签订契约，成为魔法少女吧。"',
      wishHint: '许下一个愿望，它将化为你的力量之源。但记住——灵魂宝石一旦碎裂，你将堕入永远的黑暗。',
      declineText: '你拒绝了她。银发少女叹了口气，身影在梦境中消散。但你隐约感到，那些黑暗中的视线并不会因此离开。',
    },
    {
      familiar: '星夜',
      approach: '深夜归途中，一只浑身漆黑的猫挡住了你的去路。它开口说话时，声音是中年男性的低沉。',
      offer: '"别害怕。我是来帮你的。这城市里游荡的东西，你已经有所察觉了吧？成为魔法少女，你就可以保护自己和所爱之人。"',
      wishHint: '你的愿望将成为契约的代价。这不是免费的午餐——但比起被幽诡吞噬，这已是很好的结局。',
      declineText: '你绕开了那只猫。它静静地注视着你消失在夜色中，发出一声似人非人的叹息。',
    },
    {
      familiar: '银铃',
      approach: '学校的更衣柜里出现了一枚陌生的戒指。当你触碰它的瞬间，耳边响起一阵清脆的银铃声。',
      offer: '"你听到了吗？那是时钟的倒计时。幽诡正在接近你在意的人。变身吧，魔法少女——这是你唯一能保护他们的方法。"',
      wishHint: '戒指会回应你最深的渴望。但也请记住：力量是双向的契约，使用它，就要付出代价。',
      declineText: '你把戒指放回了更衣柜。铃声消失了，但你的手指上留下了一道淡淡的印记。',
    },
  ];

  function checkContractTrigger(state) {
    if (!state || !state.supernatural) return false;
    if (state.magicalGirl && state.magicalGirl.active) return false;
    if (state.magicalGirl && state.magicalGirl.contracts && state.magicalGirl.contracts.length > 0) return false;
    var age = Game.content.age(state);
    if (state.gender !== '女' || age < 12 || age > 18) return false;
    var awareness = state.supernatural.playerAwareness || 0;
    if (awareness < 50) return false;
    if (state.supernatural.lastAttackMonth < state.totalMonths - 6) return false;
    return true;
  }

  function generateContract(state) {
    if (!checkContractTrigger(state)) return null;
    var contract = U.random(CONTRACTS);
    return {
      id: 'mg-contract-' + state.totalMonths,
      familiar: contract.familiar,
      approach: contract.approach,
      offer: contract.offer,
      wishHint: contract.wishHint,
      declineText: contract.declineText,
      month: state.totalMonths,
    };
  }

  function acceptContract(state, contract) {
    if (!contract) return { ok: false, message: '契约已经失效' };
    Game.magicalGirlCore.ensure(state);
    state.magicalGirl.active = true;
    state.magicalGirl.stage = '见习';
    state.magicalGirl.familiar = contract.familiar;
    state.magicalGirl.magicPower = 50;
    state.magicalGirl.soulGem = 100;
    state.magicalGirl.contracts.push({
      familiar: contract.familiar,
      month: state.totalMonths,
      accepted: true,
    });
    var job = Game.config.jobs.find(function (j) { return j.id === 'magicalgirl'; });
    if (job) {
      state.career.job = job.name;
      state.career.jobId = job.id;
      state.career.company = job.company;
      state.career.salary = 0;
      state.career.level = 0;
      state.career.exp = 0;
      state.career.performance = 10;
      state.career.lastPromotionMonth = state.totalMonths - 6;
      state.career.management = false;
      state.career.titleTrack = 'staff';
      state.career.titleRank = 0;
      state.career.lastTitleMonth = state.totalMonths - 12;
      state.career.lastRaiseMonth = state.totalMonths - 6;
      state.career.lastAutoRaiseMonth = state.totalMonths;
      state.career.jobStartMonth = state.totalMonths;
    }
    Game.lifeDirector.addLog(state, '魔法少女契约', '你与使魔「' + contract.familiar + '」缔结了契约。从现在开始，你就是一位魔法少女了。你的愿望将成为你最锋利的武器。', 'milestone');
    state.supernatural.playerAwareness = Math.min(100, state.supernatural.playerAwareness + 10);
    return { ok: true, message: '你成为了魔法少女。使魔「' + contract.familiar + '」将指引你的战斗。' };
  }

  function declineContract(state, contract) {
    if (!contract) return { ok: false, message: '契约已经失效' };
    state.magicalGirl.contracts.push({
      familiar: contract.familiar,
      month: state.totalMonths,
      accepted: false,
    });
    Game.lifeDirector.addLog(state, '拒绝契约', contract.declineText, 'warning');
    return { ok: true, message: '你拒绝了契约。但幽诡不会就此罢手。' };
  }

  Game.magicalGirlContract = Object.freeze({
    checkContractTrigger: checkContractTrigger,
    generateContract: generateContract,
    acceptContract: acceptContract,
    declineContract: declineContract,
  });
}(window));
