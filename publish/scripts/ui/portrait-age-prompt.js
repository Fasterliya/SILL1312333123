(function initPortraitAgePrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function profile(years) {
    if (years <= 2) return [
      '3-3.5 heads tall', 'large round head, very short rounded limbs, tiny hands and feet',
      'soft compact proportions, fully covered comfortable clothing',
    ];
    if (years <= 7) return [
      '3.5-4 heads tall', 'large round face, short soft jawline, narrow shoulders',
      'short rounded limbs, small hands and feet, straight compact torso',
    ];
    if (years <= 9) return [
      '3.5-4.5 heads tall', 'round face, softly full cheeks, short jawline, narrow shoulders',
      'short rounded limbs, small hands and feet, no visible muscle definition',
      'straight compact torso, loose modest casual clothing, calm natural expression',
    ];
    if (years <= 11) return [
      '4-5 heads tall', 'slightly elongated limbs, visible neck, soft jawline, narrow shoulders',
      'subtly defined waist without exaggerated curves, lively natural expression',
      'casual modest clothing',
    ];
    if (years <= 13) return [
      '5-5.5 heads tall', 'lean compact frame, slender limbs, soft rounded facial features',
      'slightly longer hands and feet, shoulders and pelvis only subtly developed',
      'no exaggerated curves, natural slightly reserved pose, modest coordinated clothing',
    ];
    if (years <= 16) return [
      '5.5-6 heads tall', 'slender balanced frame, visible neck, longer legs',
      'subtle shoulder line, soft but more defined jawline',
      'restrained anatomical development, no exaggerated curves or emphasized musculature',
      'modest contemporary fashion, natural atmosphere',
    ];
    if (years <= 18) return [
      '6-7 heads tall', 'balanced elongated proportions, clear facial structure',
      'clean natural skin, minimal muscle definition, no exaggerated curves',
      'modern modest fashion, bright natural expression, restrained styling',
    ];
    return [];
  }

  function lines(years) {
    const details = profile(years);
    if (!details.length) return [];
    return [
      `body_proportion: ${details[0]}`,
      `proportion_details: ${details.slice(1).join(', ')}`,
      'presentation: fully clothed, modest, neutral, non-suggestive, anatomically consistent proportions',
    ];
  }

  function negative(years) {
    if (years >= 19) return '';
    const common = [
      'overdeveloped anatomy', 'overly sharp facial structure', 'exaggerated body development',
      'sexualized proportions', 'revealing clothing', 'suggestive pose',
      'glamour pose', 'heavy makeup', 'fetish styling',
    ];
    if (years <= 13) common.push('overly elongated legs', 'overly broad shoulders', 'emphasized musculature');
    return common.join(', ');
  }

  Game.portraitAgePrompt = Object.freeze({ lines, negative });
}(window));
