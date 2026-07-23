(function initAiCharacterChat(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var inflight = false;
  var drawInflight = false;
  var chatHistories = {};
  var latestReqId = 0;
  var activePersonId = null;
  var chatState = null;

  var SEX_KEYWORDS = ['交欢', '做爱', '上床', '做吧', '抱我', '亲我', '要你', '想要', '来吧', '别忍了', '晚上', '陪我', '一起睡', '疼你', '爱你', '舒服'];

  var PHOTO_QUALITY = [
    '(masterpiece, best quality, newest:1.3)', 'official anime artwork',
    'soft cel shading', 'beautiful anime style', 'extremely detailed', '8k',
  ];
  var PHOTO_STYLE = [
    'selfie', 'phone camera photo', 'looking at camera', 'casual snapshot',
    'natural lighting', 'indoor ambient light', 'soft focus', 'shallow depth of field',
    'intimate close-up', 'personal photo', 'handheld camera angle',
  ];
  var PHOTO_NEGATIVE = 'lowres, bad anatomy, bad hands, text, watermark, username, signature, ugly, deformed, blurry, monochrome, nsfw, nude';

  function buildPhotoPrompt(person, state, userPrompt) {
    var age = U.personAge(state, person);
    var gender = person.gender === '男' ? 'male' : 'female';
    var hair = person.hairstyle || '';
    var hairColor = person.hairColor || '';
    var eyeColor = person.eyeColor || '';
    var body = person.bodyType || 'slim';
    var top = person.clothing?.top || '';
    var temperament = person.temperament || 'natural expression';
    var personality = person.personality || '';
    var clean = function (s) { return String(s || '').replace(/未成年|儿童|学生/g, '年轻').replace(/[零一二三四五六七八九十百\d]{1,4}\s*岁/g, '').trim(); };

    var parts = [];
    parts.push(PHOTO_QUALITY.join(', '));
    parts.push('1girl' + (gender === 'male' ? ', 1boy' : '') + ', solo');
    parts.push(clean(hair) + ' hair, ' + clean(hairColor) + ' hair');
    parts.push(clean(eyeColor) + ' eyes');
    parts.push(clean(body) + ' body');
    if (top) parts.push('wearing ' + clean(top));
    parts.push(clean(temperament) + ', ' + clean(personality));
    parts.push(age + ' years old');
    parts.push('(' + clean(userPrompt) + ':2.0)');
    parts.push(PHOTO_STYLE.join(', '));

    return { prompt: parts.join(', '), negativePrompt: PHOTO_NEGATIVE };
  }

  var npcPhotoReplies = [
    '按你说的拍了。你看看。', '拍了——别嫌不好看啊。', '喏，你要的照片。',
    '好了好了，发给你了。', '（发了一张照片）这样可以吗？', '将就看吧。随手拍的。',
    '给你。别给别人看。', '拍完才发现头发有点乱……算了。', '嗯。拍好了。',
  ];

  /* ===== Persona Prompt ===== */
  function personaPrompt(person, state) {
    var age = U.personAge(state, person);
    var job = person.job || '无业';
    var personality = person.personality || '普通';
    var trait = person.trait || '';
    var relation = person.relation || '陌生人';
    var gender = person.gender === '男' ? '男性' : '女性';
    var affection = person.affection || 50;
    var corruption = (person.psychology?.corruption || 0);
    var sexAdd = (person.psychology?.sexAddiction || 0);

    var prompt = '【系统指令】你正在扮演一个游戏角色。角色卡。不输出元文本。不描述动作。直接说台词。回复20-60字。\n\n';
    prompt += '姓名：' + person.name + ' | 性别：' + gender + ' | 年龄：' + age + ' | 职业：' + job + '\n';
    prompt += '性格：' + personality + ' | 特点：' + trait + ' | 关系：' + relation + ' | 亲密度：' + affection + '/100\n';
    if (corruption > 30) prompt += '腐化：' + corruption + '/100（' + (corruption > 60 ? '几乎无底线' : '道德淡化') + '）\n';
    if (sexAdd > 40) prompt += '性瘾：' + sexAdd + '/100（' + (sexAdd > 70 ? '极度饥渴' : '有明显冲动') + '）\n';
    prompt += '\n【风格】' + speechStyle(relation, age, gender, personality, affection) + '\n';

    if (person.specterPossessed) {
      var sp = (state.supernatural?.specters || []).find(function (s) { return s.hostId === person.id; });
      prompt += '\n【幽诡寄生】类型：' + (sp ? sp.type : '?') + ' | 阶段：' + (sp ? sp.stage : '?') + '\n' + specterSeduction(person, sp);
    }
    prompt += '\n【性暗示开关】' + seductionRules(person, affection, corruption, sexAdd);
    prompt += '\n\n【照片回复规则】当玩家发送照片（图片气泡）后，你会回复一句简短的话评价或回应这张照片。如果玩家要求你拍照（在生图输入中写了要求），你回复时会提到拍摄相关的话——不会太长，一句即可。';
    prompt += '\n【规则】不要打招呼。像个真人。可以有停顿和省略号。可以拒绝也可以接受。';

    return prompt;
  }

  function speechStyle(rel, age, gen, per, aff) {
    var c = aff >= 80 ? '亲密随意。' : aff >= 50 ? '客气有温度。' : '疏远有距离。';
    var a = age <= 16 ? '少年口吻。' : age <= 22 ? '年轻口吻。' : age <= 40 ? '成年口吻。' : '中年口吻。';
    var r = { '父亲': '父辈。', '母亲': '母辈。', '哥哥': '兄长。', '姐姐': '姐姐。', '弟弟': '弟弟。', '妹妹': '妹妹。', '配偶': '伴侣。' };
    return (r[rel] || (rel + '。')) + c + a;
  }

  function specterSeduction(person, sp) {
    if (!sp) return '';
    var t = sp.type; var s = sp.stage;
    var g = {
      '魅妖': '无意识靠近、暧昧眼神、不小心触碰对方。',
      '淫妖': '用眼神打量身体。说性暗示话后装作若无其事。对亲近者说"今晚有空吗""我有点冷"。',
      '梦魇': '描述暧昧的梦然后岔开话题。',
      '情缚': '反复确认对方不会离开。眼神停留过久。',
      '欲母': '抚摸腹部。用母性包裹诱惑。"你需要被照顾"——手放在不该放的地方。',
    };
    var b = g[t] || '掩饰异常但偶尔答非所问。';
    if (s === '掠食') b += ' 掠食阶段——暗示更大胆更频繁。';
    return b;
  }

  function seductionRules(person, affection, corruption, sexAdd) {
    var p = person.specterPossessed; var r = '';
    if (p || sexAdd > 50 || corruption > 40) {
      r += '当玩家表达亲密意图时可以积极回应。直接要求交欢时：\n';
      if (p) r += '幽诡寄生→几乎必同意（约10%拒绝）。\n';
      if (sexAdd > 70) r += '性瘾极重→几乎必同意，可能主动提出。\n';
      if (affection >= 70) r += '亲密→很可能同意（带害羞）。\n';
      else if (affection >= 40) r += '关系尚可→约40%同意。拒绝时说"这样不好"或"太快了"。\n';
      else r += '不熟→大概率拒绝。\n';
      if (corruption > 60) r += '腐化高→即使不熟也可能同意（"无所谓了"）。\n';
    } else {
      if (affection >= 80) r += '亲密→接受表白但拒绝交欢（"还没到那一步"）。\n';
      else r += '关系一般→拒绝越界暗示。\n';
    }
    return r;
  }

  /* ===== Chat Core ===== */
  function buildMessages(person, state, userMessage) {
    var pid = person.id;
    if (!chatHistories[pid] || !chatHistories[pid].length) {
      chatHistories[pid] = [
        { role: 'user', content: personaPrompt(person, state) + '\n\n以「' + person.name + '」的身份对玩家说第一句话。像已有默契那样随便开口。' },
      ];
    }
    chatHistories[pid].push({ role: 'user', content: userMessage });
    while (chatHistories[pid].length > 24) chatHistories[pid].splice(0, 2);
    return chatHistories[pid].slice();
  }

  function fallbackReply(person) {
    var pool = ['嗯……最近确实发生了不少事。', '（沉默）我现在不太想聊这个。', '你最近还好吗？', '说实话我也说不清楚。'];
    if (person.specterPossessed) pool.push('（盯着你看了很久）你……感觉到了什么吗？', '别离我太近……我不知道还能控制多久。', '你身上有很好闻的味道——不是比喻。');
    if (person.specterPurifiedAtMonth) pool.push('你看起来认识我？抱歉我不记得了。');
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function chat(person, state, message, onUpdate) {
    return new Promise(function (resolve) {
      if (inflight) { var fb = fallbackReply(person); onUpdate(fb, true); return resolve(fb); }
      var reqId = ++latestReqId; var messages = buildMessages(person, state, message); inflight = true;
      try {
        var sdk = root.dzmm; if (!sdk || !sdk.completions) { inflight = false; var fb2 = fallbackReply(person); chatHistories[person.id].push({ role: 'assistant', content: fb2 }); onUpdate(fb2, true); return resolve(fb2); }
        sdk.completions({ model: 'default', messages: messages, maxTokens: 500 }, function (content, done) {
          if (reqId !== latestReqId) return; onUpdate(content, done);
          if (done) { inflight = false; var h = chatHistories[person.id]; var l = h[h.length - 1]; if (l && l.role === 'assistant') l.content = content; else h.push({ role: 'assistant', content: content }); resolve(content); }
        }).catch(function () { inflight = false; var fb3 = fallbackReply(person); chatHistories[person.id].push({ role: 'assistant', content: fb3 }); onUpdate(fb3, true); resolve(fb3); });
      } catch (e) { inflight = false; var fb4 = fallbackReply(person); chatHistories[person.id].push({ role: 'assistant', content: fb4 }); onUpdate(fb4, true); resolve(fb4); }
    });
  }

  /* ===== Photo Generation ===== */
  function generatePhoto(person, state, userPrompt) {
    return new Promise(function (resolve, reject) {
      if (drawInflight) return reject(new Error('正在生成上一张照片'));
      drawInflight = true;
      var spec = buildPhotoPrompt(person, state, userPrompt);
      try {
        Game.sdkAdapter.drawGenerate({ prompt: spec.prompt, negativePrompt: spec.negativePrompt }).then(function (result) {
          drawInflight = false;
          if (result && result.images && result.images[0]) resolve(result.images[0]);
          else reject(new Error('图片生成失败'));
        }).catch(function (e) { drawInflight = false; reject(e); });
      } catch (e) { drawInflight = false; reject(e); }
    });
  }

  /* ===== Encounter ===== */
  function canStartEncounter(person, state) {
    if (!person || person.status === '死亡') return false;
    if (person.specterPossessed) return true;
    var sa = person.psychology?.sexAddiction || 0; var co = person.psychology?.corruption || 0; var af = person.affection || 0;
    return sa > 60 || co > 50 || (af >= 70 && sa > 30);
  }
  function detectIntent(msg) {
    return SEX_KEYWORDS.some(function (k) { return msg.indexOf(k) >= 0; }) ? 'sex' : 'chat';
  }
  function startEncounter(person, state) {
    if (!Game.encounterSystem) return;
    Game.encounterSystem.init(state, person, 'hookup', person.gender === '女' ? 'client' : 'provider');
    Game._refresh(); Game.encounterSystem.showOverlay(state); Game.view.showToast('交欢开始 — ' + person.name, 'good');
  }

  /* ===== UI ===== */
  function renderChat(person, state) {
    var hist = chatHistories[person.id] || [];
    var display = hist.filter(function (m) {
      return m.role === 'assistant' || (m.role === 'user' && !(m.content.indexOf('【系统指令】') >= 0));
    });
    var canEnc = canStartEncounter(person, state);

    return '<div id="aiChatPanel" style="display:flex;flex-direction:column;height:100%;max-height:70vh">'
      + '<header style="padding:8px 10px;border-bottom:1px solid var(--ui-line);display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-weight:700;font-size:11px">💬 ' + (person.name || '') + ' · ' + (person.relation || '') + '</span>'
      + '<button type="button" data-ai-chat-close style="border:none;background:none;font-size:14px;cursor:pointer">✕</button></header>'
      + '<div id="aiChatMessages" style="flex:1;overflow-y:auto;padding:10px;font-size:10px;line-height:1.6">'
      + display.map(function (m) {
        return renderBubble(m);
      }).join('')
      + '</div>'
      + '<div id="aiChatPhotoPrompt" style="display:none;padding:6px 8px;border-top:1px solid var(--ui-line);background:var(--ui-soft)">'
      + '<input id="aiChatPhotoInput" type="text" placeholder="描述你想要的照片：姿势、表情、场景……" style="width:100%;padding:5px 8px;border:1px solid var(--ui-line);border-radius:4px;font-size:9px" maxlength="150">'
      + '<div style="display:flex;gap:6px;margin-top:4px"><button type="button" id="aiChatPhotoGo" style="flex:1;padding:5px;border:none;border-radius:4px;background:var(--ui-green,#315f58);color:#fff;font-size:10px;font-weight:700">开始生成（约30-60秒）</button>'
      + '<button type="button" id="aiChatPhotoCancel" style="padding:5px 10px;border:1px solid var(--ui-line);border-radius:4px;background:var(--ui-paper);font-size:10px">取消</button></div></div>'
      + '<div style="padding:8px;border-top:1px solid var(--ui-line);display:flex;gap:6px">'
      + '<input id="aiChatInput" type="text" placeholder="输入消息..." style="flex:1;padding:6px 8px;border:1px solid var(--ui-line);border-radius:4px;font-size:10px" maxlength="200">'
      + '<button type="button" id="aiChatSend" style="padding:6px 10px;border:none;border-radius:4px;background:var(--ui-green,#315f58);color:#fff;font-size:10px;font-weight:700;white-space:nowrap">发送</button>'
      + '<button type="button" id="aiChatPhotoBtn" style="padding:6px 8px;border:none;border-radius:4px;background:#4a80c4;color:#fff;font-size:9px;font-weight:700;white-space:nowrap">📷生图</button>'
      + (canEnc ? '<button type="button" id="aiChatEncounter" style="padding:6px 8px;border:none;border-radius:4px;background:#c44d7a;color:#fff;font-size:9px;font-weight:700;white-space:nowrap">❤</button>' : '')
      + '</div></div>';
  }

  function renderBubble(m) {
    var isUser = m.role === 'user';
    var isImage = m.image && m.image.length > 0;
    var content = (m.content || '').replace(/</g, '&lt;');
    var html = '<div style="margin:6px 0;text-align:' + (isUser ? 'right' : 'left') + '">';
    if (isImage) {
      html += '<div style="display:inline-block;max-width:75%;border-radius:10px;overflow:hidden;cursor:pointer" data-ai-photo-view="' + (m.image || '') + '">'
        + '<img src="' + (m.image || '') + '" style="width:100%;display:block" loading="lazy" onerror="this.style.display=\'none\'">'
        + '</div>';
    }
    if (content) {
      html += '<span style="display:inline-block;max-width:80%;padding:6px 10px;border-radius:8px;margin-top:' + (isImage ? '4px' : '0') + ';'
        + (isUser ? 'background:var(--ui-green,#315f58);color:#fff' : 'background:var(--ui-soft,#e5e4da);color:var(--ui-ink)')
        + '">' + content + '</span>';
    }
    html += '</div>';
    return html;
  }

  function openChat(personId, state) {
    var person = Game.people.find(state, personId);
    if (!person) return;
    activePersonId = personId; chatState = state;
    var ds = document.getElementById('detailScreen'); var dc = document.getElementById('detailContent'); var dt = document.getElementById('detailTitle');
    if (!ds || !dc) return;
    dc.innerHTML = renderChat(person, state);
    if (dt) dt.textContent = 'AI 对话';
    ds.hidden = false; ds.dataset.mode = 'aichat';
    var msgs = document.getElementById('aiChatMessages'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
    setTimeout(function () { var inp = document.getElementById('aiChatInput'); if (inp) inp.focus(); }, 100);
  }

  function sendMessage() {
    if (inflight || !activePersonId || !chatState) return;
    var input = document.getElementById('aiChatInput'); if (!input) return;
    var msg = input.value.trim(); if (!msg) return;
    var person = Game.people.find(chatState, activePersonId); if (!person) return;

    if (detectIntent(msg) === 'sex' && canStartEncounter(person, chatState)) { input.value = ''; closeChat(); startEncounter(person, chatState); return; }

    input.value = ''; input.disabled = true;
    var sb = document.getElementById('aiChatSend'); if (sb) { sb.disabled = true; sb.textContent = '...'; }
    appendUserBubble(msg);
    var thinking = showThinking(person.name);

    chat(person, chatState, msg, function (content, done) {
      if (thinking) thinking.remove();
      updateReplyBubble(content);
      if (done) { if (sb) { sb.disabled = false; sb.textContent = '发送'; } if (input) input.disabled = false; finalizeReplyBubble(); }
    });
  }

  function appendUserBubble(msg) {
    var msgs = document.getElementById('aiChatMessages'); if (!msgs) return;
    msgs.innerHTML += '<div style="margin:6px 0;text-align:right"><span style="display:inline-block;max-width:80%;padding:6px 10px;border-radius:8px;background:var(--ui-green,#315f58);color:#fff">' + msg.replace(/</g, '&lt;') + '</span></div>';
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showThinking(name) {
    var msgs = document.getElementById('aiChatMessages'); if (!msgs) return null;
    var el = document.createElement('div'); el.id = 'aiThinking';
    el.style.cssText = 'margin:6px 0;text-align:left;color:var(--ui-muted);font-size:9px;font-style:italic';
    el.textContent = name + '正在输入...'; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function updateReplyBubble(content) {
    var msgs = document.getElementById('aiChatMessages'); if (!msgs) return;
    var rp = document.getElementById('aiReplyPending');
    if (!rp) { rp = document.createElement('div'); rp.id = 'aiReplyPending'; rp.style.cssText = 'margin:6px 0;text-align:left'; msgs.appendChild(rp); }
    rp.innerHTML = '<span style="display:inline-block;max-width:80%;padding:6px 10px;border-radius:8px;background:var(--ui-soft,#e5e4da);color:var(--ui-ink)">' + content.replace(/</g, '&lt;') + '</span>';
    msgs.scrollTop = msgs.scrollHeight;
  }

  function finalizeReplyBubble() {
    var rp = document.getElementById('aiReplyPending'); if (rp) rp.removeAttribute('id');
  }

  /* ===== Photo UI Actions ===== */
  function showPhotoPrompt() {
    var panel = document.getElementById('aiChatPhotoPrompt'); if (panel) panel.style.display = 'block';
    var input = document.getElementById('aiChatPhotoInput'); if (input) { input.value = ''; setTimeout(function () { input.focus(); }, 50); }
  }
  function hidePhotoPrompt() {
    var panel = document.getElementById('aiChatPhotoPrompt'); if (panel) panel.style.display = 'none';
  }

  function doGeneratePhoto() {
    if (drawInflight || !activePersonId || !chatState) return;
    var person = Game.people.find(chatState, activePersonId); if (!person) return;
    var input = document.getElementById('aiChatPhotoInput'); if (!input) return;
    var userPrompt = input.value.trim() || 'cute selfie, natural pose, smile';
    hidePhotoPrompt();

    var msgs = document.getElementById('aiChatMessages'); if (!msgs) return;
    var thinking = document.createElement('div'); thinking.id = 'aiPhotoThinking';
    thinking.style.cssText = 'margin:6px 0;text-align:left;color:var(--ui-muted);font-size:9px;font-style:italic';
    thinking.textContent = person.name + '正在拍照...'; msgs.appendChild(thinking); msgs.scrollTop = msgs.scrollHeight;

    generatePhoto(person, chatState, userPrompt).then(function (imageData) {
      if (thinking) thinking.remove();
      appendNpcPhoto(person, imageData);
    }).catch(function (e) {
      if (thinking) thinking.remove();
      var fb = npcPhotoReplies[Math.floor(Math.random() * npcPhotoReplies.length)].replace('拍了', '没拍成');
      appendNpcText(person, fb + '（生成失败：' + (e.message || '未知') + '）');
    });
  }

  function appendNpcPhoto(person, imageData) {
    var msgs = document.getElementById('aiChatMessages'); if (!msgs) return;
    var reply = npcPhotoReplies[Math.floor(Math.random() * npcPhotoReplies.length)];
    chatHistories[person.id].push({ role: 'assistant', content: reply, image: imageData });
    msgs.innerHTML += renderBubble({ role: 'assistant', content: reply, image: imageData });
    msgs.scrollTop = msgs.scrollHeight;
  }

  function appendNpcText(person, text) {
    var msgs = document.getElementById('aiChatMessages'); if (!msgs) return;
    chatHistories[person.id].push({ role: 'assistant', content: text });
    msgs.innerHTML += renderBubble({ role: 'assistant', content: text });
    msgs.scrollTop = msgs.scrollHeight;
  }

  function viewPhoto(imageData) {
    if (!imageData) return;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    overlay.innerHTML = '<img src="' + imageData + '" style="max-width:90%;max-height:90%;object-fit:contain;border-radius:8px"><span style="position:absolute;top:10px;right:20px;color:#fff;font-size:18px">✕</span>';
    overlay.addEventListener('click', function () { overlay.remove(); });
    root.document.body.appendChild(overlay);
  }

  function quickEncounter() {
    if (!activePersonId || !chatState) return;
    var person = Game.people.find(chatState, activePersonId);
    if (!person || !canStartEncounter(person, chatState)) return;
    closeChat(); startEncounter(person, chatState);
  }

  function closeChat() { activePersonId = null; chatState = null; var ds = document.getElementById('detailScreen'); if (ds) ds.hidden = true; }

  function handleClick(event) {
    var cb = event.target.closest('[data-npc-chat]'); if (cb) { var st = Game._getState ? Game._getState() : null; if (st) openChat(cb.dataset.npcChat, st); return true; }
    var cl = event.target.closest('[data-ai-chat-close]'); if (cl) { closeChat(); return true; }
    var sd = event.target.closest('#aiChatSend'); if (sd) { sendMessage(); return true; }
    var ec = event.target.closest('#aiChatEncounter'); if (ec) { quickEncounter(); return true; }
    var pb = event.target.closest('#aiChatPhotoBtn'); if (pb) { showPhotoPrompt(); return true; }
    var pg = event.target.closest('#aiChatPhotoGo'); if (pg) { doGeneratePhoto(); return true; }
    var pc = event.target.closest('#aiChatPhotoCancel'); if (pc) { hidePhotoPrompt(); return true; }
    var pv = event.target.closest('[data-ai-photo-view]'); if (pv) { viewPhoto(pv.dataset.aiPhotoView); return true; }
    var inp = event.target.closest('#aiChatInput'); if (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendMessage(); }); return false; }
    return false;
  }

  Game.aiCharacterChat = Object.freeze({
    personaPrompt: personaPrompt, chat: chat, openChat: openChat, closeChat: closeChat,
    handleClick: handleClick, renderChat: renderChat, generatePhoto: generatePhoto,
    canStartEncounter: canStartEncounter, startEncounter: startEncounter,
  });
}(window));
