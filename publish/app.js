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
    Game.healthSafety.repair(state);
    Game.view.render(state);
    Game.lifeLoop.render(state);
    Game.actions.renderDecision();
  }

  function finish(result) {
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    refresh();
    save();
  }

  /* ---- Time loop ---- */
  var _timer = null;
  /* tick speed: days per tick | interval | real time per month */
  /*   1x: 1 day / 2000ms = 60s/month */
  /*   5x: 15 days / 500ms = 1s/month */
  /*  10x: 30 days / 250ms = 0.25s/month */
  var SPEED_DAYS = {0:0, 1:1, 5:15, 10:30};
  var SPEED_MS   = {0:0, 1:2000, 5:500, 10:250};

  function tickDay() {
    var s = state;
    if(!s||s.gameOver) return;
    var spd = s.timeSpeed||0;
    if(spd===0) return;
    if(s.pendingDecision){ s.timeSpeed=0; refresh(); return; }
    var days = SPEED_DAYS[spd]||1;
    for(var i=0;i<days;i++){
      s.day+=1;
      if(s.day>30){
        s.day=1;
        Game.lifeDirector.advance(s,1);
        s.stamina.current = s.stamina.max;
        if(s.education.fastForwardTarget&&s.totalMonths>=s.education.fastForwardTarget) Game.educationFastForward.complete(s);
      }
      Game.examSystem?.checkReveal(s);
      if(s.pendingDecision||s.gameOver){
        s.timeSpeed=0;
        break;
      }
    }
    refresh(); save();
  }

  function startTimer(){
    if(_timer){root.clearInterval(_timer);_timer=null;}
    if(!state||state.gameOver) return;
    var spd = state.timeSpeed||0;
    if(spd===0||state.pendingDecision) return;
    var ms = SPEED_MS[spd]||2000;
    _timer = root.setInterval(tickDay, Math.max(ms,50));
  }

  function setTimeSpeed(speed){
    if(!state||state.gameOver) return;
    state.timeSpeed = Number(speed)||0;
    startTimer();
    refresh();
  }

  function startTimeLoop(){ startTimer(); }
  function resumeEducation(){ if(Game.educationFastForward.active(state)) setTimeSpeed(10); }
  function startEducationFastForward(){
    if(!state||state.pendingDecision||state.gameOver) return;
    if(!Game.educationFastForward.active(state)){
      var months = Game.educationFastForward.begin(state);
      if(!months) return Game.view.showToast('当前没有可推进的升学节点','warning');
      Game.view.showToast('已开启自动学习推进','good');
      save();
    }
    setTimeSpeed(10);
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
    Game.view.el.timeBar.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-time-speed]');
      if (btn) setTimeSpeed(Number(btn.dataset.timeSpeed));
    });

    /* Space to toggle pause/resume */
    var _lastSpeed = 1;
    root.addEventListener('keydown', function(e) {
      if (e.code !== 'Space' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (!state || state.gameOver) return;
      var current = state.timeSpeed || 0;
      if (current === 0) {
        setTimeSpeed(_lastSpeed || 1);
      } else {
        _lastSpeed = current;
        setTimeSpeed(0);
      }
    });
    Game.view.el.examJumpBtn.addEventListener('click', startEducationFastForward);
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
      Game.marketView.configure({ getState: () => state, save });
      Game.navigation.configure({ getState: () => state, save });
      Game.hunterMode.configure({ getState: () => state, refresh, save });
      Game.characterChat.configure({ getState: () => state, refresh, save });
      Game.appearance.configure({ getState: () => state });
      Game.actions.configure({ getState: () => state, refresh, save, resumeEducation });
      Game.familySystem.configure({ getState: () => state, refresh, save });
      Game.interactionRouter.configure({ getState: () => state, refresh, save, finish });
      Game.profile.updateGrowth(state);
      Game.npcLife.update(state);
      if (!['家中', '已毕业'].includes(state.education.school)) {
        Game.social.createClassmates(state, state.education.school, 32);
      }
      bind();
      /* Expose state accessors for encounter/hookup/brothel systems */
      Game._getState = () => state;
      Game._refresh = refresh;
      Game._save = save;
      Game._setTimeSpeed = setTimeSpeed;
      startTimeLoop();
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
