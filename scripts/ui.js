(function(window, $){
  'use strict';
  window.App = window.App || {};

  // UI module: renders lists, planner views, and binds events
  (function(){
    var state = {
      foods: [],
      plan: [],
      settings: { repeatGap: 2, includeDesserts: true },
      currentWeek: 0,
      view: 'week' // or 'month'
    };

    function saveAll(){
      window.AppStorage.setFoods(state.foods);
      window.AppStorage.savePlan(state.plan);
      window.AppStorage.saveSettings(state.settings);
    }

    function renderSuggestions(){
      var $wrap = $('#suggestions').empty();
      window.AppUtil.chipSuggestions.forEach(function(s){
        var $chip = $(`<button type="button" class="chip hover:bg-sky/10 transition" aria-label="Add suggestion ${s.name}">${s.name}</button>`);
        $chip.on('click', function(){ addFood(s.name, s.category); });
        $wrap.append($chip);
      });
    }

    function addFood(name, category){
      var clean = window.AppUtil.cleanName(name);
      if (!clean) return;
      var cat = (category || 'any').toLowerCase();
      var item = { id: window.AppUtil.uid(), name: clean, category: cat };
      state.foods.push(item);
      saveAll();
      renderFoods();
    }

    function deleteFood(id){
      state.foods = state.foods.filter(function(f){ return f.id !== id; });
      saveAll();
      renderFoods();
    }

    function renderFoods(){
      var $list = $('#food-list').empty();
      $('#food-count').text(state.foods.length);
      if (state.foods.length === 0) {
        $list.append(`<div class="text-sm text-ink/60">No foods yet. Add some or use sample foods.</div>`);
        return;
      }
      state.foods.forEach(function(f){
        var color = f.category === 'breakfast' ? 'bg-[#FFF1C9]' : f.category === 'lunch' ? 'bg-[#D9F2FF]' : f.category === 'dinner' ? 'bg-[#FFE3D9]' : f.category === 'dessert' ? 'bg-[#FFEFF7]' : 'bg-mist';
        var $row = $(`
          <div class="card-tight p-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-medium">${f.name}</p>
              <p class="text-xs text-ink/60">${f.category}</p>
            </div>
            <span class="chip ${color}">${f.category}</span>
            <button class="btn-icon" aria-label="Delete ${f.name}">🗑️</button>
          </div>
        `);
        $row.find('button').on('click', function(){ deleteFood(f.id); });
        $list.append($row);
      });
    }

    function ensurePlan(){
      if (!state.plan || state.plan.length !== 28) {
        state.plan = window.AppUtil.planMonth(state.foods, state.settings);
        saveAll();
      }
    }

    function renderPlanner(){
      if (state.view === 'week') renderWeek(); else renderMonth();
    }

    function renderWeek(){
      ensurePlan();
      var $wrap = $('#week-container').removeClass('hidden').empty();
      $('#month-container').addClass('hidden');
      var weeks = window.AppUtil.planToWeeks(state.plan);
      var week = weeks[state.currentWeek] || [];
      $('#week-label').text('Week ' + (state.currentWeek + 1) + ' of 4');

      var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      // Match month layout: use the same responsive columns and compact list markup so week cards
      // share styling/spacing with the month view.
      var $grid = $('<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-3 print-week"></div>');
      week.forEach(function(p, i){
        var dayLabel = dayNames[i];
        var $card = $(`
          <button class="day-cell text-left" data-day="${p.day}" aria-label="Edit Day ${p.day}">
            <div class="flex items-center justify-between">
              <span class="font-semibold">${dayLabel} • ${p.day}</span>
              <span class="chip">Edit</span>
            </div>
            <ul class="mt-2 space-y-1 text-xs">
              <li><strong>🍳</strong> ${p.meals.breakfast}</li>
              <li><strong>🥗</strong> ${p.meals.lunch}</li>
              <li><strong>🍝</strong> ${p.meals.dinner}</li>
              <li><strong>🍮</strong> ${p.meals.dessert || '—'}</li>
            </ul>
          </button>
        `);
        $card.on('click', function(){ openDayModal(p.day); });
        $grid.append($card);
      });
      $wrap.append($grid);
    }

    function renderMonth(){
      ensurePlan();
      $('#week-container').addClass('hidden');
      var $wrap = $('#month-container').removeClass('hidden').empty();
      var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      var $grid = $('<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-3"></div>');
      state.plan.forEach(function(p, idx){
        var label = dayNames[idx % 7];
        var $cell = $(`
          <button class="day-cell text-left" data-day="${p.day}" aria-label="Edit Day ${p.day}">
            <div class="flex items-center justify-between">
              <span class="font-semibold">${label} • ${p.day}</span>
              <span class="chip">Edit</span>
            </div>
            <ul class="mt-2 space-y-1 text-xs">
              <li><strong>🍳</strong> ${p.meals.breakfast}</li>
              <li><strong>🥗</strong> ${p.meals.lunch}</li>
              <li><strong>🍝</strong> ${p.meals.dinner}</li>
              <li><strong>🍮</strong> ${p.meals.dessert || '—'}</li>
            </ul>
          </button>
        `);
        $cell.on('click', function(){ openDayModal(p.day); });
        $grid.append($cell);
      });
      $wrap.append($grid);
    }

    function openDayModal(day){
      var p = state.plan.find(function(x){ return x.day === day; });
      if (!p) return;
      // build options for selects from foods
      var cats = window.AppUtil.categorize(state.foods);
      var desserts = window.AppUtil.getDessertPool(state.foods, state.settings.includeDesserts);
      function fill($sel, pool, current){
        $sel.empty();
        pool.forEach(function(item){ $sel.append(`<option value="${item.name}">${item.name}</option>`); });
        // ensure current is present
        if (current && !pool.some(function(i){ return i.name === current; })) {
          $sel.append(`<option value="${current}">${current}</option>`);
        }
        if (current) $sel.val(current);
      }
      fill($('#edit-breakfast'), [].concat(cats.breakfast, cats.any), p.meals.breakfast);
      fill($('#edit-lunch'), [].concat(cats.lunch, cats.any), p.meals.lunch);
      fill($('#edit-dinner'), [].concat(cats.dinner, cats.any), p.meals.dinner);
      fill($('#edit-dessert'), desserts, p.meals.dessert);

      $('#day-form').off('submit').on('submit', function(e){
        e.preventDefault();
        p.meals.breakfast = $('#edit-breakfast').val() || '';
        p.meals.lunch = $('#edit-lunch').val() || '';
        p.meals.dinner = $('#edit-dinner').val() || '';
        p.meals.dessert = $('#edit-dessert').val() || '';
        saveAll();
        closeModal();
        renderPlanner();
      });
      $('#day-delete-dessert').off('click').on('click', function(){ $('#edit-dessert').val(''); });
      $('#day-modal').removeClass('hidden');
      $('#day-modal-close').off('click').on('click', closeModal);
      $(document).on('keydown.dayModal', function(evt){ if (evt.key === 'Escape') closeModal(); });
      function closeModal(){ $('#day-modal').addClass('hidden'); $(document).off('keydown.dayModal'); }
      window.closeModal = closeModal; // for access inside submit callback
    }

    function bindEvents(){
      $('#food-form').on('submit', function(e){
        e.preventDefault();
        var name = $('#food-name').val();
        var cat = $('#food-cat').val();
        if (!name) return;
        addFood(name, cat);
        $('#food-name').val('');
      });

      $('#btn-sample').on('click', function(){
        window.AppUtil.sampleFoods.forEach(function(s){ addFood(s.name, s.category); });
      });

      $('#btn-generate').on('click', function(){
        state.plan = window.AppUtil.planMonth(state.foods, state.settings);
        saveAll();
        renderPlanner();
      });

      $('#btn-clear-plan').on('click', function(){
        if (confirm('Clear the current plan?')) { state.plan = []; saveAll(); renderPlanner(); }
      });

      $('#repeat-gap').on('input change', function(){
        var val = parseInt($(this).val(), 10);
        if (isNaN(val) || val < 0) val = 0; if (val > 6) val = 6;
        state.settings.repeatGap = val; saveAll();
      });

      $('#toggle-desserts').on('change', function(){
        state.settings.includeDesserts = $(this).is(':checked');
        saveAll();
      });

      // Tabs
      $('#tab-week').on('click', function(){ state.view = 'week'; $('#tab-week').attr('aria-pressed', 'true'); $('#tab-month').attr('aria-pressed', 'false'); renderPlanner(); });
      $('#tab-month').on('click', function(){ state.view = 'month'; $('#tab-week').attr('aria-pressed', 'false'); $('#tab-month').attr('aria-pressed', 'true'); renderPlanner(); });

      // Week navigation
      $('#btn-prev-week').on('click', function(){ state.currentWeek = Math.max(0, state.currentWeek - 1); renderPlanner(); });
      $('#btn-next-week').on('click', function(){ state.currentWeek = Math.min(3, state.currentWeek + 1); renderPlanner(); });

      // Export and print
      $('#btn-print').on('click', function(){ window.print(); });
      $('#btn-export-week').on('click', function(){ ensurePlan(); var csv = window.AppUtil.makeCSVForWeek(state.plan, state.currentWeek); window.AppUtil.downloadFile('platecraft_week'+(state.currentWeek+1)+'.csv', csv, 'text/csv'); });
      $('#btn-export-month').on('click', function(){ ensurePlan(); var csv = window.AppUtil.makeCSV(state.plan); window.AppUtil.downloadFile('platecraft_month.csv', csv, 'text/csv'); });
      $('#btn-export-json').on('click', function(){ ensurePlan(); var json = JSON.stringify(state.plan, null, 2); window.AppUtil.downloadFile('platecraft_month.json', json, 'application/json'); });
      $('#btn-copy').on('click', function(){ ensurePlan(); var text = window.AppUtil.planToText(state.plan); navigator.clipboard.writeText(text).then(function(){ alert('Copied to clipboard.'); }).catch(function(){ alert('Copy failed.'); }); });
    }

    function hydrate(){
      state.foods = window.AppStorage.getFoods();
      state.plan = window.AppStorage.getPlan();
      var s = window.AppStorage.getSettings();
      if (typeof s.repeatGap === 'number') state.settings.repeatGap = s.repeatGap;
      if (typeof s.includeDesserts === 'boolean') state.settings.includeDesserts = s.includeDesserts;
      $('#repeat-gap').val(state.settings.repeatGap);
      $('#toggle-desserts').prop('checked', state.settings.includeDesserts);
    }

    // Public API
    window.App.init = function(){
      hydrate();
      bindEvents();
      renderSuggestions();
      renderFoods();
      if (!state.plan || state.plan.length !== 28) {
        state.plan = window.AppUtil.planMonth(state.foods, state.settings);
        window.AppStorage.savePlan(state.plan);
      }
    };

    window.App.render = function(){
      renderPlanner();
    };

    // Expose some state for debugging
    window.App._state = state;
  })();
})(window, jQuery);
