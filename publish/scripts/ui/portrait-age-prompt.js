(function initPortraitAgePrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const minorStyles = Object.freeze([
    {
      max: 2,
      lines: [
        'minor_age_stage_1: clearly 0-2 years old, age-accurate infant or toddler appearance',
        'body_proportion: 3-3.5 heads tall, oversized round head, tiny compact torso',
        'anatomy_details: full cheeks, almost no visible neck, very short rounded limbs, tiny hands and feet',
        'presentation: fully clothed, comfortable age-appropriate clothing, neutral natural pose, non-suggestive',
      ],
      negative: 'older child, adolescent, adult proportions, long limbs, sharp jaw, visible muscle, heavy makeup, revealing clothing, suggestive pose',
    },
    {
      max: 6,
      lines: [
        'minor_age_stage_2: clearly 3-6 years old, age-accurate young child appearance',
        'body_proportion: 3.5-4.5 heads tall, large round head, short compact torso',
        'anatomy_details: round face, soft cheeks, short jaw, narrow shoulders, short limbs, small hands and feet',
        'presentation: fully clothed, modest child clothing, relaxed playful posture, neutral and non-suggestive',
      ],
      negative: 'infant proportions, teenage appearance, adult proportions, long legs, sharp mature face, broad shoulders, heavy makeup, revealing clothing, suggestive pose',
    },
    {
      max: 10,
      lines: [
        'minor_age_stage_3: clearly 7-10 years old, age-accurate school-age child appearance',
        'body_proportion: 4.5-5 heads tall, compact balanced torso, narrow shoulders',
        'anatomy_details: softly rounded face, short jaw, gradually longer limbs, small hands and feet, no muscle definition',
        'presentation: fully clothed, modest coordinated clothing, lively natural posture, neutral and non-suggestive',
      ],
      negative: 'infant proportions, teenage appearance, adult curves, adult musculature, overly long legs, sharp mature face, heavy makeup, revealing clothing, suggestive pose',
    },
    {
      max: 14,
      lines: [
        'minor_age_stage_4: clearly 11-14 years old, age-accurate early adolescent appearance',
        'body_proportion: 5-6 heads tall, lean compact frame, slender gradually lengthening limbs',
        'anatomy_details: soft youthful face, lightly defined jaw, subtle shoulders and pelvis, restrained physical development',
        'presentation: fully clothed, modest age-appropriate clothing, natural reserved posture, neutral and non-suggestive',
      ],
      negative: 'infant proportions, fully adult anatomy, exaggerated curves, emphasized musculature, glamour styling, heavy makeup, revealing clothing, fetish styling, suggestive pose',
    },
    {
      max: 18,
      lines: [
        'minor_age_stage_5: clearly 15-18 years old, age-accurate older adolescent appearance',
        'body_proportion: 6-7 heads tall, balanced elongated proportions, natural shoulder line',
        'anatomy_details: youthful facial structure, clear but soft jawline, restrained anatomy, minimal muscle definition',
        'presentation: fully clothed, modest contemporary clothing, bright natural expression, neutral and non-suggestive',
      ],
      negative: 'childlike toddler proportions, fully mature adult appearance, exaggerated curves, emphasized musculature, glamour styling, heavy makeup, revealing clothing, fetish styling, suggestive pose',
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

  function minorStyle(years) {
    return minorStyles.find((style) => years <= style.max) || null;
  }

  function lines(years, gender) {
    if (years >= 70) return style70(gender);
    if (years >= 50) return style50(gender);
    return minorStyle(years)?.lines || [];
  }

  function negative(years) {
    if (years >= 70) return [
      'young adult, youthful face, teenage appearance, baby face',
      'smooth unlined skin, ageless face, middle-aged face',
    ].join(', ');
    if (years >= 50) return [
      'young adult, youthful face, teenage appearance, baby face',
      'smooth unlined skin, ageless face',
    ].join(', ');
    if (years >= 19) return '';
    return minorStyle(years)?.negative || '';
  }

  Game.portraitAgePrompt = Object.freeze({ lines, negative });
}(window));
