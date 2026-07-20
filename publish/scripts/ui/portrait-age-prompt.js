(function initPortraitAgePrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const proportionStyles = Object.freeze([
    {
      id: 'stage1',
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
      id: 'stage2',
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
      id: 'stage3',
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
      id: 'stage4',
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
      id: 'stage5',
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
  const options = Object.freeze([
    { id: 'stage1', label: '比例阶段一', detail: '3-3.5头身' },
    { id: 'stage2', label: '比例阶段二', detail: '3.5-4.5头身' },
    { id: 'stage3', label: '比例阶段三', detail: '4.5-5头身' },
    { id: 'stage4', label: '比例阶段四', detail: '5-6头身' },
    { id: 'stage5', label: '比例阶段五', detail: '6-7头身' },
    { id: 'style40', label: '成熟阶段', detail: '40-54岁风格' },
    { id: 'style55', label: '年长阶段', detail: '55岁以上风格' },
  ]);
  const optionIds = new Set(options.map((item) => item.id));

  function style40(gender) {
    const identity = gender === '女'
      ? 'elegant mature lady, refined wealthy madam, sophisticated mature feminine charm'
      : 'elegant mature gentleman, refined wealthy bearing, sophisticated mature charm';
    return [
      `age_style_40: (clearly 40-54 years old:1.4), ${identity}`,
      'aging_details_40: subtle forehead lines, crow feet, nasolabial folds, mature skin, poised upper-class presence',
      'age_scope_40: age only face, skin and posture; keep art style, hair and complete cosplay outfit unchanged',
    ];
  }

  function style55(gender) {
    const identity = gender === '女'
      ? 'elegant elderly lady, aristocratic grandmother, graceful mature feminine charm'
      : 'elegant elderly gentleman, aristocratic grandfather, graceful mature dignity';
    return [
      `age_style_55: (clearly elderly 55+ years old:1.5), ${identity}`,
      'aging_details_55: pronounced natural wrinkles, forehead lines, crow feet, nasolabial folds, softened jaw, dignified healthy presence',
      'age_scope_55: age only face, skin and posture; keep art style, hair and complete cosplay outfit unchanged',
    ];
  }

  function automatic(years) {
    if (years >= 55) return 'style55';
    if (years >= 40) return 'style40';
    return proportionStyles.find((style) => years <= style.max)?.id || null;
  }

  function valid(stage) {
    return optionIds.has(stage);
  }

  function resolve(years, override) {
    return valid(override) ? override : automatic(years);
  }

  function isProportion(stage) {
    return /^stage[1-5]$/.test(stage || '');
  }

  function lines(years, gender, override) {
    const stage = resolve(years, override);
    if (stage === 'style55') return style55(gender);
    if (stage === 'style40') return style40(gender);
    return proportionStyles.find((style) => style.id === stage)?.lines || [];
  }

  function negative(years, override) {
    const stage = resolve(years, override);
    if (stage === 'style55') return [
      'insufficient facial aging, overly smooth unlined skin',
      'faint wrinkles, firm unsoftened jawline, ageless facial rendering',
    ].join(', ');
    if (stage === 'style40') return [
      'insufficient facial aging, overly smooth unlined skin',
      'missing forehead lines, missing nasolabial folds, ageless facial rendering',
    ].join(', ');
    return proportionStyles.find((style) => style.id === stage)?.negative || '';
  }

  Game.portraitAgePrompt = Object.freeze({
    options, automatic, resolve, valid, isProportion, lines, negative,
  });
}(window));
