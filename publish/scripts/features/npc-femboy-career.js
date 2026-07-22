(function initNpcFemboyCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const careerIds = new Set(['coser', 'welfare']);
  const feminineCostume = /裙|女仆|巫女|洋装|旗袍|振袖|百褶|连衣|水手服|长袜|过膝袜/;
  const feminineTop = /裙|女仆|巫女|洋装|旗袍|振袖|连衣|小香|町娘|毕业袴/;
  const masculineStyle = /男性|男式|燕尾服|狩衣|背头|寸头|西装长裤|直筒裤|工装裤|机车裤|休闲裤|商务袜/;
  const feminineBodies = new Set(['小胸', '丰满', '匀称', '娇小纤细']);

  function hash(value) {
    return [...String(value || '')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function jobId(job) {
    const id = typeof job === 'string' ? job : job?.id;
    if (careerIds.has(id)) return id;
    const name = typeof job === 'string' ? job : job?.name;
    if (/Coser/i.test(name || '')) return 'coser';
    return name === '福利姬' ? 'welfare' : '';
  }

  function isFeminineCostume(costume) {
    return Boolean(costume && costume.name !== '无'
      && feminineCostume.test(`${costume.name} ${costume.prompt || ''}`));
  }

  function chance(person, id) {
    const interest = Number(person.fashion?.cosplayInterest) || 0;
    const charm = Number(person.stats?.魅力) || 50;
    const slim = ['清瘦', '娇小纤细', '匀称'].includes(person.bodyType) ? 10 : 0;
    const soft = ['青涩', '灵动', '明快', '文雅'].includes(person.temperament) ? 9 : 0;
    const base = id === 'welfare' ? 10 + charm * 0.24 : 7 + interest * 0.34;
    return U.clamp(Math.round(base + slim + soft), 8, id === 'welfare' ? 58 : 62);
  }

  function allowsJob(person, job, age) {
    const id = jobId(job);
    if (!id || person.gender !== '男' || age < 18 || person.status !== '健康') return false;
    return hash(`${person.id}:${id}:feminine-career`) % 100 < chance(person, id);
  }

  function morphology(person) {
    person.bodyMorphology = person.bodyMorphology && typeof person.bodyMorphology === 'object'
      ? person.bodyMorphology : {};
    const data = person.bodyMorphology;
    const seed = hash(`${person.id}:femboy-body`);
    data.chest = U.clamp(Number(data.chest) || 8, 0, 100);
    data.shoulderWidth = U.clamp(Number(data.shoulderWidth) || 48 + (seed % 8), 0, 100);
    data.waistDefinition = U.clamp(Number(data.waistDefinition) || 62 + (seed % 11), 0, 100);
    data.hipVolume = U.clamp(Number(data.hipVolume) || 38 + (seed % 10), 0, 100);
    data.legLength = U.clamp(Number(data.legLength) || 72 + (seed % 12), 0, 100);
    data.legSlenderness = U.clamp(Number(data.legSlenderness) || 70 + ((seed >>> 5) % 14), 0, 100);
    return data;
  }

  function ensure(person) {
    person.feminineCareer = person.feminineCareer && typeof person.feminineCareer === 'object'
      ? person.feminineCareer : {};
    const data = person.feminineCareer;
    data.active = Boolean(data.active);
    data.stage ||= data.active ? 'exploring' : 'none';
    data.startedMonth = Number.isFinite(data.startedMonth) ? data.startedMonth : -1;
    data.feminineOutfits = Math.max(0, Number(data.feminineOutfits) || 0);
    data.bodyGoal ||= 'cute-curvy';
    morphology(person);
    return data;
  }

  function active(person) {
    return person?.gender === '男' && Boolean(person.feminineCareer?.active);
  }

  function activate(state, person, source) {
    if (person.gender !== '男' || U.personAge(state, person) < 18) return false;
    const data = ensure(person);
    if (data.active) return true;
    data.active = true;
    data.stage = 'exploring';
    data.startedMonth = state.totalMonths;
    data.source = source || jobId(person.job);
    person.creatorStyle ||= {};
    person.creatorStyle.nextChangeMonth = state.totalMonths;
    return true;
  }

  function onJobAssigned(state, person, job) {
    const id = jobId(job);
    if (!id || person.gender !== '男') return false;
    return allowsJob(person, job, U.personAge(state, person))
      ? activate(state, person, id) : false;
  }

  function considerConvention(state, person, costume) {
    if (person.gender !== '男' || !isFeminineCostume(costume)) return false;
    person.fashion ||= {};
    person.fashion.crossplay = true;
    if (U.personAge(state, person) >= 18) activate(state, person, 'coser');
    return true;
  }

  function progress(state, person) {
    if (!active(person)) return null;
    const data = ensure(person);
    const months = Math.max(0, state.totalMonths - data.startedMonth);
    if (data.stage === 'exploring' && months >= 4 && data.feminineOutfits >= 2) {
      data.stage = 'established';
    }
    const completed = (person.cosmeticProcedures || []).filter((item) => (
      ['shoulder', 'waist', 'hip', 'breast'].includes(item.type)
    )).length;
    if (completed >= 3) data.stage = 'feminized';
    return data;
  }

  function markOutfit(state, person) {
    const data = progress(state, person);
    if (!data) return;
    data.feminineOutfits += 1;
    person.bodyType = '娇小纤细';
    person.adultBodyType = '娇小纤细';
    progress(state, person);
  }

  function nextProcedure(state, person, completed) {
    const data = progress(state, person);
    if (!data || data.stage === 'exploring') return '';
    const sequence = ['facial', 'shoulder', 'waist'];
    if (Number(person.height) > 166) sequence.push('heightshort');
    sequence.push('hip', 'breastaug', 'eyelid', 'nose');
    return sequence.find((id) => !completed.has(Game.plasticSurgery.get(id)?.category)) || '';
  }

  function afterSurgery(state, person) {
    if (!active(person)) return;
    const body = morphology(person);
    body.legSlenderness = U.clamp(body.legSlenderness + 1, 0, 100);
    Game.characterAttributes.adjustPresentation(person, person.stats, 2);
    person.bodyType = '娇小纤细';
    person.adultBodyType = '娇小纤细';
    progress(state, person);
  }

  function styleBonus(person, rawJob) {
    if (!active(person) || !jobId(rawJob)) return 0;
    const body = morphology(person);
    return U.clamp(0.08 + (body.legLength - 65) / 500
      + (body.legSlenderness - 65) / 550, 0.08, 0.2);
  }

  function advantageLabel(person) {
    const body = morphology(person);
    const legs = Math.max(1, Math.round((body.legLength - 60) / 2));
    const slender = Math.max(1, Math.round((body.legSlenderness - 60) / 2));
    return `长腿线条 +${legs} · 纤细腿型 +${slender} · 医美魅力额外 +2/项 · 职业增幅 ×${(1 + styleBonus(person, person.job)).toFixed(2)}`;
  }

  function planLabel(state, person) {
    const data = progress(state, person);
    if (!data) return '';
    if (data.stage === 'exploring') {
      const remaining = Math.max(0, 4 - (state.totalMonths - data.startedMonth));
      return `女性化造型适应期 · 已完成${data.feminineOutfits}次换装 · 至少还需${remaining}个月`;
    }
    const completed = new Set((person.cosmeticProcedures || []).map((item) => item.type));
    const next = nextProcedure(state, person, completed);
    return next ? `可爱曲线计划 · 下一项${Game.plasticSurgery.get(next)?.name || '造型调整'}`
      : '可爱曲线计划已完成';
  }

  function allowsAppearance(person, field, value) {
    if (!active(person)) return true;
    if (field === 'bodyType') return feminineBodies.has(value);
    if (field === 'cosplay') return isFeminineCostume(Game.cosplayCatalog.find(value));
    if (field === 'clothing.top') return feminineTop.test(String(value || ''));
    return !masculineStyle.test(String(value || ''));
  }

  Game.npcFemboyCareer = Object.freeze({
    active, ensure, allowsJob, onJobAssigned, considerConvention, progress, markOutfit,
    nextProcedure, afterSurgery, styleBonus, advantageLabel, planLabel,
    allowsAppearance, isFeminineCostume,
  });
}(window));
