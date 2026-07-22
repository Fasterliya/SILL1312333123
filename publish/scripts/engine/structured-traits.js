(function initStructuredTraits(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const personalities = {
    disciplined: { name: '自律', bonuses: {}, growth: 1.1, stressGain: 1.15 },
    lazy: { name: '懒散', bonuses: {}, growth: 0.88, stressRecovery: 1.25 },
    brave: { name: '勇敢', bonuses: { 体能: 4 }, risk: 1.25 },
    timid: { name: '胆怯', bonuses: { 心计: 3 }, risk: 0.7 },
    outgoing: { name: '外向', bonuses: { 交涉: 5 }, social: 1.2 },
    introverted: { name: '内向', bonuses: { 学识: 4, 交涉: -3 }, social: 0.8 },
    honest: { name: '诚实', bonuses: { 交涉: 2, 心计: -4 } },
    cunning: { name: '狡猾', bonuses: { 心计: 6, 交涉: -1 } },
  };
  const educations = {
    学识: '学术教育', 交涉: '社交教育', 管理: '商业教育', 心计: '谋略教育', 体能: '体能教育',
  };
  const experiences = {
    coser: { name: '职业 Coser', bonuses: { 交涉: 3, 体能: 2 } },
    entrepreneur: { name: '创业者', bonuses: { 管理: 5, 心计: 2 } },
    traveler: { name: '旅行家', bonuses: { 学识: 2, 体能: 2 } },
    veteran: { name: '退伍者', bonuses: { 体能: 5, 管理: 2 } },
    trauma: { name: '创伤', bonuses: { 交涉: -3, 心计: 2 } },
    addiction: { name: '成瘾', bonuses: { 管理: -3, 心计: -2 } },
  };

  function hash(value) {
    return [...String(value || 'person')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function personalityIds(target) {
    const text = `${target.personality || ''}|${target.trait || ''}`;
    const seed = hash(target.id || target.name);
    return [
      /自律|细心|执着|务实/.test(text) ? 'disciplined'
        : (/懒散/.test(text) ? 'lazy' : ((seed & 1) ? 'disciplined' : 'lazy')),
      /勇敢|热血/.test(text) ? 'brave' : (/胆怯|敏感/.test(text) ? 'timid' : ((seed & 2) ? 'brave' : 'timid')),
      /外向|乐观|随和|幽默/.test(text) ? 'outgoing'
        : (/内向|慢热|理性/.test(text) ? 'introverted' : ((seed & 4) ? 'outgoing' : 'introverted')),
      /狡猾/.test(text) ? 'cunning' : (/诚实/.test(text) ? 'honest' : ((seed & 8) ? 'honest' : 'cunning')),
    ];
  }

  function inferredEducation(target) {
    const text = `${target.educationName || ''}|${target.job || ''}`;
    const ability = /商|金融|管理|会计/.test(text) ? '管理'
      : (/艺术|偶像|主播|社交/.test(text) ? '交涉'
        : (/军|体育|运动/.test(text) ? '体能' : (/法律|犯罪|调查/.test(text) ? '心计' : '学识')));
    return { ability, level: Math.max(0, Math.min(4, Number(target.educationLevel) || 0)) };
  }

  function ensure(target) {
    target.traits = target.traits && typeof target.traits === 'object' ? target.traits : {};
    const traits = target.traits;
    traits.personality = Array.isArray(traits.personality) ? traits.personality : personalityIds(target);
    traits.personality = traits.personality.filter((id) => personalities[id]).slice(0, 4);
    traits.education = traits.education && typeof traits.education === 'object'
      ? traits.education : inferredEducation(target);
    traits.experience = Array.isArray(traits.experience) ? traits.experience : [];
    if (target.job === '职业Coser' && !traits.experience.includes('coser')) traits.experience.push('coser');
    if (target.companies?.length && !traits.experience.includes('entrepreneur')) traits.experience.push('entrepreneur');
    if ((target.trauma || target.psychology?.trauma) > 30 && !traits.experience.includes('trauma')) traits.experience.push('trauma');
    traits.childhood ||= '';
    return traits;
  }

  function abilityBonus(target, ability) {
    const traits = ensure(target);
    const personality = traits.personality.reduce((sum, id) => sum + (personalities[id].bonuses[ability] || 0), 0);
    const education = traits.education.ability === ability ? traits.education.level * 3 : 0;
    const experience = traits.experience.reduce((sum, id) => sum + (experiences[id]?.bonuses[ability] || 0), 0);
    return personality + education + experience;
  }

  function growthMultiplier(target, ability) {
    const traits = ensure(target);
    const personality = traits.personality.reduce((value, id) => value * (personalities[id].growth || 1), 1);
    const education = traits.education.ability === ability ? 1 + traits.education.level * 0.08 : 1;
    return personality * education;
  }

  function stressFactor(target, recovery) {
    return ensure(target).personality.reduce((value, id) => (
      value * (recovery ? personalities[id].stressRecovery || 1 : personalities[id].stressGain || 1)
    ), 1);
  }

  function compatibility(left, right) {
    const a = ensure(left).personality;
    const b = ensure(right).personality;
    const same = a.filter((id) => b.includes(id)).length;
    const opposites = [['disciplined', 'lazy'], ['brave', 'timid'], ['outgoing', 'introverted'], ['honest', 'cunning']];
    const clashes = opposites.filter(([x, y]) => (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))).length;
    return Math.max(-12, Math.min(12, same * 3 - clashes * 3));
  }

  function childhood(target) {
    const traits = ensure(target);
    if (!traits.childhood) {
      const list = ['好奇', '活跃', '合群', '谨慎'];
      traits.childhood = list[hash(`${target.id || target.name}:childhood`) % list.length];
    }
    return traits.childhood;
  }

  function setEducation(target, ability, level) {
    ensure(target).education = { ability, level: Math.max(1, Math.min(4, Math.round(level))) };
  }

  function addExperience(target, id) {
    if (!experiences[id]) return false;
    const list = ensure(target).experience;
    if (!list.includes(id)) list.push(id);
    return true;
  }

  function display(target) {
    const traits = ensure(target);
    return {
      personality: traits.personality.map((id) => personalities[id].name),
      education: traits.education.level
        ? `${educations[traits.education.ability]} ${traits.education.level}级` : '尚未形成',
      experience: traits.experience.map((id) => experiences[id]?.name).filter(Boolean),
      childhood: traits.childhood,
    };
  }

  Game.structuredTraits = Object.freeze({
    ensure, abilityBonus, growthMultiplier, stressFactor, compatibility,
    childhood, setEducation, addExperience, display, educations,
  });
}(window));
