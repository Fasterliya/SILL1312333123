(function initCreatorEconomy(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function count(value) {
    return Math.max(0, Math.round(Number(value) || 0));
  }

  function compact(value) {
    const amount = count(value);
    if (amount < 1000) return amount.toLocaleString();
    const units = amount >= 1000000000
      ? [1000000000, 'b'] : (amount >= 1000000 ? [1000000, 'm'] : [1000, 'k']);
    const scaled = amount / units[0];
    const digits = scaled < 100 ? 1 : 0;
    return `${scaled.toFixed(digits).replace(/\.0$/, '')}${units[1]}`;
  }

  function audienceValue(followers) {
    const fans = count(followers);
    return Math.sqrt(fans) * 14 + fans * 0.03;
  }

  function trustFactor(brandTrust) {
    return 0.75 + U.clamp(Number(brandTrust) || 0, 0, 100) / 200;
  }

  function contentIncome(views, followers, brandTrust, weight) {
    const adRevenue = count(views) / 1000 * (8 + U.clamp(brandTrust, 0, 100) / 8);
    const fanRevenue = audienceValue(followers) * 0.08;
    return Math.max(0, Math.round((adRevenue + fanRevenue) * (weight || 1)));
  }

  function livestreamIncome(viewers, followers, brandTrust) {
    const liveRevenue = count(viewers) * (1.2 + U.clamp(brandTrust, 0, 100) / 70);
    return Math.max(0, Math.round(liveRevenue + audienceValue(followers) * 0.12));
  }

  function sponsorIncome(followers, brandTrust) {
    return Math.max(0, Math.round(
      (800 + audienceValue(followers) * 1.8) * trustFactor(brandTrust),
    ));
  }

  function passiveIncome(views, followers, brandTrust) {
    const playback = count(views) / 1000 * (6 + U.clamp(brandTrust, 0, 100) / 10);
    return Math.max(0, Math.round(
      (playback + audienceValue(followers) * 0.12) * trustFactor(brandTrust),
    ));
  }

  function monthlySalary(base, followers, brandTrust) {
    return Math.max(0, Math.round(
      count(base) * 0.35 + audienceValue(followers) * (0.8 + U.clamp(brandTrust, 0, 100) / 250),
    ));
  }

  function npcIncome(followers, incomeRate) {
    const rate = Math.max(0, Number(incomeRate) || 0);
    return Math.max(0, Math.round(audienceValue(followers) * rate * 12));
  }

  Game.creatorEconomy = Object.freeze({
    compact, audienceValue, contentIncome, livestreamIncome,
    sponsorIncome, passiveIncome, monthlySalary, npcIncome,
  });
}(window));
