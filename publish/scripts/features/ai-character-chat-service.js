(function initAiCharacterChatService(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var histories = {};
  var inFlight = false;
  var activeRequestId = 0;
  var activePersonId = null;

  function cleanText(value) {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, function (block) { return block.replace(/```/g, ''); })
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 800);
  }

  function ensureHistory(person, state) {
    if (!histories[person.id]?.length) {
      histories[person.id] = [{
        role: 'user',
        content: Game.aiCharacterChatPrompt.personaPrompt(person, state)
          + '\n\n现在，以「' + person.name + '」的身份对玩家说出第一句话。像日常聊天一样自然——不要打招呼说"你好"，而是像你们之间已经有默契那样随便开口。',
        hidden: true,
      }];
    }
    return histories[person.id];
  }

  function trimHistory(history) {
    while (history.length > 25) history.splice(1, 2);
  }

  function buildMessages(person, state, message) {
    var history = ensureHistory(person, state);
    history.push({ role: 'user', content: message });
    trimHistory(history);
    return history.map(function (item) {
      return { role: item.role, content: item.content };
    });
  }

  function visibleHistory(personId) {
    return (histories[personId] || []).filter(function (item) {
      return !item.hidden && (item.role === 'user' || item.role === 'assistant');
    }).map(function (item) {
      return { role: item.role, content: item.content, fallback: Boolean(item.fallback) };
    });
  }

  function hashIndex(value, length) {
    var hash = 0;
    for (var i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return Math.abs(hash) % length;
  }

  function fallbackReply(person, message) {
    var pool = [
      '嗯……最近确实发生了不少事。',
      '我现在不太想聊这个。换个话题吧。',
      '说实话，我也说不太清楚。',
      '你想听真话还是假话？算了，当我没问。',
      '你最近还好吗？我都很少见到你了。',
      '有时候我也不知道自己在想什么。',
      '今天有点累了，不过还能陪你说几句。',
    ];
    if (person.specterPossessed) pool.push('你……是不是感觉到了什么？');
    if (person.specterPurifiedAtMonth) pool.push('你看起来好像认识我，可我真的记不起来了。');
    if (person.institution === '摇篮改造机构') pool.push('以前的事不太重要，现在这样就挺好的。');
    return pool[hashIndex(person.id + ':' + message, pool.length)];
  }

  function errorGuidance(error) {
    var map = {
      RATE_LIMITED: '请求较多，请稍后再次发送',
      QUOTA_EXHAUSTED: 'AI额度或积分不足，本次使用本地回应',
      VIP_REQUIRED: '当前模型需要会员权限，本次使用本地回应',
      UNAUTHORIZED: '登录状态失效，请重新进入游戏',
      TOKEN_EXPIRED: '登录状态失效，请重新进入游戏',
      FORBIDDEN: '当前账号无法使用AI对话',
      SENSITIVE_CONTENT_DETECTED: '消息未通过内容检查，请换一种说法',
      SDK_UNAVAILABLE: '离线预览中，本次使用本地回应',
    };
    return map[error?.code] || '连接不稳定，本次使用本地回应';
  }

  async function chat(person, state, rawMessage, onUpdate) {
    if (inFlight) return { source: 'busy', reason: 'busy' };
    var update = typeof onUpdate === 'function' ? onUpdate : function () {};
    var message = cleanText(rawMessage).slice(0, 200);
    if (!message) return { source: 'invalid', reason: 'empty' };
    var requestId = ++activeRequestId;
    var messages = buildMessages(person, state, message);
    var finalText = '';
    var result;
    var finalMeta;
    inFlight = true;
    activePersonId = person.id;
    try {
      await Game.sdkAdapter.complete({
        model: 'default',
        messages: messages,
        maxTokens: 500,
      }, function (content, done) {
        finalText = cleanText(content);
        if (requestId !== activeRequestId) return;
        if (!done) update(finalText, false, { source: 'ai' });
      });
      if (!finalText) throw Object.assign(new Error('AI没有返回有效内容'), { code: 'EMPTY_RESPONSE' });
      if (requestId !== activeRequestId) result = { source: 'cancelled' };
      else {
        histories[person.id].push({ role: 'assistant', content: finalText });
        result = { source: 'ai', text: finalText };
        finalMeta = { source: 'ai' };
      }
    } catch (error) {
      console.error('AI自由对话失败:', error?.code, error?.message, error?.stack);
      if (requestId !== activeRequestId) result = { source: 'cancelled' };
      else {
        var fallback = fallbackReply(person, message);
        histories[person.id].push({ role: 'assistant', content: fallback, fallback: true });
        finalMeta = { source: 'fallback', errorCode: error?.code, guidance: errorGuidance(error) };
        result = { source: 'fallback', text: fallback, guidance: finalMeta.guidance };
      }
    } finally {
      if (requestId === activeRequestId) {
        inFlight = false;
        activePersonId = null;
      }
    }
    if (result?.text) update(result.text, true, finalMeta);
    return result;
  }

  function clear(personId) {
    if (inFlight && activePersonId === personId) return false;
    delete histories[personId];
    return true;
  }

  Game.aiCharacterChatService = Object.freeze({
    chat: chat,
    clear: clear,
    history: visibleHistory,
    isBusy: function () { return inFlight; },
    busyPersonId: function () { return activePersonId; },
  });
}(window));
