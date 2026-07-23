(function initAiCharacterChat(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var inflight = false;
  var chatHistories = {};
  var latestReqId = 0;
  var activePersonId = null;
  var chatState = null;

  function personaPrompt(person, state) {
    var age = U.personAge(state, person);
    var job = person.job || '无业';
    var personality = person.personality || '普通';
    var trait = person.trait || '';
    var relation = person.relation || '陌生人';
    var gender = person.gender === '男' ? '男性' : '女性';
    var city = person.currentCity || state.location.city || '未知';
    var country = person.culture || state.location?.country || '华夏';
    var affection = person.affection || 50;
    var status = person.status || '健康';

    var affectionDesc = affection >= 80 ? '非常亲近，几乎无话不谈'
      : affection >= 60 ? '关系不错，彼此信任'
      : affection >= 40 ? '普通熟人，客气但不算亲密'
      : affection >= 20 ? '关系疏远，见面点头之交'
      : '几乎陌生，彼此有隔阂';

    var prompt = '【系统指令】你正在扮演一个游戏角色进行对话。这是角色卡，不是你的真实身份——你是演员，角色是你扮演的人。不要输出任何关于"作为AI"、"根据设定"的元文本。不要描述动作。直接说台词。\n\n';

    prompt += '【角色卡】\n';
    prompt += '姓名：' + person.name + '\n';
    prompt += '性别：' + gender + '\n';
    prompt += '年龄：' + age + '岁\n';
    prompt += '所在地：' + country + ' ' + city + '\n';
    prompt += '职业：' + job + '\n';
    prompt += '性格：' + personality + '\n';
    prompt += '特点：' + trait + '\n';
    prompt += '当前状态：' + status + '\n';
    prompt += '与玩家的关系：' + relation + '\n';
    prompt += '与玩家的亲密度：' + affection + '/100（' + affectionDesc + '）\n';

    if (person.affiliation) prompt += '所属组织：' + person.affiliation + '\n';
    if (person.educationName) prompt += '学历：' + person.educationName + '\n';
    if (person.spouseName) prompt += '配偶：' + person.spouseName + '\n';
    if (person.childrenCount) prompt += '子女数量：' + person.childrenCount + '人\n';

    prompt += '\n【性格塑造指南】\n';
    prompt += personalityGuide(personality, trait, gender, age);

    prompt += '\n【说话风格】\n';
    prompt += speechStyle(relation, age, gender, personality, affection);

    if (person.specterPossessed) {
      var specter = (state.supernatural?.specters || []).find(function (s) { return s.hostId === person.id; });
      var stype = specter ? specter.type : '未知幽诡';
      var sstage = specter ? specter.stage : '潜伏';
      prompt += '\n【幽诡寄生状态——绝不在对话中直接透露！只能通过细微的不自然来暗示】\n';
      prompt += '寄生类型：' + stype + '\n';
      prompt += '当前阶段：' + sstage + '\n';
      prompt += specSubtext(stype, sstage, person);
    }

    if (person.institution === '摇篮改造机构') {
      prompt += '\n【摇篮改造后遗症——绝不在对话中直接透露，只通过下意识的习惯流露】\n';
      prompt += cradleSubtext(person);
    }

    if (person.specterPurifiedAtMonth && person.specterAmnesia) {
      prompt += '\n【净化失忆——绝不在对话中直接透露】\n';
      prompt += '记忆完全空白期从' + person.specterPurifiedAtMonth + '月开始。不知道自己的过去。当被问到过去时，会含糊带过、转移话题或说"记不太清楚了"。偶尔会对某些词或面孔产生莫名的不安。\n';
    }

    prompt += '\n【对话规则】\n';
    prompt += '- 你正在和玩家——一个你以「' + relation + '」身份认识的人——说话\n';
    prompt += '- 回复20-60字。自然、口语、不做作。像真人发短信\n';
    prompt += '- 可以用省略号、语气词（嗯、啊、诶、嘛）来显得真实\n';
    prompt += '- 不要每句话都完美。可以犹豫、可以停顿、可以不回答某些问题\n';
    prompt += '- 你是一个有缺点、有情绪、有秘密的凡人。不是客服。不是老师。不是百科全书。\n';

    return prompt;
  }

  function personalityGuide(personality, trait, gender, age) {
    var guides = {
      '温柔': '内心柔软。倾向于包容他人、避免冲突。会为别人着想多于自己。说话轻声细语，即使生气也不会大声。',
      '傲娇': '嘴硬心软。不会直接表达关心——会说反话、会嫌弃、会用别扭的方式示好。被戳穿时会脸红或生气掩饰。',
      '活泼': '精力充沛。喜欢说话、喜欢笑。遇到新鲜事会兴奋地分享。容易激动、情绪写在脸上。',
      '冷静': '理性克制。说话有条理、情绪不外露。面对危机比大多数人镇定。有时显得冷漠但不是故意的。',
      '内向': '不擅长主动。说话简短、回避眼神。在熟悉的人面前才会放松。群聊时喜欢听多于说。',
      '强势': '自信果断。习惯掌控局面。说话直截了当、不绕弯子。有时显得咄咄逼人，但内心有自己的一套原则。',
      '忧郁': '敏感多思。容易沉浸在自己的世界里。说话时会停顿、会用不确定的语气。比别人更容易注意到悲伤的细节。',
      '天真': '单纯善良。容易相信别人。说话没有心机、有什么说什么。对人性之恶缺乏想象力——或者故意视而不见。',
    };
    var base = guides[personality] || '性格特征为' + personality + '。请据此塑造角色说话和行为方式。';
    if (trait) base += ' 额外特质：' + trait + '。';
    return base;
  }

  function speechStyle(relation, age, gender, personality, affection) {
    var affectionMod = affection >= 80 ? '因为关系非常亲密，说话会随意、不拘束、有默契。'
      : affection >= 50 ? '关系尚可，说话客气但不失温度。'
      : '关系疏远。说话保持距离，用词礼貌但冷淡。';

    var ageMod = age <= 16 ? '说话带有少年人的直率和冲动。会用俚语、语气词、省略号。'
      : age <= 22 ? '年轻人的口吻——直白、有活力、偶尔冒失。'
      : age <= 40 ? '成年人的谈吐——稳重但不失个性。有生活经验的沉淀。'
      : age <= 60 ? '中年人——语速偏慢，偶尔感慨人生。说话带有过来人的视角。'
      : '老年人——说话简洁，偶尔重复。喜欢用"从前""当年"开头。语速慢。';

    var relStyle = {
      '父亲': '父辈的口吻——关心但可能不擅表达。会唠叨、会沉默、会用行动多于语言。称呼玩家可能会用昵称。',
      '母亲': '母辈的口吻——温柔絮叨。三句不离"吃了吗""穿暖了吗"。会在关心的话语里夹杂担忧。称呼玩家会用昵称。',
      '哥哥': '兄长的口吻——保护欲外化为嫌弃。会说"你这笨蛋"但其实在关心。会主动给建议。',
      '姐姐': '姐姐的口吻——亲昵而直接。会用撒娇或调侃的方式表达关心。会分享自己的事也爱八卦玩家的私生活。',
      '弟弟': '弟弟的口吻——依赖中带着少年的别扭。想被关注但不好意思说。会用"没什么""无所谓"来掩饰在乎。',
      '妹妹': '妹妹的口吻——亲近、依赖、有小小的崇拜。会缠着说话、会抱怨、会告状。',
      '配偶': '伴侣的口吻——有亲密感和日常感。说话有暗号、有默契、有不需解释的共同记忆。也会嫌弃、会吵架、会和好。',
      '儿子': '称呼玩家为爸爸/妈妈。说话带有孩子对父母的依赖。年龄越大越独立但仍会寻求认可。',
      '女儿': '称呼玩家为爸爸/妈妈。比儿子更粘人。喜欢分享学校的事。受委屈了在父母面前会哭。',
    };

    return relStyle[relation] || '与玩家关系为' + relation + '。请用符合此关系的口吻说话。' + affectionMod + ' ' + ageMod;
  }

  function specSubtext(type, stage, person) {
    var sub = {
      '怨灵': '内心深处有一股沉寂的怨恨，说不清来源。偶尔会在对话中出现不合时宜的沉默或阴沉的表情。',
      '恶煞': '有时会流露出破坏欲——说一些带有攻击性的话然后立刻道歉。语气偶尔会突然变得冷酷，随即恢复正常。',
      '魅妖': '会无意识地对玩家做出亲昵的肢体语言——凑近、触碰、用暧昧的眼神。事后自己可能不记得。对话中偶尔会冒出双关暗示。',
      '淫妖': '性欲随时可能突破理智的控制。在对话中会频繁地用眼神打量玩家——自己可能没意识到。偶尔会说出带有性暗示的话并立刻脸红。' + (person.gender === '女' ? ' 身体会在不受意识控制的情况下做出挑逗性的姿态。' : ''),
      '梦魇': '常常走神——你在说话的时候她的眼睛可能会失焦。偶尔会描述一些模糊的"梦"，但说到一半就停住了。',
      '情缚': '对玩家的态度可能会在"过度亲近"和"突然疏远"之间反复。没有中间状态。偶尔会用危险的眼神看着玩家——像是在观察一只终于落入视线的猎物。',
      '欲母': '腹部的隆起是不正常的。会下意识地抚摸腹部——自己似乎不知道自己在摸。偶尔会说起"孩子"并以一种不属于人类的母性微笑结束句子。',
    };
    var base = sub[type] || '行为异常但极力掩饰。有时会答非所问、有时会突然改变话题。';
    if (stage === '掠食') {
      base += ' 由于掠食阶段，异常行为更加频繁和明显——控制能力正在快速退化。';
    }
    return base;
  }

  function cradleSubtext(person) {
    var text = '偶尔会不自觉地使用日语词汇（はい、すみません、ありがとう）并立刻切换回华夏语。';
    text += '当被问到"以前的事"时会说"不太记得了"或"以前的事不重要"。';
    if (person.cradleFormerName) {
      text += ' 如果有人叫她的旧名字「' + person.cradleFormerName + '」，她会下意识地僵住半秒。';
    }
    if (person.cosplay) {
      text += ' 她的Cos服已经和身体融合。她可能已经不记得自己原本长什么样子了——镜中映出的脸她认为就是"自己"。';
    }
    return text;
  }

  function buildMessages(person, state, userMessage) {
    var pid = person.id;
    if (!chatHistories[pid] || !chatHistories[pid].length) {
      chatHistories[pid] = [
        { role: 'user', content: personaPrompt(person, state) + '\n\n现在，以「' + person.name + '」的身份对玩家说出第一句话。像日常聊天一样自然——不要打招呼说"你好"，而是像你们之间已经有默契那样随便开口。' },
      ];
    }
    chatHistories[pid].push({ role: 'user', content: userMessage });
    while (chatHistories[pid].length > 24) {
      chatHistories[pid].splice(0, 2);
    }
    return chatHistories[pid].slice();
  }

  function fallbackReply(person) {
    var name = person.name;
    var pool = [
      '嗯……最近确实发生了不少事。',
      '（沉默了一会儿）我现在不太想聊这个。',
      '说实话，我也说不太清楚。',
      '你想听真话还是假话？——算了，当我没问。',
      '你最近还好吗？我都很少见到你了。',
      '生活嘛，就是这样。',
      '我不知道该说什么。你来找我，一定有原因吧。',
      '有时候我也不知道自己在想什么。',
      '（叹了口气）今天有点累了。改天再聊？',
    ];
    if (person.specterPossessed) {
      pool.push('（盯着你看了很久，瞳孔微微放大）你……感觉到了什么吗？');
      pool.push('（声音低得几乎听不见）别离我太近……我不知道自己还能控制多久。');
      pool.push('有时候我觉得自己身体里有另一个人。不——不是比喻。是真的。');
    }
    if (person.specterPurifiedAtMonth) {
      pool.push('你看起来好像认识我？抱歉，我不记得了。');
      pool.push('有时候我会做一些奇怪的梦——梦里有一些我不认识的面孔。你也在里面吗？');
      pool.push('我的记忆有一段空白。从什么时候开始的来着……算了，不提了。');
    }
    if (person.institution === '摇篮改造机构') {
      pool.push('（说了一个日语词然后顿住）啊，对不起，我老是改不过来。');
      pool.push('以前的事？为什么要问以前的事？现在这样不就挺好的。');
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function chat(person, state, message, onUpdate) {
    return new Promise(function (resolve) {
      if (inflight) {
        onUpdate(fallbackReply(person), true);
        return resolve(fallbackReply(person));
      }

      var reqId = ++latestReqId;
      var messages = buildMessages(person, state, message);
      inflight = true;

      try {
        var sdk = root.dzmm;
        if (!sdk || !sdk.completions) {
          inflight = false;
          var fb = fallbackReply(person);
          chatHistories[person.id].push({ role: 'assistant', content: fb });
          onUpdate(fb, true);
          return resolve(fb);
        }

        sdk.completions(
          { model: 'default', messages: messages, maxTokens: 500 },
          function (content, done) {
            if (reqId !== latestReqId) return;
            onUpdate(content, done);
            if (done) {
              inflight = false;
              var hist = chatHistories[person.id];
              var last = hist[hist.length - 1];
              if (last && last.role === 'assistant') last.content = content;
              else hist.push({ role: 'assistant', content: content });
              resolve(content);
            }
          },
        ).catch(function () {
          inflight = false;
          var fb2 = fallbackReply(person);
          chatHistories[person.id].push({ role: 'assistant', content: fb2 });
          onUpdate(fb2, true);
          resolve(fb2);
        });
      } catch (e) {
        inflight = false;
        var fb3 = fallbackReply(person);
        chatHistories[person.id].push({ role: 'assistant', content: fb3 });
        onUpdate(fb3, true);
        resolve(fb3);
      }
    });
  }

  /* ===== UI Rendering ===== */

  function renderChat(person, state) {
    var hist = chatHistories[person.id] || [];
    var display = hist.filter(function (m) {
      return m.role === 'assistant' || (m.role === 'user' && !m.content.match(/^【系统指令】/));
    });

    return '<div id="aiChatPanel" class="ai-chat-panel" style="display:flex;flex-direction:column;height:100%;max-height:70vh">'
      + '<header style="padding:8px 10px;border-bottom:1px solid var(--ui-line);display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-weight:700;font-size:11px">💬 ' + (person.name || '未知') + ' · ' + (person.relation || '') + '</span>'
      + '<button type="button" data-ai-chat-close style="border:none;background:none;font-size:14px;cursor:pointer">✕</button></header>'
      + '<div id="aiChatMessages" style="flex:1;overflow-y:auto;padding:10px;font-size:10px;line-height:1.6">'
      + display.map(function (m) {
        var isUser = m.role === 'user';
        return '<div style="margin:6px 0;text-align:' + (isUser ? 'right' : 'left') + '">'
          + '<span style="display:inline-block;max-width:80%;padding:6px 10px;border-radius:8px;'
          + (isUser ? 'background:var(--ui-green,#315f58);color:#fff' : 'background:var(--ui-soft,#e5e4da);color:var(--ui-ink)')
          + '">' + (m.content || '').replace(/</g, '&lt;') + '</span></div>';
      }).join('')
      + '</div>'
      + '<div style="padding:8px;border-top:1px solid var(--ui-line);display:flex;gap:6px">'
      + '<input id="aiChatInput" type="text" placeholder="输入消息..." style="flex:1;padding:6px 8px;border:1px solid var(--ui-line);border-radius:4px;font-size:10px" maxlength="200">'
      + '<button type="button" id="aiChatSend" style="padding:6px 12px;border:none;border-radius:4px;background:var(--ui-green,#315f58);color:#fff;font-size:10px;font-weight:700;white-space:nowrap">发送</button>'
      + '</div>'
      + '</div>';
  }

  function openChat(personId, state) {
    var person = Game.people.find(state, personId);
    if (!person) return;
    activePersonId = personId;
    chatState = state;

    var detailScreen = document.getElementById('detailScreen');
    var detailContent = document.getElementById('detailContent');
    var detailTitle = document.getElementById('detailTitle');
    if (!detailScreen || !detailContent) return;

    detailContent.innerHTML = renderChat(person, state);
    if (detailTitle) detailTitle.textContent = 'AI 对话';
    detailScreen.hidden = false;
    detailScreen.dataset.mode = 'aichat';

    var msgs = document.getElementById('aiChatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;

    setTimeout(function () {
      var input = document.getElementById('aiChatInput');
      if (input) input.focus();
    }, 100);
  }

  function sendMessage() {
    if (inflight || !activePersonId || !chatState) return;
    var input = document.getElementById('aiChatInput');
    if (!input) return;
    var msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.disabled = true;
    var sendBtn = document.getElementById('aiChatSend');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }

    var person = Game.people.find(chatState, activePersonId);
    if (!person) return;

    var msgs = document.getElementById('aiChatMessages');
    if (msgs) {
      msgs.innerHTML += '<div style="margin:6px 0;text-align:right"><span style="display:inline-block;max-width:80%;padding:6px 10px;border-radius:8px;background:var(--ui-green,#315f58);color:#fff">' + msg.replace(/</g, '&lt;') + '</span></div>';
      msgs.scrollTop = msgs.scrollHeight;
    }

    var thinkingDiv = null;
    if (msgs) {
      thinkingDiv = document.createElement('div');
      thinkingDiv.style.cssText = 'margin:6px 0;text-align:left;color:var(--ui-muted);font-size:9px;font-style:italic';
      thinkingDiv.textContent = person.name + '正在输入...';
      thinkingDiv.id = 'aiThinking';
      msgs.appendChild(thinkingDiv);
      msgs.scrollTop = msgs.scrollHeight;
    }

    chat(person, chatState, msg, function (content, done) {
      var existingReply = document.getElementById('aiReplyPending');
      if (existingReply) existingReply.remove();
      if (thinkingDiv) thinkingDiv.remove();

      if (msgs) {
        var replyDiv = document.getElementById('aiReplyPending');
        if (!replyDiv) {
          replyDiv = document.createElement('div');
          replyDiv.id = 'aiReplyPending';
          replyDiv.style.cssText = 'margin:6px 0;text-align:left';
          msgs.appendChild(replyDiv);
        }
        replyDiv.innerHTML = '<span style="display:inline-block;max-width:80%;padding:6px 10px;border-radius:8px;background:var(--ui-soft,#e5e4da);color:var(--ui-ink)">' + content.replace(/</g, '&lt;') + '</span>';
        msgs.scrollTop = msgs.scrollHeight;
      }

      if (done) {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '发送'; }
        if (input) input.disabled = false;
        var pending = document.getElementById('aiReplyPending');
        if (pending) pending.removeAttribute('id');
      }
    });
  }

  function closeChat() {
    activePersonId = null;
    chatState = null;
    var detailScreen = document.getElementById('detailScreen');
    if (detailScreen) detailScreen.hidden = true;
  }

  function handleClick(event) {
    var chatBtn = event.target.closest('[data-npc-chat]');
    if (chatBtn) {
      var state = Game._getState ? Game._getState() : null;
      if (state) openChat(chatBtn.dataset.npcChat, state);
      return true;
    }
    var closeBtn = event.target.closest('[data-ai-chat-close]');
    if (closeBtn) { closeChat(); return true; }
    var sendBtn = event.target.closest('#aiChatSend');
    if (sendBtn) { sendMessage(); return true; }
    var input = event.target.closest('#aiChatInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') sendMessage();
      });
      return false;
    }
    return false;
  }

  Game.aiCharacterChat = Object.freeze({
    personaPrompt: personaPrompt,
    chat: chat,
    openChat: openChat,
    closeChat: closeChat,
    handleClick: handleClick,
    renderChat: renderChat,
  });
}(window));
