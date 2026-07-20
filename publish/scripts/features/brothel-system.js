(function initBrothelSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- styling helpers ---- */
  function styleAsProstitute(woman) {
    const schoolTops = ['水手服迷你裙', '西式制服百褶裙', '水手服过膝裙'];
    const cuteTops = ['针织开衫连衣裙', '宽松毛衣半身裙', '法式小香套装', '都市西装连衣裙'];
    const cosplayTops = Game.cosplayCatalog?.items
      ? Game.cosplayCatalog.items.filter((c) => c.name !== '无').map((c) => c.name) : [];

    const allTops = [...schoolTops, ...cuteTops, ...cosplayTops.slice(0, 6)];
    const tops = ['水手服迷你裙', '西式制服百褶裙', '水手服过膝裙',
      '针织开衫连衣裙', '宽松毛衣半身裙', '法式小香套装'];

    woman.clothing = woman.clothing && typeof woman.clothing === 'object' ? woman.clothing : {};
    woman.clothing.top = U.random(tops);
    woman.clothing.socks = U.random(['白色过膝袜', '白色连裤袜', '白色中筒袜', '黑色连裤袜']);
    woman.clothing.shoes = U.random(['帆布鞋', '乐福鞋', '白色运动鞋']);
    woman.hairstyle = U.random(['双马尾', '公主切长发', '日式姬发式', '齐肩直发', '自然层次发']);
    woman.bodyType = U.random(['娇小纤细', '小胸', '匀称']);
    woman.temperament = U.random(['青涩', '明快', '清冷', '灵动']);
  }

  /* ---- check for acquaintances ---- */
  function checkAcquaintances(state, women) {
    const results = [];
    women.forEach((woman) => {
      const isClassmate = state.contacts.some((c) => c.id === woman.id);
      const daughter = state.family.some((f) =>
        f.id === woman.id && ['女儿'].includes(f.relation));
      const relative = state.family.some((f) =>
        f.id === woman.id && !['父亲', '母亲', '配偶', '儿子', '女儿'].includes(f.relation));

      if (isClassmate || daughter || relative) {
        results.push({
          woman,
          relation: daughter ? '女儿' : (isClassmate ? '同学' : '亲属'),
          kind: daughter ? 'daughter' : (isClassmate ? 'classmate' : 'relative'),
        });
      }
    });
    return results;
  }

  /* ---- stage data ---- */
  function brothelStageData(state, stage, partnerName) {
    return [
      {
        title: '踏入烟花巷',
        text: '霓虹灯映照着狭窄的巷子，穿着暴露的女性在门口揽客。空气中混杂着廉价香水和酒精的气味。',
        options: [
          ['premium', '径直走进最高档的会所', { cost: 800, mood: 2, score: 3 }],
          ['browse', '先在巷子里转转观察各家', { mood: 5, score: 2 }],
          ['direct', '直接选最近的店面进去', { cost: 400, mood: 3, score: 1 }],
        ],
      },
      {
        title: '选择对象',
        text: '几位女性向你投来目光，各有风韵。',
        options: [
          ['young', '选择最年轻娇小的那位', { mood: 6, cost: 200, score: 4, style: 'school' }],
          ['cute', '选择穿着可爱的制服少女', { mood: 5, cost: 150, score: 3, style: 'cute' }],
          ['mature', '选择气质成熟的那位', { mood: 3, cost: 100, score: 2, style: 'mature' }],
        ],
      },
      {
        title: '房中私语',
        text: `${partnerName || '她'}带你进入房间，淡淡的花香弥漫。灯光调得很暗，只有床头一盏小灯。`,
        options: [
          ['gentle', '温柔地安抚她，先聊聊天', { affection: 10, mood: 3, score: 3 }],
          ['direct', '不多废话，直接开始', { mood: 5, score: 2 }],
          ['gift', '先送上小礼物讨她欢心', { cost: 300, affection: 15, mood: 6, score: 5 }],
        ],
      },
    ][stage];
  }

  /* ---- main functions ---- */
  function ensure(state) {
    state.brothelStage = state.brothelStage && typeof state.brothelStage === 'object' ? state.brothelStage : {
      active: false, placeId: null, stage: 0, partnerId: null, score: 0,
    };
    return state.brothelStage;
  }

  function start(state) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能前往红灯区' };
    if (state.brothelStage.active) return { ok: false, message: '你已经在红灯区中了' };
    ensure(state);
    state.brothelStage.active = true;
    state.brothelStage.stage = 0;
    state.brothelStage.partnerId = null;
    state.brothelStage.score = 0;
    return { ok: true, message: '踏入红灯区' };
  }

  function choose(state, choiceId) {
    const bs = state.brothelStage;
    const stage = brothelStageData(state, bs.stage, '');
    const choice = stage?.options.find((e) => e[0] === choiceId);
    if (!stage || !choice) return { ok: false, message: '选项已失效' };

    const effect = choice[2];
    if (effect.cost) Game.economy.spend(state, effect.cost);
    state.stats.心情 = U.clamp(state.stats.心情 + (effect.mood || 0), 0, 100);
    bs.score += effect.score || 0;

    if (bs.stage === 1) {
      /* Select partner */
      const women = Game.socialWorld.cityPeople(state, state.location.city)
        .filter((p) => p.gender === '女' && p.status === '健康'
          && U.personAge(state, p) >= 18 && U.personAge(state, p) <= 45);
      if (!women.length) {
        bs.active = false;
        return { ok: false, message: '今晚没有合适的对象' };
      }

      /* Check for acquaintances */
      const acquaintances = checkAcquaintances(state, women);
      let woman;
      let specialText = '';

      if (acquaintances.length && Math.random() < 0.3) {
        /* Encounter someone you know */
        const acq = U.random(acquaintances);
        woman = acq.woman;
        specialText = acq.relation === '女儿'
          ? `你震惊地发现眼前的人竟然是你的女儿${woman.name}！她同样认出了你，眼神中闪过一丝慌乱...`
          : `你惊讶地发现，眼前的人竟然是你的${acq.relation}${woman.name}。她先是一愣，随后低下头...`;
        bs.score -= 15;
      } else {
        /* Select based on choice */
        if (effect.style === 'school') {
          const young = women.filter((p) => U.personAge(state, p) <= 25);
          woman = young.length ? U.random(young) : U.random(women);
        } else if (effect.style === 'cute') {
          const cute = women.filter((p) =>
            ['水手服迷你裙', '西式制服百褶裙'].includes(p.clothing?.top || ''));
          woman = cute.length ? U.random(cute) : U.random(women);
        } else {
          woman = U.random(women);
        }
      }

      /* Style and tag */
      styleAsProstitute(woman);
      woman.sexWork = woman.sexWork && typeof woman.sexWork === 'object' ? woman.sexWork : {};
      woman.sexWork.isProstitute = true;
      woman.sexWork.brothelVisits = (woman.sexWork.brothelVisits || 0) + 1;
      woman.sexWork.lastBrothelMonth = state.totalMonths;
      if (!woman.job || woman.job === '无') woman.job = '妓女';
      woman.metCity ||= state.location.city;

      bs.partnerId = woman.id;
      /* Add to travel encounters so she appears after the encounter */
      woman.affection = U.clamp(Number(woman.affection) || 40, 0, 100);
      if (!state.travel.encounters.some((p) => p.id === woman.id)) {
        state.travel.encounters.push(woman);
      }
      if (specialText) {
        Game.lifeDirector.addLog(state, '红灯区·不期而遇', specialText, 'normal');
      }
    }

    if (bs.stage === 0 && effect.mood) {
      Game.lifeDirector.addLog(state, '红灯区·探索',
        `你${choice[1]}，心情提升。`, 'good');
    }

    if (bs.stage === 2 && effect.affection) {
      const partner = Game.people.find(state, bs.partnerId);
      if (partner) {
        partner.affection = U.clamp(partner.affection + effect.affection, 0, 100);
      }
    }

    bs.stage += 1;

    if (bs.stage >= 3) {
      /* Transition to encounter system */
      const partner = Game.people.find(state, bs.partnerId);
      if (partner) {
        return { ok: true, message: '进入交欢', startEncounter: true, partner };
      }
      bs.active = false;
      return { ok: false, message: '对象已经离开了' };
    }

    return { ok: true, message: `${stage.title}：${choice[1]}` };
  }

  function render(state) {
    const bs = state.brothelStage;
    if (!bs.active) {
      /* Show brothel entry button */
      return `<section class="panel">
        <div class="panel-title"><h2>红灯区</h2><span>深夜娱乐</span></div>
        <p class="empty-state">成年人的夜生活。消费不菲，但能彻底放松身心。</p>
        <button class="wide-action" data-brothel-start>进入红灯区 · ${Game.view.money(680)}</button>
      </section>`;
    }

    const partner = bs.partnerId ? Game.people.find(state, bs.partnerId) : null;
    const nm = partner ? partner.name : '未知';
    const stage = brothelStageData(state, bs.stage, nm);
    if (!stage) return '';

    return `<section class="journey-current"><span>红灯区 · ${state.location.city}</span>
      <strong>${stage.title}</strong><small>${stage.text}</small>
      <div class="journey-progress"><i style="width:${bs.stage * 33}%"></i></div></section>
      <div class="journey-options">${stage.options.map(([id, label, eff]) => (
        `<button data-brothel-choice="${id}">${label}${eff.cost ? ` · ${Game.view.money(eff.cost)}` : ''}</button>`
      )).join('')}</div>`;
  }

  function handleClick(event) {
    const startBtn = event.target.closest('[data-brothel-start]');
    if (startBtn) {
      const state = Game._getState ? Game._getState() : null;
      if (state) {
        const result = start(state);
        Game._refresh();
        if (result.ok) Game.view.showToast(result.message, 'good');
      }
      return true;
    }
    const choiceBtn = event.target.closest('[data-brothel-choice]');
    if (choiceBtn) {
      const state = Game._getState ? Game._getState() : null;
      if (state && state.brothelStage.active) {
        const result = choose(state, choiceBtn.dataset.brothelChoice);
        Game._refresh();
        if (result.startEncounter && result.partner) {
          /* Launch encounter overlay */
          Game.encounterSystem.init(state, result.partner, 'brothel', 'client');
          Game._refresh();
          Game.encounterSystem.showOverlay(state);
          Game.view.showToast('交欢开始', 'good');
        } else if (result.ok) {
          Game.view.showToast(result.message, 'good');
        } else {
          Game.view.showToast(result.message, 'warning');
        }
      }
      return true;
    }
    return false;
  }

  Game.brothelSystem = Object.freeze({ ensure, start, choose, render, handleClick, styleAsProstitute });
}(window));
