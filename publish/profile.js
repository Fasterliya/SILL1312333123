(function initProfile(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
  const editable = ['hairColor', 'temperament', 'bodyType', 'hairstyle', 'outfit'];
  let api = null;
  let drawing = false;
  let latestRequest = 0;
  let drawError = '';

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

  function phaseStyle(state, phase) {
    const profile = state.profile;
    const styles = [
      ['黑色', '懵懂', '幼小', '胎毛短发', '婴儿连体衣'],
      ['黑色', '童真', '幼小', '儿童短发', '彩色童装'],
      ['黑色', '清朗', '匀称', '清爽短发', '简洁校服'],
      ['黑色', '青涩', '清瘦', '层次碎发', '简洁校服'],
      ['深棕', '明快', '匀称', '自然层次发', '校园休闲'],
      ['深棕', '沉稳', '匀称', '利落短发', '通勤正装'],
      ['黑灰', '从容', profile.bodyType, '简约短发', '品质日常'],
      ['银灰', '温和', '清瘦', '银丝短发', '舒适棉麻'],
    ];
    [profile.hairColor, profile.temperament, profile.bodyType,
      profile.hairstyle, profile.outfit] = styles[phase];
    if (phase >= 4) profile.outfit = outfitFor(state, phase);
    profile.styleStage = phase;
  }

  function outfitFor(state, phase) {
    const p = state.profile;
    if (phase >= 7) return '舒适棉麻';
    if (p.personality === '热血' || p.interests.运动 > 70) return '运动穿搭';
    if (p.temperament === '文雅' || p.interests.艺术 > 70) return '文艺穿搭';
    if (['理性', '沉稳'].includes(p.personality) || p.temperament === '干练') return '通勤正装';
    return phase === 4 ? '校园休闲' : '品质日常';
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
    let weight = years < 2
      ? 3.4 + years * 6
      : (14.8 + Math.min(7, years * 0.35) + bodyOffset) * (height / 100) ** 2;
    state.profile.height = Math.round(height * 10) / 10;
    state.profile.weight = Math.max(3.2, Math.round(weight * 10) / 10);
    const phase = agePhase(U.age(state));
    if (state.profile.styleStage !== phase) phaseStyle(state, phase);
  }

  function options(field, current) {
    const source = C.appearance[field] || [];
    const values = source.includes(current) ? source : [current, ...source];
    return values.map((value) => `<option value="${value}" ${value === current ? 'selected' : ''}>${value}</option>`).join('');
  }

  function safeImage(url) {
    if (typeof url !== 'string') return '';
    try {
      const parsed = new URL(url, root.location?.href || 'https://game.local');
      return ['https:', 'http:', 'data:', 'blob:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function render(state, elements) {
    const p = state.profile;
    const image = safeImage(p.portraitUrl);
    elements.portraitSlot.innerHTML = image
      ? `<img src="${image}" alt="${state.name}的角色立绘">`
      : `<div class="portrait-empty"><b>${state.name.slice(-1)}</b><span>尚未生成立绘</span></div>`;
    const portrait = elements.portraitSlot.querySelector('img');
    portrait?.addEventListener('error', () => {
      if (state.profile.portraitUrl !== image) return;
      state.profile.portraitUrl = null;
      drawError = '原立绘地址已失效，请重新生成';
      api.save();
      api.refresh();
    }, { once: true });
    elements.portraitStatus.textContent = drawing
      ? '正在生成角色立绘，预计约 30 秒'
      : (drawError || (image ? '立绘已保存到角色档案' : '根据当前外观生成全年龄立绘'));
    elements.portraitSlot.disabled = drawing;
    elements.portraitSlot.setAttribute('aria-busy', String(drawing));
    elements.generatePortraitBtn.disabled = drawing;
    elements.generatePortraitBtn.textContent = drawing ? '生成中…约30秒' : (image ? '重新生成立绘' : '生成角色立绘');
    elements.profileFacts.innerHTML = [
      ['年龄', `${U.age(state)}岁${state.totalMonths % 12}月`],
      ['身高', `${p.height.toFixed(1)} cm`], ['体重', `${p.weight.toFixed(1)} kg`],
      ['性格', p.personality], ['气质', p.temperament], ['身材', p.bodyType],
    ].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
    elements.profileEditor.innerHTML = editable.map((field) => {
      const labels = { hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型', outfit: '服装' };
      return `<label><span>${labels[field]}</span><select data-profile-field="${field}">${options(field, p[field])}</select></label>`;
    }).join('');
    elements.interestGrid.innerHTML = Object.entries(p.interests).map(([name, value]) => (
      `<div><span>${name}</span><i><b style="width:${value}%"></b></i><strong>${value}</strong></div>`
    )).join('');
  }

  function edit(field, value) {
    if (!editable.includes(field) || !C.appearance[field]?.includes(value)) return;
    const state = api.getState();
    state.profile[field] = value;
    if (field === 'bodyType') updateGrowth(state);
    api.refresh();
    api.save();
  }

  function prompt(state) {
    const p = state.profile;
    return `华夏现代人生模拟游戏角色立绘，${state.gender}性，${U.age(state)}岁，${p.hairColor}${p.hairstyle}，${p.bodyType}身材，${p.temperament}气质，${p.personality}性格，穿${p.outfit}。全身站姿，单人，干净浅色背景，精致二次元商业游戏立绘，符合真实年龄，健康自然，全年龄，非性感，无文字，无水印。`;
  }

  async function retryDraw(state) {
    const retryable = new Set(['RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT', 'DRAW_TIMEOUT', 'CREATE_TASK_FAILED', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE']);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await Game.sdkAdapter.drawGenerate({
          prompt: prompt(state), dimension: '2:3', model: 'anime',
          negativePrompt: 'lowres, blurry, bad anatomy, bad hands, text, watermark, nsfw, revealing clothes',
        });
      } catch (err) {
        if (!retryable.has(err?.code) || !err?.retryable || attempt === 1) throw err;
        await new Promise((resolve) => root.setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
    return null;
  }

  async function generate() {
    if (drawing) return;
    const target = api.getState();
    drawing = true;
    drawError = '';
    const requestId = ++latestRequest;
    api.refresh();
    try {
      const result = await retryDraw(target);
      if (requestId !== latestRequest || target !== api.getState()) return;
      target.profile.portraitUrl = result.images[0];
      target.profile.portraitTaskId = result.taskId || null;
      await api.save();
    } catch (err) {
      if (requestId !== latestRequest) return;
      console.error('立绘生成失败:', err?.code, err?.message, err?.stack);
      const guidance = {
        SDK_UNAVAILABLE: '请在 Game Studio 预览中生成立绘',
        SENSITIVE_CONTENT_DETECTED: '当前外观描述未通过内容检查，请调整后重试',
        QUOTA_EXHAUSTED: '今日绘图额度或积分不足',
        VIP_REQUIRED: '当前模型需要会员权限',
        UNAUTHORIZED: '登录状态失效，请重新进入游戏',
        TOKEN_EXPIRED: '登录状态失效，请重新进入游戏',
      };
      drawError = guidance[err?.code] || '生成失败，点击按钮可以重试';
    } finally {
      if (requestId === latestRequest) drawing = false;
      api.refresh();
    }
  }

  function configure(options) { api = options; }
  function cancel() { latestRequest += 1; drawing = false; }

  Game.profile = Object.freeze({ configure, updateGrowth, render, edit, generate, cancel });
}(window));
