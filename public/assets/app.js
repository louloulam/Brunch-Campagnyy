(function () {
  'use strict';

  var ICON = function (name, cls, path) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-' + name + ' ' + cls + '" aria-hidden="true">' + path + '</svg>';
  };
  var PHONE_PATH = '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>';
  var ICONS = {
    phone: function (c) { return ICON('phone', c, PHONE_PATH); },
    pin: function (c) { return ICON('map-pin', c, '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle>'); },
    mail: function (c) { return ICON('mail', c, '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect>'); },
    clock: function (c) { return ICON('clock', c, '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path>'); },
    search: function (c) { return ICON('search', c, '<path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle>'); },
    chevron: function (c) { return ICON('chevron-right', c, '<path d="m9 18 6-6-6-6"></path>'); }
  };

  var TAGS = {
    'Best Seller': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Coup de Cœur': 'bg-purple-100 text-purple-800 border-purple-300',
    'Populaire': 'bg-amber-100 text-amber-800 border-amber-300'
  };
  var TAG_DEFAULT = 'bg-stone-100 text-stone-800 border-stone-300';

  var state = { data: null, cat: 'all', q: '' };
  var app = document.getElementById('app');
  var modalRoot = document.getElementById('modal-root');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function imgSrc(v) {
    return /^(\/|https?:|data:)/.test(v) ? v : 'assets/' + v;
  }
  function price(n) {
    return Number(n).toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0') + ' DA';
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function visibleItems() {
    var hidden = state.data.hiddenCats || [];
    return (state.data.items || []).filter(function (i) { return i.available !== false && hidden.indexOf(i.cat) === -1; });
  }

  function load() {
    return fetch('/api/menu', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('api'); return r.json(); })
      .catch(function () {
        return fetch('menu.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
      });
  }

  function cardHTML(it) {
    var img = it.image
      ? '<div class="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-stone-100 relative"><img alt="' + esc(it.name) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="' + esc(imgSrc(it.image)) + '"></div>'
      : '<div class="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-stone-400 font-serif italic text-sm">' + esc((it.name || '?').charAt(0)) + '</div>';
    var tag = it.tag
      ? '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ' + (TAGS[it.tag] || TAG_DEFAULT) + '">' + esc(it.tag) + '</span>'
      : '';
    return '<div class="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:shadow-md transition-all flex gap-4 cursor-pointer group relative overflow-hidden" data-id="' + esc(it.id) + '">' +
      img +
      '<div class="flex-1 flex flex-col justify-between min-w-0"><div>' +
      '<div class="flex items-start justify-between gap-2"><h3 class="text-sm font-bold text-stone-900 group-hover:text-stone-700 transition-colors leading-snug line-clamp-1">' + esc(it.name) + '</h3>' + tag + '</div>' +
      '<p class="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">' + esc(it.desc) + '</p></div>' +
      '<div class="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">' +
      '<span class="text-sm sm:text-base font-extrabold font-mono" style="color: var(--accent, #226677);">' + price(it.price) + '</span>' +
      '<span class="text-xs font-semibold text-stone-500 group-hover:text-stone-900 flex items-center gap-0.5 transition-colors">Détails ' + ICONS.chevron('w-3.5 h-3.5') + '</span>' +
      '</div></div></div>';
  }

  function btnStyle(active) {
    return active
      ? 'background-color: var(--accent, #226677); color: #fff;'
      : 'background-color: rgb(245, 245, 244); color: rgb(87, 83, 78);';
  }

  function applyTheme(t) {
    var hex = /^#[0-9a-f]{6}$/i;
    var bg = t && hex.test(t.bg) ? t.bg : '#226677';
    var accent = t && hex.test(t.accent) ? t.accent : '#226677';
    app.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    document.documentElement.style.setProperty('--accent', accent);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', bg);
  }

  function render() {
    var d = state.data, info = d.info || {};
    applyTheme(d.theme);
    var items = visibleItems();
    var counts = {};
    items.forEach(function (i) { counts[i.cat] = (counts[i.cat] || 0) + 1; });
    var cats = (d.categories || []).filter(function (c) { return counts[c]; });
    if (state.cat !== 'all' && !counts[state.cat]) state.cat = 'all';

    var catBtns = '<button data-cat="all" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all" style="' + btnStyle(state.cat === 'all') + '">Tous (' + items.length + ')</button>' +
      cats.map(function (c) {
        return '<button data-cat="' + esc(c) + '" class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5" style="' + btnStyle(state.cat === c) + '"><span>' + esc(c) + '</span><span class="text-[10px] opacity-75">(' + counts[c] + ')</span></button>';
      }).join('');

    var phone = esc(info.phone || '');
    var header =
      '<div class="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-stone-900">' +
      '<img alt="Brunch &amp; Co" class="w-full h-full object-cover opacity-90" src="assets/Brunch_Co_background_image_1791456131937.jpeg">' +
      '<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>' +
      '<div class="absolute top-4 right-4 flex items-center gap-2"><a href="tel:' + phone + '" class="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-stone-800 hover:bg-white shadow-md transition-transform hover:scale-105" title="Appeler le restaurant">' + ICONS.phone('w-4 h-4') + '</a></div></div>' +
      '<div class="max-w-4xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10"><div class="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 backdrop-blur-md">' +
      '<div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">' +
      '<div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-lg shrink-0 bg-white p-1"><img alt="Brunch &amp; Co" class="w-full h-full object-contain rounded-xl" src="assets/Brunch_Co_logo_1791062845856.jpeg"></div>' +
      '<div class="flex-1 space-y-2"><div class="flex flex-wrap items-center justify-center sm:justify-between gap-2">' +
      '<h1 class="text-2xl sm:text-3xl font-serif font-black tracking-tight text-stone-900">' + esc(info.name || 'Brunch & Co') + '</h1>' +
      '<span class="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Menu Ouvert</span></div>' +
      '<p class="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl" style="white-space:pre-line">' + esc(info.tagline) + '</p>' +
      '<div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-stone-600 font-medium">' +
      '<span class="flex items-center gap-1">' + ICONS.pin('w-3.5 h-3.5 text-stone-400 shrink-0') + '<span>• ' + esc(info.address) + '</span></span>' +
      '<a href="tel:' + phone + '" class="flex items-center gap-1 hover:underline">' + ICONS.phone('w-3.5 h-3.5 text-stone-400 shrink-0') + '<span>' + phone + '</span></a>' +
      '<a href="mailto:' + esc(info.email) + '" class="flex items-center gap-1 hover:underline">' + ICONS.mail('w-3.5 h-3.5 text-stone-400 shrink-0') + '<span>' + esc(info.email) + '</span></a>' +
      '<span class="flex items-center gap-1">' + ICONS.clock('w-3.5 h-3.5 text-stone-400 shrink-0') + '<span>• ' + esc(info.hours) + '</span></span>' +
      (info.instagram ? '<a href="' + esc(info.instagram) + '" target="_blank" rel="noreferrer" class="flex items-center gap-1 hover:underline text-rose-600 font-bold"><span>📸 ' + esc(info.instagram) + '</span></a>' : '') +
      (info.facebook ? '<a href="' + esc(info.facebook) + '" target="_blank" rel="noreferrer" class="flex items-center gap-1 hover:underline text-blue-600 font-bold"><span>👍 Facebook</span></a>' : '') +
      '</div>' +
      (info.note ? '<div class="pt-2 text-xs text-stone-500 italic border-t border-stone-100 mt-2">ℹ️ ' + esc(info.note) + '</div>' : '') +
      '</div></div></div></div>';

    var bar =
      '<div class="max-w-4xl mx-auto px-4 mt-6 sticky top-3 z-30"><div class="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-md border border-stone-200 space-y-3">' +
      '<div class="relative">' + ICONS.search('w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400') +
      '<input id="q" placeholder="Rechercher un plat, pizza, dessert..." class="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-50 rounded-xl border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all" type="text" value="' + esc(state.q) + '"></div>' +
      '<div id="cats" class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">' + catBtns + '</div></div></div>';

    app.innerHTML = header + bar + '<div class="max-w-4xl mx-auto px-4 mt-8"><div id="grid" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div></div>';
    bind();
    renderGrid();
  }

  function filtered() {
    var q = norm(state.q.trim());
    return visibleItems().filter(function (i) {
      if (state.cat !== 'all' && i.cat !== state.cat) return false;
      if (!q) return true;
      return norm(i.name).indexOf(q) > -1 || norm(i.desc).indexOf(q) > -1;
    });
  }

  function renderGrid() {
    var list = filtered();
    document.getElementById('grid').innerHTML = list.length
      ? list.map(cardHTML).join('')
      : '<div class="empty-state">Aucun plat trouvé.</div>';
  }

  function bind() {
    document.getElementById('q').addEventListener('input', function (e) {
      state.q = e.target.value;
      renderGrid();
    });
    document.getElementById('cats').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]');
      if (!b) return;
      state.cat = b.getAttribute('data-cat');
      var all = document.querySelectorAll('#cats button');
      Array.prototype.forEach.call(all, function (x) {
        x.setAttribute('style', btnStyle(x.getAttribute('data-cat') === state.cat));
      });
      renderGrid();
    });
    document.getElementById('grid').addEventListener('click', function (e) {
      var c = e.target.closest('[data-id]');
      if (!c) return;
      openModal(c.getAttribute('data-id'));
    });
  }

  function openModal(id) {
    var it = (state.data.items || []).filter(function (i) { return i.id === id; })[0];
    if (!it) return;
    modalRoot.innerHTML =
      '<div class="bc-modal" id="bc-modal"><div class="bc-sheet">' +
      '<button class="bc-close" aria-label="Fermer">×</button>' +
      (it.image ? '<img alt="' + esc(it.name) + '" src="' + esc(imgSrc(it.image)) + '">' : '<div class="bc-noimg">' + esc((it.name || '?').charAt(0)) + '</div>') +
      '<div class="bc-body"><h2>' + esc(it.name) + '</h2>' +
      (it.tag ? '<div style="margin-top:.5rem"><span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ' + (TAGS[it.tag] || TAG_DEFAULT) + '">' + esc(it.tag) + '</span></div>' : '') +
      (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') +
      '<div class="bc-price">' + price(it.price) + '</div></div></div></div>';
    document.body.style.overflow = 'hidden';
    var m = document.getElementById('bc-modal');
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.closest('.bc-close')) closeModal();
    });
  }
  function closeModal() {
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  // Photo introuvable : on affiche un cadre propre au lieu d'une image cassée
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img.getAttribute('data-failed')) return;
    img.setAttribute('data-failed', '1');
    var letter = esc((img.getAttribute('alt') || '?').charAt(0));
    if (img.closest('.bc-sheet')) {
      var d = document.createElement('div'); d.className = 'bc-noimg'; d.textContent = letter.replace(/&[a-z#0-9]+;/g, '?');
      img.replaceWith(d);
    } else if (img.parentNode && img.parentNode.className.indexOf('w-24') > -1) {
      img.parentNode.className += ' flex items-center justify-center text-stone-400 font-serif italic text-sm';
      img.replaceWith(document.createTextNode((img.getAttribute('alt') || '?').charAt(0)));
    }
  }, true);

  load().then(function (data) {
    state.data = data;
    render();
    // Rafraîchit le menu quand le client revient sur l'onglet (stocks à jour)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      load().then(function (fresh) { state.data = fresh; render(); }).catch(function () {});
    });
  }).catch(function () {
    app.innerHTML = '<p class="loading">Impossible de charger la carte. Réessayez dans un instant.</p>';
  });
})();
