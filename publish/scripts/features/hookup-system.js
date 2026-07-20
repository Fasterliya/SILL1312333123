(function initHookupSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- style partner ---- */
  function styleHookupPartner(state, partner, style) {
    partner.clothing = partner.clothing && typeof partner.clothing === 'object' ? partner.clothing : {};
    if (style === 'school') {
      partner.clothing.top = U.random(['水手服迷你裙', '水手服过膝裙', '西式制服百褶裙']);
      partner.clothing.socks = U.random(['白色过膝袜', '白色连裤袜', '白色中筒袜']);
      partner.clothing.shoes = U.random(['乐福鞋', '帆布鞋']);
      partner.hairstyle = U.random(['双马尾', '公主切长发', '齐肩直发', '日式姬发式']);
      partner.bodyType = U.random(['娇小纤细', '小胸']);
      partner.temperament = U.random(['青涩', '明快', '灵动']);
    } else if (style === 'cosplay') {
      const items = Game.cosplayCatalog?.items
        ? Game.cosplayCatalog.items.filter((c) => c.name !== '无' && U.personAge(state, partner) >= c.minAge && U.personAge(state, partner) <= c.maxAge)
        : [];
      if (items.length) {
        const cos = U.random(items);
        partner.cosplay = cos.name;
        partner.clothing.top = cos.name + 'COS服';
      }
      partner.clothing.socks = U.random(['白色过膝袜', '白色连裤袜', '黑色过膝袜']);
      partner.clothing.shoes = U.random(['乐福鞋', '帆布鞋', '白色运动鞋']);
      if (!partner.hairstyle || partner.hairstyle === '儿童短发') {
        partner.hairstyle = U.random(['双马尾', '高束马尾', '自然层次发']);
      }
    } else {
      partner.clothing.top = U.random(['针织开衫连衣裙', '宽松毛衣半身裙', '衬衫牛仔裤套装']);
      partner.clothing.socks = U.random(['白色中筒袜', '船袜']);
      partner.clothing.shoes = U.random(['白色运动鞋', '帆布鞋']);
      partner.hairstyle = U.random(['自然层次发', '齐肩直发', '双马尾']);
    }
    partner.metCity ||= state.location.city;
    partner.currentCity ||= state.location.city;
  }

  /* ---- stage data ---- */
  function hookupStageData(state, stage, partnerName) {
    const isProvider = state.hookupStage.playerRole === 'provider';
    return [
      {
        title: '收到邀约',
        text: isProvider
          ? '一条私信吸引了你的注意——对方出价不菲，想要与你共度一晚。'
          : '一位粉丝发来私密邀约，照片上的她穿着可爱的制服，让人心动。',
        options: [
          ['accept', '欣然接受邀约', { mood: 5, score: 3 }],
          ['negotiate', '先聊聊确认对方诚意', { mood: 2, affection: 6, score: 2 }],
        ],
      },
      {
        title: '赴约准备',
        text: isProvider
          ? `你翻看衣柜，今天是${partnerName || '金主'}喜欢的风格...`
          : `她在约定的地点等你。今天她想穿什么风格呢？`,
        options: [
          ['school', '学院风 · 水手服+过膝袜+双马尾', { mood: 6, score: 4, style: 'school' }],
          ['cosplay', 'COS装扮 · 角色扮演的刺激', { mood: 8, cost: 400, score: 5, style: 'cosplay' }],
          ['casual', '日常便服 · 邻家少女的温柔', { mood: 3, score: 2, style: 'casual' }],
        ],
      },
      {
        title: '暧昧开场',
        text: `${partnerName || '对方'}就在眼前。气氛已经升温，空气中弥漫着微妙的期待。`,
        options: [
          ['flirt', '用甜言蜜语调情', { affection: 8, mood: 3, score: 3 }],
          ['direct', '不多废话直接进入正题', { mood: 5, score: 2 }],
          ['drink', '先共饮一杯放松', { cost: 200, mood: 6, affection: 5, score: 4 }],
        ],
      },
    ][stage];
  }

  /* ---- main functions ---- */
  function ensure(state) {
    state.hookupStage = state.hookupStage && typeof state.hookupStage === 'object' ? state.hookupStage : {
      active: false, stage: 0, sponsorId: null, style: '', score: 0, playerRole: 'provider',
    };
    return state.hookupStage;
  }

  function start(state, sponsor, playerRole) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能进行私密约会' };
    if (state.hookupStage.active) return { ok: false, message: '当前已经有一个进行中的约会' };
    ensure(state);

    /* Generate sponsor if not provided */
    let partner = sponsor;
    if (!partner) {
      const gender = playerRole === 'provider' ? '男' : '女';
      const age = playerRole === 'provider' ? U.between(28, 55) : U.between(18, 28);
      partner = U.person('金主', U.random(Game.nameSystem.surnames()), age, gender, state.totalMonths);
      Game.worldCulture.applyPerson(partner, state.location.country);
      U.setUniqueName(state, partner, Game.worldCulture.profile(state.location.country).locale);
      partner.metCity = state.location.city;
      partner.currentCity = state.location.city;
      partner.affection = U.between(42, 62);
      partner.wealth = U.between(500000, 5000000);
      partner.sponsorType = true;
      if (!state.worldPeople.some((p) => p.id === partner.id)) state.worldPeople.push(partner);
    }

    state.hookupStage.active = true;
    state.hookupStage.stage = 0;
    state.hookupStage.sponsorId = partner.id;
    state.hookupStage.style = '';
    state.hookupStage.score = 0;
    state.hookupStage.playerRole = playerRole || 'provider';

    state.stats.心情 = U.clamp(state.stats.心情 + 4, 0, 100);

    return { ok: true, message: `与${partner.name}的私密约会开始` };
  }

  function choose(state, choiceId) {
    const hs = state.hookupStage;
    const partner = Game.people.find(state, hs.sponsorId);
    const nm = partner ? partner.name : '对方';
    const stage = hookupStageData(state, hs.stage, nm);
    const choice = stage?.options.find((e) => e[0] === choiceId);
    if (!stage || !choice) return { ok: false, message: '选项已失效' };

    const effect = choice[2];
    if (effect.cost) Game.economy.spend(state, effect.cost);
    if (effect.mood) state.stats.心情 = U.clamp(state.stats.心情 + effect.mood, 0, 100);
    hs.score += effect.score || 0;

    if (hs.stage === 1 && effect.style && partner) {
      hs.style = effect.style;
      if (hs.playerRole === 'provider') {
        /* Player is female sex worker - style herself */
        const playerStyle = { ...state.profile, clothing: {}, gender: '女' };
        styleHookupPartner(state, { ...playerStyle, id: state.profile.id }, effect.style);
        state.profile.clothing = playerStyle.clothing;
        state.profile.hairstyle = playerStyle.hairstyle;
        state.profile.bodyType = playerStyle.bodyType;
      } else {
        /* Style the female partner */
        styleHookupPartner(state, partner, effect.style);
      }
    }

    if (hs.stage === 2 && effect.affection && partner) {
      partner.affection = U.clamp(partner.affection + effect.affection, 0, 100);
    }

    hs.stage += 1;

    if (hs.stage >= 3) {
      if (partner) {
        const playerRole = hs.playerRole;
        return { ok: true, message: '进入交欢', startEncounter: true, partner, playerRole };
      }
      hs.active = false;
      return { ok: false, message: '对方已经离开了' };
    }

    return { ok: true, message: `${stage.title}：${choice[1]}` };
  }

  function render(state) {
    const hs = state.hookupStage;
    if (!hs.active) return '';

    const partner = Game.people.find(state, hs.sponsorId);
    const nm = partner ? partner.name : '对方';
    const stage = hookupStageData(state, hs.stage, nm);
    if (!stage) return '';

    const roleLabel = hs.playerRole === 'provider' ? '女方' : '男方';

    return `<section class="journey-current"><span>私密约会 · ${roleLabel}</span>
      <strong>${stage.title}</strong><small>${stage.text}</small>
      <div class="journey-progress"><i style="width:${hs.stage * 33}%"></i></div></section>
      <div class="journey-options">${stage.options.map(([id, label, eff]) => (
        `<button data-hookup-choice="${id}">${label}${eff.cost ? ` · ${Game.view.money(eff.cost)}` : ''}</button>`
      )).join('')}</div>`;
  }

  function handleClick(event) {
    const choiceBtn = event.target.closest('[data-hookup-choice]');
    if (choiceBtn) {
      const state = Game._getState ? Game._getState() : null;
      if (state && state.hookupStage.active) {
        const result = choose(state, choiceBtn.dataset.hookupChoice);
        Game._refresh();
        if (result.startEncounter && result.partner) {
          Game.encounterSystem.init(state, result.partner, 'hookup', result.playerRole);
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

  Game.hookupSystem = Object.freeze({ ensure, start, choose, render, handleClick, styleHookupPartner });
}(window));
