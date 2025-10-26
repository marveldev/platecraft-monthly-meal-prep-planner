(function(window, $){
  'use strict';
  window.App = window.App || {};

  // Namespaced storage helpers
  window.AppStorage = {
    keys: {
      FOODS: 'platecraft_foods_v1',
      PLAN: 'platecraft_plan_v1',
      SETTINGS: 'platecraft_settings_v1'
    },
    getFoods: function(){
      try { return JSON.parse(localStorage.getItem(window.AppStorage.keys.FOODS) || '[]'); } catch(e){ return []; }
    },
    setFoods: function(list){
      try { localStorage.setItem(window.AppStorage.keys.FOODS, JSON.stringify(list || [])); } catch(e){}
    },
    getPlan: function(){
      try { return JSON.parse(localStorage.getItem(window.AppStorage.keys.PLAN) || '[]'); } catch(e){ return []; }
    },
    savePlan: function(plan){
      try { localStorage.setItem(window.AppStorage.keys.PLAN, JSON.stringify(plan || [])); } catch(e){}
    },
    getSettings: function(){
      try { return JSON.parse(localStorage.getItem(window.AppStorage.keys.SETTINGS) || '{}'); } catch(e){ return {}; }
    },
    saveSettings: function(settings){
      try { localStorage.setItem(window.AppStorage.keys.SETTINGS, JSON.stringify(settings || {})); } catch(e){}
    }
  };

  // Utility functions and planning engine
  window.AppUtil = {
    uid: function(){
      return 'id_' + Math.random().toString(36).slice(2, 10);
    },
    cleanName: function(s){
      return String(s || '').replace(/[\n\r\t]+/g, ' ').trim();
    },
    categories: ['breakfast','lunch','dinner','dessert','any'],
    defaultDesserts: [
      'Greek yogurt with honey',
      'Fruit salad',
      'Dark chocolate square',
      'Baked cinnamon apple',
      'Rice pudding',
      'Berry parfait',
      'Banana nice cream'
    ],
    sampleFoods: [
      { name: 'Overnight oats', category: 'breakfast' },
      { name: 'Avocado toast', category: 'breakfast' },
      { name: 'Breakfast tacos', category: 'breakfast' },
      { name: 'Chicken wrap', category: 'lunch' },
      { name: 'Mediterranean bowl', category: 'lunch' },
      { name: 'Tomato soup + grilled cheese', category: 'lunch' },
      { name: 'Stir-fry veggies + tofu', category: 'dinner' },
      { name: 'Pasta with pesto', category: 'dinner' },
      { name: 'Salmon with rice', category: 'dinner' },
      { name: 'Curry with naan', category: 'dinner' },
      { name: 'Taco night', category: 'dinner' },
      { name: 'Quinoa salad', category: 'any' },
      { name: 'Sushi bowl', category: 'any' },
      { name: 'Veggie omelet', category: 'any' }
    ],
    chipSuggestions: [
      { name: 'Yogurt parfait', category: 'breakfast' },
      { name: 'Chia pudding', category: 'breakfast' },
      { name: 'Turkey club', category: 'lunch' },
      { name: 'Burrito bowl', category: 'lunch' },
      { name: 'Sheet-pan chicken', category: 'dinner' },
      { name: 'Roasted veggie pasta', category: 'dinner' },
      { name: 'Mango sticky rice', category: 'dessert' },
      { name: 'Brownie bites', category: 'dessert' },
      { name: 'Fruit and cheese plate', category: 'dessert' },
      { name: 'Any: Buddha bowl', category: 'any' }
    ],

    categorize: function(foods){
      var map = { breakfast: [], lunch: [], dinner: [], dessert: [], any: [] };
      (foods || []).forEach(function(f){
        var cat = (f.category || 'any').toLowerCase();
        if (!map[cat]) map[cat] = [];
        map[cat].push(f);
      });
      return map;
    },

    getDessertPool: function(foods, includeDesserts){
      if (!includeDesserts) return [];
      var desserts = (foods || []).filter(function(f){ return (f.category || '').toLowerCase() === 'dessert'; });
      if (desserts.length > 0) return desserts.slice();
      // map defaults to objects for selection, do not store into foods
      return window.AppUtil.defaultDesserts.map(function(name){ return { id: 'd_'+window.AppUtil.uid(), name: name, category: 'dessert', system: true }; });
    },

    shuffle: function(arr){
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    },

    pickNonRepeating: function(pool, recent, repeatGap){
      if (!pool || pool.length === 0) return null;
      // try to find item not in recent
      for (var i = 0; i < pool.length; i++) {
        if (recent.indexOf(pool[i].name) === -1) return pool[i];
      }
      // fallback to first
      return pool[0];
    },

    planMonth: function(foods, settings){
      settings = settings || {};
      var repeatGap = Math.max(0, parseInt(settings.repeatGap || 2, 10));
      var includeDesserts = settings.includeDesserts !== false; // default true
      var cats = window.AppUtil.categorize(foods || []);

      var breakfastPool = window.AppUtil.shuffle([].concat(cats.breakfast, cats.any));
      var lunchPool = window.AppUtil.shuffle([].concat(cats.lunch, cats.any));
      var dinnerPool = window.AppUtil.shuffle([].concat(cats.dinner, cats.any));
      var dessertPool = window.AppUtil.shuffle(window.AppUtil.getDessertPool(foods, includeDesserts));

      if (breakfastPool.length === 0) breakfastPool = window.AppUtil.shuffle(cats.any);
      if (lunchPool.length === 0) lunchPool = window.AppUtil.shuffle(cats.any);
      if (dinnerPool.length === 0) dinnerPool = window.AppUtil.shuffle(cats.any);

      var recent = { breakfast: [], lunch: [], dinner: [], dessert: [] };
      var indexes = { breakfast: 0, lunch: 0, dinner: 0, dessert: 0 };
      var plan = [];

      function nextFrom(pool, key){
        if (!pool || pool.length === 0) return null;
        // rotate index
        var attempt = 0; var item = null;
        while (attempt < pool.length) {
          var idx = (indexes[key] + attempt) % pool.length;
          var candidate = pool[idx];
          if (recent[key].indexOf(candidate.name) === -1) { item = candidate; indexes[key] = (idx + 1) % pool.length; break; }
          attempt++;
        }
        if (!item) { item = pool[indexes[key]]; indexes[key] = (indexes[key] + 1) % pool.length; }
        // update recent
        recent[key].unshift(item.name);
        if (recent[key].length > repeatGap) recent[key].length = repeatGap;
        return item;
      }

      for (var d = 1; d <= 28; d++) {
        var b = nextFrom(breakfastPool, 'breakfast');
        var l = nextFrom(lunchPool, 'lunch');
        var di = nextFrom(dinnerPool, 'dinner');
        var de = includeDesserts ? nextFrom(dessertPool, 'dessert') : null;
        plan.push({ day: d, meals: {
          breakfast: b ? b.name : '',
          lunch: l ? l.name : '',
          dinner: di ? di.name : '',
          dessert: de ? de.name : ''
        }});
      }
      return plan;
    },

    planToWeeks: function(plan){
      var weeks = [[],[],[],[]];
      (plan || []).forEach(function(p, idx){
        var w = Math.floor(idx / 7); if (!weeks[w]) weeks[w] = []; weeks[w].push(p);
      });
      return weeks;
    },

    makeCSV: function(plan){
      var rows = [['Day','Breakfast','Lunch','Dinner','Dessert']];
      (plan || []).forEach(function(p){
        rows.push([ 'Day '+p.day, p.meals.breakfast, p.meals.lunch, p.meals.dinner, p.meals.dessert ]);
      });
      return window.AppUtil._toCSV(rows);
    },

    makeCSVForWeek: function(plan, weekIndex){
      var start = (weekIndex * 7);
      var slice = (plan || []).slice(start, start + 7);
      return window.AppUtil.makeCSV(slice);
    },

    _toCSV: function(rows){
      function esc(v){
        var s = String(v == null ? '' : v);
        if (s.search(/[",\n]/) >= 0) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }
      return rows.map(function(r){ return r.map(esc).join(','); }).join('\n');
    },

    downloadFile: function(filename, content, type){
      var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 0);
    },

    planToText: function(plan){
      var weeks = window.AppUtil.planToWeeks(plan || []);
      var out = [];
      weeks.forEach(function(week, idx){
        out.push('Week ' + (idx + 1));
        week.forEach(function(p){
          out.push('  Day ' + p.day + ': ' + [p.meals.breakfast, p.meals.lunch, p.meals.dinner, (p.meals.dessert ? ('Dessert: ' + p.meals.dessert) : '')].filter(Boolean).join(' | '));
        });
        out.push('');
      });
      return out.join('\n');
    }
  };
})(window, jQuery);
