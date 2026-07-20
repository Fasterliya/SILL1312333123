(function initLifeResume(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function recordEvent(state, person, event, detail, eventMonth) {
    if (!person.lifeResume) person.lifeResume = [];
    const month = Number.isFinite(eventMonth) ? eventMonth : state.totalMonths;
    const birthMonth = Number.isFinite(person.birthMonth)
      ? person.birthMonth : (person === state.profile ? (state.playerBornAt || 0) : 0);
    const age = Math.max(0, Math.floor((month - birthMonth) / 12));
    const duplicate = person.lifeResume.some((entry) => (
      entry.event === event && entry.detail === detail && entry.month === month
    ));
    if (duplicate) return false;
    person.lifeResume.push({ age, event, detail, month });
    person.lifeResume.sort((left, right) => (left.month || 0) - (right.month || 0));

    if (person.lifeResume.length <= 30) return true;

    const entries = person.lifeResume;
    const lastEntry = entries[entries.length - 1];
    const keepLast = lastEntry && lastEntry.event === '去世' ? 1 : 0;
    const removeCount = entries.length - 30;

    const protectedIndices = new Set([0]);
    if (keepLast) protectedIndices.add(entries.length - 1);

    const candidates = entries
      .map(function (entry, index) { return { entry: entry, index: index }; })
      .filter(function (item) { return !protectedIndices.has(item.index); })
      .sort(function (a, b) { return (a.entry.month || 0) - (b.entry.month || 0); });

    const removeIndices = new Set(candidates.slice(0, removeCount).map(function (item) { return item.index; }));
    person.lifeResume = entries.filter(function (_, index) { return !removeIndices.has(index); });
    return true;
  }

  function backfillResume(state, person) {
    if (!person || (person.lifeResume && person.lifeResume.length > 0)) return;
    if (!person.lifeResume) person.lifeResume = [];

    var birthMonth = person.birthMonth;
    if (!Number.isFinite(birthMonth)) return;

    var city = person.homeCity || person.metCity || '未知城市';
    var entries = [];

    // 出生
    entries.push({ age: 0, event: '出生', detail: '出生在' + city, month: birthMonth });

    // 教育阶段 — 使用 schoolHistory 如果有，否则根据当前学历生成一条记录
    if (person.schoolHistory && person.schoolHistory.length > 0) {
      person.schoolHistory.forEach(function (record) {
        var schoolName = record.school || record.schoolName || '';
        if (!schoolName) return;
        var endedAt = Number.isFinite(record.endedAt) ? record.endedAt : birthMonth + 6 * 12;
        var entryAge = Math.max(0, Math.floor((endedAt - birthMonth) / 12));
        entries.push({
          age: entryAge,
          event: '入学',
          detail: '进入' + schoolName,
          month: record.startedAt || (endedAt - 36),
        });
      });
    } else if (person.educationName && person.educationStage && person.educationStage !== 'home') {
      var stageStart = {
        kindergarten: 3, primary: 6, middle: 12, high: 15, vocational: 15,
        university: 18, workforce: 22, graduate: 22,
      };
      var startAge = stageStart[person.educationStage] || 6;
      entries.push({
        age: startAge,
        event: '入学',
        detail: '进入' + person.educationName,
        month: birthMonth + startAge * 12,
      });
    }

    // 首次就业
    if (person.job && person.job !== '退休') {
      var jobAge = 18;
      if (person.educationStage === 'university' || person.educationStage === 'graduate') jobAge = 22;
      if (person.npcMarriedAtAge && person.npcMarriedAtAge < jobAge) jobAge = person.npcMarriedAtAge;
      entries.push({
        age: Math.max(16, jobAge),
        event: '就业',
        detail: '开始从事' + person.job,
        month: birthMonth + Math.max(16, jobAge) * 12,
      });
    }

    // 婚姻
    if (person.npcMarried && Number.isFinite(person.npcMarriedAtAge)) {
      entries.push({
        age: person.npcMarriedAtAge,
        event: '结婚',
        detail: '与' + (person.spouseName || '伴侣') + '结婚',
        month: birthMonth + person.npcMarriedAtAge * 12,
      });
    }

    // 子女
    if (person.childIds && person.childIds.length > 0) {
      person.childIds.forEach(function (childId) {
        var child = Game.people.find(state, childId);
        if (child && Number.isFinite(child.birthMonth)) {
          var parentAgeAtBirth = Math.max(0, Math.floor((child.birthMonth - birthMonth) / 12));
          entries.push({
            age: parentAgeAtBirth,
            event: '生育',
            detail: '孩子' + (child.name || '') + '出生',
            month: child.birthMonth,
          });
        }
      });
    }

    // 去世
    if (person.status === '已故' && Number.isFinite(person.deceasedAt)) {
      var deathAge = Math.max(0, Math.floor((person.deceasedAt - birthMonth) / 12));
      entries.push({
        age: deathAge,
        event: '去世',
        detail: person.deathCause || '安详离世',
        month: person.deceasedAt,
      });
    }

    // 按时间排序并限制 30 条
    entries.sort(function (a, b) { return a.month - b.month; });
    person.lifeResume = entries.slice(0, 30);
  }

  function renderResume(person) {
    var entries = person.lifeResume || [];
    if (entries.length === 0) {
      return '<div class="timeline"><p style="text-align:center;color:#8c918d;font-size:12px;padding:12px;">暂无人生履历记录</p></div>';
    }

    var isDeceased = person.status === '已故';

    var cards = entries.map(function (entry, index) {
      var side = index % 2 === 0 ? 'left' : 'right';
      var isLast = index === entries.length - 1;
      var deceasedClass = (isLast && isDeceased) ? ' deceased' : '';

      return '<article class="timeline-card ' + side + deceasedClass + '">'
        + '<time>' + entry.age + '岁</time>'
        + '<strong>' + escape(entry.event) + '</strong>'
        + '<span>' + escape(entry.detail) + '</span>'
        + '</article>';
    }).join('');

    return '<div class="timeline">' + cards + '</div>';
  }

  Game.lifeResume = Object.freeze({
    recordEvent: recordEvent,
    backfillResume: backfillResume,
    renderResume: renderResume,
  });
}(window));
