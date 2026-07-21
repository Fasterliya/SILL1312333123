(function initConventionCalendarInteractions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  function refresh() {
    Game._refresh?.();
  }
  function notify(result) {
    Game.view?.showToast?.(result.message, result.ok ? 'good' : 'warning');
    refresh();
    Promise.resolve(Game._save?.()).catch((err) => {
      console.error('漫展日历存档失败:', err?.message, err?.stack);
    });
  }
  function openDetail(id) {
    const state = Game._getState?.();
    const item = state && Game.conventionCalendar.find(state, id);
    if (!item) return;
    Game.navigation.openDetail('漫展详情', Game.conventionCalendarView.detail(state, item), 'convention');
  }
  function handleClick(event) {
    const target = event?.target;
    if (!target || typeof target.closest !== 'function') return false;
    if (target.closest('[data-convention-calendar]')) {
      Game.conventionCalendarView.setOpen(true);
      refresh();
      return true;
    }
    if (target.closest('[data-convention-back]')) {
      Game.conventionCalendarView.setOpen(false);
      refresh();
      return true;
    }
    const filter = target.closest('[data-convention-filter]');
    if (filter) {
      Game.conventionCalendarView.setFilter(filter.dataset.conventionFilter);
      refresh();
      return true;
    }
    const year = target.closest('[data-convention-year]');
    if (year) {
      Game.conventionCalendarView.changeYear(year.dataset.conventionYear);
      refresh();
      return true;
    }
    const detail = target.closest('[data-convention-detail]');
    if (detail) {
      openDetail(detail.dataset.conventionDetail);
      return true;
    }
    const register = target.closest('[data-convention-register]');
    if (register) {
      const state = Game._getState?.();
      const role = document.querySelector('[data-convention-role]')?.value || 'visitor';
      const intent = document.querySelector('[data-convention-intent]')?.value || 'social';
      const result = Game.conventionCalendar.register(
        state, register.dataset.conventionRegister, role, intent,
      );
      notify(result);
      if (result.ok) openDetail(register.dataset.conventionRegister);
      return true;
    }
    const attend = target.closest('[data-convention-attend]');
    if (attend) {
      const result = Game.conventionCalendar.startAttendance(
        Game._getState?.(), attend.dataset.conventionAttend,
      );
      if (result.ok) Game.navigation.closeDetail();
      notify(result);
      return true;
    }
    return false;
  }

  Game.conventionCalendarInteractions = Object.freeze({ handleClick });
}(window));
