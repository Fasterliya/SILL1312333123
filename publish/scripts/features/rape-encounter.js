(function initRapeEncounter(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function initRape(state, partner, mode) {
    if (!partner || partner.status !== '健康') return { ok: false, message: '无法开始' };
    const corr = partner.victimCorruption || 0;
    state.encounter.isRape = true;
    state.encounter.victimResistance = corr >= 70 ? 0 : (corr >= 40 ? 50 : 100);
    state.encounter.victimCorruption = corr;
    state.encounter.usedAphrodisiac = false;
    state.encounter.usedDrug = false;
    if (partner.gender === '女') partner.hymenIntact = false;
    Game.encounterSystem.init(state, partner, 'rape', 'client');
    state.encounter.isRape = true;
    state.encounter.victimResistance = state.encounter.victimResistance || 100;
    return { ok: true, message: '暴力开始了' };
  }

  function applyAphrodisiac(state) { state.encounter.usedAphrodisiac = true; }
  function applyDrug(state) { state.encounter.usedDrug = true; state.encounter.victimResistance = Math.max(30, Math.floor(state.encounter.victimResistance / 2)); }

  function tickResistance(state, posName) {
    var dec;
    if (state.encounter.usedDrug) dec = U.between(20, 30);
    else if (state.encounter.usedAphrodisiac) dec = U.between(12, 20);
    else dec = U.between(8, 15);
    state.encounter.victimResistance = U.clamp(state.encounter.victimResistance - dec, 0, 100);
    return resistanceText(state.encounter.victimResistance, partnerName(state));
  }

  function partnerName(state) { var p = Game.people.find(state, state.encounter.partnerId); return p ? p.name : '她'; }

  function resistanceText(res, nm) {
    if (res > 80) return nm + '尖叫着拼命挣扎，指甲在你手臂上划出血痕。';
    if (res > 40) return nm + '的挣扎开始减弱，呼救声变成了哽咽的抽泣。';
    if (res > 0) return nm + '不再呼救，只是无声地流泪，身体偶尔本能地抽搐。';
    return nm + '眼神空洞地望着天花板，已经不再挣扎了。';
  }

  function addCorruption(state, partner) {
    if (!partner || partner.status !== '健康') return;
    partner.victimCorruption = U.clamp((partner.victimCorruption || 0) + U.between(8, 20), 0, 100);
    partner.trauma = U.clamp((partner.trauma || 0) + U.between(15, 30), 0, 100);
    partner.affection = U.clamp(partner.affection - 20, 0, 100);
    partner.trust = U.clamp((partner.trust || 50) - 30, 0, 100);
    Game.criminalSystem && Game.criminalSystem.addRecord(state, 15);
    if (Game.psychology) { Game.psychology.addGuilt(state, 15); Game.psychology.addCorruption(state, 5); }
    if (Math.random() < 0.15) {
      if (Game.criminalSystem) Game.criminalSystem.addRecord(state, U.between(10, 25));
      Game.lifeDirector.addLog(state, '被害报案', partner.name + '向警方报案了你的强奸行为。', 'normal');
    }
  }

  function reportRape(state, partner) {
    if (Game.criminalSystem) Game.criminalSystem.addRecord(state, U.between(10, 20));
    Game.lifeDirector.addLog(state, '警察上门', '深夜的敲门声。两个警察站在门口：我们接到报案——' + partner.name + '指控你对她实施了性侵犯。', 'normal');
  }

  Game.rapeEncounter = Object.freeze({ initRape: initRape, applyAphrodisiac: applyAphrodisiac, applyDrug: applyDrug, tickResistance: tickResistance, resistanceText: resistanceText, addCorruption: addCorruption, reportRape: reportRape });
}(window));
