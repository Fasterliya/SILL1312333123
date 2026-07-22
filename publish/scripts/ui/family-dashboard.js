(function initFamilyDashboard(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function render(state) {
    var html = '';

    html += renderSummary(state);
    html += renderConflictWarning(state);
    html += renderMemberList(state);
    html += renderChildrenPanel(state);
    html += renderHouseholdCompact(state);
    html += renderEventTimeline(state);

    var familyList = document.getElementById('familyList');
    if (familyList) familyList.innerHTML = '<div class="family-dashboard">' + html + '</div>';
  }

  function renderSummary(state) {
    var living = state.family.filter(function (p) { return p.status === '健康'; });
    var spouses = living.filter(function (p) { return state.romance && p.id === state.romance.partnerId; });
    var kids = living.filter(function (p) { return ['儿子', '女儿'].includes(p.relation); });
    var parents = living.filter(function (p) { return ['父亲', '母亲'].includes(p.relation); });

    return '<section class="family-summary panel" style="margin-bottom:8px">'
      + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;text-align:center">'
      + '<div><p style="font-size:12px;font-weight:750;color:var(--ui-ink);margin:0">' + living.length + '</p><p style="font-size:9px;color:var(--ui-muted);margin:0">家庭成员</p></div>'
      + '<div><p style="font-size:12px;font-weight:750;color:var(--ui-ink);margin:0">' + spouses.length + '</p><p style="font-size:9px;color:var(--ui-muted);margin:0">配偶</p></div>'
      + '<div><p style="font-size:12px;font-weight:750;color:var(--ui-ink);margin:0">' + kids.length + '</p><p style="font-size:9px;color:var(--ui-muted);margin:0">子女</p></div>'
      + '<div><p style="font-size:12px;font-weight:750;color:var(--ui-ink);margin:0">' + parents.length + '</p><p style="font-size:9px;color:var(--ui-muted);margin:0">父母</p></div>'
      + '</div>'
      + '<p style="font-size:10px;color:var(--ui-muted);margin:6px 0 0;text-align:center">家族财富 ¥' + Number(state.familyWealth || 0).toLocaleString() + ' · 第' + (state.generation || 1) + '代 · ' + (U.age(state)) + '岁</p>'
      + '</section>';
  }

  function renderConflictWarning(state) {
    if (!state.romance || !state.romance.married) return '';
    var entries = Game.familyConflictCore ? Game.familyConflictCore.spouseEntries(state) : [];
    var warning = entries.filter(function (e) {
      var item = Game.familyConflictCore.profile(state, e.id);
      return item && item.suspicion >= 30;
    });
    if (!warning.length) return '';
    var maxSuspicion = Math.max.apply(null, warning.map(function (e) {
      return Math.round(Game.familyConflictCore.profile(state, e.id).suspicion);
    }));
    var label = maxSuspicion >= 75 ? '婚姻危机' : (maxSuspicion >= 50 ? '关系紧张' : '配偶不安');
    return '<div style="margin-bottom:8px;padding:8px 10px;border-left:4px solid ' + (maxSuspicion >= 75 ? '#c23b32' : '#f39c12') + ';border-radius:0 6px 6px 0;background:' + (maxSuspicion >= 75 ? '#fff8eb' : '#fffbeb') + ';font-size:10px">'
      + '<p style="margin:0;font-weight:700;color:' + (maxSuspicion >= 75 ? '#a8453a' : '#b88a35') + '">⚠ ' + label + ' — 疑心 ' + maxSuspicion + '/100</p>'
      + '<p style="margin:2px 0 0;color:var(--ui-muted)">配偶正在怀疑你的行为。及时沟通或修复关系。</p></div>';
  }

  function renderMemberList(state) {
    var members = state.family.filter(function (p) { return p.status === '健康'; });
    var cards = members.map(function (p) {
      var age = U.personAge(state, p);
      var aff = Math.round(p.affection || 50);
      var affColor = aff >= 70 ? 'var(--ui-green, #315f58)' : (aff >= 40 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-red, #a8453a)');
      var actions = Game.familySystem ? Game.familySystem.detailActions(state, p) : [];
      var actionBtns = actions.slice(0, 3).map(function (a) {
        return '<button type="button" data-detail-family="' + p.id + '" data-family-action="' + a[0] + '" style="min-height:32px;padding:2px 8px;border:1px solid var(--ui-line);border-radius:4px;background:var(--ui-paper);font-size:9px;color:var(--ui-ink)">' + a[1] + '</button>';
      }).join('');
      var specterTag = p.specterPossessed
        ? '<span style="display:inline-block;padding:1px 5px;border-radius:3px;background:rgba(194,59,50,0.12);color:#a8453a;font-size:8px;margin-left:4px">幽诡</span>'
        : '';
      return '<article style="padding:10px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-paper);margin-bottom:6px">'
        + '<div style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:start">'
        + Game.portraitSystem.avatar(p)
        + '<div style="min-width:0">'
        + '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">'
        + '<p style="font-size:13px;font-weight:700;margin:0;color:var(--ui-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + '</p>'
        + specterTag
        + '</div>'
        + '<p style="font-size:10px;color:var(--ui-muted);margin:0 0 4px">' + p.relation + ' · ' + age + '岁 · ' + (p.personality || '') + (p.trait ? ' · ' + p.trait : '')
        + (p.job && p.job !== '无' ? ' · ' + p.job : '') + '</p>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:9px;color:var(--ui-muted);white-space:nowrap">好感</span>'
        + '<progress value="' + aff + '" max="100" style="flex:1;height:4px"></progress>'
        + '<span style="font-size:10px;font-weight:750;color:' + affColor + ';white-space:nowrap">' + aff + '</span></div>'
        + (actionBtns ? '<div style="display:flex;gap:4px;flex-wrap:wrap">' + actionBtns + '</div>' : '')
        + '</div></div></article>';
    }).join('');

    return '<section style="margin-bottom:8px"><p style="font-size:11px;font-weight:700;color:var(--ui-ink);margin:0 0 6px">家庭成员</p>'
      + (cards || '<p class="empty-state">暂无家庭成员</p>') + '</section>';
  }

  function renderChildrenPanel(state) {
    var children = state.family.filter(function (p) { return ['儿子', '女儿'].includes(p.relation) && p.status === '健康'; });
    if (!children.length) return '';
    var age = U.age(state);
    var cards = children.map(function (child) {
      var cAge = U.personAge(state, child);
      var up = child.upbringing || {};
      var care = Math.round(up.care || 0);
      var edu = Math.round(up.education || 0);
      var ind = Math.round(up.independence || 0);
      var hlth = Math.round(up.health || 0);
      var bar = function (label, val, color) {
        return '<div style="margin-bottom:2px"><span style="font-size:8px;color:var(--ui-muted)">' + label + '</span><div style="display:flex;align-items:center;gap:4px"><progress value="' + val + '" max="100" style="flex:1;height:3px"></progress><span style="font-size:8px;color:' + color + '">' + val + '</span></div></div>';
      };
      var actions = cAge < 18 ? (Game.parenting ? Game.parenting.detailActions(child).map(function (a) {
        return '<button type="button" data-parenting-child="' + child.id + '" data-parenting-action="' + a[0].slice(7) + '" style="min-height:28px;padding:1px 5px;border:1px solid var(--ui-line);border-radius:3px;background:var(--ui-paper);font-size:8px">' + a[1] + '</button>';
      }).join('') : '') : '<button type="button" data-detail-family="' + child.id + '" data-family-action="chat" style="min-height:28px;padding:2px 6px;border:1px solid var(--ui-line);border-radius:4px;font-size:8px;color:var(--ui-ink)">联系</button>';

      return '<article style="padding:8px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-paper)">'
        + '<p style="font-size:11px;font-weight:700;margin:0 0 4px;color:var(--ui-ink)">' + child.name + ' · ' + cAge + '岁</p>'
        + bar('关爱', care, 'var(--ui-green)') + bar('学业', edu, 'var(--ui-gold)') + bar('自主', ind, 'var(--ui-gold)') + bar('健康', hlth, 'var(--ui-green)')
        + '<div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap">' + actions + '</div></article>';
    }).join('');
    var parentInfo = '<p style="font-size:9px;color:var(--ui-muted);margin:0 0 6px">养育方式：' + (state.parenting ? state.parenting.style : '均衡陪伴') + ' · ' + (state.parenting ? state.parenting.focus + '教育' : '未设定') + '</p>';

    return '<section style="margin-bottom:8px"><p style="font-size:11px;font-weight:700;color:var(--ui-ink);margin:0 0 4px">子女成长</p>' + parentInfo + cards + '</section>';
  }

  function renderHouseholdCompact(state) {
    if (!Game.householdSystem) return '';
    var home = state.household || {};
    return '<section style="margin-bottom:8px;padding:10px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-paper)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      + '<p style="font-size:11px;font-weight:700;color:var(--ui-ink);margin:0">家庭协作 · ' + (home.policy || '共同承担') + '</p>'
      + '<p style="font-size:10px;color:var(--ui-muted);margin:0">预算 ¥' + Number(home.sharedBudget || 0).toLocaleString() + '</p></div>'
      + '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;text-align:center;font-size:9px;margin-bottom:6px">'
      + '<div><span style="color:var(--ui-muted)">凝聚</span><br><b style="color:var(--ui-ink);font-size:10px">' + Math.round(home.cohesion || 0) + '</b></div>'
      + '<div><span style="color:var(--ui-muted)">边界</span><br><b style="color:var(--ui-ink);font-size:10px">' + Math.round(home.boundaries || 0) + '</b></div>'
      + '<div><span style="color:var(--ui-muted)">照护</span><br><b style="color:var(--ui-ink);font-size:10px">' + Math.round(home.careBalance || 0) + '</b></div>'
      + '<div><span style="color:var(--ui-muted)">教育</span><br><b style="color:var(--ui-ink);font-size:10px">' + Math.round(home.educationSupport || 0) + '</b></div>'
      + '<div><span style="color:' + ((home.conflict || 0) > 50 ? 'var(--ui-red)' : 'var(--ui-muted)') + '">矛盾</span><br><b style="color:' + ((home.conflict || 0) > 50 ? 'var(--ui-red)' : 'var(--ui-ink)') + ';font-size:10px">' + Math.round(home.conflict || 0) + '</b></div>'
      + '</div>'
      + Game.familyConflict ? Game.familyConflict.render(state) : ''
      + '</section>';
  }

  function renderEventTimeline(state) {
    var events = state.familyEvents || [];
    if (!events.length) return '';
    return '<details class="fold-section" style="margin-bottom:8px"><summary><span>家族事件</span><small>' + events.length + '条</small></summary>'
      + '<div class="fold-content" style="max-height:140px;overflow-y:auto">'
      + events.slice(0, 12).map(function (e) {
        return '<p style="font-size:9px;color:var(--ui-muted);margin:2px 0;padding:2px 0;border-bottom:1px solid var(--ui-line)">'
          + '<b style="color:var(--ui-ink)">' + e.title + '</b> · ' + e.text + '</p>';
      }).join('')
      + '</div></details>';
  }

  Game.familyDashboard = Object.freeze({ render: render });
}(window));
