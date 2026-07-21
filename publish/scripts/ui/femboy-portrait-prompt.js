(function initFemboyPortraitPrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function applies(target) {
    return target?.gender === '男'
      && (Game.npcFemboyCareer?.active(target) || target.fashion?.crossplay);
  }

  function visualGender(target, actualGender) {
    return applies(target) ? '女' : actualGender;
  }

  function lines(target, years) {
    if (!applies(target)) return [];
    if (years < 18) {
      return [
        'crossplay_presentation: male cosplayer portraying a feminine character',
        'appearance_direction: soft androgynous face, feminine character wig and modest costume styling',
        'body_direction: natural age-appropriate proportions, fully clothed, non-suggestive presentation',
      ];
    }
    const body = Game.npcFemboyCareer?.ensure(target) && target.bodyMorphology;
    const stage = target.feminineCareer?.stage || 'exploring';
    const result = [
      '(adult feminine male, femboy, male identity with convincingly feminine presentation:1.3)',
      'face_direction: delicate feminine facial features, large expressive eyes, soft makeup, smooth clean face',
      'body_direction: slim feminine male silhouette, refined shoulder line, narrow waist, long slender legs',
      'styling_direction: feminine hairstyle or character wig, cute feminine outfit, elegant feminine posture',
      'identity_lock: retain male identity data while presenting visually close to a cute adult woman',
      'fully clothed, tasteful non-explicit anime character illustration',
    ];
    if (body?.shoulderWidth < 42) result.push('cosmetic_result: visibly narrower softly sloped shoulders');
    if (body?.waistDefinition > 78) result.push('cosmetic_result: strongly defined slim waist');
    if (body?.hipVolume > 62) result.push('cosmetic_result: fuller rounded hip silhouette');
    if (body?.chest > 32) result.push('cosmetic_result: subtle rounded bust contour under clothing');
    if (stage === 'exploring') result.push('transition_stage: early feminine presentation, subtle androgynous male frame');
    if (stage === 'feminized') result.push('transition_stage: polished highly feminine body contour and professional styling');
    return result;
  }

  Game.femboyPortraitPrompt = Object.freeze({ applies, visualGender, lines });
}(window));
