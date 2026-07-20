(function initPortraitIntent(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const actionRules = [
    [/睡在床上|在床上睡/, 'sleeping naturally on a bed'],
    [/趴在床上/, 'lying prone on a bed'],
    [/坐在床上/, 'sitting naturally on a bed'],
    [/躺在床上|躺床/, 'lying naturally on a bed'],
    [/侧躺|侧卧/, 'lying naturally on one side'],
    [/仰卧/, 'lying naturally on the back'],
    [/趴着|俯卧/, 'lying prone'],
    [/躺着|躺下|平躺/, 'lying down'],
    [/坐着|坐下|坐在/, 'sitting pose'],
    [/跪着|跪坐|跪在/, 'kneeling pose'],
    [/蹲着|蹲下|蹲在/, 'crouching pose'],
    [/奔跑|跑步|跑动/, 'running pose'],
    [/跳跃|跳起/, 'jumping pose'],
    [/走路|行走|散步/, 'walking naturally'],
    [/跳舞|舞蹈/, 'dancing pose'],
    [/靠着|靠在|倚靠/, 'leaning naturally against the requested surface'],
    [/拥抱|抱着|怀抱/, 'holding the requested subject naturally in both arms'],
    [/手持|拿着|握着|举着/, 'holding the requested object clearly and naturally'],
    [/回头|转身/, 'turning naturally as requested'],
    [/动作|姿势/, 'custom pose matching the player direction'],
  ];
  const sceneRules = [
    [/卧室|床上|床边|被窝/, 'detailed bedroom interior, visible bed, pillows and bedding'],
    [/客厅|沙发/, 'detailed living room interior'],
    [/教室|课堂/, 'detailed academy classroom interior'],
    [/街道|街头/, 'detailed city street background'],
    [/海边|沙滩/, 'detailed seaside background'],
    [/森林|树林/, 'detailed forest background'],
    [/咖啡馆|咖啡厅/, 'detailed cafe interior'],
    [/图书馆|书店/, 'detailed library interior with bookshelves'],
    [/屋顶|天台/, 'detailed rooftop background'],
    [/室内|房间/, 'fully rendered interior environment'],
    [/室外|户外/, 'fully rendered outdoor environment'],
    [/背景|场景/, 'fully rendered environment matching the player direction'],
  ];

  function matchRule(text, rules) {
    return rules.find(([pattern]) => pattern.test(text))?.[1] || '';
  }

  function analyze(text) {
    const source = String(text || '');
    const action = matchRule(source, actionRules);
    const scene = matchRule(source, sceneRules);
    const direction = [source, action, scene].filter(Boolean).join(', ');
    return Object.freeze({ action, scene, direction });
  }

  Game.portraitIntent = Object.freeze({ analyze });
}(window));
