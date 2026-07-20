(function initProfile(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const catalog = Game.appearanceCatalog;
  const editable = ['cosplay', 'hairColor', 'temperament', 'bodyType', 'hairstyle', 'clothing.top', 'clothing.socks', 'clothing.shoes'];
  let api = null;

  function agePhase(years) {
    if (years < 3) return 0;
    if (years < 6) return 1;
    if (years < 12) return 2;
    if (years < 18) return 3;
    if (years < 23) return 4;
    if (years < 40) return 5;
    if (years < 60) return 6;
    return 7;
  }

  function styleTop(state) {
    const p = Game.hunterMode.identity(state).profile;
    if (['热血', '外向'].includes(p.personality) || p.trait === '勇敢') return '运动穿搭';
    if (p.temperament === '文雅' || ['浪漫', '敏感'].includes(p.trait)) return '文艺穿搭';
    if (p.personality === '理性' || ['务实', '自律'].includes(p.trait)) return '通勤正装';
    return U.age(state) < 24 ? '校园休闲' : '品质日常';
  }

  function phaseStyle(state, phase) {
    const identity = Game.hunterMode.identity(state);
    const p = identity.profile;
    const styles = [
      ['婴儿连体衣', '婴儿袜', '婴儿软底鞋'],
      ['日式幼稚园制服', '短袜', '魔术贴童鞋'],
      ['简洁校服', '白色中筒袜', '白色运动鞋'],
      ['简洁校服', '白色中筒袜', '帆布鞋'],
      [styleTop(state), '船袜', '白色运动鞋'],
      [styleTop(state), '黑色商务袜', '皮鞋'],
      ['品质日常', '船袜', '乐福鞋'],
      ['舒适棉麻', '羊毛袜', '舒适布鞋'],
    ];
    let values = styles[phase];
    if (identity.gender === '女' && [3, 4].includes(phase) && Math.random() < 0.34) {
      values = ['水手服迷你裙', '白色连裤袜', '乐福鞋'];
    }
    p.clothing = { top: values[0], socks: values[1], shoes: values[2] };
    p.styleStage = phase;
  }

  function updateGrowth(state) {
    const identity = Game.hunterMode.identity(state);
    const years = Math.max(0, (state.totalMonths - identity.birthMonth) / 12);
    const age = Math.floor(years);
    const phase = agePhase(age);
    const phaseChanged = identity.profile.styleStage !== phase;
    if (phaseChanged) Game.geneticsGrowth.applyAppearance(identity.profile, identity.gender, years);
    Game.geneticsGrowth.updateGrowth(identity.profile, identity.gender, years, false);
    if (phaseChanged) phaseStyle(state, phase);
    Game.femaleYouthStyle.apply(identity.profile, identity.gender, age);
  }

  function value(profile, field) {
    return Game.cosplayCatalog.effectiveValue(profile, field);
  }

  function optionsFor(key) {
    return key === 'cosplay' ? Game.cosplayCatalog.items : catalog[key];
  }

  function render(state, elements) {
    const identity = Game.hunterMode.identity(state);
    const p = identity.profile;
    Game.portraitSystem.renderPlayer(state, elements);
    elements.profileFacts.innerHTML = [
      ['年龄', `${U.age(state)}岁${Game.timeSystem.ageMonths(state) % 12}月`], ['身高', `${p.height.toFixed(1)} cm`],
      ['体重', `${p.weight.toFixed(1)} kg`], ['成长身高', `${Number(p.maxHeight).toFixed(1)} cm`],
      ['COS服', p.cosplay], ['发色', value(p, 'hairColor')],
      ['发型', value(p, 'hairstyle')], ['瞳色', p.eyeColor], ['气质', p.temperament],
      ...(identity.gender === '女' && state.romance.married
        ? [['生育力', `${Game.demography.fertility(state, p)}%`]] : []),
    ].map(([label, text]) => `<div><span>${label}</span><b>${text}</b></div>`).join('');
    elements.traitGrid.innerHTML = [['性格', p.personality], ['特质', p.trait]]
      .map(([label, text]) => `<div><span>${label}</span><strong>${text}</strong></div>`).join('');
    elements.geneFacts.innerHTML = [
      ['DNA编码', p.genetics.code], ['脸型', p.faceShape], ['五官比例', p.featureProportions],
      ['遗传骨架', p.bodyFrame], ['发育倾向', p.developmentTendency], ['痣', p.molePosition],
      ['雀斑', p.freckles], ['个人特征', p.distinctiveFeature],
    ].map(([label, text]) => `<div><span>${label}</span><strong>${text}</strong></div>`).join('');
    const labels = {
      cosplay: 'COS服', hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型',
      'clothing.top': '身穿', 'clothing.socks': '袜子', 'clothing.shoes': '鞋',
    };
    const rows = editable.map((field) => {
      const covered = Game.cosplayCatalog.overrides(p, field);
      return `<button class="selector-row" data-selector-field="${field}" ${covered ? 'disabled' : ''}>
        <span>${labels[field]}</span><strong>${value(p, field)}</strong>
        <b aria-hidden="true">${covered ? '覆' : '›'}</b></button>`;
    });
    elements.profileEditor.innerHTML = `
      <details class="editor-group" open><summary>角色造型</summary>${rows.slice(0, 5).join('')}</details>
      <details class="editor-group"><summary>独立穿搭</summary>${rows.slice(5).join('')}</details>`;
  }

  function edit(field, nextValue) {
    if (!editable.includes(field)) return false;
    const key = field.startsWith('clothing.') ? field.split('.')[1] : field;
    if (!optionsFor(key)?.some((item) => item.name === nextValue)) return false;
    const state = api.getState();
    const profile = Game.hunterMode.identity(state).profile;
    if (Game.cosplayCatalog.overrides(profile, field)) return false;
    if (field.startsWith('clothing.')) profile.clothing[key] = nextValue;
    else profile[field] = nextValue;
    if (field === 'bodyType') updateGrowth(state);
    api.refresh();
    api.save();
    return true;
  }

  function editTarget(field, nextValue, targetId) {
    if (!targetId) return edit(field, nextValue);
    if (!editable.includes(field)) return false;
    const key = field.startsWith('clothing.') ? field.split('.')[1] : field;
    if (!optionsFor(key)?.some((item) => item.name === nextValue)) return false;
    const state = api.getState();
    const target = Game.people.find(state, targetId);
    if (!target) return false;
    if (Game.cosplayCatalog.overrides(target, field)) return false;
    if (field.startsWith('clothing.')) target.clothing[key] = nextValue;
    else target[field] = nextValue;
    if (field === 'bodyType') Game.npcLife.syncGrowth(state, target);
    api.refresh();
    api.save();
    return true;
  }

  function configure(options) { api = options; }

  Game.profile = Object.freeze({ configure, updateGrowth, render, edit, editTarget });
}(window));
