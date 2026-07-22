(function initMagicalGirlView(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  function render(state) {
    var core = Game.magicalGirlCore;
    if (!core || !core.isMagicalGirl(state)) return '';

    var mg = state.magicalGirl;
    var html = core.renderStatus(state);

    if (mg.activeMission && mg.activeMission.stage <= 5) {
      html += Game.magicalGirlSystem.renderMission(state);
    } else {
      html += '<div class="magical-actions" style="margin-top:10px;padding:12px;border:1px solid var(--ui-line, #d8d5c9);border-radius:6px;background:var(--ui-paper, #fffdf7)">'
        + '<h3 style="font-size:13px;font-weight:700;margin:0 0 6px;color:var(--ui-ink)">魔法少女行动</h3>'
        + '<p style="font-size:10px;color:var(--ui-muted, #69736f);margin:0 0 10px">无薪水。力量来自猎杀。灵魂宝石每月自然消耗 2 点，击杀幽诡回复 5 点。</p>';

      if (!mg.wish) {
        html += '<button type="button" data-mg-wish style="min-height:44px;padding:8px 12px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-green-soft, #edf3ef);color:var(--ui-green, #315f58);font-size:11px;font-weight:750;width:100%;margin-bottom:8px">许下愿望</button>';
      } else {
        html += '<p style="font-size:10px;margin:0 0 8px;color:var(--ui-muted);font-style:italic">愿望：「' + mg.wish + '」</p>';
      }

      var specterCount = state.supernatural ? state.supernatural.specters.length : 0;
      var canPatrol = mg.magicPower > 0 && specterCount > 0;
      var patrolLabel = !mg.magicPower
        ? '魔力枯竭——无法巡逻'
        : specterCount === 0
          ? '当前城市未感知到幽诡'
          : '开始巡逻猎杀';

      html += '<button type="button" data-mg-patrol" style="min-height:44px;padding:8px 12px;border:none;border-radius:5px;background:var(--ui-green, #315f58);color:#fff;font-size:11px;font-weight:750;width:100%;margin-bottom:8px"' + (canPatrol ? '' : ' disabled style="opacity:0.45"') + '>'
        + patrolLabel + (canPatrol ? '（当前' + specterCount + '只幽诡潜伏）' : '') + '</button>';

      var bonus = core.combatBonus(state);
      html += '<div style="margin-top:8px;padding:8px;background:var(--ui-soft, #f4f1e8);border-radius:4px;font-size:10px;color:var(--ui-muted, #69736f)">'
        + '<p style="margin:0;font-weight:700;color:var(--ui-ink)">当前战斗加成</p>'
        + '<p style="margin:2px 0 0">攻击+' + bonus.atk + ' · HP上限+' + bonus.hp + ' · 感知+' + bonus.awareness + '</p>'
        + '</div>';

      if (mg.kills > 0) {
        html += '<div style="margin-top:8px;font-size:10px;color:var(--ui-muted)">'
          + '<p style="margin:0;color:var(--ui-ink);font-weight:700">猎杀记录</p>'
          + '<p style="margin:2px 0 0">共击杀 ' + mg.kills + ' 只幽诡</p>';
        if (mg.contracts.length) {
          html += '<p style="margin:2px 0 0">契约历史：' + mg.contracts.map(function (c) {
            return c.familiar + (c.accepted ? '' : '（拒绝）');
          }).join(' · ') + '</p>';
        }
        html += '</div>';
      }

      if (mg.corruption >= 40) {
        html += '<div style="margin-top:8px;padding:8px;border-left:4px solid #c23b32;background:#fff8eb;border-radius:0 6px 6px 0;font-size:10px;color:#a8453a">'
          + '<p style="margin:0;font-weight:700">灵魂宝石污染警告</p>'
          + '<p style="margin:2px 0 0">污染度 ' + mg.corruption + '/100——当心魔女化</p></div>';
      }

      html += '</div>';
    }

    return '<section class="career-panel">' + html + '</section>';
  }

  Game.magicalGirlView = Object.freeze({ render: render });
}(window));
