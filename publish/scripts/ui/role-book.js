(function initRoleBook(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let filter = 'city';
  let getState = () => null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function isClassmate(person) {
    return person.relation === '同学' || person.relation === '校友'
      || Boolean(person.schoolHistory?.length);
  }

  function isCradleInmate(person) {
    return Boolean(person.cradleImprisoned || person.cradleInmate
      || person.cradleStatus === 'imprisoned' || person.cradle?.imprisoned
      || person.institution === '摇篮改造机构');
  }

  function playerCradleRecord(state) {
    const cradle = state.cradle;
    if (!cradle?.imprisoned || (cradle.city && cradle.city !== state.location.city)) return null;
    const identity = Game.hunterMode.identity(state);
    return {
      id: 'player-profile',
      name: identity.name,
      relation: '本人',
      gender: identity.gender,
      baseAge: Game.content.age(state),
      currentCity: state.location.city,
      job: '摇篮改造机构',
      status: '健康',
      portraitUrl: identity.profile?.portraitUrl || null,
      cradleInmate: true,
      isPlayerRecord: true,
    };
  }

  function peopleFor(state) {
    const all = Game.people.all(state).filter((person) => person.id !== 'player-profile');
    const local = Game.socialWorld.cityPeople(state, state.location.city);
    if (filter === 'city') return local;
    if (filter === 'specter-local') return local.filter((person) => person.specterPossessed);
    if (filter === 'cradle-local') {
      const inmates = local.filter(isCradleInmate);
      const player = playerCradleRecord(state);
      return player ? [player, ...inmates] : inmates;
    }
    if (filter === 'overseas-cn') return local.filter((person) => person.culture === '华夏');
    if (filter === 'school') return all.filter(isClassmate);
    if (filter === 'work') return all.filter((person) => (
      state.career.company && person.company === state.career.company
    ));
    if (filter === 'contact') return all.filter((person) => person.phoneUnlocked);
    return all;
  }

  function statusFor(state, person) {
    if (person.isPlayerRecord) return '当前囚禁档案';
    if (person.status === '已故') return '已故 · 纪念档案';
    if (Game.socialWorld.reachable(state, person)) return '可联系';
    return person.currentCity === state.location.city ? '同城，可尝试重逢' : '未留联系方式';
  }

  function specialTags(state, person) {
    if (person.specterPossessed) {
      const tags = ['幽诡寄生'];
      if (person.specterOriginalGender === '男' && person.gender === '女') tags.push('前男性');
      if (Number.isFinite(person.specterPossessedAtAge)) tags.push(`${person.specterPossessedAtAge}岁寄生`);
      tags.push(`生理${Game.content.personAge(state, person)}岁`);
      if (person.specterPregnantDue > state.totalMonths) {
        tags.push(`孕期剩余${person.specterPregnantDue - state.totalMonths}月`);
      }
      return tags;
    }
    return isCradleInmate(person) ? ['摇篮收容中'] : [];
  }

  function actionButtons(state, person) {
    if (person.isPlayerRecord || person.status === '已故') return '';
    const family = state.family.some((item) => item.id === person.id);
    const actions = family ? Game.familySystem.detailActions(state, person)
      : Game.social.detailActions(state, person);
    const buttons = actions.map(([type, label]) => (
      family
        ? `<button type="button" data-detail-family="${escape(person.id)}"
          data-family-action="${escape(type)}">${escape(label)}</button>`
        : `<button type="button" data-detail-contact="${escape(person.id)}"
          data-contact-action="${escape(type)}">${escape(label)}</button>`
    ));
    if (Game.socialWorld.reachable(state, person)) {
      buttons.push(`<button type="button" class="roster-chat-action"
        data-npc-chat="${escape(person.id)}">自由对话</button>`);
    }
    return buttons.join('');
  }

  function card(state, person) {
    const place = person.currentCity || person.careerCity || person.homeCity || '去向未明';
    const age = person.isPlayerRecord ? Game.content.age(state) : Game.content.personAge(state, person);
    const tags = [person.gender, `${age}岁`, person.personality, person.trait].filter(Boolean);
    const special = specialTags(state, person);
    const affection = Math.max(0, Math.min(100, Math.round(Number(person.affection) || 0)));
    const portrait = Game.portraitSystem.status(person.id);
    const openAttrs = person.isPlayerRecord
      ? 'data-open-module="roleArchive" data-module-title="角色档案"'
      : `data-character-id="${escape(person.id)}"`;
    const portraitActions = person.isPlayerRecord ? ''
      : `<button type="button" data-portrait-view="${escape(person.id)}">查看立绘</button>
        ${person.status === '已故' ? '' : `<button type="button" data-npc-generate="${escape(person.id)}"
          ${portrait.drawing ? 'disabled' : ''}>${portrait.drawing ? '生成中…约30-60秒'
          : (person.portraitUrl ? '重新生成立绘' : '生成角色立绘')}</button>`}`;
    const actions = portraitActions + actionButtons(state, person);
    return `<article class="character-roster-card role-book-card ${person.status === '已故' ? 'deceased' : ''}
      ${portrait.drawing ? 'is-drawing' : ''}">
      <button class="character-roster-portrait" type="button" ${openAttrs}
        aria-label="查看${escape(person.name)}档案">${Game.portraitSystem.avatar(person)}
        ${portrait.drawing ? '<span class="roster-portrait-pending">绘制中</span>' : ''}</button>
      <div class="character-roster-info"><header><div><strong>${escape(person.name)}</strong>
        <span>${escape(person.relation || '熟人')}</span></div>
        <button type="button" class="roster-file-button" ${openAttrs}>档案</button></header>
        <div class="character-roster-tags">${tags.map((tag) => `<span>${escape(tag)}</span>`).join('')}</div>
        <p class="character-roster-meta">${escape(person.job || person.educationName || person.school || '当地生活')}
          · ${escape(place)}</p>
        ${special.length ? `<div class="character-roster-alerts">${special.map((tag) => (
          `<span>${escape(tag)}</span>`)).join('')}</div>` : ''}
        <small class="character-roster-status">${escape(statusFor(state, person))}</small>
        ${portrait.error ? `<small class="character-roster-error">${escape(portrait.error)}</small>` : ''}
        ${person.isPlayerRecord ? '' : `<div class="character-roster-affection"><span>好感 ${affection}</span>
          <progress max="100" value="${affection}"></progress></div>`}
        ${actions ? `<details class="character-roster-actions"><summary>互动选项</summary>
          <div>${actions}</div></details>` : ''}</div></article>`;
  }

  function overview(state, people) {
    const reachable = people.filter((person) => (
      person.isPlayerRecord || Game.socialWorld.reachable(state, person)
    )).length;
    const portraits = people.filter((person) => Boolean(person.portraitUrl)).length;
    return `<section class="roster-overview"><div><strong>${people.length}</strong><span>当前人物</span></div>
      <div><strong>${reachable}</strong><span>可联系</span></div>
      <div><strong>${portraits}</strong><span>已有立绘</span></div>
      <p>${escape(state.location.city)}人物网络 · 点击头像或档案按钮查看完整成长记录</p></section>`;
  }

  function render(state) {
    const host = document.getElementById('roleBookPanel');
    if (!host) return;
    const inJapan = state.location.country === '日本';
    if (filter === 'overseas-cn' && !inJapan) filter = 'city';
    const filters = [
      ['city', '当前城市'], ['specter-local', '本地幽诡'], ['cradle-local', '本地摇篮'],
      ['school', '同窗校友'], ['work', '同事'], ['contact', '可联系'], ['all', '全部人物'],
    ];
    if (inJapan) filters.splice(1, 0, ['overseas-cn', '华侨']);
    const source = peopleFor(state);
    const people = source.slice(0, 100);
    host.innerHTML = `<div class="character-roster-shell">${overview(state, people)}
      <nav class="filter-chips">${filters.map(([id, label]) => (
        `<button class="${filter === id ? 'active' : ''}" data-role-filter="${id}">${label}</button>`
      )).join('')}</nav><div class="character-roster-list">${people.length
      ? people.map((person) => card(state, person)).join('')
      : '<p class="empty-state">当前分类还没有人物。</p>'}</div></div>`;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-role-filter]');
    if (!button) return false;
    filter = button.dataset.roleFilter;
    render(getState());
    return true;
  }

  function configure(options) { getState = options.getState; }

  Game.roleBook = Object.freeze({ configure, render, handleClick });
}(window));
