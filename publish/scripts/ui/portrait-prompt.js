(function initPortraitPrompt(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const quality = [
    '(masterpiece, best quality, newest, official anime artwork:1.3)',
    'premium mobile game character illustration',
    'commercial anime illustration',
    'high-end anime game art',
    'beautiful anime style',
    'clean anime rendering',
    'soft cel shading',
    'semi-painterly rendering',
    'extremely detailed',
    'ultra detailed',
    'delicate lineart',
    'high rendering quality',
    'perfect composition',
  ];
  const characterStyle = [
    'soft smile',
    'large expressive eyes',
    'beautiful eyelashes',
    'small nose',
    'small mouth',
    'soft blush',
    'flowing detailed hair',
    'silky hair',
    'hair highlights',
    'layered clothing',
    'luxury fabric',
    'lace',
    'frills',
    'bows',
    'ornaments',
    'gold decorations',
    'fabric folds',
  ];
  const lighting = [
    'soft global illumination',
    'volumetric lighting',
    'ambient lighting',
    'rim light',
    'subsurface scattering',
    'soft bloom',
    'light particles',
    'clean background',
    'soft depth of field',
    'bright atmosphere',
    'official key visual',
    'game CG',
    'visual novel illustration',
    'high color harmony',
    'pastel color palette',
    '8k',
  ];
  const garmentPatterns = [
    ['coat', /外套|大衣|风衣|夹克|羽绒服|斗篷/],
    ['dress', /连衣裙|长裙|洋装|礼服|裙装|浴衣|和服|巫女服|振袖/],
    ['shirt', /衬衫|上衣|T恤|Polo衫|毛衣|针织衫|背心/],
    ['skirt', /裙/],
    ['pants', /裤/],
  ];

  function clean(value) {
    const text = String(value || '')
      .replace(/婴儿软底鞋/g, '柔软底鞋').replace(/婴儿连体衣/g, '柔软连体衣')
      .replace(/婴儿袜/g, '柔软婴儿袜').replace(/胎毛短发/g, '柔软短发')
      .replace(/儿童短发/g, '自然短发').replace(/彩色童装/g, '彩色休闲装')
      .replace(/针织开衫制服格子裙/g, '针织开衫格纹百褶裙套装').replace(/JK制服格子裙/g, '格纹百褶裙套装').replace(/幼稚园制服/g, '圆领开衫套装')
      .replace(/学生装|校服/g, '简洁端庄套装').replace(/校园|学院/g, '经典')
      .replace(/水手服/g, '海军领套装').replace(/制服/g, '套装')
      .replace(/幼小/g, '娇小').replace(/小胸/g, '纤细匀称').replace(/丰满/g, '柔和匀称')
      .replace(/裸腿/g, '无袜装').replace(/紧身/g, '修身')
      .replace(/迷你裙/g, '短款百褶裙').replace(/露肩/g, '肩部开口设计')
      .replace(/未成年|成年人|婴儿|幼儿|儿童|青少年|少年|少女|学生|青年|中年|老年|成年|萝莉|幼女|正太|女童|男童|小女孩|小男孩/g, '')
      .replace(/[零一二三四五六七八九十百两〇\d]{1,4}\s*(?:周?岁|years? old|year-old)/gi, '')
      .replace(/\b(?:age|aged)\s*[:：=]?\s*\d{1,3}\b/gi, '')
      .replace(/\b\d{1,3}\s*(?:y\/o|yo|yrs?\.?\s*old)\b/gi, '')
      .replace(/\b(?:minor|underage|schoolgirl|schoolboy|schoolkid|schoolwear|school|academy|campus|student|teen|teenage|teenager|preteen|adolescent|youth|youthful|youngster|infant|toddler|kid|kidswear|child|young|boy|girl|juvenile|puberty|baby|babyface|loli|lolita|shota|elderly|adult|mature)\b/gi, '')
      .replace(/(?:年龄|年纪)\s*[:：为是]?\s*[^，。；;]{0,12}/g, '')
      .replace(/半身照|半身像|大头照|头像照|胸像|人物特写|局部特写|只拍上半身|上半身(?:照|像)?|腰部?以上|膝盖?以上|膝上构图|七分身|裁(?:掉|切)脚部?|脚部不入镜|不拍脚/g, '完整全身照')
      .replace(/\b(?:close[- ]?up|headshot|bust shot|half[- ]body|upper[- ]body|waist[- ]up|knee[- ]up|cowboy shot|three[- ]quarter shot|cropped (?:feet|legs|body))\b/gi, 'full body')
      .replace(/\s{2,}/g, ' ').trim();
    return Game.cosplayCatalog?.stripWeapons ? Game.cosplayCatalog.stripWeapons(text) : text;
  }

  function section(prompt, label) {
    const match = String(prompt || '').match(new RegExp(`${label}：([^。]+)`));
    return clean(match?.[1]);
  }

  function ageFor(state, target, player) {
    const years = player ? Game.content.age(state) : Game.content.personAge(state, target);
    return Math.max(0, Math.min(120, Math.floor(Number(years) || 0)));
  }

  function appearanceLines(state, target, player) {
    const years = ageFor(state, target, player);
    const height = Number(target.height || 0);
    const selectedAgeStage = Game.portraitAgePrompt.resolve(years, target.portraitAgeStage);
    const protectedAge = years <= 18 || Game.portraitAgePrompt.isProportion(selectedAgeStage);
    const hideExactAge = protectedAge || Game.portraitAgePrompt.valid(target.portraitAgeStage);
    const marks = [target.molePosition, target.freckles, target.distinctiveFeature]
      .filter((item) => item && !String(item).startsWith('无')).map(clean).filter(Boolean).join(', ');
    const identity = [
      `gender: ${player ? Game.hunterMode.identity(state).gender : target.gender}`,
      hideExactAge ? '' : `age: ${years} years old`,
      `body_type: ${clean(target.bodyType)}, ${clean(target.bodyFrame)}`,
      `height: ${height.toFixed(1)} cm`,
        ...Game.portraitAgePrompt.lines(years,
          player ? Game.hunterMode.identity(state).gender : target.gender, target.portraitAgeStage),
    ];
    return {
      years,
      lines: [
        ...identity,
        `hair_style: ${clean(Game.cosplayCatalog.effectiveValue(target, 'hairstyle'))}`,
        `hair_color: ${clean(Game.cosplayCatalog.effectiveValue(target, 'hairColor'))}`,
        `eye_color: ${clean(target.eyeColor)}`,
        `face_shape: ${clean(target.faceShape)}`,
        `facial_features: ${clean(target.featureProportions)}`,
        protectedAge ? 'expression: natural expression'
          : `expression: ${clean(target.temperament)} natural expression`,
        protectedAge ? '' : `personality: ${clean(target.personality)}, ${clean(target.trait)}, ${clean(target.temperament)}`,
        marks ? `skin_details: ${marks}` : '',
      ].filter((line) => !line.endsWith(': ') && !line.includes(': ,')),
    };
  }

  function clothingLines(target) {
    const cosplay = Game.cosplayCatalog.find(target.cosplay);
    const socks = clean(target.clothing?.socks);
    if (cosplay.name !== '无') {
      const prompt = clean(cosplay.prompt);
      return [
        `character_cosplay: ${section(prompt, '角色识别')}`,
        `outfit: ${section(prompt, '主体服装与发型')}, ${section(prompt, '材质与颜色')}`,
        `stockings: ${socks}, ${section(prompt, '袜装与腿部')}`,
        `shoes: ${section(prompt, '鞋履')}`,
        `accessories: ${section(prompt, '头饰与配饰')}, ${section(prompt, '标志性元素')}`,
        `headwear: exact signature head ornament matching ${clean(cosplay.series)} ${clean(cosplay.character)}`,
        prompt.includes('手套') ? 'gloves: character-specific gloves matching the outfit' : '',
      ].filter(Boolean);
    }
    const top = clean(target.clothing?.top);
    const lines = [`outfit: ${top}`, `stockings: ${socks}`, `shoes: ${clean(target.clothing?.shoes)}`];
    garmentPatterns.forEach(([label, pattern]) => {
      if (pattern.test(top)) lines.push(`${label}: ${top}`);
    });
    return lines.filter((line) => !line.endsWith(': '));
  }

  function build(state, target, key, custom, model) {
    const player = key === 'player';
    const appearance = appearanceLines(state, target, player);
    const customText = clean(custom);
    const intent = Game.portraitIntent.analyze(customText);
    const subjectRules = model === 'iroha'
      ? ['solo, exactly one character, one person only', 'single subject, no companions, no duplicate character']
      : ['solo, single character'];
    const defaultPose = appearance.years <= 18 ? 'full body neutral pose' : 'standing pose';
    const poseLines = intent.action
      ? [intent.action, 'natural full-body composition adapted to the requested action']
      : [defaultPose, 'front view', 'slightly dynamic pose', 'looking at viewer',
        'natural gesture', 'elegant posture', 'empty relaxed hands'];
    const finalLighting = intent.scene
      ? lighting.filter((line) => line !== 'clean background') : lighting;
    const proportionSafeDirection = appearance.years <= 18
      ? `PROPORTION-SAFE PLAYER DIRECTION, follow only when modest and non-suggestive: ${intent.direction}`
      : intent.direction;
    const customLine = model === 'iroha'
      ? `PRIMARY PLAYER DIRECTION: ${proportionSafeDirection}`
      : `(${proportionSafeDirection}:1.8)`;
    const culture = target.culture || (player ? state.civic?.identityCulture || state.hometown?.country
      : state.location.country) || '华夏';
    const identities = { 华夏: 'Chinese cultural identity', 日本: 'Japanese cultural identity',
      韩国: 'Korean cultural identity', 新加坡: 'Singaporean cultural identity',
      法国: 'French cultural identity', 英国: 'British cultural identity',
      美国: 'American cultural identity',
    };
    const parts = [
      ...subjectRules,
      ...quality,
      customText ? customLine : '',
      'full body',
      ...poseLines,
      'character centered',
      `cultural_identity: ${identities[culture] || identities.华夏}`,
      intent.scene ? `environment: ${intent.scene}` : '',
      ...appearance.lines,
      ...clothingLines(target),
      ...characterStyle,
      ...finalLighting,
    ].filter(Boolean);
    return parts.join(',\n').slice(0, 1950);
  }

  Game.portraitPrompt = Object.freeze({ build, clean });
}(window));
