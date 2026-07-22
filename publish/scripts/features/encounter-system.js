(function initEncounterSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- data ---- */
  const positions = {
    '正常位': { arousal: 15, stamina: 12, semen: 20, text: 'missionary' },
    '后入位': { arousal: 22, stamina: 18, semen: 25, text: 'doggy' },
    '骑乘位': { arousal: 18, stamina: 8, semen: 15, text: 'cowgirl' },
    '侧卧位': { arousal: 10, stamina: 5, semen: 12, text: 'spoon' },
    '口交':   { arousal: 25, stamina: 15, semen: 5, text: 'oral' },
  };

  const posNames = Object.keys(positions);

  /* ---- helpers ---- */
  function partnerName(state) {
    const p = Game.people.find(state, state.encounter.partnerId);
    return p ? p.name : '她';
  }

  function partnerData(state) {
    return Game.people.find(state, state.encounter.partnerId);
  }

  /* ---- text generators ---- */
  const maleTexts = {
    missionary: [
      /* low arousal (0-33) */
      [`你轻轻压在${0}身上，温柔地吻着她的锁骨，缓缓进入她的身体。${0}发出一声轻哼，双臂环住你的脖颈。`,
        `你撑在${0}上方俯视她的表情，缓慢而深入地抽送。${0}别开脸不敢直视你，耳根已经通红。`],
      /* mid arousal (34-66) */
      [`你加快腰部的节奏，${0}的双腿紧紧缠住你的腰，房间里回荡着肌肤相撞的湿润声响。`,
        `${0}的眼神开始涣散，嘴唇微微张开却发不出完整的音节，只有急促的喘息和偶尔溢出的一声"再深一点"。`],
      /* high arousal (67-100) */
      [`${0}的指甲在你背上留下道道红痕，双腿不住地颤抖，口中溢出不成句的哀求。你俯身吻住她，腰部狠狠挺入最深。`,
        `你双手扣住${0}的手腕按在枕边，每一次撞击都顶到最深处。${0}仰起头，身体弓成一道弧线，已经说不出完整的句子。`],
    ],
    doggy: [
      [`从身后握住${0}纤细的腰肢，缓慢地挤入。${0}将脸埋在枕头中，双肩微微颤抖。`,
        `你让${0}跪趴在床上，一手扶住她的腰窝，另一手沿着她的脊柱慢慢向上抚摸。`],
      [`你俯身贴在${0}背上，胸口紧贴她的后背，一手绕到前面揉捏她的胸口，腰部深深挺入。${0}咬住枕头也压不住低吟。`,
        `${0}的纤细腰肢随着你的节奏塌陷又弓起，你看着她在自己身下摇晃，每一次深入都能感到她体内的紧致包裹。`],
      [`你直起身子，双手扣紧${0}的胯骨，开始猛烈地冲刺。${0}的呻吟已经完全失控，手紧紧攥着床单，整个身体被撞得向前挪动。`,
        `${0}的双腿已经软得跪不住了，你捞住她的腰将她拉回身边，在她耳边低语着下流的情话，节奏丝毫不停。`],
    ],
    cowgirl: [
      [`${0}红着脸跨坐在你身上，双手撑在你胸膛上，小心翼翼地扭动腰肢寻找舒服的角度。`,
        `你躺平让${0}自己掌握节奏，她闭着眼上下起伏，长发扫过你的胸口。`],
      [`你握住${0}的腰帮她上下起伏，她仰起头发出一声长长的叹息，动作逐渐大胆起来，腰肢画着圆圈。`,
        `${0}的动作变得热情，你伸手抚上她晃动的胸口，她咬着下唇也压不住愉悦的呻吟。`],
      [`${0}已经褪去了所有羞涩，双手撑在你胸膛上疯狂地扭动腰肢。你感觉到她体内的痉挛，每一次下落都坐到底，她仰头尖叫。`,
        `${0}的体力开始不支，动作变得凌乱，身体前倾跌进你怀里。你顺势翻身将她压在身下，接过主导权。`],
    ],
    spoon: [
      [`从侧面温柔地环抱住${0}，她整个身体嵌进你怀中。你抬起她的腿，缓慢地进入，她的呼吸变得绵长而满足。`,
        `你从背后抱住${0}，鼻尖轻蹭她的后颈。她放松地靠在你怀里，任由你掌控节奏。`],
      [`你的一只手轻抚${0}的腰侧和小腹，另一只手与她十指相扣。缓慢而深情的律动中，你能感受到她身体每一丝微小的颤动。`,
        `${0}转过头来与你交换了一个绵长的吻，呼吸交织。你的手从她腰间滑到腿间，她的身体在你怀中轻轻蜷缩。`],
      [`你加快了侧卧的节奏，${0}后背紧紧贴着你，她已经完全瘫软在你怀里，只能发出微弱的鼻音。你亲吻她的耳垂和颈侧，手在她身上游走。`,
        `${0}在你怀里不住发抖，回头用湿润的眼睛看着你。你深深挺入的同时吻住她的唇，将她的低吟全部吞入口中。`],
    ],
    oral: [
      [`${0}跪在你面前，双手扶着你的大腿，先是用舌尖试探地舔了一下，然后张开双唇含了进去。`,
        `你靠在床头，${0}伏在你腿间，认真而小心地吞吐。她偶尔抬起眼看你的表情，眼神又羞又怯。`],
      [`${0}的口舌越发熟练，舌尖灵活地缠绕挑逗，吞吐的幅度和速度也逐渐加大。你轻轻按住她的后脑，她发出一声闷哼。`,
        `你抚摸着${0}的头发，看着她努力取悦你的样子。她一边吞吐一边用手指按摩着根部，嘴角溢出晶莹的液体。`],
      [`你双手捧住${0}的头加快了节奏，她的眼角渗出泪花但并未推开你，反而更加投入。喉间发出呜咽般的声音，振动传遍全身。`,
        `${0}已经不在意溢出的唾液，动作变得急切而热情。她抬起眼看你，眼神迷离而顺从，仿佛在等待你的下一步。`],
    ],
  };

  const femaleTexts = {
    missionary: [
      [`${0}伏在你身上缓缓挺动，你仰面承受着他的重量，双手攀住他的肩膀。他进入得很深，你忍不住轻哼出声。`,
        `你躺在${0}身下，双腿轻夹他的腰侧。他的动作很温柔，每一下都恰到好处，你放松身体全心感受。`],
      [`节奏逐渐加快，${0}的呼吸变得越来越粗重，你感觉身体被一次次填满。你环住他的脖子，在他耳边轻唤他的名字。`,
        `${0}俯身吻你的脖子和锁骨，腰部的动作却不减。你双腿紧紧缠住他，身体不由自主地迎上去。`],
      [`${0}低声叫着你的名字，动作开始失去控制。你紧紧抱住他，感觉自己快要融化。他的额头抵着你的，呼吸急促而滚烫。`,
        `快感一波波涌来，你仰起头弓起身体，手指紧紧抓住${0}的背。他在你耳边说着让人脸红的话，动作又快又深。`],
    ],
    doggy: [
      [`你跪趴在床上，${0}从身后握住你的腰缓缓进入。这个姿势让你格外害羞，把脸埋进了交叠的手臂间。`,
        `你感觉${0}的目光在背上流连，他的手指沿着你的脊柱滑下，最后停在腰窝处。动作不疾不徐，但每一下都很深。`],
      [`${0}俯身在你耳边低语，灼热的呼吸喷在你脖颈上让身体酥麻。他的动作开始变得有力，你忍不住呻吟出声，腰肢不由自主地迎合。`,
        `你的手臂已经开始微微发软，${0}从身后握住你的手十指相扣。这个姿势让每一次撞击都深入到底，你的呻吟一声高过一声。`],
      [`${0}变得猛烈起来，双手扣紧你的胯骨快速冲撞。你整个人被撞得向前挪动，头发散落在枕头上，口中发出自己也控制不住的叫声。`,
        `你已经完全趴倒在床上，膝盖跪不住，只有臀部还被他托着。${0}的动作又快又狠，你感觉意识开始模糊，只剩下身体的本能反应。`],
    ],
    cowgirl: [
      [`你跨坐在${0}身上，双手撑在他胸膛上，小心地沉下腰。他双手扶住你的腰侧，鼓励地看着你。你慢慢找到了舒服的节奏。`,
        `你控制着角度和深度，${0}仰面看着你，眼神温柔而深情。你俯下身去吻他，腰部轻轻画着圈。`],
      [`你直起身来掌握节奏，每次下落都坐到底。${0}的双手攀上你的胸口，你仰起头发出满足的叹息。`,
        `你俯下身子让${0}的脸埋在你胸前，他张口含住顶峰，你忍不住浑身一颤，腰肢的动作乱了节拍。`],
      [`你狂乱地上下起伏，汗水顺着脊背滑落。${0}双手握住你的腰发力向上顶，你仰起头发出一声高亢的呻吟，快感直冲头顶。`,
        `你的大腿开始发酸，节奏完全失控。${0}翻身占回主导，将你的腿架到肩上，开始了猛烈的冲刺。`],
    ],
    spoon: [
      [`${0}从身后温柔地环住你，你蜷缩在他怀中感受着他缓慢地进入。他的体温包裹着你，你闭上眼睛全心感受。`,
        `你背靠着${0}的胸膛，他的手臂环着你的腰。动作缓慢而深情，像摇篮般温柔。你在他的怀抱中完全放松。`],
      [`${0}的手轻轻抚过你的小腹下滑，与下身的节奏呼应。你转过头和他交换了一个吻，呼吸交织在一起。`,
        `${0}在你耳边说着温柔的情话，他的声音低沉而沙哑。你感觉自己像是在温暖的潮水中飘荡，每一丝感受都被他掌控。`],
      [`${0}的节奏逐渐加快，你在他怀中蜷缩得更紧。他的手紧紧环住你的腰，呼吸在你颈后变得急促。你回头看他，他低头吻住了你。`,
        `你的身体已经完全软在${0}怀中，只能发出细碎的鼻音。他从身后更用力地抱紧你，像要把你揉进身体里。`],
    ],
    oral: [
      [`你跪在${0}面前，双手扶着他的大腿。先是试探地用舌尖碰了碰，然后张开双唇小心地含进去。${0}的手指轻轻插入你的发间。`,
        `你抬眼看向${0}，他的表情让你脸颊发烫。你努力地用唇舌取悦他，他的呼吸逐渐加重。`],
      [`${0}发出低沉的喘息，手指轻轻按住你的后脑引导节奏。你顺着他的力度加快摆动头部，双颊微微凹陷。`,
        `你能感觉到${0}在你的口中变得更硬，他低声叫了你的名字。你的舌尖灵活地绕着圈，一只手按摩着根部。`],
      [`${0}双手捧住你的脸颊加快了节奏，你闭上眼睛努力配合。眼角渗出一点泪花，喉咙深处发出模糊的呜咽。`,
        `你感觉到${0}的身体绷紧，他的手指插进你的发间收紧。你抬眼用湿润的目光看他——这是最让他兴奋的眼神。`],
    ],
  };

  function posKey(name) {
    const map = { '正常位': 'missionary', '后入位': 'doggy', '骑乘位': 'cowgirl', '侧卧位': 'spoon', '口交': 'oral' };
    return map[name] || 'missionary';
  }

  function actionText(state, posName) {
    const nm = partnerName(state);
    const role = state.encounter.playerRole;
    const pool = role === 'provider' ? (femaleTexts[posKey(posName)] || femaleTexts.missionary)
      : (maleTexts[posKey(posName)] || maleTexts.missionary);
    /* 3 arousal tiers: 0-33, 34-66, 67-100 */
    const tier = Math.min(Math.floor(state.encounter.arousal / 34), pool.length - 1);
    const tierTexts = pool[tier];
    /* random pick within tier for variety */
    const idx = state.encounter.actionLog.length % tierTexts.length;
    return tierTexts[idx].replace(/\{0\}/g, nm);
  }

  function orgasmText(state) {
    const nm = partnerName(state);
    const count = state.encounter.orgasmCount + 1;
    const texts = [
      /* first orgasm */
      [`${nm}身体微微颤抖，呼吸变得急促杂乱，喉间逸出一声压抑的低吟。她双手紧紧抓住你，体内一阵阵收缩——她达到了第一次高潮。`,
        `${nm}浑身一僵，脚趾蜷曲起来，发出一声长长的呻吟。她的身体不由自主地向上弓起，第一次高潮来得汹涌而甜美。`],
      /* second */
      [`${nm}浑身痉挛，双手紧紧攥住床单，失声尖叫中迎来了第二次绝顶。她的腰肢剧烈颤抖，一波接一波的快感让她几乎失控。`,
        `第二次高潮来得更加猛烈——${nm}整个人弹起又落下，双腿紧紧夹住你的腰，口中喊着让你不要停。她的泪水从眼角滑落，却是太舒服了。`],
      /* third */
      [`${nm}已经眼神迷离失去了焦距，全身瘫软但身体仍然不受控制地抽搐着，意识仿佛飘到了很远的地方。高潮像是无休无止的浪潮。`,
        `${nm}的第三次绝顶让她的声音都哑了。她只能张着嘴发出无声的尖叫，腰部痉挛般弹动，体内的收缩一阵强过一阵。`],
      /* fourth+ */
      [`${nm}几乎失去意识，只能发出微弱的气声。身体已经完全不属于自己了，只剩下本能的颤动，连手指都抬不起来。`,
        `${nm}的泪水、汗水混在一起，意识模糊中还在微弱地迎合。每当你稍微动一下都能引起她体内的连锁收缩，她已经承受不了更多却还在高潮的余韵中。`],
    ];
    const idx = Math.min(count - 1, texts.length - 1);
    const variants = texts[idx];
    return variants[count % variants.length].replace(/\{0\}/g, nm);
  }

  function finishText(state) {
    const nm = partnerName(state);
    const count = state.encounter.orgasmCount;
    const posCount = state.encounter.positionsTried.length;
    const role = state.encounter.playerRole;
    const semen = Math.round(state.encounter.semenGauge);

    if (count === 0) {
      return role === 'provider'
        ? [`交欢结束了。${nm}轻轻呼出一口气，虽然你没有达到高潮，但身体仍然感到满足。他为你披上衣服。`,
           `交欢结束了。虽然没有高潮，但${nm}的温柔让整个过程很舒适。你靠在他身边小憩。`]
        : [`交欢结束了。${nm}脸颊微红，虽然没有高潮，但看起来还算满意。她靠在你身边轻轻喘息。`,
           `交欢结束了。${nm}靠在你怀里，虽然没有达到绝顶，但全程都很享受你的温柔。`];
    }

    const multi = posCount >= 3 ? `你们尝试了${posCount}种不同的体位，` : '';
    if (role === 'provider') {
      return [
        `交欢结束了。你达到了${count}次高潮，${multi}身体软得像一摊水。${nm}温柔地为你擦拭身体。`,
        `交欢结束了。在${count}次绝顶之后你已经筋疲力尽。${nm}搂着你，手指轻轻梳理你的头发。`,
        `${multi}${count}次高潮让你的身体还在微微发抖。${nm}把你圈进怀里，你闭上眼感受余韵。`,
      ];
    }
    return [
      `交欢结束了。${multi}${nm}瘫软在你怀中，她一共高潮了${count}次。精液槽溢满了${semen}%，她的体内仍在微微收缩。`,
      `交欢结束了。${nm}已经连手指都抬不起来了，${count}次高潮掏空了她所有体力。你替她盖好被子。`,
      `${multi}${nm}在高潮的余韵中轻轻颤抖，${count}次绝顶让她彻底沦陷。精液槽${semen}%——如果运气不好的话可能会怀孕。`,
    ];
  }

  /* ---- core logic ---- */
  function ensure(state) {
    state.encounter = state.encounter && typeof state.encounter === 'object' ? state.encounter : {
      active: false, mode: '', partnerId: null, playerRole: 'client',
      femaleStamina: 100, femaleStaminaMax: 100, arousal: 0, orgasmCount: 0,
      climaxThreshold: 75, semenGauge: 0, maxSemen: 100,
      position: '正常位', positionsTried: [],
      actionLog: [], _satisfaction: 0,
      isRape: false, victimResistance: 100, victimCorruption: 0, usedAphrodisiac: false, usedDrug: false,
    };
    return state.encounter;
  }

  function setFemaleMaxStamina(state, woman) {
    const age = U.personAge(state, woman);
    const base = woman.gender === '女' ? 120 : 100;
    const ageFactor = age < 22 ? 10 : (age > 40 ? -20 : 0);
    state.encounter.femaleStaminaMax = U.clamp(base + ageFactor, 60, 140);
    state.encounter.femaleStamina = state.encounter.femaleStaminaMax;
  }

  function init(state, partner, mode, playerRole) {
    if (!partner || partner.status !== '健康') return { ok: false, message: '无法开始交欢' };
    ensure(state);
    state.encounter.active = true;
    state.encounter.mode = mode;
    state.encounter.partnerId = partner.id;
    state.encounter.playerRole = playerRole || 'client';
    state.encounter.arousal = U.between(10, 30);
    state.encounter.orgasmCount = 0;
    state.encounter.climaxThreshold = U.between(68, 82);
    state.encounter.semenGauge = 0;
    state.encounter.position = '正常位';
    state.encounter.positionsTried = ['正常位'];
    state.encounter.actionLog = [];

    if (mode === 'rape') { state.encounter.isRape = true; state.encounter.victimResistance = 100; }

    const femalePartner = playerRole === 'provider' ? state.profile : partner;
    setFemaleMaxStamina(state, femalePartner);

    state.stats.心情 = U.clamp(state.stats.心情 + 3, 0, 100);
    const openingTexts = {
      brothel_client: [
        `${partner.name}轻轻关上门，转身面对你。她解开外衣的扣子，露出里面的水手服。灯光下她的眼神既职业又带着一丝羞涩。`,
        `${partner.name}为你倒了一杯温水，然后跪坐在床边。她低着头轻声问：'您想怎么样开始？'`,
      ],
      hookup_client: [
        `${partner.name}已经在酒店房间等着了。她穿着你最喜欢的那套水手服，白色过膝袜在灯光下泛着柔和的光泽。`,
        `房间里的灯光很暗。${partner.name}坐在床边，双腿并拢，双手规矩地放在膝盖上，像等待第一次约会的少女。`,
      ],
      hookup_provider: [
        `你推门进入酒店房间。${partner.name}正在窗边等着，回头看到你时眼中闪过一丝赞许。`,
        `${partner.name}坐在沙发上示意你过去。他的目光毫不掩饰地打量着你今天的装扮。`,
      ],
    };
    const k = `${mode}_${playerRole}`;
    const pool = openingTexts[k] || openingTexts.brothel_client;
    state.encounter.actionLog.unshift({ position: '开场',
      text: pool[state.encounter.actionLog.length % pool.length],
      arousal: state.encounter.arousal, stamina: state.encounter.femaleStamina });
    Game.lifeDirector.addLog(state, '私密交欢',
      `你与${partner.name}开始了${mode === 'brothel' ? '一段露水情缘' : '一次私密约会'}。`, 'normal');
    return { ok: true, message: `与${partner.name}的交欢开始` };
  }

  function act(state, posName) {
    if (!state.encounter.active) return { ok: false, message: '当前没有进行中的交欢' };
    const pos = positions[posName];
    if (!pos) return { ok: false, message: '无效的体位选择' };

    const prevPos = state.encounter.position;
    state.encounter.position = posName;
    if (!state.encounter.positionsTried.includes(posName)) {
      state.encounter.positionsTried.push(posName);
      const nm = partnerName(state);
      const transitions = {
        '正常位→后入位': `你轻轻退出，将${nm}翻过身去。她顺从地跪趴好，腰肢塌出一道诱人的弧线。`,
        '正常位→骑乘位': `你翻身躺下，扶着${nm}的腰让她坐上来。她红着脸跨过你，双手撑在你胸膛上。`,
        '正常位→侧卧位': `你侧身将${nm}搂进怀里，从身后温柔地环住她。她的后背紧贴你的胸膛。`,
        '后入位→正常位': `你退出后将${nm}翻过来面对你。她仰面躺下，眼神已经迷离。`,
        '后入位→骑乘位': `你躺平后示意${nm}自己坐上来。她咬着下唇跨过你，缓缓沉下腰。`,
        '骑乘位→正常位': `你翻身将${nm}压在身下接过主导权。她仰面看着你，双腿本能地缠上你的腰。`,
        '骑乘位→后入位': `你从${nm}身下抽身，让她转身跪趴。她软软地照做了，腰线下沉得恰到好处。`,
        '口交→正常位': `${nm}抬起眼看你，嘴角还残留着晶莹。你将她拉起来推倒在床上俯身压了上去。`,
        '正常位→口交': `你退出后示意${nm}跪下。她顺从地伏在你腿间，双唇微张。`,
      };
      const tKey = `${prevPos}→${posName}`;
      if (transitions[tKey]) {
        state.encounter.actionLog.unshift({ position: '切换', text: transitions[tKey],
          arousal: state.encounter.arousal, stamina: state.encounter.femaleStamina });
      }
    }

    /* consume stamina */
    const staminaCost = pos.stamina + U.between(-3, 3);
    state.encounter.femaleStamina = Math.max(0, state.encounter.femaleStamina - staminaCost);

    /* arousal and climax check */
    state.encounter.arousal = U.clamp(state.encounter.arousal + pos.arousal + U.between(-5, 8), 0, 100);

    /* semen gauge */
    if (posName !== '口交') {
      state.encounter.semenGauge = Math.min(state.encounter.maxSemen,
        state.encounter.semenGauge + pos.semen + U.between(-3, 5));
    }

    /* welfare姬 satisfaction tracking */
    if (state.career?.jobId === 'welfare' && state.encounter.mode === 'hookup') {
      var satisfyGain = { '正常位': 8, '后入位': 12, '骑乘位': 15, '侧卧位': 6, '口交': 18 }[posName] || 8;
      state.encounter._satisfaction = (state.encounter._satisfaction || 0) + satisfyGain + U.between(-3, 5);
    }

    if (state.encounter.isRape) {
      var dec = state.encounter.usedDrug ? U.between(20, 30) : (state.encounter.usedAphrodisiac ? U.between(12, 20) : U.between(8, 15));
      state.encounter.victimResistance = U.clamp(state.encounter.victimResistance - dec, 0, 100);
    }

    /* action text */
    const text = actionText(state, posName);
    state.encounter.actionLog.unshift({
      position: posName, text, arousal: state.encounter.arousal,
      stamina: state.encounter.femaleStamina,
    });
    state.encounter.actionLog = state.encounter.actionLog.slice(0, 30);

    /* orgasm check */
    let orgasmed = false;
    if (state.encounter.arousal >= state.encounter.climaxThreshold) {
      orgasmed = true;
      state.encounter.orgasmCount += 1;
      state.encounter.climaxThreshold = Math.min(95,
        state.encounter.climaxThreshold + U.between(6, 14));
      state.encounter.femaleStamina = Math.max(0, state.encounter.femaleStamina - 10);
      state.encounter.semenGauge = Math.min(state.encounter.maxSemen,
        state.encounter.semenGauge + 30); /* orgasm draws semen in */
      state.encounter.arousal = U.clamp(state.encounter.arousal - 25, 30, 85);
      const oText = orgasmText(state);
      state.encounter.actionLog.unshift({
        position: '高潮', text: oText, arousal: state.encounter.arousal,
        stamina: state.encounter.femaleStamina, orgasm: true,
      });
      state.encounter.actionLog = state.encounter.actionLog.slice(0, 30);
    }

    /* ended by stamina? */
    if (state.encounter.femaleStamina <= 0) {
      return finish(state);
    }

    const nm = partnerName(state);
    return {
      ok: true, orgasmed,
      message: `${posName} · 体力${state.encounter.femaleStamina}/${state.encounter.femaleStaminaMax}` +
        (orgasmed ? ` · ${nm}高潮了!` : ''),
    };
  }

  function finish(state) {
    if (!state.encounter.active) return { ok: false, message: '没有进行中的交欢' };
    const enc = state.encounter;
    const nm = partnerName(state);
    const finTexts = finishText(state);
    const text = Array.isArray(finTexts) ? finTexts[state.encounter.orgasmCount % finTexts.length] : finTexts;
    enc.actionLog.unshift({ position: '结束', text, arousal: enc.arousal, stamina: enc.femaleStamina, finish: true });
    enc.active = false;

    /* money for brothel/hookup */
    if (enc.mode === 'brothel') {
      const cost = U.between(400, 900);
      Game.economy.spend(state, cost);
      state.stats.心情 = U.clamp(state.stats.心情 + U.between(8, 18), 0, 100);
    } else if (enc.mode === 'hookup') {
      state.stats.心情 = U.clamp(state.stats.心情 + U.between(6, 14), 0, 100);
      state.career.burnout = U.clamp((state.career.burnout || 0) - 4, 0, 100);
      if (state.career.jobId === 'welfare' && partner) {
        Game.welfareCareer?.addRegularClient(state, partner.id || 'anonymous');
        var satisfaction = (enc._satisfaction || 0);
        var tipRate = Math.min(0.3, satisfaction / 100);
        var tip = Math.round((partner.wealth ? partner.wealth * 0.00005 : 800) * (1 + tipRate));
        state.money += tip;
        if (satisfaction >= 80) {
          Game.lifeDirector.addLog(state, '金主满意',
            '金主对你的服务非常满意，额外留下了' + Game.view.money(tip) + '小费。', 'good');
        }
      }
    }

    /* pregnancy */
    const partner = partnerData(state);
    if (partner && partner.gender === '女') {
      const playerPerson = { ...state.profile, id: 'player-profile',
        name: state.name, gender: state.gender, culture: state.location.country };
      const spermAmount = enc.semenGauge;
      const record = Game.relationshipSecrets.addEncounterRecord(state, partner, enc.mode, spermAmount);
      if (record && spermAmount >= (enc.isRape ? 30 : 40)) {
        Game.relationshipSecrets.schedulePregnancy(state, playerPerson, partner, record);
      }
    } else if (partner && state.gender === '女' && enc.playerRole === 'provider') {
      const playerPerson = { ...state.profile, id: 'player-profile',
        name: state.name, gender: state.gender, culture: state.location.country };
      const spermAmount = enc.semenGauge;
      const record = Game.relationshipSecrets.addEncounterRecord(state, partner, enc.mode, spermAmount);
      if (record && spermAmount >= (enc.isRape ? 30 : 40)) {
        Game.relationshipSecrets.schedulePregnancy(state, playerPerson, partner, record);
      }
    }

    /* partner stats */
    if (partner && partner.status === '健康') {
      partner.interactions += 1;
      partner.affection = U.clamp(partner.affection + U.between(4, 10), 0, 100);
      if (partner.affection < 42) partner.affection = 42;
      if (partner.sexWork?.isProstitute) {
        partner.sexWork.brothelVisits = (partner.sexWork.brothelVisits || 0) + 1;
      }
    }
    /* ensure partner is in travel encounters */
    if (partner && !state.travel.encounters.some(function(p) { return p.id === partner.id; })) {
      state.travel.encounters.push(partner);
    }
    /* psychology / addiction hooks */
    var addAmount = enc.isRape ? 5 : (enc.mode === 'brothel' ? 3 : 2);
    if (Game.psychology) {
      Game.psychology.addAddiction(state, addAmount);
      if (enc.isRape) {
        Game.psychology.addGuilt(state, 15);
        Game.psychology.addCorruption(state, 5);
      } else if (enc.mode === 'hookup') {
        Game.psychology.addGuilt(state, U.between(3, 8));
      }
    }
    /* criminal record for rape */
    if (enc.isRape) {
      if (Game.rapeEncounter) Game.rapeEncounter.addCorruption(state, partner);
      if (Game.criminalSystem) Game.criminalSystem.addRecord(state, 18);
    }
    /* spousal suspicion */
    if (Game.familyConflict) {
      var susAmount = enc.isRape ? 8 : (enc.mode === 'brothel' ? 3 : 5);
      Game.familyConflict.addSuspicion(state, susAmount, enc.isRape ? '配偶察觉到了你的异样' : (enc.mode === 'brothel' ? '深夜不归，配偶起了疑心' : '身上陌生的香水味让配偶皱眉'));
    }
    /* STD risk */
    if (enc.isRape) {
      if (Game.healthSystem) Game.healthSystem.checkSTD(state, 'high');
    } else if (enc.mode === 'brothel') {
      if (Game.healthSystem) Game.healthSystem.checkSTD(state, 'medium');
    } else if (enc.mode === 'hookup') {
      if (Game.healthSystem) Game.healthSystem.checkSTD(state, 'medium');
    }
    /* consume global stamina */
    if (state.stamina) {
      state.stamina.current = Math.max(0, state.stamina.current - 30);
    }

    Game.lifeDirector.addLog(state, '私密交欢结束',
      `${nm}的体力耗尽，交欢结束。高潮${enc.orgasmCount}次 · 尝试${enc.positionsTried.length}种体位。`, 'good');

    state.brothelStage.active = false;
    state.hookupStage.active = false;

    return { ok: true, message: `交欢结束 · ${nm}高潮${enc.orgasmCount}次`, finish: true };
  }

  /* ---- render ---- */
  function render(state) {
    if (!state.encounter.active) return '';
    const enc = state.encounter;
    const nm = partnerName(state);
    const st = Math.round(enc.femaleStamina);
    const stMax = Math.round(enc.femaleStaminaMax);
    const ar = Math.round(enc.arousal);
    const sg = Math.round(enc.semenGauge);
    const th = Math.round(enc.climaxThreshold);

    const staminaWarn = st < 25 ? ' critical' : (st < 50 ? ' warning' : '');
    const arousalWarn = ar >= th ? ' near-climax' : '';

    const posButtons = posNames.map((name) => {
      const tried = enc.positionsTried.includes(name) ? ' tried' : '';
      const active = enc.position === name ? ' active' : '';
      return `<button class="encounter-pos${tried}${active}" data-encounter-pos="${name}"
        ${st <= 0 ? 'disabled' : ''}>${name}</button>`;
    }).join('');

    const logHTML = enc.actionLog.slice(0, 12).map((entry, i) => {
      const cls = entry.orgasm ? 'encounter-orgasm' : (entry.finish ? 'encounter-finish' : '');
      return `<p class="${cls}"><small>${entry.position}</small>${entry.text}</p>`;
    }).join('');

    return `<div class="encounter-overlay" id="encounterOverlay" role="dialog" aria-modal="true">
      <header class="encounter-header">
        <span>今夜 · ${nm}</span>
        <strong>${enc.mode === 'brothel' ? '青楼寻欢' : (enc.mode === 'hookup' ? '私密约会' : '奇遇交欢')}</strong>
      </header>
      <div class="encounter-bars">
        <div class="encounter-bar"><label>体力</label>
          <i class="bar-track"><b class="${staminaWarn}" style="width:${st * 100 / stMax}%"></b></i>
          <em>${st}/${stMax}</em></div>
        <div class="encounter-bar"><label>兴奋度</label>
          <i class="bar-track"><b class="${arousalWarn}" style="width:${ar}%"></b></i>
          <em>${ar}/${th}→</em></div>
        <div class="encounter-bar"><label>精液槽</label>
          <i class="bar-track"><b style="width:${sg}%"></b></i>
          <em>${sg}/${enc.maxSemen}</em></div>
        ${enc.isRape ? '<div class="encounter-bar"><label>抵抗</label><i class="bar-track"><b style="width:' + enc.victimResistance + '%"></b></i><em>' + enc.victimResistance + '/100</em></div><p style="color:#d46a6a;font-size:11px">' + (enc.victimResistance > 80 ? '她拼命挣扎着...' : (enc.victimResistance > 40 ? '挣扎在减弱...' : (enc.victimResistance > 0 ? '无声流泪...' : '已经不再反抗了。'))) + '</p>' : ''}
      </div>
      <div class="encounter-hud"><span>高潮 ${enc.orgasmCount}次</span>
        <span>体位 ${enc.positionsTried.length}种</span></div>
      <div class="encounter-positions">${posButtons}</div>
      <div class="encounter-log">${logHTML || '<p class="empty-state">选择体位开始交欢</p>'}</div>
      <footer><button class="encounter-finish-btn" data-encounter-finish>结束交欢</button></footer>
    </div>`;
  }

  function overlayHtml(state) {
    return render(state);
  }

  function handleClick(event) {
    event.stopPropagation();
    const posBtn = event.target.closest('[data-encounter-pos]');
    if (posBtn) {
      event.stopPropagation();
      const stateData = Game._getState ? Game._getState() : null;
      if (stateData && stateData.encounter?.active) {
        const result = act(stateData, posBtn.dataset.encounterPos);
        Game._refresh();
        if (result.finish) {
          hideOverlay();
        } else if (result.ok || result.orgasmed) {
          Game.view.showToast(result.message, result.orgasmed ? 'good' : 'normal');
          refreshOverlay(stateData);
        }
      }
      return true;
    }
    const finishBtn = event.target.closest('[data-encounter-finish]');
    if (finishBtn) {
      event.stopPropagation();
      const stateData = Game._getState ? Game._getState() : null;
      if (stateData) {
        finish(stateData);
        Game._refresh();
        hideOverlay();
        Game.view.showToast('交欢结束', 'normal');
      }
      return true;
    }
    return false;
  }

  function showOverlay(state) {
    const container = document.getElementById('encounterOverlayContainer');
    if (container) { container.innerHTML = render(state); container.hidden = false; }
  }

  function hideOverlay() {
    const container = document.getElementById('encounterOverlayContainer');
    if (container) { container.innerHTML = ''; container.hidden = true; }
  }

  function refreshOverlay(state) {
    const container = document.getElementById('encounterOverlayContainer');
    if (container && state.encounter.active) { container.innerHTML = render(state); }
  }

  Game.encounterSystem = Object.freeze({
    ensure, init, act, finish, render, overlayHtml, handleClick, showOverlay, hideOverlay,
  });
}(window));
