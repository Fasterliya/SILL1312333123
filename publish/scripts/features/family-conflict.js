(function initFamilyConflict(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function ensure(state) {
    state.romance.suspicion = Number.isFinite(state.romance.suspicion) ? state.romance.suspicion : 0;
    state.romance.affairCount = Math.max(0, Number(state.romance.affairCount) || 0);
    return state.romance;
  }

  function addSuspicion(state, amount, reason) {
    if (!state.romance.married) return;
    ensure(state);
    state.romance.suspicion = U.clamp(state.romance.suspicion + amount, 0, 100);
    if (amount >= 8) {
      Game.lifeDirector.addLog(state, '家庭疑云', reason, 'normal');
    }
    /* trigger spousal confrontation at thresholds */
    if (state.romance.suspicion >= 40 && state.romance.suspicion - amount < 40) {
      Game.lifeDirector.addLog(state, '配偶质问',
        '你的配偶开始怀疑你的行踪，用审视的目光看着你。', 'normal');
    }
    if (state.romance.suspicion >= 90) {
      Game.lifeDirector.addLog(state, '家庭危机',
        '配偶已经掌握了确凿证据，一场风暴即将来临。', 'normal');
    }
  }

  function confront(state) {
    if (!state.romance.married || state.romance.suspicion < 40) return { ok: false, message: '配偶目前没有异常' };
    const partner = Game.people.find(state, state.romance.partnerId);
    if (!partner) return { ok: false, message: '无法联系配偶' };
    const severity = state.romance.suspicion >= 70 ? '激烈' : '平静';
    partner.trust = U.clamp((partner.trust || 50) - 12, 0, 100);
    partner.conflict = U.clamp((partner.conflict || 0) + 18, 0, 100);
    state.romance.suspicion = U.clamp(state.romance.suspicion - 20, 0, 100);
    Game.lifeDirector.addLog(state, '夫妻对峙',
      `一场${severity}的对峙发生了。${partner.name}要求你解释。`, 'normal');
    return { ok: true, message: `与${partner.name}进行了一场${severity}的对话` };
  }

  function divorce(state) {
    if (!state.romance.married) return { ok: false, message: '你还没有结婚' };
    const partner = Game.people.find(state, state.romance.partnerId);
    if (!partner) {
      state.romance.married = false; state.romance.partnerId = null;
      return { ok: true, message: '婚姻关系已解除' };
    }
    /* property split: player keeps 65% cash, house stays with player */
    state.money = Math.round(state.money * 0.65);
    partner.relation = '前配偶';
    partner.affection = 0;
    partner.trust = 0;
    partner.conflict = 100;
    partner.spouseId = null;
    state.family = state.family.filter((p) => p.id !== partner.id);
    if (!state.contacts.some((p) => p.id === partner.id)) state.contacts.push(partner);
    state.romance.married = false;
    state.romance.partnerId = null;
    state.romance.suspicion = 0;
    Game.lifeDirector.addLog(state, '婚姻破裂',
      `你与${partner.name}结束了婚姻关系。财产分割后你保留了大部分资产。`, 'milestone');
    return { ok: true, message: `与${partner.name}离婚完成，财产分割后保留65%现金` };
  }

  function reconcile(state) {
    if (!state.romance.married || state.romance.suspicion < 30) return { ok: false, message: '当前关系不需要特别的修复' };
    Game.economy.spend(state, 1500);
    state.romance.suspicion = U.clamp(state.romance.suspicion - 25, 0, 100);
    const partner = Game.people.find(state, state.romance.partnerId);
    if (partner) {
      partner.affection = U.clamp(partner.affection + 8, 0, 100);
      partner.trust = U.clamp((partner.trust || 50) + 10, 0, 100);
    }
    state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
    Game.lifeDirector.addLog(state, '修复关系',
      '你花时间陪伴家人，试图修复裂痕。', 'good');
    return { ok: true, message: Game.economy.message(state, '家庭关系有所修复') };
  }

  function monthly(state) {
    ensure(state);
    if (!state.romance.married) return;
    const partner = Game.people.find(state, state.romance.partnerId);
    if (!partner || partner.status !== '健康') return;
    /* distance decay if not dating */
    if (state.romance.lastDateMonth === undefined) state.romance.lastDateMonth = state.totalMonths;
    if (state.totalMonths - state.romance.lastDateMonth >= 3 && state.month === 1) {
      addSuspicion(state, 1, '连续多月没有约会，配偶感到被冷落');
    }
    /* affair decay suspicion slowly */
    if (state.romance.suspicion > 0 && state.totalMonths % 4 === 0) {
      state.romance.suspicion = U.clamp(state.romance.suspicion - 1, 0, 100);
    }
    /* NPC family: relatives with sex-worker careers affect family + notify player */
    if (state.totalMonths % 4 === 0) {
      const notified = state.familyConflict?._notifiedJobs || {};
      state.familyConflict = state.familyConflict || {};
      state.familyConflict._notifiedJobs = notified;
      state.family.forEach((member) => {
        if (member.status !== '健康') return;
        const riskyJobs = ['妓女', '福利姬'];
        if (riskyJobs.includes(member.job) && U.personAge(state, member) >= 18) {
          /* notify if daughter/sister discovered */
          const key = `${member.id}-${member.job}`;
          if (!notified[key] && ['女儿', '妹妹', '母亲', '配偶', '姐姐'].includes(member.relation)) {
            notified[key] = true;
            const discoveryTexts = {
              女儿: { 妓女: `你偶然路过红灯区时看到了一个熟悉的身影——是女儿${member.name}。她穿着水手服站在店门口招揽客人。你的脚步钉在了地上。`,
                福利姬: `朋友发来一个链接——女儿${member.name}在福利频道上发布着付费内容。你的手在颤抖。` },
              妹妹: { 妓女: `城市很小。你在红灯区的巷子里看到了妹妹${member.name}。她别开脸不愿看你，你也说不出话。`,
                福利姬: `妹妹${member.name}的社交账号粉丝比你想的多——内容让你沉默了很久。` },
              母亲: { 妓女: `邻居隐晦地告诉你母亲${member.name}晚上在红灯区工作。你不知道该愤怒还是该悲伤。`,
                福利姬: `帮母亲${member.name}修电脑时发现了她的账号——内容让你久久无法平静。` },
              配偶: { 妓女: `朋友提醒你多关心配偶。你亲眼看到${member.name}走进了红灯区的会所。`,
                福利姬: `手机相册里几张自拍让你起了疑心。你打开了${member.name}的粉丝频道。` },
            };
            const rd = discoveryTexts[member.relation] || {};
            const logText = rd[member.job] || `你发现${member.relation}${member.name}在城市里从事着${member.job}的工作，心情复杂。`;
            Game.lifeDirector.addLog(state, '家庭隐情', logText, 'normal');
          }
          /* parent's job affects children */
          const children = state.family.filter((p) =>
            ['儿子', '女儿'].includes(p.relation) && p.status === '健康'
            && U.personAge(state, p) >= 12 && (p.parentIds || []).includes(member.id));
          children.forEach((child) => {
            child.trust = U.clamp((child.trust || 50) - 1, 0, 100);
          });
          /* spouse discovers prostitute work */
          if (member.spouseId && Math.random() < 0.08) {
            const spouse = Game.people.find(state, member.spouseId);
            if (spouse) {
              spouse.conflict = U.clamp((spouse.conflict || 0) + 10, 0, 100);
              spouse.trust = U.clamp((spouse.trust || 50) - 8, 0, 100);
            }
          }
        }
      });
    }

    /* children affected by high conflict */
    const home = Game.householdSystem ? Game.householdSystem.ensure(state) : null;
    if (home && home.conflict >= 60) {
      state.family.filter((p) => ['儿子', '女儿'].includes(p.relation) && p.status === '健康'
        && U.personAge(state, p) >= 12).forEach((child) => {
        child.trust = U.clamp((child.trust || 50) - 2, 0, 100);
        if (state.totalMonths % 6 === 0) {
          Game.lifeDirector.addLog(state, '家庭阴云',
            `${child.name}感受到了家中的紧张气氛，变得沉默寡言。`, 'normal');
        }
      });
    }
    /* prostitute/welfare job discovery */
    const riskyJobs = ['妓女', '福利姬'];
    if (riskyJobs.includes(state.career.job) && state.location.city === partner.currentCity) {
      if (Math.random() < 0.06) {
        state.romance.suspicion = U.clamp(state.romance.suspicion + 15, 0, 100);
        Game.lifeDirector.addLog(state, '身份暴露',
          `城市不大。${partner.name}隐约知道了你真正的工作。`, 'normal');
      }
    }
  }

  function render(state) {
    if (!state.romance.married) return '';
    const partner = Game.people.find(state, state.romance.partnerId);
    const suspicion = Math.round(state.romance.suspicion);
    const level = suspicion < 20 ? '平静' : (suspicion < 50 ? '微妙' : (suspicion < 75 ? '紧张' : '危险'));
    const suspicionBar = suspicion > 0
      ? `<div class="suspicion-bar"><span>配偶怀疑度 ${suspicion}</span>
        <i class="bar-track"><b style="width:${suspicion}%" class="${suspicion > 60 ? 'critical' : ''}"></b></i></div>`
      : '';

    return `<details class="system-fold">
      <summary>婚姻关系 · ${level}${partner ? ' · ' + partner.name : ''}</summary>
      ${suspicionBar}
      <div class="system-actions">
      <button data-conflict-action="confront">夫妻对峙</button>
      <button data-conflict-action="reconcile">修复关系</button>
      <button data-conflict-action="divorce" class="danger-btn">离婚</button>
      </div>
      <p class="system-note">出轨${state.romance.affairCount}次 · 怀疑度${suspicion} · ${suspicion >= 40 ? '配偶开始起疑' : (suspicion === 0 ? '风平浪静' : '有一些小波澜')}</p>
      </details>`;
  }

  function handleClick(event) {
    const btn = event.target.closest('[data-conflict-action]');
    if (!btn) return false;
    const state = Game._getState ? Game._getState() : null;
    if (!state) return false;
    const action = btn.dataset.conflictAction;
    let result;
    if (action === 'confront') result = confront(state);
    else if (action === 'reconcile') result = reconcile(state);
    else if (action === 'divorce') {
      if (root.confirm('确定离婚吗？现金将分走35%给前配偶。')) result = divorce(state);
      else result = { ok: false, message: '取消了离婚' };
    }
    if (result) {
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  Game.familyConflict = Object.freeze({ ensure, addSuspicion, confront, divorce, reconcile, monthly, render, handleClick });
}(window));
