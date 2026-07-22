(function initNpcInitiativeRiskGenerators(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.npcInitiativeCore;

  function revenge(state) {
    if (Core.playerAge(state) < 18) return null;
    const candidates = Core.allContacts(state).filter((person) => (
      person.conflict >= 70
      && Core.hasHistory(person, ['离婚', '拒绝告白', '分手', '强迫', '背叛', '强暴'])
    ));
    const person = U.random(candidates);
    if (!person) return null;
    const revengeType = U.random(['report', 'rumor', 'confront']);
    const text = {
      report: `${person.name}声称已经收集证据，准备向有关部门举报。`,
      rumor: `${person.name}正在熟人圈传播关于你的负面消息。`,
      confront: `${person.name}突然出现，要求你为过去的行为负责。`,
    }[revengeType];
    return {
      type: 'revenge',
      title: '复仇的阴影',
      text,
      data: { personId: person.id, personName: person.name, revengeType },
      options: [
        { label: '尝试对话和解', action: 'talk' },
        { label: '不予理会', action: 'ignore' },
      ],
    };
  }

  function corruptedSeduction(state) {
    if (Core.playerAge(state) < 18) return null;
    const opposite = state.gender === '男' ? '女' : '男';
    const candidates = Core.allPeople(state).filter((person) => (
      Number(person.sexAddiction) >= 50
      && person.gender === opposite
      && !['配偶', '父亲', '母亲', '儿子', '女儿'].includes(person.relation)
      && U.personAge(state, person) >= 18
    ));
    const person = U.random(candidates);
    if (!person) return null;
    return {
      type: 'corrupted_seduction',
      title: '暧昧邀约',
      text: `${person.name}邀请你今晚在酒店见面。`,
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '赴约', action: 'accept' },
        { label: '拒绝', action: 'decline' },
      ],
    };
  }

  function pregnancyNotice(state) {
    const events = Core.ensure(state);
    if (state.gender !== '男' || Core.playerAge(state) < 18) return null;
    if (state.totalMonths - events._lastPregnancyMonth < 24) return null;
    const candidates = Core.allPeople(state).filter((person) => (
      person.gender === '女'
      && U.personAge(state, person) >= 18
      && Array.isArray(person.hookupHistory)
      && person.hookupHistory.some((entry) => (
        entry.partnerId === 'player'
        || entry.partnerId === 'player-profile'
        || entry.withPlayer === true
      ))
    ));
    const person = U.random(candidates);
    if (!person) return null;
    return {
      type: 'pregnancy_notice',
      title: '意外的通知',
      text: `${person.name}告诉你，她已经怀孕，孩子很可能与你有关。`,
      data: {
        personId: person.id,
        personName: person.name,
        supportAmount: 5000,
      },
      options: [
        { label: '承认并承担抚养费', action: 'acknowledge' },
        { label: '要求亲子鉴定', action: 'test' },
        { label: '否认并回避', action: 'deny' },
      ],
    };
  }

  function rumor(state) {
    if (Core.playerAge(state) < 18) return null;
    let source = '';
    let text = '';
    if ((state.romance.affairCount || 0) >= 2) {
      source = 'affair';
      text = '你的多段私密关系开始在圈子里流传。';
    } else if ((state.creator?.scandalRisk || 0) >= 50) {
      source = 'scandal';
      text = '围绕你的负面传闻正在社交圈扩散。';
    } else {
      const spreader = U.random(state.contacts.filter((person) => (
        person.conflict >= 85 && !['父亲', '母亲'].includes(person.relation)
      )));
      if (!spreader) return null;
      source = spreader.id;
      text = `${spreader.name}正在熟人间传播对你不利的消息。`;
    }
    return {
      type: 'rumor_spread',
      title: '流言蜚语',
      text,
      data: { source, reputationLoss: U.between(4, 12) },
      options: [
        { label: '公开澄清', action: 'clarify' },
        { label: '保持沉默', action: 'ignore' },
      ],
    };
  }

  function traumaDependency(state) {
    if (Core.playerAge(state) < 18) return null;
    const candidates = Core.allPeople(state).filter((person) => (
      U.personAge(state, person) >= 18
      && Number(person.trauma) >= 45
      && Number(person.victimCorruption) >= 35
      && state.totalMonths - (person.lastDependencyEventMonth ?? -12) >= 6
      && !['父亲', '母亲', '儿子', '女儿'].includes(person.relation)
    ));
    const person = U.random(candidates);
    if (!person) return null;
    person.traumaDependency = Core.clamp(
      person.traumaDependency || Math.round(
        person.trauma * 0.45 + person.victimCorruption * 0.35,
      ),
    );
    return {
      type: 'trauma_dependency',
      title: '创伤依赖来电',
      text: `${person.name}在情绪失控时联系你，对伤害来源产生了矛盾的依赖。`,
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '陪同接受心理治疗', action: 'therapy' },
        { label: '建立安全边界', action: 'boundary' },
        { label: '利用这种依赖', action: 'exploit' },
      ],
    };
  }

  Game.npcInitiativeRiskGenerators = Object.freeze({
    list: [revenge, corruptedSeduction, pregnancyNotice, rumor, traumaDependency],
  });
}(window));
