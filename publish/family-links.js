(function initFamilyLinks(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function addWorld(state, person) {
    if (!state.worldPeople.some((item) => item.id === person.id)) state.worldPeople.push(person);
    Game.systemsState.ensurePerson(state, person);
    return person;
  }

  function makeSpouse(state, person) {
    const age = U.personAge(state, person);
    const gender = person.gender === '男' ? '女' : '男';
    const culture = person.culture || state.location.country || '华夏';
    const locale = Game.worldCulture.profile(culture).locale;
    const spouse = U.person('角色家属', '', Math.max(20, age + U.between(-3, 3)), gender, state.totalMonths);
    Game.worldCulture.applyPerson(spouse, culture);
    if (person.spouseName) spouse.name = person.spouseName;
    U.setUniqueName(state, spouse, locale);
    spouse.culture = culture;
    spouse.npcMarried = true;
    spouse.npcMarriedAtAge = person.npcMarriedAtAge;
    spouse.spouseId = person.id;
    spouse.spouseName = person.name;
    spouse.currentCity = person.currentCity;
    spouse.homeCity = person.currentCity || person.homeCity;
    spouse.affection = U.between(38, 62);
    person.spouseId = spouse.id;
    person.spouseName = spouse.name;
    addWorld(state, spouse);
    return spouse;
  }

  function makeChild(state, person, spouse, index) {
    const parentAge = U.personAge(state, person);
    const marriedAt = person.npcMarriedAtAge || Math.max(22, parentAge - 2);
    const age = Math.max(0, parentAge - marriedAt - 1 - index * 2);
    const gender = U.random(['男', '女']);
    const culture = person.culture || spouse.culture || state.location.country || '华夏';
    const identity = Game.familyNaming.forParents(state, person, spouse);
    const child = U.person('角色子女', identity.surname, age, gender, state.totalMonths);
    Game.worldCulture.applyPerson(child, culture);
    Game.familyNaming.assign(state, child, identity);
    child.parentIds = [person.id, spouse.id];
    child.currentCity = person.currentCity;
    child.homeCity = person.currentCity || person.homeCity;
    child.affection = U.between(28, 52);
    Game.genetics.inheritInto(child, gender, person, spouse, `linked-child-${child.id}`);
    addWorld(state, child);
    return child;
  }

  function materialize(state, person) {
    if (!person?.npcMarried) return false;
    let changed = false;
    let spouse = Game.people.find(state, person.spouseId)
      || Game.people.all(state).find((item) => item.id !== person.id && item.name === person.spouseName);
    if (!spouse) {
      spouse = makeSpouse(state, person);
      changed = true;
    }
    person.spouseId = spouse.id;
    spouse.spouseId = person.id;
    spouse.spouseName = person.name;
    person.childIds = Array.isArray(person.childIds) ? person.childIds : [];
    spouse.childIds = Array.isArray(spouse.childIds) ? spouse.childIds : [];
    if (['父亲', '母亲'].includes(person.relation)) {
      const siblings = state.family.filter((item) => (
        ['哥哥', '姐姐', '弟弟', '妹妹'].includes(item.relation)
      )).map((item) => item.id);
      person.childIds = [...new Set([...person.childIds, ...siblings])];
      spouse.childIds = [...new Set([...spouse.childIds, ...siblings])];
    }
    const count = ['父亲', '母亲'].includes(person.relation) ? person.childIds.length
      : Math.min(3, Math.max(person.childrenCount || 0, spouse.childrenCount || 0));
    while (person.childIds.length < count) {
      const child = makeChild(state, person, spouse, person.childIds.length);
      person.childIds.push(child.id);
      spouse.childIds.push(child.id);
      changed = true;
    }
    person.childrenCount = person.childIds.length;
    spouse.childrenCount = spouse.childIds.length;
    if (person.populationResident || spouse.populationResident) {
      person.familyMaterialized = true;
      spouse.familyMaterialized = true;
    }
    Game.socialWorld.rebuild(state);
    return changed;
  }

  function relatives(state, person) {
    const ids = [person.spouseId, ...(person.childIds || []), ...(person.parentIds || [])].filter(Boolean);
    return ids.map((id) => Game.people.find(state, id)).filter(Boolean);
  }

  function render(state, person) {
    const people = relatives(state, person);
    if (!person.npcMarried && !people.length) return '';
    const rows = people.length ? people.map((relative) => {
      const relation = relative.id === person.spouseId ? '配偶'
        : ((person.childIds || []).includes(relative.id) ? '子女' : '父母');
      return `<button class="relation-link" type="button" data-character-id="${relative.id}">
        <span class="relation-avatar">${Game.portraitSystem.avatar(relative)}</span>
        <span class="relation-kind">${relation}</span><strong>${relative.name}</strong>
        <small>${relative.currentCity || '去向未明'} · 查看档案</small></button>`;
    }).join('') : '<p class="empty-state">家庭成员资料尚未建立。</p>';
    return `<details class="record-section" open><summary><span>家庭成员</span>
      <small>可继续查看配偶与儿女</small></summary><div class="relation-links">${rows}</div></details>`;
  }

  Game.familyLinks = Object.freeze({ materialize, relatives, render });
}(window));
