(function bootstrap(root) {
  'use strict';

  const Game = root.LifeGame || {};
  const U = Game.content;
  let state = null;
  let busy = false;
  let resetting = false;

  Game.sdkAdapter.progress('start', '正在生成人生');

  function save() {
    return Game.storage.save(state).then((source) => {
      Game.saveManager.render();
      return source;
    }).catch((err) => {
      console.error('存档失败:', err?.message, err?.stack);
    });
  }

  function refresh() {
    Game.view.render(state);
    Game.lifeLoop.render(state);
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
    const result = Game.lifeDirector.advance(state, months);
    refresh();
    if (result.interrupted && state.pendingDecision) {
      Game.view.showToast(`时间推进了${result.advanced}个月，已在关键选择处暂停`, 'warning');
    }
    save().finally(() => { busy = false; });
  }

  function switchTabs(event) {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    Game.view.el.tabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === tab));
    Game.view.el.tabPages.querySelectorAll('.page').forEach((page) => {
      page.classList.toggle('active', page.id === tab.dataset.tab);
    });
  }

  function bind() {
    Game.view.el.monthBtn.addEventListener('click', () => advance(1));
    Game.view.el.yearBtn.addEventListener('click', () => advance(12));
    Game.view.el.decisionBody.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice]');
      if (choice) Game.actions.decide(choice.dataset.choice);
    });
    Game.view.el.decisionBody.addEventListener('change', (event) => {
      if (Game.admissions.handleChange(event)) Game.actions.renderDecision();
    });
    Game.view.el.tabs.addEventListener('click', switchTabs);
    document.addEventListener('click', Game.interactionRouter.handle);
    const generate = () => Game.portraitSystem.generatePlayer(Game.view.el.portraitPromptInput.value);
    Game.view.el.generatePortraitBtn.addEventListener('click', generate);
    Game.view.el.portraitSlot.addEventListener('click', () => Game.portraitGallery.open('player'));
    Game.view.el.childPlanBtn.addEventListener('click', Game.familySystem.planChild);
    Game.view.el.resetBtn.addEventListener('click', reset);
    root.addEventListener('resize', Game.view.drawHero);
  }

  async function reset() {
    if (resetting) return;
    if (!root.confirm('确定重新开始一段人生吗？当前存档会被覆盖。')) return;
    resetting = true;
    busy = true;
    Game.view.el.resetBtn.disabled = true;
    Game.view.el.resetBtn.setAttribute('aria-busy', 'true');
    try {
      const nextState = Game.stateUpgrade.upgradeState(U.createState());
      Game.portraitSystem.cancelAll();
      Game.portraitGallery.close();
      Game.navigation.closeModule();
      Game.profile.updateGrowth(nextState);
      Game.npcLife.update(nextState);
      state = nextState;
      refresh();
      await Game.storage.reset(state);
      Game.view.showToast('新的人生已经开始', 'good');
    } catch (err) {
      console.error('重启人生失败:', err?.message, err?.stack);
      Game.view.showToast('重启失败，请稍后重试', 'warning');
    } finally {
      resetting = false;
      busy = false;
      Game.view.el.resetBtn.disabled = false;
      Game.view.el.resetBtn.removeAttribute('aria-busy');
    }
  }

  async function restore(snapshot) {
    if (busy || resetting) throw new Error('当前有操作正在进行');
    busy = true;
    try {
      Game.portraitSystem.cancelAll();
      Game.portraitGallery.close();
      state = Game.stateUpgrade.upgradeState(snapshot);
      Game.navigation.closeModule();
      Game.profile.updateGrowth(state);
      Game.npcLife.update(state);
      refresh();
      await Game.storage.save(state);
    } finally {
      busy = false;
    }
  }

  async function boot() {
    try {
      Game.view.init();
      Game.navigation.init();
      Game.portraitGallery.init();
      Game.lifeLoop.init();
      Game.saveManager.init();
      state = Game.stateUpgrade.upgradeState(await Game.storage.load());
      Game.profile.configure({ getState: () => state, refresh, save });
      Game.portraitGallery.configure({ getState: () => state, refresh, save });
      Game.portraitSystem.configure({ getState: () => state, refresh, save });
      Game.drawSettings.configure({ getState: () => state, save });
      Game.saveManager.configure({ getState: () => state, restore });
      Game.schoolLines.configure({ getState: () => state, refresh });
      Game.roleBook.configure({ getState: () => state });
      Game.navigation.configure({ getState: () => state, save });
      Game.appearance.configure({ getState: () => state });
      Game.actions.configure({ getState: () => state, refresh, save });
      Game.familySystem.configure({ getState: () => state, refresh, save });
      Game.interactionRouter.configure({ getState: () => state, refresh, save, finish });
      Game.profile.updateGrowth(state);
      Game.npcLife.update(state);
      if (!['家中', '已毕业'].includes(state.education.school)) {
        Game.social.createClassmates(state, state.education.school, 32);
      }
      bind();
      refresh();
      save();
      Game.saveManager.load();
      Game.drawSettings.load();
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
