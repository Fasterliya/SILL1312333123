(function initCradleInstitution(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  function ensure(state) {
    var current = state.cradle;
    state.cradle = current && typeof current === 'object' ? current : {
      imprisoned: false,
      reformType: '',
      reformProgress: 0,
      mental: 100,
      imprisonedMonth: 0,
      city: '',
      inmateId: '',
      dailyLog: [],
      lastEscapeAttempt: 0,
      escapeAttempts: 0,
      soldToJapan: false,
      orderCharacter: '',
      orderSeries: '',
      originalName: '',
      captureAge: null,
    };
    var c = state.cradle;
    c.imprisoned = !!c.imprisoned;
    c.reformType = typeof c.reformType === 'string' ? c.reformType : '';
    c.reformProgress = Math.max(0, Math.min(100, Number(c.reformProgress) || 0));
    c.mental = Math.max(0, Math.min(100, Number(c.mental) || 0));
    c.imprisonedMonth = Number.isFinite(c.imprisonedMonth) ? c.imprisonedMonth : 0;
    c.city = typeof c.city === 'string' ? c.city : '';
    c.inmateId = typeof c.inmateId === 'string' ? c.inmateId : '';
    c.dailyLog = Array.isArray(c.dailyLog) ? c.dailyLog.slice(-20) : [];
    c.lastEscapeAttempt = Number.isFinite(c.lastEscapeAttempt) ? c.lastEscapeAttempt : 0;
    c.escapeAttempts = Math.max(0, Number(c.escapeAttempts) || 0);
    c.soldToJapan = !!c.soldToJapan;
    c.orderCharacter = typeof c.orderCharacter === 'string' ? c.orderCharacter : '';
    c.orderSeries = typeof c.orderSeries === 'string' ? c.orderSeries : '';
    c.originalName = typeof c.originalName === 'string' ? c.originalName : '';
    c.captureAge = Number.isFinite(c.captureAge) ? c.captureAge : null;
    if (c.soldToJapan && c.imprisoned) c.imprisoned = false;
    return c;
  }

  function isImprisoned(state) {
    return !!(state.cradle && state.cradle.imprisoned);
  }

  function tryCradleEntrap(state) {
    var c = ensure(state);
    if (c.imprisoned) return false;
    var age = U.age(state);
    if (state.gender !== '女' || age < 12 || age > 17) return false;
    var culture = state.location ? state.location.country : '华夏';
    if (culture !== '华夏') return false;

    var risk = 0;
    var father = state.family.find(function (p) { return p.relation === '父亲'; });
    var mother = state.family.find(function (p) { return p.relation === '母亲'; });
    var parentAffection = Math.min(
      father ? (father.affection || 50) : 50,
      mother ? (mother.affection || 50) : 50
    );
    if (parentAffection < 30) risk += 4;
    if (state.familyWealth < 50000) risk += 3;
    var studyScore = state.education.study || 0;
    if (studyScore < 40) risk += 3;
    if (state.career.jobId === 'idol-underground' || state.health.stdHistory && state.health.stdHistory.length > 0) risk += 2;

    if (risk <= 0 || Math.random() * 100 > risk) return false;

    c.imprisoned = true;
    c.imprisonedMonth = state.totalMonths;
    c.city = state.location.city;
    c.inmateId = 'CR-' + state.totalMonths + '-' + Math.random().toString(36).slice(2, 6);
    c.originalName = state.name;
    c.captureAge = age;
    c.mental = 100;
    c.reformProgress = 0;
    c.dailyLog = [];
    c.escapeAttempts = 0;
    c.soldToJapan = false;

    var roll = Math.random();
    if (roll < 0.55) {
      c.reformType = 'japanese';
      c.orderCharacter = '';
      c.orderSeries = '';
      Game.lifeDirector.addLog(state, '摇篮改造机构', '你的父母说送你去一所"全封闭特训学校"提高成绩。你走进那栋灰色建筑后，大门在你身后锁上了。这里不是学校。', 'danger');
    } else {
      c.reformType = 'cosplay';
      pickCosplayOrder(state, c);
      Game.lifeDirector.addLog(state, '摇篮改造机构', '一个自称"演艺培训中心"的人在学校门口找到了你。他们说发现了你的cosplay天赋——要带你去东京发展。你跟着他们走进了一辆没有窗户的面包车。', 'danger');
    }
    state.timeSpeed = 0;
    return true;
  }

  function pickCosplayOrder(state, c) {
    var catalog = Game.cosplayCatalog;
    if (!catalog || !catalog.items) {
      c.reformType = 'japanese';
      return;
    }
    var chars = catalog.items.filter(function (item) {
      return item.name !== '无' && item.character && item.series;
    });
    if (!chars.length) {
      c.reformType = 'japanese';
      return;
    }
    var picked = chars[Math.floor(Math.random() * chars.length)];
    c.orderCharacter = picked.character;
    c.orderSeries = picked.series;
    c.reformType = 'cosplay';
  }

  function applyJapaneseIdentity(state, c) {
    if (state.profile.nameCulture === '日本') return false;
    var formerName = c.originalName || state.name;
    var changedName = Game.nameSystem.makeName('', '女', 'ja-JP');
    state.profile.birthName = state.profile.birthName || formerName;
    state.profile.cradleFormerName = formerName;
    state.profile.nameHistory = Array.isArray(state.profile.nameHistory)
      ? state.profile.nameHistory : [];
    if (!state.profile.nameHistory.some(function (item) {
      return item.from === formerName && item.to === changedName;
    })) {
      state.profile.nameHistory.push({
        from: formerName,
        to: changedName,
        country: '日本',
        reason: '摇篮身份改造',
      });
    }
    state.name = changedName;
    state.profile.nameCulture = '日本';
    return true;
  }

  function monthly(state) {
    var c = ensure(state);
    if (c.imprisoned) {
      monthlyPrison(state, c);
    } else {
      tryCradleEntrap(state);
    }
  }

  function monthlyPrison(state, c) {
    c.reformProgress = Math.min(100, c.reformProgress + U.between(5, 10));
    c.mental = Math.max(0, c.mental - U.between(3, 7));

    var roll = Math.random();
    if (roll < 0.35) {
      c.mental = Math.max(0, c.mental - U.between(5, 10));
      state.stats['健康'] = Math.max(5, state.stats['健康'] - U.between(2, 5));
      c.dailyLog.unshift('电击惩罚——你因为拒绝用日语回答问题被绑在电椅上。');
    } else if (roll < 0.60) {
      c.dailyLog.unshift('语言测试——看守用日语向你提问。你的回答让他们勉强满意。');
      c.reformProgress = Math.min(100, c.reformProgress + U.between(2, 4));
    } else if (roll < 0.78) {
      c.dailyLog.unshift('交欢调教——守卫强迫你对一个单向镜后的"观察员"进行表演。');
      c.mental = Math.max(0, c.mental - U.between(8, 15));
      state.profile.trauma = Math.min(100, (Number(state.profile.trauma) || 0) + U.between(3, 8));
      if (state.psychology && typeof state.psychology === 'object') {
        state.psychology.sexAddiction = Math.min(100, (state.psychology.sexAddiction || 0) + U.between(2, 4));
      }
    } else if (roll < 0.88) {
      c.dailyLog.unshift('另一名囚徒偷偷递给你半块面包。她小声说："我叫' + U.random(['小月','阿希','玲子','美晴']) + '，也被关在这里。"');
      c.mental = Math.min(100, c.mental + U.between(1, 3));
    } else {
      c.dailyLog.unshift('禁闭室——你被关进了一个没有光的小房间。不知道过了多久。');
      c.mental = Math.max(0, c.mental - U.between(10, 18));
    }
    c.dailyLog = c.dailyLog.slice(0, 20);

    if (c.reformProgress >= 60) {
      if (applyJapaneseIdentity(state, c)) {
        c.dailyLog.unshift('改造第' + (state.totalMonths - c.imprisonedMonth) + '个月——你已经不记得自己的华夏名字了。现在你叫' + state.name + '。');
      }
    }

    if (c.reformType === 'cosplay' && c.reformProgress >= 40) {
      state.profile.cosplay = c.orderSeries + ' · ' + c.orderCharacter;
      c.dailyLog.unshift('幻梦Cos服已经完全贴合了你的身体。镜中的脸变成了「' + c.orderCharacter + '」。你记不起自己原本长什么样子了。');
    }

    if (c.reformProgress >= 100) {
      sellToJapan(state, c);
    }
  }

  function sellToJapan(state, c) {
    applyJapaneseIdentity(state, c);
    var jpCities = [
      { city: '东京', province: '东京都', country: '日本', tier: 1, cost: 0 },
      { city: '大阪', province: '大阪府', country: '日本', tier: 1, cost: 0 },
      { city: '京都', province: '京都府', country: '日本', tier: 2, cost: 0 },
      { city: '横滨', province: '神奈川县', country: '日本', tier: 2, cost: 0 },
    ];
    var target = jpCities[Math.floor(Math.random() * jpCities.length)];
    state.location = { province: target.province, city: target.city, country: target.country };

    c.imprisoned = false;
    c.soldToJapan = true;
    state.career.job = '妓女';
    state.career.jobId = 'prostitute';
    state.career.company = target.city + '风月场所';
    state.career.salary = 8000;
    state.career.level = 0;
    state.career.exp = 0;
    state.career.performance = 20;
    state.career.jobStartMonth = state.totalMonths;

    state.nameCulture = '日本';

    Game.lifeDirector.addLog(state, '卖到日本', '你在' + (state.totalMonths - c.imprisonedMonth) + '个月的改造后被卖到了日本' + target.city + '。你已经完全变成了' + (c.reformType === 'cosplay' ? ('「' + c.orderCharacter + '」') : '一个日本少女') + '。但你还记得那栋灰色建筑的走廊——那是你失去一切的地方。', 'milestone');
    state.timeSpeed = 1;
  }

  function playerAction(state, action) {
    var c = ensure(state);
    if (!c.imprisoned) return { ok: false, message: '你不在囚禁中' };

    switch (action) {
      case 'obey':
        c.reformProgress = Math.min(100, c.reformProgress + U.between(5, 10));
        c.mental = Math.max(0, c.mental - U.between(1, 3));
        c.dailyLog.unshift('你顺从地完成了今日的改造训练。守卫给了你一份额外的日式便当。');
        if (c.reformProgress >= 100) sellToJapan(state, c);
        return { ok: true, message: '你选择了顺从。改造进度加快了。' };
      case 'resist':
        c.reformProgress = Math.min(100, c.reformProgress + U.between(0, 2));
        c.mental = Math.max(0, c.mental - U.between(8, 15));
        c.dailyLog.unshift('你拼命反抗今天的训练。守卫用电棍让你安静了下来。你的手腕上多了新的淤青。');
        return { ok: true, message: '你选择了抵抗。身心都受到了惩罚。' };
      case 'observe':
        c.mental = Math.max(0, c.mental - U.between(2, 5));
        c.escapeAttempts = Math.min(10, c.escapeAttempts + 1);
        c.dailyLog.unshift('你假装顺从，暗中观察守卫的巡逻时间和门禁弱点。你记下了至少一处可能的漏洞。');
        return { ok: true, message: '你观察到了逃跑的机会。累计观察 ' + c.escapeAttempts + '/3 次。' };
      case 'feign':
        c.reformProgress = Math.min(100, c.reformProgress + U.between(3, 6));
        c.mental = Math.max(0, c.mental - U.between(0, 2));
        c.dailyLog.unshift('你假装已经完全被改造——说日语、行礼、微笑。看守认为你"进步很快"，放松了警惕。');
        return { ok: true, message: '你假装失忆。守卫放松了戒备。' };
      case 'escape':
        if (c.escapeAttempts < 3) return { ok: false, message: '你还没有观察到足够的逃跑机会（需要3次观察）' };
        var chance = 0.08;
        if (c.mental >= 60) chance += 0.10;
        if (c.reformProgress <= 30) chance += 0.08;
        if (c.soldToJapan) chance += 0.15;
        c.lastEscapeAttempt = state.totalMonths;
        if (Math.random() < chance) {
          c.imprisoned = false;
          c.mental = Math.max(0, c.mental - 20);
          if (state.psychology && typeof state.psychology === 'object') {
            state.psychology.trauma = Math.min(100, (state.psychology.trauma || 0) + U.between(20, 30));
          }
          var father2 = state.family.find(function (p) { return p.relation === '父亲'; });
          var mother2 = state.family.find(function (p) { return p.relation === '母亲'; });
          if (father2) father2.affection = Math.max(0, (father2.affection || 50) - 50);
          if (mother2) mother2.affection = Math.max(0, (mother2.affection || 50) - 50);
          Game.lifeDirector.addLog(state, '越狱成功', '你在一个雷雨夜从摇篮机构逃了出来。守卫的警报声在你背后响起，但你没有回头。你永远不会忘记那条走廊。', 'milestone');
          return { ok: true, message: '你成功逃出了摇篮机构！' };
        }
        c.reformProgress = Math.min(100, c.reformProgress + U.between(10, 20));
        c.mental = Math.max(0, c.mental - U.between(15, 25));
        c.dailyLog.unshift('逃跑失败——你被拖了回来。看守笑着说："还有' + (6 - Math.floor(c.reformProgress / 100 * 6)) + '个月就能把你卖掉。"');
        return { ok: false, message: '逃跑失败。改造进度被迫加速。' };
      default:
        return { ok: false, message: '未知行动' };
    }
  }

  function renderPrison(state) {
    var c = ensure(state);
    if (!c.imprisoned) return '';

    var monthsIn = state.totalMonths - c.imprisonedMonth;
    var reformPct = c.reformProgress;
    var mentalPct = c.mental;
    var reformColor = reformPct > 60 ? 'var(--ui-red, #a8453a)' : (reformPct > 30 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-green, #315f58)');
    var mentalColor = mentalPct > 50 ? 'var(--ui-green, #315f58)' : (mentalPct > 20 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-red, #a8453a)');

    var html = '<div class="cradle-prison" style="margin-top:10px;padding:12px;border:1px solid var(--ui-red, #a8453a);border-left:4px solid #c23b32;border-radius:6px;background:#fff8eb">'
      + '<h3 style="font-size:13px;font-weight:700;margin:0 0 4px;color:#c23b32">摇篮改造机构 · 囚禁中</h3>'
      + '<p style="font-size:10px;color:var(--ui-muted, #69736f);margin:0 0 10px">编号 ' + c.inmateId + ' · 已关押 ' + monthsIn + ' 个月 · '
      + (c.reformType === 'japanese' ? '日本化改造' : ('幻梦Cos服 · ' + c.orderSeries + ' · ' + c.orderCharacter)) + '</p>';

    html += '<div style="margin-bottom:8px">'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">改造进度</p>'
      + '<div style="display:flex;align-items:center;gap:6px"><progress value="' + reformPct + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + reformColor + ';white-space:nowrap">' + reformPct + '/100</span></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:1px 0 0">改造完成度达100%后将被卖到日本</p></div>';

    html += '<div style="margin-bottom:10px">'
      + '<p style="font-size:10px;margin:0 0 2px;color:var(--ui-muted)">精神抵抗</p>'
      + '<div style="display:flex;align-items:center;gap:6px"><progress value="' + mentalPct + '" max="100" style="flex:1;height:6px;background:#e5e4da;border:none"></progress>'
      + '<span style="font-size:11px;font-weight:750;color:' + mentalColor + ';white-space:nowrap">' + mentalPct + '/100</span></div>'
      + '<p style="font-size:9px;color:var(--ui-muted);margin:1px 0 0">精神归零将导致人格崩坏，改造强制完成</p></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">'
      + '<button type="button" data-cradle-action="obey" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">顺从配合</button>'
      + '<button type="button" data-cradle-action="resist" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">精神抵抗</button>'
      + '<button type="button" data-cradle-action="observe" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">观察弱点</button>'
      + '<button type="button" data-cradle-action="feign" style="min-height:44px;padding:6px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-paper);color:var(--ui-ink);font-size:10px;font-weight:700">假装失忆</button>'
      + '</div>';

    if (c.escapeAttempts >= 3) {
      html += '<button type="button" data-cradle-action="escape" style="min-height:44px;padding:8px 12px;border:none;border-radius:5px;background:#c23b32;color:#fff;font-size:11px;font-weight:750;width:100%;margin-bottom:8px">逃 跑（观察 ' + c.escapeAttempts + ' 次）</button>';
    } else {
      html += '<button type="button" disabled style="min-height:44px;padding:8px 12px;border:1px solid var(--ui-line);border-radius:5px;background:var(--ui-soft);color:var(--ui-muted);font-size:10px;width:100%;margin-bottom:8px;opacity:0.45">逃跑需要3次观察（当前 ' + c.escapeAttempts + '/3）</button>';
    }

    if (c.dailyLog.length > 0) {
      html += '<div style="max-height:120px;overflow-y:auto;font-size:9px;color:var(--ui-muted);line-height:1.5;border-top:1px solid var(--ui-line);padding-top:8px">'
        + c.dailyLog.slice(0, 6).map(function (l) { return '<p style="margin:2px 0;padding:2px 0;border-bottom:1px solid var(--ui-line)">' + l + '</p>'; }).join('')
        + '</div>';
    }

    html += '</div>';
    return html;
  }

  function handleClick(event) {
    var state = Game._getState ? Game._getState() : null;
    if (!state || !state.cradle) return false;

    var actionBtn = event.target.closest('[data-cradle-action]');
    if (actionBtn) {
      var result = playerAction(state, actionBtn.dataset.cradleAction);
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }

    return false;
  }

  Game.cradleInstitution = Object.freeze({
    ensure: ensure,
    monthly: monthly,
    isImprisoned: isImprisoned,
    renderPrison: renderPrison,
    handleClick: handleClick,
  });
}(window));
