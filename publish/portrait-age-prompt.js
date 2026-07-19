(function initPortraitAgePrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function profile(years) {
    if (years <= 2) return [
      '3-3.5 heads tall', 'large round head, very short rounded limbs, tiny hands and feet',
      'soft infant proportions, fully covered comfortable clothing',
    ];
    if (years <= 7) return [
      '3.5-4 heads tall', 'large round face, short soft jawline, narrow shoulders',
      'short rounded limbs, small hands and feet, straight youthful torso',
    ];
    if (years <= 9) return [
      '3.5-4.5 heads tall', 'round face, softly full cheeks, short jawline, narrow shoulders',
      'short rounded limbs, small hands and feet, no visible muscle definition',
      'straight childlike torso, loose age-appropriate kidswear, innocent natural expression',
    ];
    if (years <= 11) return [
      '4-5 heads tall', 'slightly elongated limbs, visible neck, soft jawline, narrow shoulders',
      'subtly defined waist without adult curves, lively youthful expression',
      'casual age-appropriate kidswear',
    ];
    if (years <= 13) return [
      '5-5.5 heads tall', 'lean preteen frame, slender limbs, soft youthful facial features',
      'slightly longer hands and feet, shoulders and pelvis only subtly developed',
      'no adult curves, natural slightly awkward pose, age-appropriate schoolwear',
    ];
    if (years <= 16) return [
      '5.5-6 heads tall', 'slender adolescent frame, visible neck, longer legs',
      'subtle shoulder line, soft but more defined youthful jawline',
      'age-appropriate immature build, no adult curves or emphasized musculature',
      'modest teen fashion, youthful non-mature atmosphere',
    ];
    if (years <= 18) return [
      '6-7 heads tall', 'late-teen near-adult proportions, youthful face',
      'clean natural skin, minimal muscle definition, no exaggerated curves',
      'modern modest teen fashion, bright expression, non-mature styling',
    ];
    return [];
  }

  function lines(years) {
    const details = profile(years);
    if (!details.length) return [];
    return [
      `body_proportion: ${details[0]}`,
      `age_development: ${details.slice(1).join(', ')}`,
      years < 18
        ? 'safety: strictly age-appropriate anatomy, fully clothed, non-sexualized presentation'
        : 'styling: youthful late-teen appearance without exaggerated mature features',
    ];
  }

  function negative(years) {
    if (years >= 19) return '';
    const common = [
      'mature adult anatomy', 'adult-looking face', 'exaggerated body development',
      'sexualized proportions', 'revealing clothing', 'suggestive pose',
      'glamour pose', 'heavy mature makeup', 'fetish styling',
    ];
    if (years <= 13) common.push('long adult legs', 'broad adult shoulders', 'muscular adult body');
    return common.join(', ');
  }

  Game.portraitAgePrompt = Object.freeze({ lines, negative });
}(window));
