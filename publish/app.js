(function bootstrap(root) {
  'use strict';

  const Game = root.LifeGame || {};
  const U = Game.content;
  let state = null;
  let busy = false;

  Game.sdkAdapter.progress('start', '正在生成人生');

  function save() {
    return Game.storage.save(state).catch((err) => {
      console.error('存档失败:', err?.message, err?.stack);
    });
  }

  function refresh() {
    Game.view.render(state);
    Game.actions.renderHouseActions();
    Game.actions.renderDecision();
  }

  function advance(months) {
    if (busy || state.pendingDecision || state.gameOver) return;
    busy = true;
    Game.lifeDirector.advance(state, months);
    refresh();
    save().finally(() => { busy = false; });
  }

  function activity(type) {
    if (state.monthActionTaken || state.gameOver) {
      Game.view.showToast('本月已经安排过主要活动', 'warning');
      return;
    }
    const map = {
      study: ['专注学习', '你认真学习，为下一次考试积累实力。', ['智力', 2], ['心情', -2]],
      sport: ['锻炼身体', '一次痛快的运动让身体更有力量。', ['体魄', 3], ['健康', 2]],
      social: ['主动社交', '你和身边的人聊了很久，关系更自然。', ['魅力', 2], ['心情', 2]],
      rest: ['好好休息', '你放慢脚步，给自己留出喘息空间。', ['心情', 5], ['健康', 1]],
    };
    const item = map[type];
    if (!item) return;
    item.slice(2).forEach(([name, delta]) => {
      state.stats[name] = U.clamp(state.stats[name] + delta, 0, 100);
    });
    if (type === 'study') state.education.study += 7;
    state.monthActionTaken = true;
    Game.lifeDirector.addLog(state, item[0], item[1], 'good');
    Game.view.showToast(item[0], 'good');
    refresh();
    save();
  }

  function bind() {
    Game.view.el.monthBtn.addEventListener('click', () => advance(1));
    Game.view.el.yearBtn.addEventListener('click', () => advance(12));
    Game.view.el.actionStrip.addEventListener('click', (event) => {
      activity(event.target.closest('[data-activity]')?.dataset.activity);
    });
    Game.view.el.familyList.addEventListener('click', (event) => {
      Game.actions.interact(event.target.closest('[data-person]')?.dataset.person);
    });
    Game.view.el.assetPanel.addEventListener('click', (event) => {
      const stock = event.target.closest('[data-stock]');
      const house = event.target.closest('[data-house]');
      if (stock) Game.actions.trade(stock.dataset.stock, stock.dataset.trade);
      if (house) Game.actions.buyHouse(Number(house.dataset.house));
    });
    Game.view.el.decisionBody.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice]');
      if (choice) Game.actions.decide(choice.dataset.choice);
    });
    Game.view.el.tabs.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (!tab) return;
      Game.view.el.tabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === tab));
      Game.view.el.tabPages.querySelectorAll('.page').forEach((page) => {
        page.classList.toggle('active', page.id === tab.dataset.tab);
      });
    });
    root.addEventListener('resize', Game.view.drawHero);
    Game.view.el.childPlanBtn.addEventListener('click', Game.actions.planChild);
    Game.view.el.resetBtn.addEventListener('click', reset);
  }

  async function reset() {
    if (!root.confirm('确定重新开始一段人生吗？当前存档会被覆盖。')) return;
    await Game.storage.reset();
    state = U.createState();
    refresh();
    save();
  }

  async function boot() {
    try {
      Game.view.init();
      state = await Game.storage.load() || U.createState();
      Game.actions.configure({ getState: () => state, refresh, save });
      bind();
      refresh();
      Game.sdkAdapter.progress('runtime_initializing', '人生档案已建立');
      root.requestAnimationFrame(() => {
        Game.sdkAdapter.progress('first_frame', '可以开始人生');
        Game.sdkAdapter.ready();
      });
    } catch (err) {
      console.error('启动失败:', err?.message, err?.stack);
      Game.sdkAdapter.error('BOOT_FAILED', err?.message || '启动失败');
      document.body.innerHTML = '<main class="boot-error"><h1>人生档案加载失败</h1><p>请刷新后重试。</p></main>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}(window));
