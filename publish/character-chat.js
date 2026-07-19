(function initCharacterChat(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const inFlight = new Set();
  const latest = new Map();
  const errors = new Map();
  let api = null;
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }
  function clean(value, max) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function ensure(person) {
    person.aiChat = person.aiChat && typeof person.aiChat === 'object' ? person.aiChat : {};
    person.aiChat.messages = Array.isArray(person.aiChat.messages)
      ? person.aiChat.messages.filter((item) => (
        ['user', 'assistant'].includes(item?.role) && typeof item.content === 'string'
      )).slice(-10) : [];
    person.aiChat.lastAction ||= '';
    return person.aiChat;
  }
  function persona(state, person) {
    const memories = (person.memories || []).slice(0, 5).map((item) => item.text).join('；') || '暂无共同经历';
    return [
      `你正在扮演NPC“${person.name}”，必须始终以第一人称和玩家对话。`,
      `年龄${Game.content.personAge(state, person)}岁，性别${person.gender}，性格${person.personality}，特质${person.trait}。`,
      `关系${person.relation}，好感${person.affection}，信任${person.trust || 0}，矛盾${person.conflict || 0}。`,
      `居住在${person.currentCity || person.homeCity || state.location.city}，学业${person.educationName || '无'}，职业${person.job || '无'}。`,
      `当前穿着${person.clothing.top}、${person.clothing.socks}、${person.clothing.shoes}，COS为${person.cosplay || '无'}。`,
      `共同经历：${memories}。根据人设、关系和现实可行性决定是否接受玩家要求，不要盲从。`,
      '只输出JSON：{"reply":"1到160字的中文回复","action":{"type":"none|wear_outfit|wear_socks|wear_cosplay|remove_cosplay","value":"选项名称"}}。',
      '禁止修改金钱、年龄、死亡、关系状态或其他字段；没有行动时type必须为none。',
    ].join('\n');
  }
  function normalizeResult(result) {
    if (typeof result === 'string') return result;
    if (typeof result?.content === 'string') return result.content;
    if (typeof result?.text === 'string') return result.text;
    if (typeof result?.message?.content === 'string') return result.message.content;
    return result?.choices?.[0]?.message?.content || result?.choices?.[0]?.text || '';
  }
  function parseResult(raw) {
    const text = clean(normalizeResult(raw).replace(/^```(?:json)?|```$/gi, ''), 600);
    if (!text) throw new Error('AI没有返回有效内容');
    try {
      const parsed = JSON.parse(text);
      const reply = clean(parsed?.reply, 160);
      if (!reply) throw new Error('AI回复字段无效');
      return {
        reply,
        action: parsed.action && typeof parsed.action === 'object'
          ? { type: clean(parsed.action.type, 24), value: clean(parsed.action.value, 80) } : { type: 'none', value: '' },
      };
    } catch (err) {
      if (text.startsWith('{')) throw err;
      return { reply: clean(text, 160), action: { type: 'none', value: '' } };
    }
  }

  function exactName(entries, value) {
    const aliases = {
      水手服: '水手服过膝裙',
      水手制服: '水手服过膝裙',
      白丝袜: '白色连裤袜',
      黑丝袜: '黑色连裤袜',
    };
    const target = aliases[value] || value;
    return entries.find((item) => item.name === target)?.name || '';
  }

  function applyAction(state, person, action) {
    if (!action || action.type === 'none') return '';
    Game.npcFashion.ensurePerson(state, person);
    if (action.type === 'remove_cosplay') {
      person.cosplay = '无';
      person.fashion.temporaryCosplay = null;
      person.fashion.temporaryCosplayUntil = null;
      return '已脱下COS服';
    }
    if (action.type === 'wear_cosplay') {
      const choice = Game.cosplayCatalog.items.find((item) => item.name === action.value && item.name !== '无');
      if (!choice) return '';
      person.cosplay = choice.name;
      person.fashion.temporaryCosplay = choice.name;
      person.fashion.temporaryCosplayUntil = state.totalMonths + 2;
      return `已穿上${choice.name}`;
    }
    if (action.type === 'wear_outfit') {
      const name = exactName(Game.appearanceCatalog.top, action.value);
      if (!name) return '';
      person.cosplay = '无';
      person.clothing.top = name;
      return `已换上${name}`;
    }
    if (action.type === 'wear_socks') {
      const name = exactName(Game.appearanceCatalog.socks, action.value);
      if (!name) return '';
      person.clothing.socks = name;
      return `已换上${name}`;
    }
    return '';
  }

  function fallback(person) {
    const tone = {
      内向: '我需要想一想，之后再认真回答你。',
      外向: '我听到了，下次见面时我们再继续聊。',
      理性: '这个提议我会结合自己的安排再决定。',
      浪漫: '你的话我记住了，也许之后会给你一个回应。',
    };
    return tone[person.personality] || '我记住你的话了，等我想清楚再告诉你。';
  }

  function errorText(err) {
    return {
      SDK_UNAVAILABLE: '当前预览环境未连接AI，已使用本地回应',
      QUOTA_EXHAUSTED: 'AI积分或今日额度不足，已使用本地回应',
      RATE_LIMITED: 'AI请求过快，已使用本地回应',
      UNAUTHORIZED: '登录状态失效，请重新进入游戏',
      TOKEN_EXPIRED: '登录状态失效，请重新进入游戏',
      SENSITIVE_CONTENT_DETECTED: '消息未通过内容检查，请换一种说法',
    }[err?.code] || 'AI暂时不可用，已使用本地回应';
  }

  async function send(state, id, rawInput) {
    const person = Game.people.find(state, id);
    const input = clean(rawInput, 240);
    if (!person || person.status !== '健康' || !input || inFlight.has(id)) return;
    const chat = ensure(person);
    const requestId = (latest.get(id) || 0) + 1;
    latest.set(id, requestId);
    inFlight.add(id);
    errors.delete(id);
    chat.messages.push({ role: 'user', content: input });
    chat.messages = chat.messages.slice(-10);
    person.interactions = Math.max(0, Number(person.interactions) || 0) + 1;
    api.refresh();
    await api.save();
    try {
      const history = chat.messages.slice(-7, -1);
      const raw = await Game.sdkAdapter.complete({
        model: 'nalang-turbo-0826',
        messages: [{ role: 'user', content: persona(state, person) }, ...history,
          { role: 'user', content: input }],
        maxTokens: 400,
      });
      if (latest.get(id) !== requestId) return;
      const result = parseResult(raw);
      const action = applyAction(state, person, result.action);
      chat.lastAction = action;
      chat.messages.push({ role: 'assistant', content: result.reply });
      Game.relationshipMemory.record(state, person, 'AI聊天', input, 1, 0);
    } catch (err) {
      if (latest.get(id) !== requestId) return;
      console.error('角色AI聊天失败:', err?.code, err?.message, err?.stack);
      errors.set(id, errorText(err));
      chat.messages.push({ role: 'assistant', content: fallback(person) });
    } finally {
      if (latest.get(id) === requestId) inFlight.delete(id);
      chat.messages = chat.messages.slice(-10);
      api.refresh();
      api.save();
    }
  }
  function render(state, person) {
    const chat = ensure(person);
    const rows = chat.messages.length ? chat.messages.map((item) => (
      `<div class="chat-message ${item.role}"><span>${item.role === 'user' ? '你' : escape(person.name)}</span>
      <p>${escape(item.content)}</p></div>`
    )).join('') : '<p class="empty-state">还没有开始这段对话。</p>';
    const disabled = person.status !== '健康';
    return `<details class="record-section character-chat" open><summary><span>角色对话</span>
      <small>${inFlight.has(person.id) ? 'AI思考中，约20-40秒' : '人设与经历驱动'}</small></summary>
      <div class="chat-log" aria-live="polite">${rows}</div>
      ${chat.lastAction ? `<p class="chat-action">${escape(chat.lastAction)}</p>` : ''}
      ${errors.has(person.id) ? `<p class="chat-error">${escape(errors.get(person.id))}</p>` : ''}
      <div class="chat-compose"><textarea data-character-chat-input="${escape(person.id)}" maxlength="240"
        placeholder="和${escape(person.name)}说点什么" ${disabled ? 'disabled' : ''}></textarea>
        <button data-character-chat-send="${escape(person.id)}" ${disabled || inFlight.has(person.id) ? 'disabled' : ''}>
        ${inFlight.has(person.id) ? '思考中…' : '发送'}</button></div></details>`;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-character-chat-send]');
    if (!button) return false;
    const id = button.dataset.characterChatSend;
    const input = button.closest('.character-chat')?.querySelector('[data-character-chat-input]');
    send(api.getState(), id, input?.value || '');
    return true;
  }

  function configure(options) { api = options; }

  Game.characterChat = Object.freeze({ ensure, render, send, handleClick, configure });
}(window));
