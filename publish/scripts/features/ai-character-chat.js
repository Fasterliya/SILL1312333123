(function initAiCharacterChat(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var activePersonId = null;
  var chatState = null;
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function quickPrompts(person) {
    var prompts = ['最近过得怎么样？', '你现在在想什么？', '有件事想听听你的看法。'];
    if (Number(person.affection) >= 70) prompts.unshift('最近有没有想我？');
    else prompts.unshift('最近有什么新鲜事？');
    return prompts.slice(0, 4);
  }
  function messageHtml(message) {
    var user = message.role === 'user';
    var label = user ? '我' : '角色';
    return '<article class="ai-chat-message ' + (user ? 'is-user' : 'is-character') + '">'
      + '<span class="ai-chat-speaker">' + label + '</span>'
      + '<div class="ai-chat-bubble">' + escape(message.content) + '</div>'
      + (message.fallback ? '<small class="ai-chat-fallback">本地回应</small>' : '')
      + '</article>';
  }
  function contextHtml(person, state) {
    var age = Game.content.personAge(state, person);
    var affection = Math.max(0, Math.min(100, Math.round(Number(person.affection) || 0)));
    var avatar = Game.portraitSystem?.avatar(person) || escape(person.name.slice(-1));
    return '<section class="ai-chat-context"><div class="ai-chat-avatar">' + avatar + '</div>'
      + '<div class="ai-chat-identity"><div><h3>' + escape(person.name) + '</h3>'
      + '<span class="ai-chat-online"><i></i>可对话</span></div>'
      + '<p>' + escape(person.relation || '熟人') + ' · ' + age + '岁 · '
      + escape(person.personality || '普通') + '</p>'
      + '<div class="ai-chat-affection"><span>好感</span><progress max="100" value="' + affection + '"></progress>'
      + '<strong>' + affection + '</strong></div></div>'
      + '<button class="ai-chat-clear" type="button" data-ai-chat-clear aria-label="清空对话" title="清空对话">↻</button></section>';
  }
  function renderChat(person, state) {
    var history = Game.aiCharacterChatService.history(person.id);
    var messages = history.length ? history.map(messageHtml).join('')
      : '<div class="ai-chat-empty"><strong>这次想聊什么？</strong><span>'
      + escape(person.name) + '正在等你开口。</span></div>';
    if (Game.aiCharacterChatService.busyPersonId() === person.id) messages += '<article id="aiReplyPending" class="ai-chat-message is-character is-pending"><span class="ai-chat-speaker">角色</span><div class="ai-chat-bubble"><span class="ai-chat-typing" aria-label="正在输入"><i></i><i></i><i></i></span></div></article>';
    var prompts = quickPrompts(person).map(function (prompt) {
      return '<button type="button" data-ai-chat-prompt="' + escape(prompt) + '">' + escape(prompt) + '</button>';
    }).join('');
    return '<div id="aiChatPanel" class="ai-chat-panel">'
      + contextHtml(person, state)
      + '<div id="aiChatMessages" class="ai-chat-messages" aria-live="polite">' + messages + '</div>'
      + '<div class="ai-chat-compose"><div class="ai-chat-prompts" aria-label="快捷话题">' + prompts + '</div>'
      + '<form id="aiChatComposer" class="ai-chat-form"><label for="aiChatInput">消息</label>'
      + '<textarea id="aiChatInput" rows="1" maxlength="200" placeholder="说点什么…"></textarea>'
      + '<span id="aiChatCounter" class="ai-chat-counter">0/200</span>'
      + '<button id="aiChatSend" class="ai-chat-send" type="submit" aria-label="发送消息" title="发送">↑</button></form>'
      + '<p id="aiChatStatus" class="ai-chat-status" role="status">Enter发送 · Shift+Enter换行</p></div></div>';
  }
  function scrollToLatest() {
    var messages = document.getElementById('aiChatMessages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }
  function setBusy(busy, label) {
    var input = document.getElementById('aiChatInput');
    var send = document.getElementById('aiChatSend');
    var clear = document.querySelector('[data-ai-chat-clear]');
    if (input) input.disabled = busy;
    if (send) send.disabled = busy;
    if (clear) clear.disabled = busy;
    var status = document.getElementById('aiChatStatus');
    if (status) status.textContent = label || (busy ? '正在生成回复…' : 'Enter发送 · Shift+Enter换行');
  }
  function appendUserMessage(message) {
    var messages = document.getElementById('aiChatMessages');
    if (!messages) return;
    messages.querySelector('.ai-chat-empty')?.remove();
    messages.insertAdjacentHTML('beforeend', messageHtml({ role: 'user', content: message }));
    var pending = document.createElement('article');
    pending.id = 'aiReplyPending';
    pending.className = 'ai-chat-message is-character is-pending';
    pending.innerHTML = '<span class="ai-chat-speaker">角色</span><div class="ai-chat-bubble">'
      + '<span class="ai-chat-typing" aria-label="正在输入"><i></i><i></i><i></i></span></div>';
    messages.appendChild(pending);
    scrollToLatest();
  }
  function updatePending(personId, content, done, meta) {
    if (activePersonId !== personId) return;
    var pending = document.getElementById('aiReplyPending');
    if (!pending) return;
    var bubble = pending.querySelector('.ai-chat-bubble');
    if (bubble && content) bubble.textContent = content;
    if (!done) {
      setBusy(true, '正在回复…');
      scrollToLatest();
      return;
    }
    pending.removeAttribute('id');
    pending.classList.remove('is-pending');
    if (meta?.source === 'fallback') {
      pending.insertAdjacentHTML('beforeend', '<small class="ai-chat-fallback">本地回应</small>');
    }
    setBusy(false, meta?.guidance || '已回复');
    document.getElementById('aiChatInput')?.focus();
    scrollToLatest();
  }
  async function sendMessage(rawMessage) {
    if (!activePersonId || !chatState || Game.aiCharacterChatService.isBusy()) return;
    var input = document.getElementById('aiChatInput');
    var message = String(rawMessage ?? input?.value ?? '').trim().slice(0, 200);
    if (!message) {
      setBusy(false, '请输入消息后再发送');
      return;
    }
    var person = Game.people.find(chatState, activePersonId);
    if (!person) return;
    if (input) {
      input.value = '';
      input.style.height = '';
    }
    var counter = document.getElementById('aiChatCounter');
    if (counter) counter.textContent = '0/200';
    appendUserMessage(message);
    setBusy(true, person.name + '正在输入…');
    await Game.aiCharacterChatService.chat(person, chatState, message, function (content, done, meta) {
      updatePending(person.id, content, done, meta);
    });
    if (activePersonId && activePersonId !== person.id && !Game.aiCharacterChatService.isBusy()) setBusy(false, '可以继续对话');
  }
  function bindComposer() {
    var form = document.getElementById('aiChatComposer');
    var input = document.getElementById('aiChatInput');
    form?.addEventListener('submit', function (event) {
      event.preventDefault();
      sendMessage();
    });
    input?.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
    input?.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 104) + 'px';
      var counter = document.getElementById('aiChatCounter');
      if (counter) counter.textContent = input.value.length + '/200';
    });
  }
  function openChat(personId, state) {
    var person = Game.people.find(state, personId);
    if (!person) return;
    activePersonId = personId;
    chatState = state;
    Game.navigation.openDetail('与' + person.name + '对话', renderChat(person, state), 'aichat');
    bindComposer();
    var busy = Game.aiCharacterChatService.isBusy();
    setBusy(busy, busy ? '上一条消息仍在生成…' : '');
    scrollToLatest();
    root.requestAnimationFrame(function () { document.getElementById('aiChatInput')?.focus(); });
  }
  function clearChat() {
    if (!activePersonId || !chatState) return;
    if (!Game.aiCharacterChatService.clear(activePersonId)) {
      setBusy(true, '回复完成前不能清空对话');
      return;
    }
    openChat(activePersonId, chatState);
    setBusy(false, '对话已清空');
  }
  function handleClick(event) {
    var open = event.target.closest('[data-npc-chat]');
    if (open) {
      var state = Game._getState ? Game._getState() : null;
      if (state) openChat(open.dataset.npcChat, state);
      return true;
    }
    if (event.target.closest('[data-ai-chat-clear]')) {
      clearChat();
      return true;
    }
    var prompt = event.target.closest('[data-ai-chat-prompt]');
    if (prompt) {
      sendMessage(prompt.dataset.aiChatPrompt);
      return true;
    }
    return false;
  }
  function onDetailClosed() {
    activePersonId = null;
    chatState = null;
  }
  Game.aiCharacterChat = Object.freeze({
    openChat: openChat,
    renderChat: renderChat,
    handleClick: handleClick,
    onDetailClosed: onDetailClosed,
  });
}(window));
