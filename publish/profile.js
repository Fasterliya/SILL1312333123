(function initProfile(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const catalog = Game.appearanceCatalog;
  const editable = ['hairColor', 'temperament', 'bodyType', 'hairstyle', 'clothing.top', 'clothing.socks', 'clothing.shoes'];
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
    const p = state.profile;
    if (['热血', '外向'].includes(p.personality) || p.trait === '勇敢') return '运动穿搭';
    if (p.temperament === '文雅' || ['浪漫', '敏感'].includes(p.trait)) return '文艺穿搭';
    if (p.personality === '理性' || ['务实', '自律'].includes(p.trait)) return '通勤正装';
    return U.age(state) < 24 ? '校园休闲' : '品质日常';
  }

  function phaseStyle(state, phase) {
    const p = state.profile;
    const styles = [
      ['黑色', '懵懂', '幼小', '胎毛短发', '婴儿连体衣', '婴儿袜', '婴儿软底鞋'],
      ['黑色', '童真', '幼小', '儿童短发', '彩色童装', '短棉袜', '魔术贴童鞋'],
      ['黑色', '清朗', '匀称', '清爽短发', '简洁校服', '白色中筒袜', '白色运动鞋'],
      ['黑色', '青涩', '清瘦', '层次碎发', '简洁校服', '白色中筒袜', '帆布鞋'],
      ['深棕', '明快', '匀称', '自然层次发', styleTop(state), '短棉袜', '白色运动鞋'],
      ['深棕', '沉稳', '匀称', '利落短发', styleTop(state), '黑色商务袜', '皮鞋'],
      ['黑灰', '从容', p.bodyType, '简约短发', '品质日常', '短棉袜', '乐福鞋'],
      ['银灰', '温和', '清瘦', '银丝短发', '舒适棉麻', '羊毛袜', '舒适布鞋'],
    ];
    const values = styles[phase];
    [p.hairColor, p.temperament, p.bodyType, p.hairstyle] = values;
    p.clothing = { top: values[4], socks: values[5], shoes: values[6] };
    p.styleStage = phase;
  }

  function updateGrowth(state) {
    const years = state.totalMonths / 12;
    const seed = state.profile.growthSeed;
    let height;
    if (years < 1) height = 50 + years * 25;
    else if (years < 3) height = 75 + (years - 1) * 10;
    else if (years < 6) height = 95 + (years - 3) * 7;
    else if (years < 12) height = 116 + (years - 6) * 5.7;
    else {
      const adult = state.gender === '男' ? 175 : 164;
      height = 150 + (adult - 150) * Math.min(1, (years - 12) / 6);
    }
    height += seed * Math.min(1, years / 14);
    const bodyOffset = { 幼小: -1, 清瘦: -1.2, 匀称: 0, 健壮: 1.8, 丰润: 2.5 }[state.profile.bodyType] || 0;
    const weight = years < 2 ? 3.4 + years * 6
      : (14.8 + Math.min(7, years * 0.35) + bodyOffset) * (height / 100) ** 2;
    state.profile.height = Math.round(height * 10) / 10;
    state.profile.weight = Math.max(3.2, Math.round(weight * 10) / 10);
    const phase = agePhase(U.age(state));
    if (state.profile.styleStage !== phase) phaseStyle(state, phase);
  }

  function value(profile, field) {
    return field.startsWith('clothing.') ? profile.clothing[field.split('.')[1]] : profile[field];
  }

  function render(state, elements) {
    const p = state.profile;
    Game.portraitSystem.renderPlayer(state, elements);
    elements.profileFacts.innerHTML = [
      ['年龄', `${U.age(state)}岁${state.totalMonths % 12}月`], ['身高', `${p.height.toFixed(1)} cm`],
      ['体重', `${p.weight.toFixed(1)} kg`], ['发色', p.hairColor], ['发型', p.hairstyle], ['气质', p.temperament],
    ].map(([label, text]) => `<div><span>${label}</span><b>${text}</b></div>`).join('');
    elements.traitGrid.innerHTML = [['性格', p.personality], ['特质', p.trait]]
      .map(([label, text]) => `<div><span>${label}</span><strong>${text}</strong></div>`).join('');
    const labels = {
      hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型',
      'clothing.top': '身穿', 'clothing.socks': '袜子', 'clothing.shoes': '鞋',
    };
    elements.profileEditor.innerHTML = editable.map((field) => (
      `<button class="selector-row" data-selector-field="${field}"><span>${labels[field]}</span>
        <strong>${value(p, field)}</strong><b aria-hidden="true">›</b></button>`
    )).join('');
  }

  function edit(field, nextValue) {
    if (!editable.includes(field)) return false;
    const key = field.startsWith('clothing.') ? field.split('.')[1] : field;
    if (!catalog[key]?.some((item) => item.name === nextValue)) return false;
    const state = api.getState();
    if (field.startsWith('clothing.')) state.profile.clothing[key] = nextValue;
    else state.profile[field] = nextValue;
    if (field === 'bodyType') updateGrowth(state);
    api.refresh();
    api.save();
    return true;
  }

  function configure(options) { api = options; }

  Game.profile = Object.freeze({ configure, updateGrowth, render, edit });
}(window));
