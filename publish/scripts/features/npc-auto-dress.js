(function initNpcAutoDress(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var PRIORITY = {
    'genetics': 0, 'phase-style': 1, 'npc-init': 2, 'culture': 3,
    'career': 4, 'encounter': 5, 'specter': 6, 'cosplay': 7,
    'cradle': 8, 'surgery': 9, 'player-lock': Infinity,
  };

  function getReason(person, reason) {
    if (reason.indexOf('encounter-end') >= 0) return reason;
    if (person._playerLocked) return 'player-lock';
    if (person._surgeryLocked) return 'surgery';
    if (person._cradleLocked) return 'cradle';
    if (person._cosplayLocked) return 'cosplay';
    if (person._specterLocked) return 'specter';
    if (person._encounterTemp && reason.indexOf('enc') < 0 && reason !== 'specter') return 'encounter';
    return reason;
  }

  function shouldApply(person, reason) {
    if (!reason) return true;
    if (person._playerLocked) return false;
    var reqPrio = PRIORITY[reason] || 0;
    var curPrio = PRIORITY[person._lastDressReason] || -1;
    return reqPrio >= curPrio;
  }

  function apply(state, person, reason) {
    reason = getReason(person, reason);
    if (!shouldApply(person, reason)) return;

    person._lastDressReason = reason;
    if (reason === 'player-lock') person._playerLocked = true;
    if (reason === 'surgery') person._surgeryLocked = true;

    var catalog = Game.appearanceCatalog;
    if (!catalog || !Game.stylePreference) return;

    switch (reason) {
      case 'genetics': return applyGenetics(state, person);
      case 'phase-style': return applyPhaseStyle(state, person);
      case 'npc-init': return applyNpcInit(state, person);
      case 'culture': return applyCulture(state, person);
      case 'career': return applyCareer(state, person);
      case 'encounter': return applyEncounter(state, person);
      case 'encounter-end': return applyEncounterEnd(state, person);
      case 'specter': return applySpecter(state, person);
      case 'cosplay': return applyCosplay(state, person);
      case 'cradle': return applyCradle(state, person);
      case 'surgery': return;
      case 'player-lock': return;
    }
  }

  function applyGenetics(state, person) {
  }

  function applyPhaseStyle(state, person) {
    Game.stylePreference.assign(person, state);
    var outfit = Game.stylePreference.pickOutfit(person, state);
    applyOutfit(person, outfit);
  }

  function applyNpcInit(state, person) {
    var culture = person.culture || state.location?.country || '华夏';
    if (culture === '日本') Game.stylePreference.override(person, 'wafuu');
    Game.stylePreference.assign(person, state);

    if (person.job && (person.job.indexOf('妓女') >= 0 || person.jobId === 'prostitute')) {
      Game.stylePreference.override(person, 'school', 'sailor');
    }
    if (person.job && (person.job.indexOf('公务员') >= 0 || person.job.indexOf('办公室') >= 0)) {
      Game.stylePreference.override(person, 'formal', 'office');
    }

    var outfit = Game.stylePreference.pickOutfit(person, state);
    applyOutfit(person, outfit);
  }

  function applyCulture(state, person) {
    var culture = person.culture || '';
    if (culture === '日本') {
      Game.stylePreference.override(person, 'wafuu');
      Game.stylePreference.assign(person, state);
      var outfit = Game.stylePreference.pickOutfit(person, state);
      applyOutfit(person, outfit);
    }
  }

  function applyCareer(state, person) {
    if (Math.random() > 0.5) return;
    if (person.job && (person.job.indexOf('公务员') >= 0 || person.job.indexOf('办公室') >= 0)) {
      Game.stylePreference.override(person, 'formal', 'office');
    } else if (person.job && (person.job.indexOf('妓女') >= 0 || person.jobId === 'prostitute')) {
      Game.stylePreference.override(person, 'school', 'sailor');
    } else {
      Game.stylePreference.assign(person, state);
    }
    var outfit = Game.stylePreference.pickOutfit(person, state);
    applyOutfit(person, outfit);
  }

  function applyEncounter(state, person) {
    person._preEncounterOutfit = {
      top: person.clothing ? person.clothing.top : '',
      socks: person.clothing ? person.clothing.socks : '',
      shoes: person.clothing ? person.clothing.shoes : '',
      hair: person.hairstyle || '',
      bodyType: person.bodyType || '',
    };
    person._encounterTemp = true;
    Game.stylePreference.override(person, 'school', 'sailor');
    var outfit = Game.stylePreference.pickOutfit(person, state);
    applyOutfit(person, outfit);
  }

  function applyEncounterEnd(state, person) {
    person._encounterTemp = false;
    if (person._preEncounterOutfit) {
      var pre = person._preEncounterOutfit;
      if (!person.clothing) person.clothing = {};
      person.clothing.top = pre.top;
      person.clothing.socks = pre.socks;
      person.clothing.shoes = pre.shoes;
      person.hairstyle = pre.hair;
      person.bodyType = pre.bodyType;
      person._preEncounterOutfit = null;
    }
    person._lastDressReason = 'career';
  }

  function applySpecter(state, person) {
    person._specterLocked = true;
    var specter = (state.supernatural?.specters || []).find(function (s) { return s.hostId === person.id; });
    var isJapanese = (person.culture || state.location?.country) === '日本';

    if (isJapanese) {
      Game.stylePreference.override(person, 'wafuu');
      var wafuuSubs = ['miko', 'furisode', 'taisho', 'casual'];
      var jpRoll = Math.random();
      var jpSub;
      if (jpRoll < 0.55) jpSub = 'miko';
      else if (jpRoll < 0.80) jpSub = 'furisode';
      else if (jpRoll < 0.95) jpSub = 'taisho';
      else jpSub = 'casual';
      person._styleSub = jpSub;
    } else {
      Game.stylePreference.override(person, 'school');
      var type = specter ? specter.type : '怨灵';
      var weights = {
        '怨灵': ['sailor', 50, 'jk', 30, 'blazer', 20],
        '恶煞': ['sailor', 30, 'jk', 40, 'blazer', 30],
        '魅妖': ['sailor', 70, 'jk', 20, 'blazer', 10],
        '淫妖': ['sailor', 75, 'jk', 15, 'blazer', 10],
        '梦魇': ['sailor', 45, 'jk', 35, 'blazer', 20],
        '情缚': ['sailor', 60, 'jk', 25, 'blazer', 15],
        '欲母': ['sailor', 50, 'jk', 20, 'blazer', 30],
      };
      var w = weights[type] || weights['怨灵'];
      var total = w[1] + w[3] + w[5];
      var r = Math.random() * total;
      if (r < w[1]) person._styleSub = 'sailor';
      else if (r < w[1] + w[3]) person._styleSub = 'jk';
      else person._styleSub = 'blazer';
    }

    var outfit = Game.stylePreference.pickOutfit(person, state);
    applyOutfit(person, outfit);
  }

  function applyCosplay(state, person) {
    person._cosplayLocked = true;
  }

  function applyCradle(state, person) {
    person._cradleLocked = true;
    Game.stylePreference.override(person, 'wafuu', 'furisode');
  }

  function applyOutfit(person, outfit) {
    if (!outfit) return;
    if (!person.clothing) person.clothing = {};
    if (outfit.top) person.clothing.top = outfit.top;
    if (outfit.socks) person.clothing.socks = outfit.socks;
    if (outfit.shoes) person.clothing.shoes = outfit.shoes;
    if (outfit.hair) person.hairstyle = outfit.hair;
  }

  Game.appearancePipeline = Object.freeze({
    apply: apply,
    getReason: getReason,
    shouldApply: shouldApply,
    PRIORITY: PRIORITY,
  });
}(window));
