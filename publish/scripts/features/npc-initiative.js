(function initNpcInitiative(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

  /* ---- module-level state reference ---- */
  let _stateRef = null;

  function setRef(state) {
    _stateRef = state;
  }

  function getRef() {
    return _stateRef;
  }

  /* ---- ensure ---- */
  function ensure(state) {
    if (!state.npcEvents || typeof state.npcEvents !== 'object') {
      state.npcEvents = { queue: [], active: false, frequency: 'high' };
    }
    const npc = state.npcEvents;
    npc.queue = Array.isArray(npc.queue) ? npc.queue : [];
    npc.active = Boolean(npc.active);
    if (!['high', 'low', 'off'].includes(npc.frequency)) {
      npc.frequency = 'high';
    }
    /* internal tracking */
    npc._brothelVisits = npc._brothelVisits && typeof npc._brothelVisits === 'object'
      ? npc._brothelVisits : {};
    npc._lastPregnancyMonth = Number.isFinite(npc._lastPregnancyMonth)
      ? npc._lastPregnancyMonth : -36;
    return npc;
  }

  /* ---- helpers ---- */
  function uid() {
    return `ne-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function isFemale(state) {
    return state.gender === '女';
  }

  function isMale(state) {
    return state.gender === '男';
  }

  function isWelfare(state) {
    return state.career.jobId === 'welfare';
  }

  function playerAge(state) {
    return U.age(state);
  }

  function allContacts(state) {
    return state.contacts.filter(function (person) {
      return person && person.status === '健康' && person.phoneUnlocked;
    });
  }

  function allPeople(state) {
    return Game.people ? Game.people.all(state).filter(function (person) {
      return person && person.status === '健康' && person.id !== state.profile?.id;
    }) : [];
  }

  function findPerson(state, id) {
    return Game.people ? Game.people.find(state, id) : null;
  }

  function hasHistory(person, keywords) {
    if (!Array.isArray(person.memories)) return false;
    return person.memories.some(function (memory) {
      return keywords.some(function (kw) {
        return memory.kind === kw || (memory.text && memory.text.includes(kw));
      });
    });
  }

  function isRomanticRelation(relation) {
    return ['前恋人', '前配偶', '恋人', '配偶'].includes(relation);
  }

  /* ---- monthly event generation ---- */
  function monthly(state) {
    ensure(state);
    var npc = state.npcEvents;
    if (npc.frequency === 'off') return;
    if (state.pendingDecision || state.gameOver) return;

    var count = 0;
    if (npc.frequency === 'high') {
      count = U.between(2, 5);
    } else if (npc.frequency === 'low') {
      if (state.totalMonths % 3 === 0) {
        count = U.between(1, 2);
      }
    }
    if (count <= 0) return;

    /* gather candidate events */
    var candidates = [];

    try { var ev = genExLoverContact(state); if (ev) candidates.push(ev); } catch (_) { /* skip */ }
    try { var ev2 = genSponsorPM(state); if (ev2) candidates.push(ev2); } catch (_) { /* skip */ }
    try { var ev3 = genProstituteRegular(state); if (ev3) candidates.push(ev3); } catch (_) { /* skip */ }
    try { var ev4 = genClassReunion(state); if (ev4) candidates.push(ev4); } catch (_) { /* skip */ }
    try { var ev5 = genRevenge(state); if (ev5) candidates.push(ev5); } catch (_) { /* skip */ }
    try { var ev6 = genCorruptedSeduction(state); if (ev6) candidates.push(ev6); } catch (_) { /* skip */ }
    try { var ev7 = genPregnancyNotice(state); if (ev7) candidates.push(ev7); } catch (_) { /* skip */ }
    try { var ev8 = genRumorSpread(state); if (ev8) candidates.push(ev8); } catch (_) { /* skip */ }

    if (candidates.length === 0) return;

    /* shuffle and pick */
    var shuffled = candidates.sort(function () { return Math.random() - 0.5; });
    var selected = shuffled.slice(0, Math.min(count, shuffled.length));

    selected.forEach(function (event) {
      npc.queue.push({
        id: uid(),
        type: event.type,
        title: event.title,
        text: event.text,
        options: event.options,
        data: event.data || {},
        month: state.totalMonths,
      });
    });
  }

  /* ================================================================
     Event generators — each returns null or {type, title, text, options, data}
     ================================================================ */

  /* 1. ex_lover_contact */
  function genExLoverContact(state) {
    if (playerAge(state) < 16) return null;
    var candidates = allContacts(state).filter(function (person) {
      return isRomanticRelation(person.relation) && (person.affection || 0) > 40;
    });
    if (candidates.length === 0) return null;
    var person = U.random(candidates);
    return {
      type: 'ex_lover_contact',
      title: person.relation === '前配偶' ? '前妻联系' : '前任联系',
      text: person.name + '发来消息：好久不见。最近还好吗？',
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '回复聊聊', action: 'ex_lover_reconnect' },
        { label: '忽略', action: 'ex_lover_ignore' },
      ],
    };
  }

  /* 2. sponsor_pm */
  function genSponsorPM(state) {
    if (!isWelfare(state)) return null;
    var creator = state.creator;
    if (!creator || !creator.followers || creator.followers < 3000) return null;
    var followers = creator.followers;
    var amount;
    var text;
    if (followers >= 20000) {
      amount = Math.round((800 + Math.sqrt(followers) * 14 + followers * 0.03) * 2.5);
      text = '某知名人士匿名邀约。非常神秘。报酬' + amount.toLocaleString() + '元。';
    } else if (followers >= 5000) {
      amount = Math.round((800 + Math.sqrt(followers) * 14 + followers * 0.03) * 1.6);
      text = '一位企业家邀你在五星级酒店共度周末，还准备了礼物。报酬' + amount.toLocaleString() + '元。';
    } else {
      amount = Math.round((800 + Math.sqrt(followers) * 14 + followers * 0.03) * 0.9);
      text = '一位小老板私信你，想在普通酒店见面。报酬' + amount.toLocaleString() + '元。';
    }
    return {
      type: 'sponsor_pm',
      title: '私密邀约',
      text: text,
      data: { amount: amount },
      options: [
        { label: '接受', action: 'sponsor_accept' },
        { label: '拒绝', action: 'sponsor_decline' },
      ],
    };
  }

  /* 3. prostitute_regular — NPC visited >= 3 times in brothel */
  function genProstituteRegular(state) {
    var visits = state.npcEvents._brothelVisits;
    var regularIds = Object.keys(visits).filter(function (id) {
      return (visits[id] || 0) >= 3;
    });
    if (regularIds.length === 0) return null;
    var personId = U.random(regularIds);
    var person = findPerson(state, personId);
    if (!person) return null;
    return {
      type: 'prostitute_regular',
      title: '熟悉的她',
      text: person.name + '发来消息：好久不见。今晚我休息——不是工作。只是想见你。',
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '赴约', action: 'regular_accept' },
        { label: '婉拒', action: 'regular_decline' },
      ],
    };
  }

  /* 4. class_reunion — old classmates in same city, age >= 22 */
  function genClassReunion(state) {
    if (playerAge(state) < 22) return null;
    var city = state.location.city;
    var archives = state.socialWorld && state.socialWorld.cityArchives
      ? state.socialWorld.cityArchives[city] : null;
    if (!archives || !Array.isArray(archives) || archives.length < 4) return null;

    /* filter to classmates who are not already active contacts */
    var contactIds = new Set(state.contacts.map(function (c) { return c.id; }));
    var archived = archives.filter(function (person) {
      return person && person.status === '健康' && !contactIds.has(person.id);
    });
    if (archived.length < 4) return null;

    var organizer = U.random(archived);
    return {
      type: 'class_reunion',
      title: '同学聚会',
      text: organizer.name + '在同学群里发起聚会邀请：' + city + '的同学准备聚一聚，你要来吗？',
      data: {
        city: city,
        archives: archived.slice(0, 8).map(function (p) { return p.id; }),
      },
      options: [
        { label: '参加聚会', action: 'reunion_go' },
        { label: '婉拒', action: 'reunion_decline' },
      ],
    };
  }

  /* 5. revenge — NPCs wronged by player */
  function genRevenge(state) {
    if (playerAge(state) < 18) return null;
    var wronged = allContacts(state).filter(function (person) {
      if (person.conflict < 70) return false;
      return hasHistory(person, ['离婚', '拒绝告白', '分手', '强迫', '背叛', '强暴']);
    });
    if (wronged.length === 0) return null;
    var person = U.random(wronged);
    var revengeType = U.random(['report', 'rumor', 'confront']);
    var texts = {
      report: person.name + '收集了你的不良记录，扬言要向有关部门举报。',
      rumor: '你听到了一些关于自己的风言风语——据说' + person.name + '在圈子里散布了你的负面消息。',
      confront: person.name + '突然出现在你面前，眼中满是怒意：' + '你做过的事，我不会就这么算了。',
    };
    return {
      type: 'revenge',
      title: '复仇的阴影',
      text: texts[revengeType],
      data: { personId: person.id, personName: person.name, revengeType: revengeType },
      options: [
        { label: '尝试对话和解', action: 'revenge_talk' },
        { label: '不予理会', action: 'revenge_ignore' },
      ],
    };
  }

  /* 6. corrupted_npc_seduction — NPC with sexAddiction >= 50 */
  function genCorruptedSeduction(state) {
    if (playerAge(state) < 16) return null;
    var playerGender = state.gender;
    var opposite = playerGender === '男' ? '女' : '男';
    var corrupted = allPeople(state).filter(function (person) {
      var addiction = person.sexAddiction;
      if (typeof addiction !== 'number' || addiction < 50) return false;
      if (person.gender !== opposite) return false;
      if (person.relation && ['配偶', '父亲', '母亲', '儿子', '女儿'].includes(person.relation)) return false;
      return true;
    });
    if (corrupted.length === 0) return null;
    var person = U.random(corrupted);
    return {
      type: 'corrupted_seduction',
      title: '暧昧邀约',
      text: person.name + '发来消息："今晚有空吗？我知道一家酒店..."',
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '赴约', action: 'seduction_accept' },
        { label: '拒绝', action: 'seduction_decline' },
      ],
    };
  }

  /* 7. pregnancy_notice — NPC pregnant with player's child */
  function genPregnancyNotice(state) {
    if (!isMale(state) || playerAge(state) < 14) return null;
    /* cooldown to avoid spamming */
    if (state.totalMonths - state.npcEvents._lastPregnancyMonth < 24) return null;

    /* check hookup history on female contacts and world people */
    var females = allPeople(state).filter(function (person) {
      if (person.gender !== '女') return false;
      if (!Array.isArray(person.hookupHistory) || person.hookupHistory.length === 0) return false;
      /* check if hookup was with the player */
      return person.hookupHistory.some(function (entry) {
        return entry.partnerId === 'player' || entry.withPlayer === true
          || (entry.partner && entry.partner === state.name);
      });
    });
    if (females.length === 0) return null;

    var person = U.random(females);
    state.npcEvents._lastPregnancyMonth = state.totalMonths;

    if (!person.childIds) person.childIds = [];
    /* generate a baby ID */
    var babyId = 'baby-ne-' + uid();
    person.childIds.push(babyId);
    if (!person.childrenCount) person.childrenCount = 0;
    person.childrenCount += 1;

    return {
      type: 'pregnancy_notice',
      title: '意外的通知',
      text: person.name + '发来消息，语气复杂：' + '我怀孕了。孩子是你的。我不知道该怎么办。',
      data: {
        personId: person.id,
        personName: person.name,
        babyId: babyId,
        supportAmount: 5000,
      },
      options: [
        { label: '承认并支付抚养费', action: 'pregnancy_acknowledge' },
        { label: '否认', action: 'pregnancy_deny' },
        { label: '回避', action: 'pregnancy_avoid' },
      ],
    };
  }

  /* 8. rumor_spread — NPCs spread rumors */
  function genRumorSpread(state) {
    if (playerAge(state) < 16) return null;
    var rumorSource = null;
    var rumorText = '';

    /* check if player has had affairs */
    if (state.romance.affairCount >= 2) {
      rumorSource = 'affair';
      rumorText = '你的一些私密关系在圈子里传开了，有人在你背后议论纷纷。';
    } else {
      /* check for criminal records or high scandal risk */
      var scandalRisk = state.creator && state.creator.scandalRisk || 0;
      if (scandalRisk >= 50) {
        rumorSource = 'scandal';
        rumorText = '你的某些行为引起了注意，负面传闻开始在社交圈中蔓延。';
      } else {
        /* check if any contacts with high conflict */
        var rumorSpreader = state.contacts.filter(function (person) {
          return person.conflict >= 85 && person.relation && !['父亲', '母亲'].includes(person.relation);
        });
        if (rumorSpreader.length === 0) return null;
        var spreader = U.random(rumorSpreader);
        rumorSource = 'contact';
        rumorText = '你听说' + spreader.name + '在熟人间散播了关于你的不利消息。';
      }
    }

    return {
      type: 'rumor_spread',
      title: '流言蜚语',
      text: rumorText,
      data: { source: rumorSource, reputationLoss: U.between(4, 12) },
      options: [
        { label: '想办法澄清', action: 'rumor_clarify' },
        { label: '不予理会', action: 'rumor_ignore' },
      ],
    };
  }

  /* ---- queue operations ---- */
  function getNextEvent(state) {
    ensure(state);
    var queue = state.npcEvents.queue;
    if (queue.length === 0) return null;
    return queue.shift();
  }

  function peekEvent(state) {
    ensure(state);
    var queue = state.npcEvents.queue;
    if (queue.length === 0) return null;
    return queue[0];
  }

  /* ---- resolve event ---- */
  function resolveEvent(state, eventId, optionIndex) {
    ensure(state);
    setRef(state);
    var queue = state.npcEvents.queue;
    var idx = -1;
    for (var i = 0; i < queue.length; i += 1) {
      if (queue[i].id === eventId) { idx = i; break; }
    }
    if (idx < 0) return { ok: false, message: '事件已失效' };

    var event = queue[idx];
    var option = event.options[optionIndex];
    if (!option) return { ok: false, message: '选项无效' };

    /* remove event from queue */
    queue.splice(idx, 1);

    var result = applyEventEffect(state, event, option);
    setRef(null);
    return result;
  }

  function applyEventEffect(state, event, option) {
    var action = option.action;
    var data = event.data || {};

    switch (event.type) {

      case 'ex_lover_contact':
        if (action === 'ex_lover_reconnect') {
          var exPerson1 = findPerson(state, data.personId);
          if (exPerson1) {
            exPerson1.affection = clamp((exPerson1.affection || 50) + 8);
            exPerson1.trust = clamp((exPerson1.trust || 40) + 5);
            exPerson1.lastInteractionMonth = state.totalMonths;
            if (exPerson1.relation === '前恋人') exPerson1.relation = '朋友';
            if (Game.relationshipMemory) {
              Game.relationshipMemory.record(state, exPerson1, '重新联系',
                '恢复了与' + exPerson1.name + '的联系', 4, -3);
            }
          }
          return { ok: true, message: '你与' + (data.personName || '对方') + '恢复了联系' };
        }
        return { ok: true, message: '你忽略了这条消息' };

      case 'sponsor_pm':
        if (action === 'sponsor_accept') {
          var amt = data.amount || 3000;
          state.money += amt;
          /* enter hookup flow if available */
          if (Game.hookupSystem && Game.hookupSystem.start) {
            Game.hookupSystem.start(state);
          }
          if (Game.lifeDirector) {
            Game.lifeDirector.addLog(state, '私密邀约',
              '你接受了一次私密会面邀请，获得了' + amt.toLocaleString() + '元。', 'normal');
          }
          return { ok: true, message: '你接受了邀约，获得了' + amt.toLocaleString() + '元' };
        }
        return { ok: true, message: '你拒绝了邀约' };

      case 'prostitute_regular':
        if (action === 'regular_accept') {
          var regPerson = findPerson(state, data.personId);
          if (regPerson) {
            regPerson.affection = clamp((regPerson.affection || 50) + 12);
            regPerson.trust = clamp((regPerson.trust || 40) + 8);
            regPerson.lastInteractionMonth = state.totalMonths;
            state.stats['心情'] = clamp((state.stats['心情'] || 50) + 8);
            if (Game.relationshipMemory) {
              Game.relationshipMemory.record(state, regPerson, '私下约会',
                '与' + regPerson.name + '共度了一个温暖的夜晚', 6, -2);
            }
          }
          return { ok: true, message: '你与' + (data.personName || '她') + '共度了一个愉快的夜晚' };
        }
        return { ok: true, message: '你婉拒了她的好意' };

      case 'class_reunion':
        if (action === 'reunion_go') {
          var cost = U.between(300, 800);
          state.money -= cost;
          state.totalMonths += 1;
          /* restore some archived classmates as contacts */
          var restoredCount = 0;
          if (data.archives && data.archives.length) {
            data.archives.forEach(function (archivedId) {
              var archived = findPerson(state, archivedId);
              if (archived && !state.contacts.some(function (c) { return c.id === archived.id; })) {
                archived.phoneUnlocked = true;
                archived.affection = clamp((archived.affection || 50) + U.between(5, 15));
                archived.lastInteractionMonth = state.totalMonths;
                state.contacts.push(archived);
                restoredCount += 1;
              }
            });
          }
          /* possible one-night stand with a classmate */
          var possibleONS = '';
          if (Math.random() < 0.25 && state.contacts.length > 0) {
            var onsTarget = U.random(state.contacts.filter(function (c) {
              return c.gender !== state.gender && c.affection >= 50;
            }));
            if (onsTarget) {
              onsTarget.affection = clamp((onsTarget.affection || 50) + 10);
              state.stats['心情'] = clamp((state.stats['心情'] || 50) + 10);
              if (!isMale(state)) {
                onsTarget.hookupHistory = Array.isArray(onsTarget.hookupHistory)
                  ? onsTarget.hookupHistory : [];
                onsTarget.hookupHistory.push({
                  partnerId: 'player', month: state.totalMonths, kind: 'reunion',
                });
              }
              possibleONS = '，并与' + onsTarget.name + '发生了亲密关系';
            }
          }
          if (Game.lifeDirector) {
            Game.lifeDirector.addLog(state, '同学聚会',
              '你参加了在' + (data.city || '本地') + '举行的同学聚会，花费' + cost + '元，重联了' + restoredCount + '位老同学。' + possibleONS, 'normal');
          }
          return { ok: true, message: '聚会很成功，恢复了' + restoredCount + '位同学的联系' + possibleONS };
        }
        return { ok: true, message: '你婉拒了聚会邀请' };

      case 'revenge':
        if (action === 'revenge_talk') {
          var revPerson = findPerson(state, data.personId);
          if (revPerson) {
            revPerson.conflict = clamp((revPerson.conflict || 0) - U.between(15, 30));
            revPerson.trust = clamp((revPerson.trust || 20) + U.between(5, 15));
            if (Game.relationshipMemory) {
              Game.relationshipMemory.record(state, revPerson, '和解尝试',
                '尝试与' + revPerson.name + '化解矛盾', 2, -10);
            }
          }
          return { ok: true, message: '你与' + (data.personName || '对方') + '进行了一次对话，矛盾有所缓解' };
        }
        /* ignore: possible consequences */
        if (Math.random() < 0.4 && data.revengeType === 'report') {
          state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) - U.between(3, 8));
          if (Game.lifeDirector) {
            Game.lifeDirector.addLog(state, '举报风波',
              data.personName + '向有关部门举报了你，城市声望下降了。', 'normal');
          }
        } else if (Math.random() < 0.3 && data.revengeType === 'rumor') {
          state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) - U.between(5, 15));
          if (Game.lifeDirector) {
            Game.lifeDirector.addLog(state, '谣言蔓延',
              '关于你的负面消息在社交圈中传播，城市声望下降了。', 'normal');
          }
        }
        return { ok: true, message: '你没理会这件事，但可能会有后续影响' };

      case 'corrupted_seduction':
        if (action === 'seduction_accept') {
          var sedPerson = findPerson(state, data.personId);
          if (sedPerson) {
            sedPerson.affection = clamp((sedPerson.affection || 50) + 10);
            if (!isMale(state)) {
              sedPerson.hookupHistory = Array.isArray(sedPerson.hookupHistory)
                ? sedPerson.hookupHistory : [];
              sedPerson.hookupHistory.push({
                partnerId: 'player', month: state.totalMonths, kind: 'seduction',
              });
            }
            /* player addiction +5 */
            if (state.health && typeof state.health.sexAddiction === 'undefined') {
              state.health.sexAddiction = 0;
            }
            if (state.health) {
              state.health.sexAddiction = clamp((state.health.sexAddiction || 0) + 5);
            }
            state.stats['心情'] = clamp((state.stats['心情'] || 50) + 8);
            if (Game.relationshipMemory) {
              Game.relationshipMemory.record(state, sedPerson, '激情之夜',
                '与' + sedPerson.name + '在酒店度过了一夜', 5, -1);
            }
          }
          return { ok: true, message: '你与' + (data.personName || '对方') + '度过了一个激情之夜' };
        }
        return { ok: true, message: '你拒绝了这个暧昧的邀约' };

      case 'pregnancy_notice':
        if (action === 'pregnancy_acknowledge') {
          if (state.money >= 0) {
            state.money -= data.supportAmount || 5000;
          } else {
            state.money -= (data.supportAmount || 5000);
          }
          var pregPersonA = findPerson(state, data.personId);
          if (pregPersonA) {
            pregPersonA.trust = clamp((pregPersonA.trust || 30) + 15);
            pregPersonA.affection = clamp((pregPersonA.affection || 50) + 5);
            if (Game.relationshipMemory) {
              Game.relationshipMemory.record(state, pregPersonA, '承认责任',
                '承认了' + pregPersonA.name + '腹中孩子是自己的，开始支付抚养费', 15, -5);
            }
          }
          /* create child record after birth */
          if (data.babyId) {
            var baby = {
              id: data.babyId,
              name: '未命名',
              gender: '女',
              baseAge: 0,
              birthMonth: state.totalMonths + 9,
              bornAt: state.totalMonths + 9,
              relation: '私生子',
              motherId: data.personId,
              fatherId: 'player',
              motherName: data.personName || '',
              parentIds: [data.personId, 'player'],
              status: '健康',
              affection: 40,
              trust: 40,
              conflict: 0,
              memories: [],
              metCity: state.location.city,
              currentCity: state.location.city,
              homeCity: state.location.city,
              childIds: [],
              phoneUnlocked: false,
              clothing: { top: '婴儿连体衣', socks: '婴儿袜', shoes: '婴儿软底鞋' },
            };
            baby.statSourceId = baby.id;
            baby.stats = { 健康: U.between(58, 90), 智力: U.between(40, 75), 魅力: U.between(35, 80) };
            if (Game.genetics && Game.genetics.founder) {
              Game.genetics.founder(baby, baby.gender, baby.id + '-' + baby.name, false);
            }
            if (Game.people && Game.people.addContact) {
              Game.people.addContact(state, baby);
            } else {
              state.contacts.push(baby);
            }
          }
          if (Game.lifeDirector) {
            Game.lifeDirector.addLog(state, '重大责任',
              '你承认了' + (data.personName || '她') + '腹中的孩子，开始每月支付抚养费。', 'normal');
          }
          return { ok: true, message: '你决定承担责任，每月支付' + (data.supportAmount || 5000).toLocaleString() + '元抚养费' };
        }
        if (action === 'pregnancy_deny') {
          var pregPersonD = findPerson(state, data.personId);
          if (pregPersonD) {
            pregPersonD.conflict = clamp((pregPersonD.conflict || 0) + 50);
            pregPersonD.affection = clamp((pregPersonD.affection || 50) - 30);
            pregPersonD.trust = clamp((pregPersonD.trust || 30) - 25);
            if (Game.relationshipMemory) {
              Game.relationshipMemory.record(state, pregPersonD, '否认责任',
                '否认了' + pregPersonD.name + '腹中的孩子是自己的', -20, 50);
            }
            /* may report */
            if (Math.random() < 0.5) {
              state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) - U.between(5, 15));
              if (Game.lifeDirector) {
                Game.lifeDirector.addLog(state, '社会纠纷',
                  pregPersonD.name + '将此事公开了，城市声望下降。', 'normal');
              }
            }
          }
          return { ok: true, message: '你否认了责任，关系彻底恶化' };
        }
        /* avoid */
        if (Game.lifeDirector) {
          Game.lifeDirector.addLog(state, '沉默回避',
            '你避开了' + (data.personName || '她') + '的消息。她将独自面对这一切。', 'normal');
        }
        return { ok: true, message: '你回避了这件事，' + (data.personName || '她') + '将独自处理' };

      case 'rumor_spread':
        if (action === 'rumor_clarify') {
          var loss = Math.round((data.reputationLoss || 8) * 0.4);
          state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) - loss);
          if (Game.lifeDirector) {
            Game.lifeDirector.addLog(state, '澄清努力',
              '你努力澄清了流言，但声望仍受到了轻微影响。', 'normal');
          }
          return { ok: true, message: '你尽力澄清了流言，声望损失减少了' };
        }
        /* ignore: full reputation loss */
        state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) - (data.reputationLoss || 8));
        if (Game.lifeDirector) {
          Game.lifeDirector.addLog(state, '流言蔓延',
            '你没有理会流言，城市声望下降了。', 'normal');
        }
        return { ok: true, message: '流言逐渐平息，但城市声望下降了' };

      default:
        return { ok: true, message: '事件已处理' };
    }
  }

  /* ---- render functions ---- */
  function renderEventBadge(state) {
    ensure(state);
    var count = state.npcEvents.queue.length;
    if (count === 0) return '';

    var badgeStyle = [
      'position:absolute',
      'top:-6px',
      'right:-6px',
      'min-width:20px',
      'height:20px',
      'line-height:20px',
      'border-radius:10px',
      'background:#e53935',
      'color:#fff',
      'font-size:12px',
      'font-weight:700',
      'text-align:center',
      'padding:0 5px',
      'pointer-events:none',
    ].join(';');

    var btnStyle = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'z-index:500',
      'background:#fff',
      'border:1px solid #ddd',
      'border-radius:50%',
      'width:44px',
      'height:44px',
      'font-size:20px',
      'cursor:pointer',
      'box-shadow:0 2px 8px rgba(0,0,0,0.12)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:0',
    ].join(';');

    return '<button id="eventQueueBtn" class="event-queue-btn" style="' + btnStyle + '" title="' + count + '条NPC事件"' +
      ' onclick="window.LifeGame.npcInitiative.openSheet()">' +
      '&#x1F4E8;' +
      '<span id="eventBadge" class="badge" style="' + badgeStyle + '">' + count + '</span>' +
      '</button>';
  }

  function renderEventSheet(state) {
    ensure(state);
    setRef(state);

    var queue = state.npcEvents.queue;
    if (queue.length === 0) {
      return '<div id="npcEventSheet" class="event-sheet" style="display:none"></div>';
    }

    var event = queue[0];
    var optionsHTML = event.options.map(function (opt, optIndex) {
      return '<button class="event-option-btn"' +
        ' style="display:block;width:100%;padding:14px;margin:6px 0;border:none;border-radius:10px;' +
        'background:#f0f0f5;font-size:15px;cursor:pointer;text-align:left;transition:background 0.2s"' +
        ' onmouseover="this.style.background=\'#e0e0ea\'" onmouseout="this.style.background=\'#f0f0f5\'"' +
        ' onclick="window.LifeGame.npcInitiative.handleSheetOption(\'' + event.id + '\',' + optIndex + ')">' +
        opt.label +
        '</button>';
    }).join('');

    var sheetStyle = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'max-height:50vh',
      'background:#fff',
      'border-radius:20px 20px 0 0',
      'box-shadow:0 -4px 20px rgba(0,0,0,0.15)',
      'z-index:600',
      'padding:16px 20px 20px',
      'overflow-y:auto',
      'animation:slideUp 0.3s ease-out',
    ].join(';');

    var overlayStyle = [
      'position:fixed',
      'top:0;left:0;right:0;bottom:0',
      'background:rgba(0,0,0,0.3)',
      'z-index:599',
    ].join(';');

    return '<div id="npcEventOverlay" style="' + overlayStyle + '"' +
      ' onclick="document.getElementById(\'npcEventOverlay\').remove();document.getElementById(\'npcEventSheet\').remove()">' +
      '</div>' +
      '<div id="npcEventSheet" class="event-sheet" style="' + sheetStyle + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<strong style="font-size:17px">' + event.title + '</strong>' +
      '<span style="font-size:12px;color:#999">' + (state.npcEvents.queue.length || 0) + '条待处理</span>' +
      '</div>' +
      '<p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">' + event.text + '</p>' +
      optionsHTML +
      '<button style="display:block;width:100%;padding:10px;margin-top:12px;border:1px solid #ddd;' +
      'border-radius:10px;background:#fff;font-size:14px;color:#888;cursor:pointer"' +
      ' onclick="document.getElementById(\'npcEventOverlay\').remove();document.getElementById(\'npcEventSheet\').remove()">' +
      '关闭</button>' +
      '</div>';
  }

  function handleSheetOption(eventId, optionIndex) {
    var state = getRef();
    if (!state) return;
    var result = resolveEvent(state, eventId, optionIndex);
    /* remove sheet and overlay */
    var overlay = document.getElementById('npcEventOverlay');
    var sheet = document.getElementById('npcEventSheet');
    if (overlay) overlay.remove();
    if (sheet) sheet.remove();
    /* refresh badge */
    refreshBadge(state);
    /* show result toast */
    if (Game.view && Game.view.showToast) {
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    /* if more events, reopen sheet */
    if (state.npcEvents.queue.length > 0 && result.ok) {
      setTimeout(function () {
        insertEventSheet(state);
      }, 300);
    }
    /* trigger save/refresh */
    try {
      if (typeof window.refreshGame === 'function') window.refreshGame();
    } catch (_) { /* ignore */ }
  }

  function openSheet() {
    var state = getRef();
    if (!state) return;
    insertEventSheet(state);
  }

  function insertEventSheet(state) {
    /* remove existing if any */
    var existingOverlay = document.getElementById('npcEventOverlay');
    var existingSheet = document.getElementById('npcEventSheet');
    if (existingOverlay) existingOverlay.remove();
    if (existingSheet) existingSheet.remove();

    var html = renderEventSheet(state);
    var container = document.getElementById('npcEventContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'npcEventContainer';
      document.body.appendChild(container);
    }
    container.innerHTML = html;
  }

  function refreshBadge(state) {
    var badge = document.getElementById('eventBadge');
    var btn = document.getElementById('eventQueueBtn');
    if (!badge || !btn) return;
    var count = state.npcEvents.queue.length;
    if (count === 0) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'flex';
      badge.textContent = count > 99 ? '99+' : String(count);
    }
  }

  /* ---- frequency management ---- */
  function changeFrequency(state, level) {
    ensure(state);
    if (!['high', 'low', 'off'].includes(level)) return false;
    state.npcEvents.frequency = level;
    if (level === 'off') {
      state.npcEvents.queue = [];
    }
    return true;
  }

  /* ---- record brothel visit (to be called by brothel system) ---- */
  function recordBrothelVisit(state, personId) {
    ensure(state);
    var visits = state.npcEvents._brothelVisits;
    visits[personId] = (visits[personId] || 0) + 1;
  }

  /* ---- set state ref for UI callbacks ---- */
  function setStateRef(state) {
    setRef(state);
  }

  Game.npcInitiative = Object.freeze({
    ensure,
    monthly,
    getNextEvent,
    renderEventBadge,
    renderEventSheet,
    changeFrequency,
    resolveEvent,
    handleSheetOption,
    openSheet,
    insertEventSheet,
    refreshBadge,
    recordBrothelVisit,
    setStateRef,
    getRef: getRef,
  });
}(window));
