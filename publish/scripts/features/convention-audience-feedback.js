(function initConventionAudienceFeedback(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  const routeSignals = Object.freeze({
    'market-sponsor-local-brand': '联名入场礼包具有辨识度',
    'operation-zoned-entry': '入场分区导流顺畅',
    'operation-open-entry': '快速入场提升现场气氛',
    'market-community-alliance': '社团联合专区内容充实',
    'market-creator-panel': '创作者座谈很有收获',
    'stage-voice-cast': '舞台嘉宾互动突出',
    'stage-guest-encore': '追加环节提升了现场热度',
    'stage-platform-live': '平台直播区带来参与感',
    'coser-featured-talk': '受邀 Coser 交流深入',
    'operation-safe-exit': '散场接驳安排有序',
    'stage-stream-finale': '直播压轴形成传播话题',
  });
  function label(score) {
    if (score >= 85) return '口碑爆发';
    if (score >= 72) return '广受好评';
    if (score >= 60) return '评价稳定';
    if (score >= 45) return '褒贬不一';
    return '口碑受损';
  }
  function reputation(score) {
    if (score >= 85) return 5;
    if (score >= 72) return 3;
    if (score >= 60) return 1;
    if (score >= 45) return -2;
    return -5;
  }
  function capture(ts, result) {
    if (!ts || ts.mode !== 'convention') return null;
    const routeIds = Array.isArray(ts.path) ? [...new Set(ts.path.map(String))] : [];
    const highlights = [...new Set(routeIds.map((id) => routeSignals[id]).filter(Boolean))];
    const score = Math.round(clamp(35 + (Number(result?.score) || 0) * 3));
    return {
      version: 1, score, label: label(score), role: ts.role || 'visitor',
      intent: ts.intent || 'social', routeIds: routeIds.slice(-10), highlights: highlights.slice(0, 4),
    };
  }
  function evaluate(state, event, context = {}) {
    const prep = Game.conventionCalendar.preparation(state, event);
    const attendance = state.conventionCalendar?.attendance?.[event.id];
    const sample = attendance?.completed ? attendance.feedback : null;
    const sampleScore = Number.isFinite(Number(sample?.score)) ? clamp(Number(sample.score)) : null;
    const sampleHighlights = Array.isArray(sample?.highlights)
      ? sample.highlights.filter((item) => typeof item === 'string').slice(0, 2) : [];
    const operationCount = Number(context.operationCount) || 0;
    const operationScore = Number(context.operationScore) || 0;
    const company = (state.companies || []).find((item) => item.id === event.organizer.companyId);
    const brand = Game.conventionProgression?.audienceImpact(company, event, prep)
      || { score: 0, strength: '', concern: '' };
    let score = prep.quality * 0.44 + prep.safety * 0.38 + prep.promotion * 0.18;
    score += operationCount ? clamp((operationScore - 50) * 0.12, -6, 6) : -4;
    score += brand.score;
    if (sampleScore !== null) score = score * 0.85 + sampleScore * 0.15;
    if (context.incident) score -= context.incident.rate > 0.1 ? 20 : 9;
    score = Math.round(clamp(score));
    const strengths = [];
    const concerns = [];
    if (sampleHighlights.length) strengths.push(...sampleHighlights);
    if (brand.strength) strengths.push(brand.strength);
    if (prep.quality >= 70) strengths.push('内容与场馆质量获得认可');
    if (prep.safety >= 70) strengths.push('现场秩序与安全感良好');
    if (prep.promotion >= 70 && prep.promotion - prep.safety < 20) {
      strengths.push('活动热度与传播表现突出');
    }
    if (prep.guests.length) strengths.push('主嘉宾形成明确记忆点');
    if (operationCount === 3 && operationScore >= 65) strengths.push('三阶段现场运营执行稳定');
    if (context.incident) concerns.push(context.incident.name);
    if (brand.concern) concerns.push(brand.concern);
    if (operationCount < 3) concerns.push('现场运营阶段存在缺口');
    if (prep.promotion - prep.safety >= 20) concerns.push('宣传热度超过现场承载能力');
    if (prep.safety < 55) concerns.push('拥挤与秩序问题较明显');
    if (prep.quality < 55) concerns.push('内容和场馆体验偏弱');
    return {
      score, label: label(score), reputationDelta: reputation(score),
      strengths: [...new Set(strengths)].slice(0, 5),
      concerns: [...new Set(concerns)].slice(0, 4), sampleUsed: sampleScore !== null,
    };
  }

  Game.conventionAudienceFeedback = Object.freeze({ capture, evaluate, label });
}(window));
