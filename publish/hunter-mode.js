(function initHunterMode(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let api = null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function ensure(state) {
    state.specialModes = state.specialModes && typeof state.specialModes === 'object'
      ? state.specialModes : {};
    state.specialModes.skinHunter = Boolean(state.specialModes.skinHunter);
    state.specialModes.activeSkinId = typeof state.specialModes.activeSkinId === 'string'
      ? state.specialModes.activeSkinId : null;
    state.specialModes.possessed = Array.isArray(state.specialModes.possessed)
      ? state.specialModes.possessed : [];
    return state.specialModes;
  }

  function active(state) {
    const modes = ensure(state);
    return modes.possessed.find((person) => person.id === modes.activeSkinId) || null;
  }

  function removeTarget(state, person) {
    state.family = state.family.filter((item) => item.id !== person.id);
    state.contacts = state.contacts.filter((item) => item.id !== person.id);
    state.worldPeople = (state.worldPeople || []).filter((item) => item.id !== person.id);
    state.matchmaking.candidates = (state.matchmaking?.candidates || [])
      .filter((item) => item.id !== person.id);
    state.travel.encounters = (state.travel?.encounters || [])
      .filter((item) => item.id !== person.id);
    state.travel.activeIds = (state.travel?.activeIds || []).filter((id) => id !== person.id);
    state.travel.activeId = state.travel.activeIds[0] || null;
    if (person.populationResident) {
      Game.populationRenewal.replaceResident(state, person.id, person.homeCity);
    }
    if (state.romance.partnerId === person.id) {
      Object.assign(state.romance, {
        partnerId: null, married: false, pendingBirth: 0, pendingBirthMotherId: null,
      });
    }
    if (state.workplace.leaderId === person.id) state.workplace.leaderId = null;
    state.workplace.rosterIds = state.workplace.rosterIds.filter((id) => id !== person.id);
    state.workplace.reportIds = state.workplace.reportIds.filter((id) => id !== person.id);
    Game.people.all(state).forEach((other) => {
      other.childIds = (other.childIds || []).filter((id) => id !== person.id);
      other.parentIds = (other.parentIds || []).filter((id) => id !== person.id);
      other.reportIds = (other.reportIds || []).filter((id) => id !== person.id);
      if (other.spouseId === person.id) other.spouseId = null;
      if (other.managerId === person.id) other.managerId = null;
    });
  }

  function capture(state, id) {
    const modes = ensure(state);
    const person = Game.people.find(state, id);
    if (!modes.skinHunter) return { ok: false, message: '皮物猎手模式尚未开启' };
    if (!person || person.status !== '健康') return { ok: false, message: '当前目标无法被皮刀夺取' };
    if (modes.possessed.some((item) => item.id === id)) {
      return { ok: false, message: '这段人生已经在皮物列表中' };
    }
    const snapshot = JSON.parse(JSON.stringify(person));
    removeTarget(state, person);
    Object.assign(snapshot, {
      relation: '夺舍人生',
      status: '被夺舍',
      skinCaptured: true,
      capturedAt: state.totalMonths,
      currentCity: '',
      phoneUnlocked: false,
    });
    modes.possessed.unshift(snapshot);
    modes.possessed = modes.possessed.slice(0, 60);
    modes.activeSkinId = snapshot.id;
    Game.lifeDirector.addLog(
      state, '皮刀夺舍', `你夺取了${snapshot.name}的人生，并将其收入皮物列表。`, 'milestone',
    );
    Game.socialWorld.rebuild(state);
    return { ok: true, message: `已夺取${snapshot.name}的人生` };
  }

  function detailAction(state, person) {
    const modes = ensure(state);
    if (!modes.skinHunter || person.status !== '健康') return '';
    return `<button class="danger-action" data-skin-capture="${escape(person.id)}">使用皮刀夺舍</button>`;
  }

  function renderMode(state) {
    const modes = ensure(state);
    const skin = active(state);
    const host = document.getElementById('hunterModePanel');
    if (!host) return;
    host.innerHTML = `<section class="hunter-status ${modes.skinHunter ? 'active' : ''}">
      <div><span>皮物猎手</span><strong>${modes.skinHunter ? '已开启' : '未开启'}</strong>
      <small>${skin ? `当前人生：${escape(skin.name)}` : '当前使用本体人生'}</small></div>
      <button data-hunter-toggle="${modes.skinHunter ? 'off' : 'on'}">${modes.skinHunter ? '关闭模式' : '开启模式'}</button>
      ${skin ? '<button class="secondary" data-hunter-restore>恢复本体</button>' : ''}</section>`;
  }

  function renderList(state) {
    const modes = ensure(state);
    const host = document.getElementById('possessedList');
    if (!host) return;
    host.innerHTML = modes.possessed.length ? modes.possessed.map((person) => (
      `<article class="skin-card ${modes.activeSkinId === person.id ? 'active' : ''}">
        <button class="skin-avatar" data-character-id="${escape(person.id)}"
          aria-label="查看${escape(person.name)}详情">${Game.portraitSystem.avatar(person)}</button>
        <div><strong>${escape(person.name)}</strong><span>${escape(person.gender)} · ${Game.content.personAge(state, person)}岁
          · ${escape(person.personality)} · ${escape(person.trait)}</span>
          <small>${person.portraitUrl ? '立绘已收录' : '暂无立绘'} · 夺取于第${person.capturedAt + 1}个月</small></div>
        <button data-hunter-wear="${escape(person.id)}">${modes.activeSkinId === person.id ? '使用中' : '使用人生'}</button>
      </article>`
    )).join('') : '<p class="empty-state">尚未夺取任何人生。</p>';
  }

  function render(state) {
    renderMode(state);
    renderList(state);
  }

  function handleClick(event) {
    const state = api.getState();
    const toggle = event.target.closest('[data-hunter-toggle]');
    const wear = event.target.closest('[data-hunter-wear]');
    const restore = event.target.closest('[data-hunter-restore]');
    const knife = event.target.closest('[data-skin-capture]');
    if (!toggle && !wear && !restore && !knife) return false;
    const modes = ensure(state);
    let result = { ok: true, message: '' };
    if (toggle) {
      modes.skinHunter = toggle.dataset.hunterToggle === 'on';
      result.message = modes.skinHunter ? '皮物猎手模式已开启' : '皮物猎手模式已关闭';
    } else if (wear) {
      modes.activeSkinId = wear.dataset.hunterWear;
      result.message = `已切换为${active(state)?.name || '本体'}的人生`;
    } else if (restore) {
      modes.activeSkinId = null;
      result.message = '已恢复本体人生';
    } else if (root.confirm('确定使用皮刀夺取这名角色的人生吗？此操作不可撤销。')) {
      result = capture(state, knife.dataset.skinCapture);
    } else return true;
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    api.refresh();
    api.save();
    return true;
  }

  function configure(options) { api = options; }

  Game.hunterMode = Object.freeze({
    ensure, active, capture, detailAction, render, handleClick, configure,
  });
}(window));
