(function initFamilyDashboard(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const openGroups = new Map([['parents', true], ['siblings', false], ['descendants', false]]);
  const relationGroups = {
    parents: new Set(['父亲', '母亲', '祖父', '祖母', '外祖父', '外祖母']),
    siblings: new Set(['哥哥', '姐姐', '弟弟', '妹妹', '兄弟', '姐妹']),
    descendants: new Set(['配偶', '丈夫', '妻子', '儿子', '女儿', '养子', '养女']),
  };

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function rememberGroups(host) {
    host.querySelectorAll('[data-family-group]').forEach((item) => {
      openGroups.set(item.dataset.familyGroup, item.open);
    });
  }

  function groups(state) {
    const result = { parents: [], siblings: [], descendants: [] };
    const partnerId = state.romance?.partnerId;
    state.family.forEach((person) => {
      if (relationGroups.parents.has(person.relation)) result.parents.push(person);
      else if (relationGroups.siblings.has(person.relation)) result.siblings.push(person);
      else if (person.id === partnerId || relationGroups.descendants.has(person.relation)) {
        result.descendants.push(person);
      }
    });
    return result;
  }

  function summary(state, grouped) {
    const all = Object.values(grouped).flat();
    const living = all.filter((person) => person.status !== '已故').length;
    return `<section class="family-overview" aria-label="家庭概况">
      <div><strong>${living}</strong><span>在世亲属</span></div>
      <div><strong>${grouped.parents.length}</strong><span>父母长辈</span></div>
      <div><strong>${grouped.siblings.length}</strong><span>兄弟姐妹</span></div>
      <div><strong>${grouped.descendants.length}</strong><span>配偶子女</span></div>
      <p>家族财富 ${Game.view.money(state.familyWealth)} · 第${state.generation || 1}代 · ${U.age(state)}岁</p>
    </section>`;
  }

  function conflictWarning(state) {
    if (!state.romance?.married || !Game.familyConflictCore) return '';
    const values = Game.familyConflictCore.spouseEntries(state).map((entry) => (
      Game.familyConflictCore.profile(state, entry.id)?.suspicion || 0
    )).filter((value) => value >= 30);
    if (!values.length) return '';
    const suspicion = Math.round(Math.max(...values));
    const danger = suspicion >= 75;
    const label = danger ? '婚姻危机' : (suspicion >= 50 ? '关系紧张' : '配偶不安');
    return `<aside class="family-warning ${danger ? 'danger' : ''}">
      <strong>${label} · 疑心 ${suspicion}/100</strong>
      <span>配偶正在怀疑你的行为，及时沟通可以修复关系。</span>
    </aside>`;
  }

  function memberCard(state, person) {
    const age = U.personAge(state, person);
    const affection = Math.max(0, Math.min(100, Math.round(person.affection || 0)));
    const role = person.job || person.educationName || person.school || '家庭生活';
    const place = person.currentCity || person.careerCity || person.homeCity || state.location.city;
    const tags = [person.gender, `${age}岁`, person.personality, person.trait].filter(Boolean).join(' · ');
    const actions = person.status === '已故' ? ''
      : Game.familySystem.detailActions(state, person).map(([type, label]) => (
        `<button type="button" data-detail-family="${escape(person.id)}"
          data-family-action="${escape(type)}">${escape(label)}</button>`
      )).join('');
    return `<article class="family-book-person ${person.status === '已故' ? 'deceased' : ''}">
      <button class="person-avatar family-book-portrait" type="button"
        data-character-id="${escape(person.id)}" aria-label="查看${escape(person.name)}档案">
        ${Game.portraitSystem.avatar(person)}
      </button>
      <div class="family-book-info">
        <header><div><strong>${escape(person.name)}</strong><span>${escape(person.relation)}</span></div>
          <button type="button" class="family-file-button" data-character-id="${escape(person.id)}">档案</button>
        </header>
        <p>${escape(tags)}</p>
        <small>${escape(role)} · ${escape(place)}${person.status === '已故' ? ' · 纪念档案' : ''}</small>
        <div class="family-affection"><span>好感 ${affection}</span><i><b style="width:${affection}%"></b></i></div>
        ${actions ? `<details class="family-person-actions"><summary>家庭互动</summary>
          <div>${actions}</div></details>` : ''}
      </div>
    </article>`;
  }

  function groupCard(state, id, title, hint, members) {
    const open = openGroups.get(id) ? ' open' : '';
    const content = members.length
      ? members.map((person) => memberCard(state, person)).join('')
      : '<p class="family-empty">当前没有这一类家庭成员</p>';
    return `<details class="family-group" data-family-group="${id}"${open}>
      <summary><span><strong>${title}</strong><small>${hint}</small></span><b>${members.length}人</b></summary>
      <div class="family-book-list">${content}</div>
    </details>`;
  }

  function household(state) {
    if (!Game.householdSystem) return '';
    const home = state.household || {};
    const metrics = [
      ['凝聚', home.cohesion], ['边界', home.boundaries], ['照护', home.careBalance],
      ['教育', home.educationSupport], ['矛盾', home.conflict],
    ];
    return `<section class="family-household"><header><strong>家庭协作 · ${escape(home.policy || '共同承担')}</strong>
      <span>共同预算 ${Game.view.money(home.sharedBudget || 0)}</span></header>
      <div class="family-household-metrics">${metrics.map(([label, value]) => (
        `<span>${label}<b>${Math.round(value || 0)}</b></span>`
      )).join('')}</div>${Game.familyConflict?.render(state) || ''}</section>`;
  }

  function events(state) {
    const items = state.familyEvents || [];
    if (!items.length) return '';
    return `<details class="fold-section family-events"><summary><span>家族事件</span><small>${items.length}条</small></summary>
      <div class="fold-content">${items.slice(0, 12).map((item) => (
        `<p><strong>${escape(item.title)}</strong><span>${escape(item.text)}</span></p>`
      )).join('')}</div></details>`;
  }

  function render(state) {
    const host = document.getElementById('familyList');
    if (!host) return;
    rememberGroups(host);
    const grouped = groups(state);
    host.innerHTML = `<div class="family-dashboard">${summary(state, grouped)}${conflictWarning(state)}
      <div class="family-group-stack">
        ${groupCard(state, 'parents', '父母', '双亲与家族长辈', grouped.parents)}
        ${groupCard(state, 'siblings', '兄弟姐妹', '同辈手足', grouped.siblings)}
        ${groupCard(state, 'descendants', '子女与配偶', '伴侣及下一代', grouped.descendants)}
      </div>${household(state)}${events(state)}</div>`;
  }

  Game.familyDashboard = Object.freeze({ render });
}(window));
