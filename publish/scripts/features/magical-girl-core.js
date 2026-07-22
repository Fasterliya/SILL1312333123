(function initMagicalGirlCore(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function ensure(state) {
    var current = state.magicalGirl;
    state.magicalGirl = current && typeof current === 'object' ? current : {
      active: false,
      stage: '见习',
      magicPower: 50,
      soulGem: 100,
      kills: 0,
      contracts: [],
      missions: [],
      lastPatrolMonth: -2,
      lastPurifyMonth: -1,
      familiar: null,
      corruption: 0,
      bondPartner: null,
      wish: '',
      activeMission: null,
    };
    var mg = state.magicalGirl;
    mg.stage = ['见习', '契约', '觉醒', '终焉'].includes(mg.stage) ? mg.stage : '见习';
    mg.magicPower = Math.max(0, Math.min(100, Number(mg.magicPower) || 0));
    mg.soulGem = Math.max(0, Math.min(100, Number(mg.soulGem) || 0));
    mg.kills = Math.max(0, Number(mg.kills) || 0);
    mg.contracts = Array.isArray(mg.contracts) ? mg.contracts.slice(-8) : [];
    mg.missions = Array.isArray(mg.missions) ? mg.missions.slice(-20) : [];
    mg.lastPatrolMonth = Number.isFinite(mg.lastPatrolMonth) ? mg.lastPatrolMonth : -2;
    mg.lastPurifyMonth = Number.isFinite(mg.lastPurifyMonth) ? mg.lastPurifyMonth : -1;
    mg.familiar = typeof mg.familiar === 'string' ? mg.familiar : null;
    mg.corruption = Math.max(0, Math.min(100, Number(mg.corruption) || 0));
    mg.bondPartner = typeof mg.bondPartner === 'string' ? mg.bondPartner : null;
    mg.wish = typeof mg.wish === 'string' ? mg.wish : '';
    mg.activeMission = null;
    return mg;
  }

  function isMagicalGirl(state) {
    return state.magicalGirl && state.magicalGirl.active === true;
  }

  function isMagicalGirlJob(jobId) {
    return jobId === 'magicalgirl';
  }

  function onJobChange(state) {
    var mg = ensure(state);
    if (state.career.jobId === 'magicalgirl') {
      mg.active = true;
      if (mg.stage === '见习') mg.stage = '契约';
      if (!mg.familiar) {
        var names = ['露娜', '星夜', '银铃', '白羽', '月影', '绯焰'];
        mg.familiar = U.random(names);
      }
      if (!mg.wish) {
        Game.lifeDirector.addLog(state, '魔法契约成立', '你与使魔「' + mg.familiar + '」缔结了契约。从现在开始，你就是魔法少女。', 'milestone');
      }
      mg.magicPower = Math.max(mg.magicPower, 40);
    } else {
      if (mg.active) {
        Game.lifeDirector.addLog(state, '魔法解除', '你离开了魔法少女的行列。使魔「' + (mg.familiar || '未知') + '」陷入了沉眠。', 'milestone');
        mg.activeMission = null;
      }
      mg.active = false;
    }
  }

  function combatBonus(state) {
    var mg = ensure(state);
    if (!mg.active || mg.magicPower <= 0) return { atk: 0, hp: 0, awareness: 0 };
    var atk = Math.round(mg.magicPower * 0.45);
    var hp = Math.round(mg.magicPower * 0.55);
    var awareness = mg.stage === '觉醒' ? 12 : (mg.stage === '终焉' ? 18 : 6);
    if (mg.activeMission && mg.activeMission.bonuses) {
      atk += mg.activeMission.bonuses.atk || 0;
      awareness += mg.activeMission.bonuses.awareness || 0;
    }
    return { atk: atk, hp: hp, awareness: awareness };
  }

  function onKill(state) {
    var mg = ensure(state);
    if (!mg.active) return;
    mg.kills += 1;
    mg.magicPower = Math.min(100, mg.magicPower + 15);
    mg.soulGem = Math.min(100, mg.soulGem + 5);
    if (mg.kills >= 5 && mg.stage === '契约') {
      mg.stage = '觉醒';
      Game.lifeDirector.addLog(state, '觉醒', '你的魔力突破了临界点。使魔「' + (mg.familiar || '使魔') + '」在你耳边低语：你已经不再是普通的魔法少女了。', 'milestone');
    }
    if (mg.kills >= 12 && mg.stage === '觉醒') {
      mg.stage = '终焉';
      Game.lifeDirector.addLog(state, '终焉', '你猎杀幽诡的数量已经让隐界都为之震动。但灵魂宝石也承载了更多的负担。', 'milestone');
    }
  }

  function monthlyDecay(state) {
    var mg = ensure(state);
    if (!mg.active) return;
    mg.soulGem = Math.max(0, mg.soulGem - 2);
    if (mg.soulGem <= 10) {
      mg.corruption = Math.min(100, mg.corruption + U.between(5, 10));
      if (mg.corruption >= 80 && Math.random() < 0.15) {
        Game.lifeDirector.addLog(state, '魔女化', '灵魂宝石在一声清脆的碎裂中崩解。黑暗从宝石裂隙中涌出，你的意识正在被吞噬——', 'danger');
        mg.stage = '魔女';
        mg.active = false;
        mg.activeMission = null;
        state.career.job = null;
        state.career.jobId = null;
        state.career.company = null;
        state.career.salary = 0;
        state.supernatural.spiritCorruption = 100;
      }
    }
  }

  function renderStatus(state) {
    var mg = ensure(state);
    if (!mg.active) return '';
    var stageLabel = mg.stage;
    var soulPct = mg.soulGem;
    var soulColor = soulPct > 50 ? 'var(--ui-green, #315f58)' : (soulPct > 20 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-red, #a8453a)');
    var html = '<div class="magical-status">'
      + '<div class="magical-header" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      + '<div class="magical-emblem" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3d2b6b,#6b3a7d);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">☆</div>'
      + '<div><p style="font-size:13px;font-weight:700;margin:0;color:var(--ui-ink, #263b37)">魔法少女</p>'
      + '<p style="font-size:9px;margin:0;color:var(--ui-muted, #69736f)">' + stageLabel + ' · 使魔「' + (mg.familiar || '无') + '」</p></div></div>'
      + '<div class="magical-bars">'
      + '<div style="margin-bottom:6px"><p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted, #69736f)">灵魂宝石纯净度</p>'
      + '<div style="display:flex;align-items:center;gap:6px"><progress value="' + soulPct + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"><span style="width:' + soulPct + '%"></span></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + soulColor + ';white-space:nowrap">' + soulPct + '/100</span></div></div>'
      + '<div style="margin-bottom:6px"><p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted, #69736f)">魔力</p>'
      + '<div style="display:flex;align-items:center;gap:6px"><progress value="' + mg.magicPower + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"><span style="width:' + mg.magicPower + '%"></span></progress>'
      + '<span style="font-size:11px;font-weight:750;color:var(--ui-green, #315f58);white-space:nowrap">' + mg.magicPower + '/100</span></div></div>'
      + '<div style="display:flex;gap:12px;font-size:10px;color:var(--ui-muted, #69736f)">'
      + '<span>猎杀 <b style="color:var(--ui-ink, #263b37)">' + mg.kills + '</b> 只</span>'
      + '<span>污染 <b style="color:' + (mg.corruption >= 40 ? 'var(--ui-red)' : 'var(--ui-ink)') + '">' + mg.corruption + '</b>/100</span></div>'
      + '</div>'
      + (mg.wish ? '<p style="font-size:10px;margin:8px 0 0;color:var(--ui-muted, #69736f);font-style:italic">愿望：「' + mg.wish + '」</p>' : '')
      + '</div>';
    return html;
  }

  Game.magicalGirlCore = Object.freeze({
    ensure: ensure,
    isMagicalGirl: isMagicalGirl,
    isMagicalGirlJob: isMagicalGirlJob,
    onJobChange: onJobChange,
    combatBonus: combatBonus,
    onKill: onKill,
    monthlyDecay: monthlyDecay,
    renderStatus: renderStatus,
  });
}(window));
