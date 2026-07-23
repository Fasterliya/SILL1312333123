(function initPortraitStageRules(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function resolve(person, state) {
    if (!person || !state) return null;

    var age = person.id === 'player-profile'
      ? U.age(state)
      : U.personAge(state, person);

    var cradle = state.cradle;
    if (cradle && Number(cradle.cosplayLevel) >= 3) return 'stage2';

    if (person.specterPossessed) return 'stage1';

    if (person.developmentTendency === '晚发育' && age < 50) return 'stage2';

    var bodyType = person.bodyType || '';
    if (['娇小纤细', '小胸', '幼小'].indexOf(bodyType) >= 0) return 'stage3';

    var temperament = person.temperament || '';
    if (['可爱', '病弱'].indexOf(temperament) >= 0) return 'stage3';

    return null;
  }

  function apply(person, state) {
    var forced = resolve(person, state);

    if (forced === 'stage2' || forced === 'stage1') {
      var cradle = state.cradle;
      var isCosplay = cradle && Number(cradle.cosplayLevel) >= 3;
      var isSpecter = person.specterPossessed;
      if (isCosplay || isSpecter) {
        person.portraitAgeStage = forced;
        return;
      }
    }

    if (forced) {
      if (Game.portraitAgePrompt && !Game.portraitAgePrompt.valid(person.portraitAgeStage)) {
        person.portraitAgeStage = forced;
      }
    } else {
      if (person.portraitAgeStage && Game.portraitAgePrompt && !Game.portraitAgePrompt.valid(person.portraitAgeStage)) {
        person.portraitAgeStage = null;
      }
    }
  }

  Game.portraitStageRules = Object.freeze({
    resolve: resolve,
    apply: apply,
  });
}(window));
