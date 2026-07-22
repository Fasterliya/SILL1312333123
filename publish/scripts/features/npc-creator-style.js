(function initNpcCreatorStyle(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const jobs = Object.freeze({
    福利姬: 'welfare', 美妆博主: 'beauty', 穿搭博主: 'style',
  });
  const looks = Object.freeze({
    coser: {
      tops: ['复古学院背带裙', '针织开衫连衣裙', '水手服过膝裙', '白绯巫女服'],
      hair: ['双马尾', '日式低双马尾', '公主切长发', '空气刘海长发'],
      shoes: ['玛丽珍鞋', '便士乐福鞋', '高帮帆布鞋'],
    },
    welfare: {
      tops: ['针织开衫连衣裙', '复古学院背带裙', '领结衬衫半身裙', '都市衬衫裙'],
      hair: ['双马尾', '日式低双马尾', '姬发式', '羊毛卷'],
      shoes: ['玛丽珍鞋', '便士乐福鞋', '低帮板鞋'],
    },
    beauty: {
      tops: ['法式小香套装', '针织开衫连衣裙', '复古灯笼袖长裙', '都市西装连衣裙'],
      hair: ['双马尾', '空气刘海长发', '法式卷发', '侧编发'],
      shoes: ['玛丽珍鞋', '便士乐福鞋', '低帮板鞋'],
    },
    style: {
      tops: ['复古学院背带裙', '针织开衫连衣裙', '法式小香套装', '领结衬衫半身裙'],
      hair: ['双马尾', '日式低双马尾', '鱼骨辫', '挑染层次发'],
      shoes: ['玛丽珍鞋', '便士乐福鞋', '高帮帆布鞋'],
    },
  });
  const maleCoserLook = Object.freeze({
    tops: ['文艺穿搭', '品质日常', '校园休闲', '运动穿搭'],
    hair: ['清爽短发', '日式短碎发', '高束马尾', '狼尾短发'],
    socks: ['船袜', '白色中筒袜', '运动袜'],
    shoes: ['高帮帆布鞋', '低帮板鞋', '白色运动鞋'],
  });

  function role(person) {
    const job = String(person.job || '');
    if (['职业Coser', '业余Coser', '受邀嘉宾Coser'].includes(job)) return 'coser';
    return jobs[job] || '';
  }

  function ensure(person, month) {
    person.creatorStyle = person.creatorStyle && typeof person.creatorStyle === 'object'
      ? person.creatorStyle : {};
    const data = person.creatorStyle;
    data.nextChangeMonth = Number.isFinite(data.nextChangeMonth) ? data.nextChangeMonth : month;
    data.pending = data.pending && typeof data.pending === 'object' ? data.pending : null;
    data.cooldownUntil = Number.isFinite(data.cooldownUntil) ? data.cooldownUntil : month;
    data.history = Array.isArray(data.history) ? data.history.slice(-8) : [];
    return data;
  }

  function changeLook(state, person, kind, data) {
    if (state.totalMonths < data.nextChangeMonth) return;
    const look = looks[kind];
    person.clothing ||= {};
    person.clothing.top = U.random(look.tops);
    person.clothing.socks = '白色连裤袜';
    person.clothing.shoes = U.random(look.shoes);
    person.hairstyle = U.random(look.hair);
    person.bodyType = person.bodyType === '娇小纤细' ? person.bodyType : '匀称';
    data.nextChangeMonth = state.totalMonths + U.between(2, 4);
    data.history.push({
      month: state.totalMonths, top: person.clothing.top, socks: person.clothing.socks,
      shoes: person.clothing.shoes, hairstyle: person.hairstyle,
    });
    data.history = data.history.slice(-8);
    Game.npcFemboyCareer?.markOutfit(state, person);
  }

  function changeMaleCoserLook(state, person, data) {
    if (state.totalMonths < data.nextChangeMonth) return;
    person.clothing ||= {};
    person.clothing.top = U.random(maleCoserLook.tops);
    person.clothing.socks = U.random(maleCoserLook.socks);
    person.clothing.shoes = U.random(maleCoserLook.shoes);
    person.hairstyle = U.random(maleCoserLook.hair);
    data.nextChangeMonth = state.totalMonths + U.between(2, 4);
    data.history.push({
      month: state.totalMonths, top: person.clothing.top, socks: person.clothing.socks,
      shoes: person.clothing.shoes, hairstyle: person.hairstyle,
    });
    data.history = data.history.slice(-8);
  }

  function finishSurgery(state, person, data) {
    if (!data.pending || state.totalMonths < data.pending.completeMonth) return;
    const proc = Game.plasticSurgery.get(data.pending.procedureId);
    if (proc) {
      Game.plasticSurgery.apply(person, person.stats, proc);
      person.cosmeticProcedures ||= [];
      person.cosmeticProcedures.push({
        id: `npc-surg-${person.id}-${state.totalMonths}`, type: proc.category,
        name: proc.name, month: state.totalMonths, cost: proc.cost, success: true,
        note: `${proc.name}恢复完成，魅力与外形得到提升。`,
      });
      person.cosmeticProcedures = person.cosmeticProcedures.slice(-8);
      Game.npcFemboyCareer?.afterSurgery(state, person);
    }
    data.pending = null;
  }

  function nextProcedure(state, person) {
    const completed = new Set((person.cosmeticProcedures || []).map((item) => item.type));
    if (Game.npcFemboyCareer?.active(person)) {
      return Game.npcFemboyCareer.nextProcedure(state, person, completed);
    }
    if (person.bodyType !== '娇小纤细' && !completed.has('waist')) return 'waist';
    if (Number(person.height) > 158 && !completed.has('height-reduction')) return 'heightshort';
    return ['eyelid', 'nose', 'facial'].find((id) => (
      !completed.has(Game.plasticSurgery.get(id).category)
    )) || '';
  }

  function scheduleSurgery(state, person, data) {
    if (data.pending || state.totalMonths < data.cooldownUntil) return;
    const procedureId = nextProcedure(state, person);
    const proc = Game.plasticSurgery.get(procedureId);
    if (!proc) return;
    data.pending = {
      procedureId, startMonth: state.totalMonths,
      completeMonth: state.totalMonths + proc.recoveryMonths,
    };
    data.cooldownUntil = data.pending.completeMonth + proc.cooldownMonths;
  }

  function monthlyPerson(state, person) {
    const kind = role(person);
    const age = U.personAge(state, person);
    const feminineCareer = Game.npcFemboyCareer?.active(person);
    const standardMaleCoser = kind === 'coser' && person.gender === '男' && !feminineCareer;
    if (!kind || (person.gender !== '女' && !feminineCareer && !standardMaleCoser)
      || age < 18 || person.status !== '健康') return;
    const data = ensure(person, state.totalMonths);
    if (standardMaleCoser) {
      changeMaleCoserLook(state, person, data);
      return;
    }
    finishSurgery(state, person, data);
    changeLook(state, person, kind, data);
    scheduleSurgery(state, person, data);
  }

  function statusRows(state, person) {
    const kind = role(person);
    const feminineCareer = Game.npcFemboyCareer?.active(person);
    if (!kind || U.personAge(state, person) < 18
      || (kind !== 'coser' && person.gender !== '女' && !feminineCareer)) return [];
    const data = ensure(person, state.totalMonths);
    if (kind === 'coser' && person.gender === '男' && !feminineCareer) {
      return [
        ['职业造型', '角色假发 / 舞台妆面 / 服装还原'],
        ['当前企划', `${person.cosplay || '综合主题COS'} · 保持原角色体态`],
        ['换装计划', `${Math.max(0, data.nextChangeMonth - state.totalMonths)}个月后更新`],
        ['造型维护', '按参展周期更新 · 不安排女性化医美'],
      ];
    }
    const pending = data.pending;
    const proc = pending ? Game.plasticSurgery.get(pending.procedureId) : null;
    const recovery = pending ? Math.max(0, pending.completeMonth - state.totalMonths) : 0;
    const cooldown = Math.max(0, data.cooldownUntil - state.totalMonths);
    return [
      ['职业造型', '双马尾 / 可爱系裙装 / 白色连裤袜'],
      ...(feminineCareer ? [
        ['身材优势', Game.npcFemboyCareer.advantageLabel(person)],
        ['女性化医美计划', Game.npcFemboyCareer.planLabel(state, person)],
      ] : []),
      ['换装计划', `${Math.max(0, data.nextChangeMonth - state.totalMonths)}个月后更新`],
      ['整容进程', proc ? `${proc.name}恢复中 · 剩余${recovery}个月`
        : (cooldown ? `术后冷却 · 剩余${cooldown}个月` : '可开始下一项')],
      ['完成项目', `${(person.cosmeticProcedures || []).length}项 · 手术不会失败`],
    ];
  }

  Game.npcCreatorStyle = Object.freeze({ role, ensure, monthlyPerson, statusRows });
}(window));
