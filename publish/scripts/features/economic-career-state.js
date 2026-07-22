(function initEconomicCareerState(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const ITEMS = Object.freeze([
    { id: 'aphrodisiac', name: '兴奋剂', buy: 200, sell: 800, risk: 1 },
    { id: 'drug', name: '镇静药', buy: 500, sell: 2000, risk: 4 },
    { id: 'toy', name: '成人用品', buy: 150, sell: 600, risk: 1 },
    { id: 'fakeId', name: '假证件', buy: 3000, sell: 8000, risk: 5 },
    { id: 'smKit', name: '特殊道具', buy: 800, sell: 3000, risk: 2 },
    { id: 'spyCam', name: '偷拍设备', buy: 2000, sell: 6000, risk: 6 },
  ]);

  function ensure(state) {
    state.sexWork = state.sexWork && typeof state.sexWork === 'object'
      ? state.sexWork : {};
    const sexWork = state.sexWork;
    sexWork.appointments = Array.isArray(sexWork.appointments) ? sexWork.appointments : [];
    sexWork.patrons = Array.isArray(sexWork.patrons) ? sexWork.patrons : [];
    sexWork.completed = Math.max(0, Number(sexWork.completed) || 0);
    sexWork.rejected = Math.max(0, Number(sexWork.rejected) || 0);
    sexWork.venueLevel = Math.max(1, Number(sexWork.venueLevel) || 1);
    sexWork.lastAppointmentMonth = Number.isFinite(sexWork.lastAppointmentMonth)
      ? sexWork.lastAppointmentMonth : -1;
    state.blackMarket = state.blackMarket && typeof state.blackMarket === 'object'
      ? state.blackMarket : {};
    state.blackMarket.stock = state.blackMarket.stock
      && typeof state.blackMarket.stock === 'object' ? state.blackMarket.stock : {};
    state.blackMarket.used = state.blackMarket.used
      && typeof state.blackMarket.used === 'object' ? state.blackMarket.used : {};
    return { sexWork, blackMarket: state.blackMarket };
  }

  function appointmentCandidates(state) {
    return (state.worldPeople || []).filter((person) => (
      person.status === '健康'
      && U.personAge(state, person) >= 18
      && person.currentCity === state.location.city
    ));
  }

  function refreshAppointments(state, force) {
    const sexWork = ensure(state).sexWork;
    if (!force
        && sexWork.lastAppointmentMonth === state.totalMonths
        && sexWork.appointments.length) return sexWork.appointments;
    const candidates = appointmentCandidates(state).slice(0, 4);
    const services = ['短时陪伴', '包夜', '私人会面', '按摩陪聊'];
    sexWork.appointments = candidates.map((person, index) => ({
      id: `appointment-${state.totalMonths}-${person.id}`,
      personId: person.id,
      name: person.name,
      service: services[index % services.length],
      price: Math.round(
        (350 + index * 180 + state.stats.魅力 * 8) * (1 + (sexWork.venueLevel - 1) * 0.18),
      ),
    }));
    if (!sexWork.appointments.length) {
      sexWork.appointments = services.slice(0, 3).map((service, index) => ({
        id: `appointment-${state.totalMonths}-${index}`,
        personId: '',
        name: ['普通客户', '商务客户', '长期客户'][index],
        service,
        price: 400 + index * 350,
      }));
    }
    sexWork.lastAppointmentMonth = state.totalMonths;
    return sexWork.appointments;
  }

  function findItem(itemId) {
    return ITEMS.find((item) => item.id === itemId) || null;
  }

  Game.economicCareerState = Object.freeze({
    ITEMS,
    ensure,
    refreshAppointments,
    findItem,
  });
}(window));
