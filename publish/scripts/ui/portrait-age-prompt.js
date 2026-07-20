(function initPortraitAgePrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const proportionStyles = Object.freeze([
    {
      max: 2,
      lines: [
        'proportion_stage_1: compact 3-3.5 heads tall silhouette',
        'facial_structure: oversized round head, full cheeks, very short soft jawline, almost no visible neck',
        'anatomy_details: tiny compact torso, very short rounded limbs, tiny hands and feet',
        'presentation: fully clothed, comfortable modest clothing, neutral natural pose',
      ],
      negative: 'elongated silhouette, long limbs, sharp angular jaw, broad shoulders, pronounced muscle definition',
    },
    {
      max: 6,
      lines: [
        'proportion_stage_2: compact 3.5-4.5 heads tall silhouette',
        'facial_structure: large round head, soft cheeks, short jawline, narrow neck',
        'anatomy_details: short compact torso, narrow shoulders, short limbs, small hands and feet',
        'presentation: fully clothed, comfortable modest clothing, relaxed natural posture',
      ],
      negative: 'extremely oversized head, overly elongated silhouette, long legs, sharp angular jaw, broad shoulders, pronounced muscle definition',
    },
    {
      max: 10,
      lines: [
        'proportion_stage_3: balanced 4.5-5 heads tall silhouette',
        'facial_structure: softly rounded face, short jawline, gentle cheek contours',
        'anatomy_details: compact balanced torso, narrow shoulders, gradually longer limbs, small hands and feet',
        'presentation: fully clothed, modest coordinated clothing, lively natural posture',
      ],
      negative: 'extremely oversized head, overly elongated silhouette, exaggerated body shape, pronounced musculature, sharp angular face',
    },
    {
      max: 14,
      lines: [
        'proportion_stage_4: lean 5-6 heads tall silhouette',
        'facial_structure: soft facial contours, lightly defined jawline, balanced feature spacing',
        'anatomy_details: compact frame, slender lengthening limbs, subtle shoulder and pelvis lines',
        'presentation: fully clothed, modest coordinated clothing, natural reserved posture',
      ],
      negative: 'extremely oversized head, very short limbs, exaggerated body shape, broad shoulders, emphasized musculature, sharp angular face',
    },
    {
      max: 18,
      lines: [
        'proportion_stage_5: balanced 6-7 heads tall silhouette',
        'facial_structure: clear soft facial contours, gently defined jawline, balanced feature spacing',
        'anatomy_details: naturally elongated limbs, balanced torso, natural shoulder line, minimal muscle definition',
        'presentation: fully clothed, modest contemporary clothing, bright natural expression',
      ],
      negative: 'extremely oversized head, very short rounded limbs, exaggerated body shape, broad shoulders, emphasized musculature, harsh angular face',
    },
  ]);

  function style50(gender) {
    const identity = gender === '女'
      ? 'elegant mature lady, refined wealthy madam, sophisticated mature feminine charm'
      : 'elegant mature gentleman, refined wealthy bearing, sophisticated mature charm';
    return [
      `age_style_50: (clearly 50-69 years old:1.4), ${identity}`,
      'aging_details_50: subtle forehead lines, crow feet, nasolabial folds, mature skin, poised upper-class presence',
      'age_scope_50: age only face, skin and posture; keep art style, hair and complete cosplay outfit unchanged',
    ];
  }

  function style70(gender) {
    const identity = gender === '女'
      ? 'elegant elderly lady, aristocratic grandmother, graceful mature feminine charm'
      : 'elegant elderly gentleman, aristocratic grandfather, graceful mature dignity';
    return [
      `age_style_70: (clearly elderly 70+ years old:1.5), ${identity}`,
      'aging_details_70: pronounced natural wrinkles, forehead lines, crow feet, nasolabial folds, softened jaw, dignified healthy presence',
      'age_scope_70: age only face, skin and posture; keep art style, hair and complete cosplay outfit unchanged',
    ];
  }

  function proportionStyle(years) {
    return proportionStyles.find((style) => years <= style.max) || null;
  }

  function lines(years, gender) {
    if (years >= 70) return style70(gender);
    if (years >= 50) return style50(gender);
    return proportionStyle(years)?.lines || [];
  }

  function negative(years) {
    if (years >= 70) return [
      'insufficient facial aging, overly smooth unlined skin',
      'faint wrinkles, firm unsoftened jawline, ageless facial rendering',
    ].join(', ');
    if (years >= 50) return [
      'insufficient facial aging, overly smooth unlined skin',
      'missing forehead lines, missing nasolabial folds, ageless facial rendering',
    ].join(', ');
    if (years >= 19) return '';
    return proportionStyle(years)?.negative || '';
  }

  Game.portraitAgePrompt = Object.freeze({ lines, negative });
}(window));
