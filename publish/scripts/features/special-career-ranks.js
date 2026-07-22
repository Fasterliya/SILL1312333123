(function initSpecialCareerRanks(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const TRACKS = {
    prostitute: {
      titles: ['街头流莺', '会所红牌', '高级交际花', '头牌名媛'],
      thresholds: [0, 30, 60, 80],
    },
    welfare: {
      titles: ['新人福利姬', '小有人气', '频道红人', '顶级福利姬'],
      thresholds: [0, 5000, 20000, 100000],
    },
    coser: {
      titles: ['新人Coser', '活跃Coser', '舞台常客', '受邀嘉宾'],
      thresholds: [0, 1500, 10000, 50000],
    },
    pimp: {
      titles: ['街头中介', '小店老板', '会所经营者', '连锁老板', '地下皇帝'],
      thresholds: [0, 3, 6, 11, 21],
    },
    blackmarket: {
      titles: ['街头小贩', '固定摊主', '黑市中间商', '地下供应链'],
      thresholds: [0, 10, 30, 100],
    },
  };

  function value(state, jobId) {
    if (jobId === 'prostitute') {
      const data = Game.economicCareerState.ensure(state).sexWork;
      const agePenalty = Math.max(0, Game.content.age(state) - 30) * 1.2;
      return Math.round(
        state.stats.魅力 * 0.35 + state.stats.健康 * 0.25
        + Math.min(40, data.completed) * 0.8 + data.patrons.length * 4 - agePenalty,
      );
    }
    if (['welfare', 'coser'].includes(jobId)) {
      return Math.max(0, state.creator?.followers || state.idol?.fans || 0);
    }
    if (jobId === 'pimp') return state.brothel?.girls?.length || 0;
    if (jobId === 'blackmarket') {
      const stock = Game.economicCareerState.ensure(state).blackMarket.stock;
      return Object.values(stock).reduce((sum, count) => sum + (Number(count) || 0), 0);
    }
    return 0;
  }

  function profile(state) {
    const jobId = state.career?.jobId;
    const track = TRACKS[jobId];
    if (!track) return null;
    const currentValue = value(state, jobId);
    let level = 0;
    track.thresholds.forEach((threshold, index) => {
      if (currentValue >= threshold) level = index;
    });
    const next = track.thresholds[level + 1];
    const floor = track.thresholds[level];
    const progress = next
      ? Math.round((currentValue - floor) / Math.max(1, next - floor) * 100) : 100;
    return {
      jobId,
      level,
      title: track.titles[level],
      nextTitle: track.titles[level + 1] || '',
      currentValue,
      next,
      progress: Game.content.clamp(progress, 0, 100),
    };
  }

  function sync(state) {
    const current = profile(state);
    if (!current) return null;
    const previous = state.career.specialRank;
    state.career.specialRank = {
      jobId: current.jobId,
      level: current.level,
      title: current.title,
    };
    if (previous?.jobId === current.jobId && previous.level === current.level) return current;
    Game.careerHistory?.add(state, {
      key: `special-rank-${current.jobId}-${current.level}`,
      kind: 'promotion',
      title: `职业等级：${current.title}`,
      detail: current.nextTitle ? `下一阶段为${current.nextTitle}` : '已达到当前路线顶级',
    });
    if (previous?.jobId === current.jobId && current.level > previous.level) {
      Game.taskCenter?.add(state, {
        key: `special-rank-notice-${current.jobId}-${current.level}`,
        type: 'notice',
        title: `职业升级 · ${current.title}`,
        text: current.nextTitle ? `新的发展目标：${current.nextTitle}` : '已达到当前职业路线顶级。',
      });
    }
    return current;
  }

  function render(state) {
    const current = sync(state);
    if (!current) return '';
    const detail = current.next
      ? `进度 ${current.currentValue}/${current.next} · 下一阶段 ${current.nextTitle}`
      : `当前指标 ${current.currentValue} · 已达顶级`;
    return `<section class="career-rank-banner"><div><small>特殊职业阶梯</small>
      <strong>${current.title}</strong><span>${detail}</span></div>
      <b>L${current.level}</b><div class="progress-bar">
      <i style="width:${current.progress}%"></i><span>${current.progress}%</span></div></section>`;
  }

  Game.specialCareerRanks = Object.freeze({ TRACKS, profile, sync, render });
}(window));
