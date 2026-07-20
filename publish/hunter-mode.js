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
    state.specialModes.possessed.forEach((person) => {
      if (person.clothing) person.clothing.socks = Game.appearanceCatalog.normalizeSocks(person.clothing.socks);
      if (!Array.isArray(person.socialRelations)) person.socialRelations = captureRelations(state, person);
    });
    return state.specialModes;
  }

  function active(state) {
    const modes = ensure(state);
    return modes.possessed.find((person) => person.id === modes.activeSkinId) || null;
  }

  function identity(state) {
    const skin = active(state);
    return {
      skin,
      profile: skin || state.profile,
      name: skin?.name || state.name,
      gender: skin?.gender || state.gender,
      birthMonth: Number.isFinite(skin?.birthMonth) ? skin.birthMonth : Number(state.playerBornAt || 0),
    };
  }

  function captureRelations(state, person) {
    const links = new Map();
    const add = (id, kind) => {
      if (id && id !== person.id && !links.has(id)) links.set(id, { id, kind });
    };
    add(person.spouseId, '配偶');
    (person.childIds || []).forEach((id) => add(id, '子女'));
    (person.parentIds || []).forEach((id) => add(id, '父母'));
    add(person.managerId, '上司');
    (person.reportIds || []).forEach((id) => add(id, '下属'));
    Game.people.all(state).forEach((other) => {
      if (other.id === person.id) return;
      if (other.spouseId === person.id) add(other.id, '配偶');
      if ((other.childIds || []).includes(person.id)) add(other.id, '父母');
      if ((other.parentIds || []).includes(person.id)) add(other.id, '子女');
      if (other.managerId === person.id) add(other.id, '下属');
      if ((other.reportIds || []).includes(person.id)) add(other.id, '上司');
      if (person.school && other.school === person.school) add(other.id, '同窗');
      if (person.companyId && other.companyId === person.companyId
        && other.departmentId === person.departmentId) add(other.id, '同事');
    });
    return [...links.values()];
  }

  function socialPeople(state, skin) {
    return (skin?.socialRelations || []).map((link) => ({
      kind: link.kind, person: Game.people.find(state, link.id),
    })).filter((link) => link.person);
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
    snapshot.socialRelations = captureRelations(state, person);
    snapshot.originalRelation = person.relation;
    removeTarget(state, person);
    Object.assign(snapshot, {
      relation: '夺舍人生',
      status: '被夺舍',
      skinCaptured: true,
      capturedAt: state.totalMonths,
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
          <small>${escape(person.originalRelation || '社会角色')} · 继承${person.socialRelations?.length || 0}项关系
          · ${person.portraitUrl ? '立绘已收录' : '暂无立绘'} · 夺取于第${person.capturedAt + 1}个月</small></div>
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
    Game.profile.updateGrowth(state);
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    api.refresh();
    api.save();
    return true;
  }

  function configure(options) { api = options; }

  Game.hunterMode = Object.freeze({
    ensure, active, identity, socialPeople, capture, detailAction, render, handleClick, configure,
  });
}(window));
