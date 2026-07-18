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

  function finish(result) {
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    refresh();
    save();
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
      sport: ['锻炼身体', '一次痛快的运动让身体更有力量。', ['健康', 3], ['心情', 1]],
      social: ['主动社交', '你和身边的人聊了很久，关系更自然。', ['魅力', 2], ['心情', 2]],
      rest: ['好好休息', '你放慢脚步，给自己留出喘息空间。', ['心情', 5], ['健康', 1]],
    };
    const item = map[type];
    if (!item) return;
    item.slice(2, 4).forEach(([name, delta]) => {
      state.stats[name] = U.clamp(state.stats[name] + delta, 0, 100);
    });
    if (type === 'study') state.education.study += 7;
    state.monthActionTaken = true;
    Game.lifeDirector.addLog(state, item[0], item[1], 'good');
    Game.view.showToast(item[0], 'good');
    refresh();
    save();
  }

  function switchTabs(event) {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    Game.view.el.tabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === tab));
    Game.view.el.tabPages.querySelectorAll('.page').forEach((page) => {
      page.classList.toggle('active', page.id === tab.dataset.tab);
    });
  }

  function contactClick(event) {
    const button = event.target.closest('[data-contact]');
    if (button) finish(Game.social.interact(state, button.dataset.contact, button.dataset.contactAction));
  }

  function assetClick(event) {
    const stock = event.target.closest('[data-stock]');
    const house = event.target.closest('[data-house]');
    if (stock) Game.actions.trade(stock.dataset.stock, stock.dataset.trade);
    if (house) Game.actions.buyHouse(Number(house.dataset.house));
  }

  function globalClick(event) {
    if (Game.appearance.handleClick(event)) return;
    const module = event.target.closest('[data-open-module]');
    if (module) {
      Game.navigation.openModule(module.dataset.openModule, module.dataset.moduleTitle);
      return;
    }
    const selector = event.target.closest('[data-selector-field]');
    if (selector) {
      Game.appearance.open(selector.dataset.selectorField);
      return;
    }
    const avatar = event.target.closest('[data-character-id]');
    if (avatar) {
      Game.navigation.openCharacter(avatar.dataset.characterId);
      return;
    }
    const family = event.target.closest('[data-detail-family]');
    if (family) {
      Game.actions.interact(family.dataset.detailFamily);
      return;
    }
    const contact = event.target.closest('[data-detail-contact]');
    if (contact) {
      finish(Game.social.interact(state, contact.dataset.detailContact, contact.dataset.contactAction));
    }
  }

  function bind() {
    Game.view.el.monthBtn.addEventListener('click', () => advance(1));
    Game.view.el.yearBtn.addEventListener('click', () => advance(12));
    Game.view.el.actionStrip.addEventListener('click', (event) => activity(event.target.closest('[data-activity]')?.dataset.activity));
    Game.view.el.familyList.addEventListener('click', (event) => Game.actions.interact(event.target.closest('[data-person]')?.dataset.person));
    Game.view.el.classmatesList.addEventListener('click', contactClick);
    Game.view.el.phoneList.addEventListener('click', contactClick);
    Game.view.el.propertyPanel.addEventListener('click', assetClick);
    Game.view.el.stockPanel.addEventListener('click', assetClick);
    Game.view.el.careerPanel.addEventListener('click', (event) => {
      const job = event.target.closest('[data-job]');
      if (job) finish(Game.careerSystem.apply(state, job.dataset.job));
    });
    Game.view.el.cityPanel.addEventListener('click', (event) => {
      const city = event.target.closest('[data-city]');
      if (!city || !root.confirm(`确定迁居${city.dataset.city}吗？当前非自由职业会结束。`)) return;
      finish(Game.careerSystem.move(state, city.dataset.city));
    });
    Game.view.el.decisionBody.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice]');
      if (choice) Game.actions.decide(choice.dataset.choice);
    });
    Game.view.el.tabs.addEventListener('click', switchTabs);
    document.addEventListener('click', globalClick);
    Game.view.el.generatePortraitBtn.addEventListener('click', Game.profile.generate);
    Game.view.el.portraitSlot.addEventListener('click', Game.profile.generate);
    Game.view.el.childPlanBtn.addEventListener('click', Game.actions.planChild);
    Game.view.el.resetBtn.addEventListener('click', reset);
    root.addEventListener('resize', Game.view.drawHero);
  }

  async function reset() {
    if (!root.confirm('确定重新开始一段人生吗？当前存档会被覆盖。')) return;
    Game.profile.cancel();
    await Game.storage.reset();
    state = U.createState();
    Game.navigation.closeModule();
    Game.profile.updateGrowth(state);
    refresh();
    save();
  }

  async function boot() {
    try {
      Game.view.init();
      Game.navigation.init();
      state = U.upgradeState(await Game.storage.load());
      Game.profile.configure({ getState: () => state, refresh, save });
      Game.navigation.configure({ getState: () => state });
      Game.appearance.configure({ getState: () => state });
      Game.actions.configure({ getState: () => state, refresh, save });
      Game.profile.updateGrowth(state);
      if (!['家中', '已毕业'].includes(state.education.school) && !state.contacts.length) {
        Game.social.enterSchool(state, state.education.school, state.education.schoolStage, 5);
      }
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}(window));
