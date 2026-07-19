(function initPortraitSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const drawing = new Set();
  const latest = new Map();
  const errors = new Map();
  let api = null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
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

  function findTarget(key) {
    const state = api.getState();
    if (key === 'player') return state.profile;
    return [...state.family, ...state.contacts].find((person) => person.id === key) || null;
  }

  function neutral(value) {
    return String(value || '')
      .replace(/婴儿软底鞋/g, '柔软底鞋').replace(/婴儿连体衣/g, '柔软连体衣')
      .replace(/婴儿袜/g, '柔软棉袜').replace(/胎毛短发/g, '柔软短发')
      .replace(/儿童短发/g, '自然短发').replace(/彩色童装/g, '彩色休闲装')
      .replace(/幼小/g, '娇小').replace(/小胸/g, '纤细匀称').replace(/丰满/g, '柔和匀称')
      .replace(/裸腿/g, '无袜装').replace(/紧身/g, '修身')
      .replace(/迷你裙/g, '短款百褶裙').replace(/露肩/g, '肩部开口设计')
      .replace(/未成年|成年人|婴儿|幼儿|儿童|少年|少女|青年|中年|老年|成年/g, '')
      .replace(/[零一二三四五六七八九十百两〇\d]{1,4}\s*(?:周?岁|years? old|year-old)/gi, '')
      .replace(/\b(?:age|aged)\s*[:：=]?\s*\d{1,3}\b/gi, '')
      .replace(/\b\d{1,3}\s*(?:y\/o|yo|yrs?\.?\s*old)\b/gi, '')
      .replace(/\b(?:young|teenage|elderly|adult|child)\b/gi, '')
      .replace(/(?:年龄|年纪)\s*[:：为是]?\s*[^，。；;]{0,12}/g, '')
      .replace(/半身照|半身像|大头照|头像照|胸像|人物特写|局部特写|只拍上半身|上半身(?:照|像)?|腰部?以上|膝盖?以上|膝上构图|七分身|裁(?:掉|切)脚部?|脚部不入镜|不拍脚/g, '完整全身照')
      .replace(/\b(?:close[- ]?up|headshot|bust shot|half[- ]body|upper[- ]body|waist[- ]up|knee[- ]up|cowboy shot|three[- ]quarter shot|cropped (?:feet|legs|body))\b/gi, 'full body')
      .replace(/\s{2,}/g, ' ').trim();
  }

  function description(state, target, key, custom) {
    const player = key === 'player';
    const gender = player ? state.gender : target.gender;
    const weighted = custom ? `，(${custom}:1.8)` : '';
    const size = `${Number(target.height || 0).toFixed(1)}cm，${Number(target.weight || 0).toFixed(1)}kg`;
    const style = '仅参考图1的清透日系商业插画画风、细腻线稿、高明度粉彩配色、柔和赛璐璐光影、空气感渐变、发丝高光和材质细节，重绘一个全新角色。不得复制图1人物的身份、五官、现有造型、姿势、摄影器材、文字框、台词、标志或构图。';
    const direction = '必须为完整全身照，人物从头顶到鞋底全部入镜，双手双脚可见，不裁切身体。动作可以站立、端坐或采用自然动态，姿势、取景与场景背景优先遵循玩家附加提示词；未指定时采用自然全身构图与协调环境。端庄自然、服装完整、适合全年龄观看，禁止文字、水印、对话框和摄影器材。';
    const face = `${neutral(target.eyeColor)}瞳色，${neutral(target.faceShape)}，${neutral(target.featureProportions)}`;
    const marks = [target.molePosition, target.freckles, target.distinctiveFeature]
      .filter((item) => item && !String(item).startsWith('无')).map(neutral).join('，');
    const finalize = (text) => text.replace(/\s{2,}/g, ' ').slice(0, 1950);
    const cosplay = Game.cosplayCatalog.find(target.cosplay);
    if (cosplay.name !== '无') {
      return finalize(`${style}现代同人COS全身角色立绘，${gender}性，身高约${Number(target.height || 0).toFixed(1)}cm，${neutral(target.bodyType)}身材，${neutral(target.temperament)}气质，${face}${marks ? `，${marks}` : ''}。高还原扮演${cosplay.name}，${neutral(cosplay.prompt)}。袜子独立搭配为${neutral(target.clothing.socks)}，与套装默认袜装冲突时以此选择为准。发色、发型、主体服装、鞋靴、配饰和道具采用上述COS部件，不混入被绘角色原本的日常穿着${weighted}。${direction}`);
    }
    const clothes = [target.clothing.top, target.clothing.socks, target.clothing.shoes].map(neutral).join('、');
    return finalize(`${style}现代人生模拟游戏角色插画，${gender}性，身高体重约${size}，${neutral(target.hairColor)}${neutral(target.hairstyle)}，${face}，${neutral(target.bodyType)}身材，${neutral(target.temperament)}气质，${neutral(target.personality)}性格，${neutral(target.trait)}特质${marks ? `，${marks}` : ''}，穿${clothes}${weighted}。${direction}`);
  }

  async function retryDraw(input) {
    const retryable = new Set(['RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT', 'DRAW_TIMEOUT', 'CREATE_TASK_FAILED', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE']);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await Game.sdkAdapter.drawEdit(input);
      } catch (err) {
        if (!retryable.has(err?.code) || !err?.retryable || attempt === 1) throw err;
        await new Promise((resolve) => root.setTimeout(resolve, 1200 * (attempt + 1)));
      }
    }
    return null;
  }

  function guidance(err) {
    return {
      SDK_UNAVAILABLE: '请在 Game Studio 预览中生成立绘',
      SENSITIVE_CONTENT_DETECTED: '提示词未通过内容检查，请先清空附加提示词，或更换COS后重试',
      QUOTA_EXHAUSTED: '今日绘图额度或积分不足',
      VIP_REQUIRED: '当前模型需要会员权限',
      UNAUTHORIZED: '登录状态失效，请重新进入游戏',
      TOKEN_EXPIRED: '登录状态失效，请重新进入游戏',
    }[err?.code] || '生成失败，点击按钮可以重试';
  }

  async function generate(key, rawCustom) {
    if (drawing.has(key)) return;
    if (drawing.size >= 2) {
      Game.view.showToast('已有两张立绘正在生成，请稍候', 'warning');
      return;
    }
    const target = findTarget(key);
    if (!target) return;
    if (key !== 'player') Game.npcLife.syncGrowth(api.getState(), target);
    const custom = neutral(String(rawCustom || '').replace(/[\u0000-\u001f]/g, ' ')).slice(0, 120);
    target.customPrompt = custom;
    drawing.add(key);
    errors.delete(key);
    const requestId = (latest.get(key) || 0) + 1;
    latest.set(key, requestId);
    api.refresh();
    try {
      const state = api.getState();
      const reference = await Game.styleReference.load();
      const result = await retryDraw({
        prompt: description(state, target, key, custom),
        images: [reference],
        dimension: '2:3',
        model: 'pro',
      });
      if (latest.get(key) !== requestId || findTarget(key) !== target) return;
      if (!Game.portraitGallery.add(key, result, custom)) throw new Error('绘图结果没有有效图片');
      await api.save();
    } catch (err) {
      if (latest.get(key) !== requestId) return;
      console.error('立绘生成失败:', err?.code, err?.message, err?.stack);
      errors.set(key, guidance(err));
    } finally {
      if (latest.get(key) === requestId) drawing.delete(key);
      api.refresh();
    }
  }

  function portraitMarkup(target, key, name, npc) {
    const image = safeImage(target.portraitUrl);
    const waiting = drawing.has(key);
    const slotAttr = `data-portrait-view="${escape(key)}"`;
    const slot = image ? `<img src="${escape(image)}" alt="${escape(name)}的角色立绘">`
      : `<div class="portrait-empty"><b>${escape(name.slice(-1))}</b><span>尚未生成立绘</span></div>`;
    return `<button class="portrait-slot ${npc ? 'npc-portrait-slot' : ''}" ${slotAttr}
      type="button" aria-label="查看${escape(name)}的立绘大图">${slot}</button>
      <div class="portrait-actions"><p>${waiting ? '参考图重绘中，预计约30-60秒' : (errors.get(key) || '参考图画风 · 自定义描述权重1.8')}</p>
      <label class="prompt-field"><span>附加提示词 · 权重1.8</span>
      <input maxlength="120" value="${escape(target.customPrompt)}" ${npc ? 'data-npc-prompt' : 'id="portraitPromptInput"'}
        placeholder="例如：戴金丝眼镜、手持书本"></label>
      ${npc ? `<button data-npc-generate="${escape(key)}" ${waiting ? 'disabled' : ''}>${image ? '重新生成' : '生成立绘'}</button>` : ''}</div>`;
  }

  function renderPlayer(state, elements) {
    const target = state.profile;
    const image = safeImage(target.portraitUrl);
    const waiting = drawing.has('player');
    elements.portraitSlot.innerHTML = image
      ? `<img src="${escape(image)}" alt="${escape(state.name)}的角色立绘">`
      : `<div class="portrait-empty"><b>${escape(state.name.slice(-1))}</b><span>尚未生成立绘</span></div>`;
    elements.portraitSlot.querySelector('img')?.addEventListener('error', () => {
      if (target.portraitUrl !== image) return;
      errors.set('player', '原立绘地址已失效，已切换其他缓存');
      Game.portraitGallery.remove('player', image);
    }, { once: true });
    elements.portraitStatus.textContent = waiting ? '参考图重绘中，预计约30-60秒'
      : (errors.get('player') || '参考图画风 · 自定义描述权重1.8');
    elements.portraitSlot.disabled = false;
    elements.generatePortraitBtn.disabled = waiting;
    elements.generatePortraitBtn.textContent = waiting ? '生成中…约30-60秒' : (image ? '重新生成立绘' : '生成角色立绘');
    if (document.activeElement !== elements.portraitPromptInput) {
      elements.portraitPromptInput.value = target.customPrompt || '';
    }
  }

  function npcHtml(state, person) {
    return `<section class="panel portrait-panel npc-panel">${portraitMarkup(person, person.id, person.name, true)}</section>`;
  }

  function avatar(person) {
    const image = safeImage(person.portraitUrl);
    return image ? `<img src="${escape(image)}" alt="">` : escape(person.name.slice(-1));
  }

  function configure(options) { api = options; }
  function generatePlayer(custom) { return generate('player', custom); }
  function generateNpc(id, custom) { return generate(id, custom); }
  function cancelAll() {
    latest.forEach((value, key) => latest.set(key, value + 1));
    drawing.clear();
  }

  Game.portraitSystem = Object.freeze({
    configure, renderPlayer, npcHtml, avatar, generatePlayer, generateNpc, cancelAll,
  });
}(window));
