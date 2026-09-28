/* =========================================================
   «Шо по стейкам?» — каталог, кошик, оформлення.
   Дані: js/products.js, налаштування: js/config.js
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.CONFIG;
  var PRODUCTS = window.PRODUCTS.filter(function (p) { return !p.hidden; });
  var CATS = window.CATEGORIES;
  var HINTS = window.GRADE_HINTS || {};
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  /* Позиції кошика. Ключ — id товару, а для товару з класами мармуру —
     'id@клас' (напр. 'ribeye@prime'). Клас — це «варіант»: копія товару з ціною
     й фото класу, тож unitPrice / hasPrice / media працюють з ним без змін. */
  function variant(p, g) {
    return {
      id: p.id + '@' + g.id, pid: p.id, gid: g.id, grade: g.label, cat: p.cat,
      name: p.name + ' · ' + g.label, en: p.en, desc: p.desc,
      perKg: g.perKg || 0, weight: p.weight, photo: g.photo || ''
    };
  }
  var byKey = {};
  PRODUCTS.forEach(function (p) {
    if (p.grades && p.grades.length) p.grades.forEach(function (g) { var v = variant(p, g); byKey[v.id] = v; });
    else byKey[p.id] = p;
  });

  var STORE_KEY = 'shopostejkam.cart.v1';
  // grade: обраний у картці клас { ribeye: 'prime' }; за замовчуванням — перший
  var state = { cart: {}, codeword: '', filter: 'all', method: 'pickup', grade: {} };
  // за замовчуванням у картці — Prime (якщо є фото), інакше перший клас із фото
  function defaultGrade(p) {
    var withPhoto = p.grades.filter(function (g) { return g.photo; });
    var prime = withPhoto.filter(function (g) { return g.id === 'prime'; })[0];
    return (prime || withPhoto[0] || p.grades[0]).id;
  }
  function gradeKey(p) { return p.grades && p.grades.length ? p.id + '@' + (state.grade[p.id] || defaultGrade(p)) : p.id; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- утиліти ---------- */
  function money(n) { return Math.round(n).toLocaleString('uk-UA') + ' ₴'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Ціна однієї одиниці: фіксована або порція = ціна/кг × вага, округлено до 5 ₴
  function unitPrice(p) {
    if (p.price) return p.price;
    return Math.round((p.perKg * p.weight / 1000) / 5) * 5;
  }
  function isApprox(p) { return !p.price; }
  // Ціна ще не вказана (perKg/price = 0) — показуємо «Ціну уточнюйте» і не пускаємо в кошик
  function hasPrice(p) { return (p.price || p.perKg) > 0; }
  function weightLabel(g) { return g >= 1000 ? (g / 1000).toLocaleString('uk-UA') + ' кг' : g + ' г'; }
  function metaLabel(p) {
    return p.price ? p.pack : money(p.perKg) + '/кг · ≈ ' + weightLabel(p.weight);
  }
  // Кодове слово: без регістру, пробілів, лапок і розділових знаків.
  // \p{L} ловить кирилицю (на відміну від \w).
  function norm(s) { return String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
  // Контакт заповнений у config.js (не порожній, не '#', не заглушка '[...]')
  function filled(v) { return !!v && v !== '#' && !/^\s*\[/.test(v); }
  function codewordOk() { return state.codeword !== '' && norm(state.codeword) === norm(CFG.codeword); }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      // невідомі ключі й класи без ціни відкидаємо (старий 'ribeye' без класу теж)
      Object.keys(saved.cart || {}).forEach(function (key) {
        if (byKey[key] && hasPrice(byKey[key]) && saved.cart[key] > 0) state.cart[key] = Math.min(99, saved.cart[key] | 0);
      });
      state.codeword = saved.codeword || '';
    } catch (e) { /* приватний режим або заблоковане сховище — працюємо без нього */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ cart: state.cart, codeword: state.codeword })); } catch (e) {}
  }

  /* ---------- підрахунки ---------- */
  function lines() {
    return Object.keys(state.cart).map(function (key) {
      var p = byKey[key];
      return { p: p, qty: state.cart[key], sum: unitPrice(p) * state.cart[key] };
    });
  }
  function totals() {
    var ls = lines();
    var count = ls.reduce(function (a, l) { return a + l.qty; }, 0);
    var subtotal = ls.reduce(function (a, l) { return a + l.sum; }, 0);
    var free = codewordOk();
    // самовивіз безкоштовний завжди; кодове слово обнуляє доставку Новою Поштою
    var delivery = count === 0 || state.method === 'pickup' || free ? 0 : CFG.deliveryFee[state.method];
    return { lines: ls, count: count, subtotal: subtotal, delivery: delivery, free: free, total: subtotal + delivery, left: Math.max(0, CFG.minOrder - subtotal) };
  }

  // key — id товару або 'id@клас'. Без ціни в кошик не пускаємо.
  function setQty(key, qty) {
    var p = byKey[key];
    if (!p) return;
    qty = Math.max(0, Math.min(99, qty));
    if (qty > 0 && !hasPrice(p)) return;
    if (qty === 0) delete state.cart[key]; else state.cart[key] = qty;
    save();
    renderCardAction(p.pid || key);
    renderCart();
  }

  /* ---------- каталог ---------- */
  var gridEl = $('[data-grid]');
  var tabsEl = $('[data-tabs]');

  // Заголовки груп і фон смуги бургерів
  var GROUPS = {
    classic: { title: 'Класичні', lead: 'Перевірені часом відруби' },
    alt: { title: 'Альтернативні', lead: 'Для тих, хто вже скуштував рібай і хоче далі' },
    burger: { title: 'Для гриля й казана', lead: 'Шашлик, люля й котлета — сирі, у вакуумі, одразу на вогонь. Оссобуко — для казана',
      bg: 'images/burgers-bg.webp', bgSmall: 'images/burgers-bg-800.webp' }
  };

  /* Плавна поява секцій при скролі (вимкнена при prefers-reduced-motion) */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = (!reduceMotion && 'IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }) : null;
  if (io) document.documentElement.classList.add('js-reveal');
  function observeReveal(root) {
    $$('[data-reveal]:not(.is-in)', root).forEach(function (el) { io ? io.observe(el) : el.classList.add('is-in'); });
  }

  // Похідні файли фото: images/x.webp → images/x-600.webp і images/thumb/x.webp
  function photoSmall(src) { return src.replace(/\.webp$/, '-600.webp'); }
  function photoThumb(src) { return src.replace(/^(.*\/)?([^\/]+)$/, '$1thumb/$2'); }

  // Фото товару або темна заглушка. kind: 'card' | 'hero' | 'thumb'
  function media(p, kind) {
    if (p.photo && kind === 'thumb') {
      return '<img src="' + esc(photoThumb(p.photo)) + '" alt="" loading="lazy" decoding="async" width="160" height="160">';
    }
    if (p.photo) {
      var sizes = kind === 'hero' ? '(min-width: 1024px) 45vw, 100vw' : '(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw';
      return '<img src="' + esc(p.photo) + '" srcset="' + esc(photoSmall(p.photo)) + ' 600w, ' + esc(p.photo) + ' 1200w" sizes="' + sizes +
        '" alt="' + esc(p.name + ' — ' + p.en) + '" loading="lazy" decoding="async" width="1200" height="896">';
    }
    return '<div class="ph ph--' + kind + '" role="img" aria-label="Фото незабаром: ' + esc(p.name) + '">' +
      (kind === 'thumb' ? '<svg class="ph__glyph" aria-hidden="true"><use href="#i-steak"/></svg>' : '<span class="ph__cap">Фото незабаром</span>') + '</div>';
  }

  function badge(p, cls) {
    if (!p.badge) return '';
    var outline = p.badge.indexOf('Витримка') === 0;
    return '<span class="badge ' + (cls || 'card__badge') + (outline ? ' badge--outline' : '') + '">' + esc(p.badge) + '</span>';
  }

  function priceHTML(p, cls) {
    if (!hasPrice(p)) return '<span class="' + cls + ' price-none">Ціна за запитом</span>';
    return '<span class="' + cls + '">' + (isApprox(p) ? '<small>≈</small>' : '') + money(unitPrice(p)) + '</span>';
  }

  function cardPriceHTML(p) {
    return priceHTML(p, 'card__sum') + '<span class="card__meta">' + (hasPrice(p) ? metaLabel(p) : 'порція ≈ ' + weightLabel(p.weight)) + '</span>';
  }

  // Перемикач класів мармуру (Select / Choice / Prime) — тільки для товарів з grades
  function gradeSwitchHTML(p) {
    var cur = byKey[gradeKey(p)];
    return '<div class="grade" data-grades="' + p.id + '">' +
      '<div class="grade__seg" role="group" aria-label="Клас мармуру: ' + esc(p.name) + '" style="--n:' + p.grades.length + '">' +
      p.grades.map(function (g) {
        return '<button class="grade__btn" type="button" data-grade="' + p.id + '" data-gid="' + g.id + '" aria-pressed="' + (g.id === cur.gid) + '">' + esc(g.label) + '</button>';
      }).join('') + '</div>' +
      '<p class="grade__hint"><span data-grade-hint>' + esc(HINTS[cur.gid] || '') + '</span> <a class="grade__what" href="#grades">Що це?</a></p>' +
    '</div>';
  }

  // Плитка-підказка в кінці класики: що таке класи мармуру (заодно закриває порожню клітинку сітки)
  function gradeNoteHTML() {
    return '<aside class="card card--note">' +
      '<p class="note__title">Select, Choice чи Prime?</p>' +
      '<p class="note__text">Клас — це кількість мармуру в м’ясі. Select — нежирний, Choice — баланс ніжності й ціни, Prime — найсоковитіший.</p>' +
      '<a class="btn btn--outline" href="#grades">Порівняти класи</a>' +
    '</aside>';
  }

  // КЛАСИЧНІ — великі картки, featured — на 2 колонки
  function classicCardHTML(p) {
    var v = byKey[gradeKey(p)];   // товар або обраний клас
    return '<article class="card' + (p.featured ? ' card--hero' : '') + '" data-id="' + p.id + '">' +
      '<div class="card__media" data-media>' + media(v, p.featured ? 'hero' : 'card') + badge(p) + '</div>' +
      '<div class="card__body">' +
        '<h4 class="card__name">' + esc(p.name) + '</h4>' +
        '<p class="card__en">' + esc(p.en) + '</p>' +
        '<p class="card__desc">' + esc(p.desc) + '</p>' +
        (p.featured && p.cook ? '<dl class="card__cook">' + p.cook.map(function (c) {
          return '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>';
        }).join('') + '</dl>' : '') +
        '<div class="card__foot">' +
          (p.grades && p.grades.length ? gradeSwitchHTML(p) : '') +
          '<div class="card__price" data-price>' + cardPriceHTML(v) + '</div>' +
          '<div class="card__action" data-action="' + p.id + '" data-kind="full"></div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // Зміна класу: кнопки, підказка, ціна, фото (плавна зміна) і кнопка кошика — для цього класу
  function setGrade(pid, gid) {
    var p = byId[pid];
    if (!p || !p.grades || gradeKey(p) === pid + '@' + gid) return;
    var prev = byKey[gradeKey(p)];
    state.grade[pid] = gid;
    var v = byKey[gradeKey(p)];
    var card = gridEl.querySelector('.card[data-id="' + pid + '"]');
    if (!card) return;
    $$('[data-grade]', card).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.gid === gid)); });
    $('[data-grade-hint]', card).textContent = HINTS[gid] || '';
    $('[data-price]', card).innerHTML = cardPriceHTML(v);
    renderCardAction(pid);
    if (v.photo !== prev.photo) swapPhoto($('[data-media]', card), v, p.featured ? 'hero' : 'card');
  }

  function swapPhoto(box, v, kind) {
    var all = $$(':scope > img, :scope > .ph', box);
    var old = all[all.length - 1];   // при швидких перемиканнях — останнє, що вже показується
    all.slice(0, -1).forEach(function (el) { el.remove(); });
    var tmp = document.createElement('div');
    tmp.innerHTML = media(v, kind);
    var next = tmp.firstChild;
    if (reduceMotion || !old) { if (old) box.replaceChild(next, old); else box.insertBefore(next, box.firstChild); return; }
    // нове фото лягає поверх старого і проявляється; старе прибираємо після переходу
    next.classList.add('media-next');
    box.insertBefore(next, old.nextSibling);
    var shown = false;
    function show() {
      if (shown) return; shown = true;
      requestAnimationFrame(function () { next.classList.add('is-shown'); });
      setTimeout(function () { old.remove(); next.classList.remove('media-next', 'is-shown'); }, 360);
    }
    if (next.tagName === 'IMG' && !next.complete) { next.addEventListener('load', show); next.addEventListener('error', show); }
    else show();
  }

  // АЛЬТЕРНАТИВНІ — компактне меню
  function altRowHTML(p) {
    return '<li class="mrow" data-id="' + p.id + '">' +
      (p.photo
        ? '<button class="mrow__img" type="button" data-zoom="' + p.id + '" aria-label="Збільшити фото: ' + esc(p.name) + '">' + media(p, 'thumb') +
          '<span class="mrow__zoom" aria-hidden="true"><svg class="i"><use href="#i-zoom"/></svg></span></button>'
        : '<div class="mrow__img">' + media(p, 'thumb') + '</div>') +
      '<div class="mrow__main">' +
        '<h4 class="mrow__name">' + esc(p.name) + badge(p, 'mrow__badge') + '</h4>' +
        '<p class="mrow__en">' + esc(p.en) + '</p>' +
        '<p class="mrow__desc">' + esc(p.desc) + '</p>' +
        (p.like ? '<p class="mrow__like">' + esc(p.like) + '</p>' : '') +
      '</div>' +
      '<div class="mrow__side">' + priceHTML(p, 'mrow__sum') +
        '<span class="mrow__meta">' + (hasPrice(p) ? money(p.perKg || p.price) + (p.perKg ? '/кг' : '') : 'ціна скоро') + '</span>' +
        '<div class="mrow__action" data-action="' + p.id + '" data-kind="compact"></div>' +
      '</div>' +
    '</li>';
  }

  // БУРГЕРИ — картки на фото-смузі
  function burgerCardHTML(p) {
    return '<article class="bcard" data-id="' + p.id + '">' +
      // мініатюра відкривається на весь екран, як у альтернативних
      (p.photo ? '<button class="bcard__thumb" type="button" data-zoom="' + p.id + '" aria-label="Збільшити фото: ' + esc(p.name) + '">' + media(p, 'thumb') + '</button>' : '') +
      '<div class="bcard__main">' +
      '<div class="bcard__top"><p class="bcard__pack">' + esc(p.pack || (hasPrice(p) ? money(p.perKg) + '/кг · ' : '') + 'порція ≈ ' + weightLabel(p.weight)) + '</p>' + badge(p, 'bcard__badge') + '</div>' +
      '<h4 class="bcard__name">' + esc(p.name) + '</h4>' +
      '<p class="bcard__en">' + esc(p.en) + '</p>' +
      '<p class="bcard__desc">' + esc(p.desc) + '</p>' +
      '<div class="bcard__foot">' + priceHTML(p, 'bcard__sum') +
        '<div class="card__action" data-action="' + p.id + '" data-kind="full"></div>' +
      '</div>' +
      '</div>' +
    '</article>';
  }

  function groupHead(cat) {
    var g = GROUPS[cat];
    return '<div class="cgroup__head" data-reveal><h3 class="cgroup__title">' + esc(g.title) + '</h3>' +
      '<p class="cgroup__lead">' + esc(g.lead) + '</p></div>';
  }

  function groupHTML(cat) {
    var list = PRODUCTS.filter(function (p) { return p.cat === cat; });
    if (!list.length) return '';
    if (cat === 'classic') {
      return '<div class="cgroup cgroup--classic" id="group-classic"><div class="container">' + groupHead(cat) +
        '<div class="cgrid" data-reveal>' + list.map(classicCardHTML).join('') + gradeNoteHTML() + '</div></div></div>';
    }
    if (cat === 'alt') {
      return '<div class="cgroup cgroup--alt" id="group-alt"><div class="container">' + groupHead(cat) +
        '<ul class="mlist" data-reveal>' + list.map(altRowHTML).join('') + '</ul>' +
        (filled(CFG.telegram) ? '<div class="helpbar" data-reveal><p><strong>Не знаєш, що обрати?</strong> Напиши, під що готуєш — гриль, пательня чи духовка, — і на скільки людей. Підкажемо відруб і вагу.</p>' +
        '<a class="btn btn--outline" href="' + esc(CFG.telegram) + '" target="_blank" rel="noopener">Написати в Telegram</a></div>' : '') +
      '</div></div>';
    }
    var g = GROUPS.burger;
    return '<div class="cgroup cgroup--burger" id="group-burger">' +
      '<img class="cgroup__bg" src="' + g.bg + '" srcset="' + g.bgSmall + ' 800w, ' + g.bg + ' 1200w" sizes="100vw" alt="" loading="lazy" decoding="async">' +
      '<div class="container">' + groupHead(cat) + '<div class="bgrid" data-reveal>' + list.map(burgerCardHTML).join('') + '</div></div>' +
    '</div>';
  }

  function stepperHTML(id, qty, name) {
    return '<div class="stepper" role="group" aria-label="Кількість: ' + esc(name) + '">' +
      '<button type="button" data-dec="' + id + '" aria-label="Менше"><svg class="i" aria-hidden="true"><use href="#i-minus"/></svg></button>' +
      '<span class="stepper__qty" aria-live="polite">' + qty + '</span>' +
      '<button type="button" data-inc="' + id + '" aria-label="Більше"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></button>' +
    '</div>';
  }

  // id — id товару; для товару з класами малюємо кнопку саме обраного класу
  function renderCardAction(pid) {
    var slot = gridEl.querySelector('[data-action="' + pid + '"]');
    if (!slot) return;
    var id = gradeKey(byId[pid]);
    var qty = state.cart[id] || 0;
    var p = byKey[id];
    var hadFocus = slot.contains(document.activeElement) ? document.activeElement : null;
    var focusKind = hadFocus && (hadFocus.hasAttribute('data-dec') ? 'dec' : hadFocus.hasAttribute('data-inc') ? 'inc' : 'add');
    var addBtn = slot.dataset.kind === 'compact'
      ? '<button class="btn-plus" type="button" data-add="' + id + '" aria-label="Додати в кошик: ' + esc(p.name) + '"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></button>'
      : '<button class="btn btn--outline" type="button" data-add="' + id + '">В кошик</button>';
    if (!hasPrice(p)) {
      var tel = CFG.phoneHref ? 'tel:' + CFG.phoneHref : '#contacts';
      addBtn = slot.dataset.kind === 'compact'
        ? '<a class="btn-plus" href="' + tel + '" aria-label="Дізнатись ціну: ' + esc(p.name) + '"><svg class="i" aria-hidden="true"><use href="#i-phone"/></svg></a>'
        : '<a class="btn btn--outline" href="' + tel + '" data-askprice>Дізнатись ціну</a>';
      qty = 0;
    }
    slot.innerHTML = qty ? stepperHTML(id, qty, p.name) : addBtn;
    // тримаємо фокус клавіатури на місці після перемальовки
    if (hadFocus) {
      var next = qty ? slot.querySelector(focusKind === 'dec' ? '[data-dec]' : '[data-inc]') : slot.querySelector('[data-add]');
      if (next) next.focus();
    }
  }

  function renderTabs() {
    tabsEl.innerHTML = CATS.map(function (c) {
      var n = c.id === 'all' ? PRODUCTS.length : PRODUCTS.filter(function (p) { return p.cat === c.id; }).length;
      return '<button class="tab" type="button" data-filter="' + c.id + '" aria-pressed="' + (state.filter === c.id) + '">' +
        esc(c.label) + '<span class="tab__n">' + n + '</span></button>';
    }).join('');
  }

  function renderGrid() {
    var cats = state.filter === 'all' ? ['classic', 'alt', 'burger'] : [state.filter];
    gridEl.innerHTML = cats.map(groupHTML).join('');
    PRODUCTS.forEach(function (p) { renderCardAction(p.id); });
    observeReveal(gridEl);
  }

  function setFilter(f) {
    state.filter = f;
    $$('.tab', tabsEl).forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.filter === f)); });
    renderGrid();
  }

  tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-filter]');
    if (t) setFilter(t.dataset.filter);
  });

  gridEl.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.zoom) { openZoom(b.dataset.zoom, b); return; }
    if (b.dataset.grade) { setGrade(b.dataset.grade, b.dataset.gid); return; }
    if (b.dataset.add) { setQty(b.dataset.add, 1); bump(); }
    else if (b.dataset.inc) { setQty(b.dataset.inc, (state.cart[b.dataset.inc] || 0) + 1); bump(); }
    else if (b.dataset.dec) setQty(b.dataset.dec, (state.cart[b.dataset.dec] || 0) - 1);
  });

  /* ---------- фото на весь екран (альтернативні) ---------- */
  var zoomDlg = $('[data-zoom-dialog]');
  var zoomFrom = null;
  function openZoom(id, from) {
    var p = byId[id];
    if (!p || !p.photo || !zoomDlg.showModal) return;
    zoomFrom = from;
    var img = $('[data-zoom-img]', zoomDlg);
    img.src = p.photo; img.alt = p.name + ' — ' + p.en;
    $('[data-zoom-name]', zoomDlg).textContent = p.name;
    $('[data-zoom-en]', zoomDlg).textContent = p.en;
    $('[data-zoom-desc]', zoomDlg).textContent = p.like || p.desc;
    $('[data-zoom-price]', zoomDlg).innerHTML = hasPrice(p)
      ? (isApprox(p) ? '<small>≈</small>' : '') + money(unitPrice(p)) + '<span>' + metaLabel(p) + '</span>'
      : 'Ціна за запитом<span>порція ≈ ' + weightLabel(p.weight) + '</span>';
    $('[data-zoom-add]', zoomDlg).dataset.zoomAdd = id;
    $('[data-zoom-add]', zoomDlg).hidden = !hasPrice(p);
    zoomDlg.showModal();
  }
  if (zoomDlg) {
    zoomDlg.addEventListener('click', function (e) {
      if (e.target === zoomDlg || e.target.closest('[data-zoom-close]')) zoomDlg.close();
      var add = e.target.closest('[data-zoom-add]');
      if (add) { setQty(add.dataset.zoomAdd, (state.cart[add.dataset.zoomAdd] || 0) + 1); bump(); zoomDlg.close(); }
    });
    zoomDlg.addEventListener('close', function () { if (zoomFrom && document.contains(zoomFrom)) zoomFrom.focus(); });
  }

  // На комп’ютері tel: нікуди не веде — показуємо номер прямо в кнопці (наступне натискання вже дзвонить)
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-askprice]');
    if (!a || !canHover.matches || a.classList.contains('is-revealed') || !filled(CFG.phone)) return;
    e.preventDefault();
    a.textContent = CFG.phone;
    a.classList.add('is-revealed');
  });

  /* ---------- шапка / меню ---------- */
  var navEl = $('#nav');
  var navToggle = $('.nav-toggle');
  function closeNav() {
    navEl.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Відкрити меню');
    navToggle.querySelector('use').setAttribute('href', '#i-menu');
  }
  navToggle.addEventListener('click', function () {
    var open = !navEl.classList.contains('is-open');
    navEl.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    navToggle.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  });
  navEl.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.dataset.filter) setFilter(a.dataset.filter);
    closeNav();
  });
  document.addEventListener('click', function (e) {
    if (navEl.classList.contains('is-open') && !e.target.closest('.header')) closeNav();
  });

  /* ---------- кошик ---------- */
  var drawer = $('#drawer');
  var overlay = $('[data-overlay]');
  var page = $('#page');
  var cartbar = $('.cartbar');
  var lastFocus = null;
  var view = 'cart';

  function bump() {
    var c = $('[data-cart-count]');
    c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump');
  }

  function setView(v) {
    view = v;
    $$('[data-view]', drawer).forEach(function (el) { el.hidden = el.dataset.view !== v; });
    $('[data-back]', drawer).hidden = v !== 'checkout';
    $('#drawer-title').textContent = v === 'checkout' ? 'Оформлення' : v === 'thanks' ? 'Замовлення' : 'Кошик';
  }

  function openCart() {
    lastFocus = document.activeElement;
    closeNav();
    if (pendingOrder && !Object.keys(state.cart).length) { showThanks(pendingOrder, false); setView('thanks'); }
    else if (view === 'thanks') setView('cart');
    renderCart();
    overlay.hidden = false; drawer.hidden = false;
    page.inert = true; cartbar.inert = true;
    document.documentElement.classList.add('is-locked');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('is-open'); drawer.classList.add('is-open'); });
    });
    $('#drawer-title').focus({ preventScroll: true });
  }

  function closeCart() {
    overlay.classList.remove('is-open'); drawer.classList.remove('is-open');
    page.inert = false; cartbar.inert = false;
    document.documentElement.classList.remove('is-locked');
    var done = function () { if (!drawer.classList.contains('is-open')) { drawer.hidden = true; overlay.hidden = true; } };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reduce ? done() : setTimeout(done, 400);
    if (view === 'thanks' && !pendingOrder) setView('cart');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-cart]')) openCart();
    else if (e.target.closest('[data-close-cart]')) {
      var toCatalog = e.target.closest('[data-goto-catalog]');
      closeCart();
      if (toCatalog) $('#catalog').scrollIntoView();
    }
  });
  overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!drawer.hidden) closeCart();
      else if (navEl.classList.contains('is-open')) { closeNav(); navToggle.focus(); }
    }
  });

  $('[data-lines]').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var id = b.dataset.inc || b.dataset.dec;
    if (!id) return;
    var next = (state.cart[id] || 0) + (b.dataset.inc ? 1 : -1);
    setQty(id, next);
    // якщо рядок зник — фокус на заголовок кошика, щоб не загубився
    if (next <= 0) $('#drawer-title').focus({ preventScroll: true });
    else { var again = $('[data-lines] [data-' + (b.dataset.inc ? 'inc' : 'dec') + '="' + id + '"]'); if (again) again.focus(); }
  });

  var codewordInput = $('#codeword');
  codewordInput.addEventListener('input', function () {
    state.codeword = codewordInput.value;
    save();
    renderCart();
  });

  function renderCart() {
    var t = totals();

    // лічильник у шапці + мобільна панель
    var countEl = $('[data-cart-count]');
    countEl.textContent = t.count;
    countEl.hidden = t.count === 0;
    $('.cart-btn').setAttribute('aria-label', 'Кошик, товарів: ' + t.count);
    cartbar.hidden = t.count === 0;
    document.body.classList.toggle('has-cartbar', t.count > 0);
    $('[data-cartbar-count]').textContent = t.count;
    $('[data-cartbar-sum]').textContent = money(t.subtotal);

    // рядки
    var linesEl = $('[data-lines]');
    linesEl.innerHTML = t.lines.map(function (l) {
      return '<li class="line">' +
        '<div class="line__img">' + media(l.p, 'thumb') + '</div>' +
        '<div><p class="line__name">' + esc(l.p.name) + (l.p.pack ? ' ' + esc(l.p.pack) : '') + '</p>' +
        '<p class="line__meta">' + (l.p.price ? money(l.p.price) + ' / уп.' : '≈ ' + weightLabel(l.p.weight) + ' · ' + money(l.p.perKg) + '/кг') + '</p></div>' +
        '<div class="line__right"><span class="line__sum">' + (isApprox(l.p) ? '≈ ' : '') + money(l.sum) + '</span>' +
        stepperHTML(l.p.id, l.qty, l.p.name) + '</div>' +
      '</li>';
    }).join('');
    $('[data-empty]').hidden = t.count > 0;
    $('[data-foot]').hidden = t.count === 0;
    $('[data-codeword-wrap]').hidden = t.count === 0;
    $('[data-progress]').hidden = t.count === 0;

    // прогрес до мінімуму
    var pct = Math.min(100, Math.round(t.subtotal / CFG.minOrder * 100));
    $('[data-progress-text]').innerHTML = t.left > 0
      ? 'До мінімального замовлення залишилось <strong>' + money(t.left) + '</strong>'
      : 'Мінімальне замовлення зібрано — можна оформлювати';
    $('[data-progress-fill]').style.transform = 'scaleX(' + pct / 100 + ')';
    $('.progress__bar').setAttribute('aria-valuenow', pct);

    // кодове слово
    var hint = $('[data-codeword-hint]');
    // «не підходить» — тільки коли введено слово повної довжини, а не з першої літери
    var typed = norm(state.codeword).length >= norm(CFG.codeword).length;
    hint.textContent = t.free ? 'Кодове слово прийнято — доставка Новою Поштою безкоштовна' : typed ? 'Слово не підходить. Перевір написання' : 'Слово «Шо по стейкам?» — перша доставка Новою Поштою безкоштовно';
    hint.classList.toggle('is-ok', t.free);

    // підсумки (у кошику й у формі)
    $$('[data-subtotal]').forEach(function (el) { el.textContent = money(t.subtotal); });
    $$('[data-delivery]').forEach(function (el) {
      var pickup = state.method === 'pickup';
      el.textContent = pickup ? 'самовивіз, 0 ₴' : t.free ? '0 ₴ — кодове слово' : money(CFG.deliveryFee.np);
      el.classList.toggle('is-free', pickup || t.free);
    });
    $$('[data-total]').forEach(function (el) { el.textContent = money(t.total); });

    $('[data-checkout]').disabled = t.count === 0 || t.left > 0;

    // якщо в оформленні прибрали товари нижче мінімуму — назад у кошик
    if (view === 'checkout' && (t.count === 0 || t.left > 0)) setView('cart');
  }

  $('[data-checkout]').addEventListener('click', function () {
    setView('checkout');
    $('#f-name').focus();
  });
  $('[data-back]').addEventListener('click', function () {
    setView('cart');
    $('#drawer-title').focus();
  });

  /* ---------- форма ---------- */
  var form = $('[data-view="checkout"]');
  var addrLabel = $('[data-address-label]');
  var addrInput = $('#f-address');

  // Самовивіз — показуємо адресу цеху; Нова Пошта — поле «місто і відділення»
  function updateMethodUI() {
    var np = state.method === 'np';
    $('[data-address-field]').hidden = !np;
    $('[data-pickup-info]').hidden = np;
    if (!np) setError('address', '');
    addrLabel.textContent = 'Місто і відділення Нової Пошти';
    addrInput.placeholder = 'Напр.: Львів, відділення № 12';
    renderCart();
  }
  form.addEventListener('change', function (e) {
    if (e.target.name !== 'method') return;
    state.method = e.target.value;
    updateMethodUI();
  });

  function setError(name, msg) {
    var input = form.elements[name];
    var out = form.querySelector('[data-error-for="' + name + '"]');
    out.textContent = msg || '';
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', out.id || (out.id = 'err-' + name)); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
  }

  function validate() {
    var f = form.elements;
    var errs = {};
    if (f.name.value.trim().length < 2) errs.name = 'Вкажи, як до тебе звертатися';
    var digits = f.phone.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) errs.phone = 'Перевір номер, напр. 067 123 45 67';
    if (state.method === 'np' && f.address.value.trim().length < 3) errs.address = 'Вкажи місто і номер відділення';
    ['name', 'phone', 'address'].forEach(function (k) { setError(k, errs[k]); });
    var first = ['name', 'phone', 'address'].filter(function (k) { return errs[k]; })[0];
    if (first) f[first].focus();
    return !first;
  }

  // Знімаємо помилку, щойно поле виправили
  ['name', 'phone', 'address'].forEach(function (k) {
    form.elements[k].addEventListener('input', function () {
      if (form.elements[k].getAttribute('aria-invalid')) setError(k, '');
    });
  });

  function buildOrder() {
    var t = totals();
    var f = form.elements;
    return {
      number: 'SP-' + Date.now().toString(36).slice(-6).toUpperCase(),
      createdAt: new Date().toISOString(),
      customer: {
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        method: state.method === 'np' ? 'Нова Пошта' : 'Самовивіз з цеху',
        address: state.method === 'np' ? f.address.value.trim() : CFG.pickupAddress,
        comment: f.comment.value.trim()
      },
      items: t.lines.map(function (l) {
        // id — ключ кошика ('ribeye@prime'), name уже з класом: «Рібай · Prime»
        return {
          id: l.p.id, product: l.p.pid || l.p.id, grade: l.p.grade || null,
          name: l.p.name + (l.p.pack ? ' ' + l.p.pack : ''), qty: l.qty,
          unitPrice: unitPrice(l.p), perKg: l.p.perKg || null, portionGrams: l.p.weight || null, sum: l.sum
        };
      }),
      subtotal: t.subtotal,
      delivery: t.delivery,
      codeword: t.free,
      total: t.total
    };
  }

  // Текст замовлення для Telegram (стане в пригоді на боці бота/воркера)
  function orderText(o) {
    var head = [
      'Нове замовлення ' + o.number,
      o.customer.name + ', ' + o.customer.phone,
      o.customer.method + ': ' + o.customer.address
    ];
    if (o.customer.comment) head.push('Коментар: ' + o.customer.comment);
    return head.concat([
      '',
      o.items.map(function (i) { return '• ' + i.name + ' × ' + i.qty + ' = ' + i.sum + ' ₴'; }).join('\n'),
      '',
      'Товари: ' + o.subtotal + ' ₴, доставка: ' + o.delivery + ' ₴' + (o.codeword ? ' (кодове слово)' : ''),
      'Разом ≈ ' + o.total + ' ₴'
    ]).join('\n');
  }

  /* МІСЦЕ ДЛЯ ВІДПРАВКИ В TELEGRAM-БОТ.
     Якщо в config.js заданий orderEndpoint — шлемо туди JSON { order, text }.
     Endpoint (напр. Cloudflare Worker) сам пересилає text у бот через Bot API,
     щоб токен бота не лежав у коді сайту. */
  function sendOrder(order) {
    // Без endpoint замовлення нікуди не йде — тоді клієнт надсилає текст сам (крок «Залишився один крок»)
    if (!CFG.orderEndpoint) return Promise.resolve({ sent: false });
    return fetch(CFG.orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: order, text: orderText(order), website: form.elements.website.value })
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return { sent: true }; });
  }

  // Екран після оформлення: «прийняли» (надіслано) або «надішліть нам» (endpoint ще не підключений)
  /* Замовлення без сервера зберігаємо, доки покупець сам не закриє («Готово, я подзвонив»):
     × чи клік повз кошик не губить текст, а іконка кошика повертає на цей екран. */
  var ORDER_KEY = 'shopostejkam.lastorder.v1';
  var pendingOrder = null;
  try { pendingOrder = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'); } catch (e) {}
  function keepOrder(o) {
    pendingOrder = o;
    try { o ? localStorage.setItem(ORDER_KEY, JSON.stringify(o)) : localStorage.removeItem(ORDER_KEY); } catch (e) {}
  }

  function showThanks(order, sent) {
    $$('[data-order-no]').forEach(function (el) { el.textContent = order.number; });
    $('[data-thanks-sent]').hidden = !sent;
    $('[data-thanks-manual]').hidden = sent;
    if (sent) { keepOrder(null); return; }
    var text = order.text || orderText(order);
    keepOrder({ number: order.number, text: text });
    $('[data-order-text]').value = text;
    var tg = $('[data-order-tg]');
    var user = filled(CFG.telegram) ? CFG.telegram.replace(/^https?:\/\/t\.me\//, '').replace(/[\/?].*$/, '') : '';
    tg.hidden = !user;
    if (user) tg.href = 'https://t.me/' + user + '?text=' + encodeURIComponent(text);
    var hasPhone = filled(CFG.phone) && CFG.phoneHref;
    var callBtn = $('[data-order-callbtn]');
    callBtn.hidden = !hasPhone;
    if (hasPhone) callBtn.href = 'tel:' + CFG.phoneHref;
    var call = $('[data-order-call]');
    call.hidden = !hasPhone;
    call.innerHTML = hasPhone ? 'Номер: <a href="tel:' + esc(CFG.phoneHref) + '">' + esc(CFG.phone) + '</a> · назви номер замовлення <strong>' + esc(order.number) + '</strong>' : '';
    $('[data-order-lead]').textContent = hasPhone
      ? 'Подзвони нам, щоб підтвердити: менеджер звірить вагу, час і оплату. Замовлення збережеться тут, доки ти його не закриєш.'
      : 'Скопіюй текст замовлення і надішли нам — менеджер звірить вагу, час і оплату.';
  }
  $('[data-order-done]').addEventListener('click', function () {
    keepOrder(null);
    setView('cart');
    closeCart();
  });
  $('[data-order-copy]').addEventListener('click', function () {
    var ta = $('[data-order-text]'), b = this;
    var done = function () { b.textContent = 'Скопійовано'; setTimeout(function () { b.textContent = 'Скопіювати текст'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); });
    else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errBox = $('[data-form-error]');
    errBox.hidden = true;
    if (!validate()) return;
    var btn = $('[data-submit]');
    btn.disabled = true; btn.textContent = 'Надсилаємо…';
    var order = buildOrder();
    sendOrder(order).then(function (res) {
      showThanks(order, res.sent);
      state.cart = {}; state.codeword = ''; codewordInput.value = '';
      save();
      form.reset(); state.method = 'pickup';
      updateMethodUI();
      renderCart();
      PRODUCTS.forEach(function (p) { renderCardAction(p.id); });
      setView('thanks');
      $('#drawer-title').focus();
    }).catch(function () {
      errBox.textContent = 'Не вдалося надіслати замовлення. Спробуй ще раз' + (filled(CFG.phone) ? ' або зателефонуй: ' + CFG.phone : '') + '.';
      errBox.hidden = false;
    }).then(function () {
      btn.disabled = false; btn.textContent = 'Підтвердити замовлення';
    });
  });

  /* ---------- контакти з config.js ---------- */
  function applyConfig() {
    $$('[data-cfg="phone"]').forEach(function (el) { el.textContent = CFG.phone; });
    $$('[data-cfg="minOrder"]').forEach(function (el) { el.textContent = money(CFG.minOrder); });
    $$('[data-cfg="deliveryFee"]').forEach(function (el) { el.textContent = money(CFG.deliveryFee.np); });
    $$('[data-cfg="pickupAddress"]').forEach(function (el) { el.textContent = CFG.pickupAddress; });
    $$('[data-link="map"]').forEach(function (a) { a.href = CFG.mapUrl; a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-link="tel"]').forEach(function (a) { a.href = 'tel:' + CFG.phoneHref; a.hidden = !CFG.phoneHref; });
    // Незаповнені контакти не показуємо зовсім — жодних «[ТЕЛЕФОН]» і мертвих посилань
    var phoneLink = $('[data-link="phone"]');
    phoneLink.hidden = !filled(CFG.phone);
    if (CFG.phoneHref) phoneLink.href = 'tel:' + CFG.phoneHref;
    else phoneLink.removeAttribute('href');
    [['instagram', CFG.instagram], ['telegram', CFG.telegram]].forEach(function (x) {
      var a = $('[data-link="' + x[0] + '"]');
      a.hidden = !filled(x[1]);
      if (filled(x[1])) { a.href = x[1]; a.target = '_blank'; a.rel = 'noopener'; }
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }


  /* ---------- «Як ми витримуємо»: повзунок 0 → 21 день ---------- */
  function initAger() {
    var root = $('[data-ager]');
    if (!root) return;
    var range = $('[data-ager-range]', root);
    var STEPS = [
      { to: 0,  stage: 'Відбір', text: 'Беремо охолоджені відруби з добрим мармуром і рівним жировим покривом, пакуємо у вакуум.' },
      { to: 3,  stage: 'Ферменти прокидаються', text: 'Власні ферменти м’яса починають потроху розм’якшувати волокна. Жодних добавок — тільки холод і час.' },
      { to: 9,  stage: 'Стає ніжнішим', text: 'Волокна розслабляються. Такий стейк уже м’якший за магазинний, а сік тримається всередині.' },
      { to: 15, stage: 'Смак набирає глибину', text: 'Смак стає повнішим і більш «м’ясним», текстура — рівною від краю до центру.' },
      { to: 20, stage: 'Майже готово', text: 'Ще кілька днів у вакуумі при 0…+2 °C — і стейк на піку.' },
      { to: 21, stage: 'Готово — ріжемо', text: 'Порціонуємо під замовлення: самовивіз з цеху на Данченка або Нова Пошта в термобоксі з льодом.' }
    ];
    var num = $('[data-ager-num]', root), unit = $('[data-ager-unit]', root);
    var stageEl = $('[data-ager-stage]', root), textEl = $('[data-ager-text]', root);
    var tender = $('[data-ager-tender]', root), flavor = $('[data-ager-flavor]', root);
    var steps = $$('[data-ager-step]', root), ticks = $$('[data-ager-go]', root);
    var lastStage = '';

    function dayWord(d) { var m10 = d % 10, m100 = d % 100; return m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дні' : 'днів'; }
    function render(d) {
      d = Math.round(d);
      root.style.setProperty('--p', d / 21);
      range.value = d;
      range.setAttribute('aria-valuetext', d + ' ' + dayWord(d) + ' витримки');
      num.textContent = d; unit.textContent = dayWord(d);
      var st = STEPS.filter(function (s) { return d <= s.to; })[0];
      if (st.stage !== lastStage) { stageEl.textContent = st.stage; textEl.textContent = st.text; lastStage = st.stage; }
      // ілюстративні криві: ніжність росте швидко на початку, смак — рівномірно
      tender.style.transform = 'scaleX(' + (0.12 + 0.88 * (1 - Math.exp(-d / 6.5)) / (1 - Math.exp(-21 / 6.5))) + ')';
      flavor.style.transform = 'scaleX(' + (0.12 + 0.88 * d / 21) + ')';
      var active = d === 0 ? 0 : d === 21 ? 2 : 1;
      steps.forEach(function (el, i) { el.classList.toggle('is-active', i === active); el.classList.toggle('is-done', i < active); });
      ticks.forEach(function (b) { b.classList.toggle('is-on', +b.dataset.agerGo <= d); });
    }

    var raf = 0;
    function animateTo(target, ms) {
      cancelAnimationFrame(raf);
      var from = +range.value, t0 = performance.now();
      if (reduceMotion || from === target) { render(target); return; }
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms);
        var e = 1 - Math.pow(1 - k, 3);
        render(from + (target - from) * e);
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }

    range.addEventListener('input', function () { cancelAnimationFrame(raf); played = true; render(+range.value); });
    ticks.forEach(function (b) { b.addEventListener('click', function () { played = true; animateTo(+b.dataset.agerGo, 600); }); });
    render(0);

    // один раз «програємо» 21 день, коли блок з’являється на екрані
    var played = false;
    if ('IntersectionObserver' in window && !reduceMotion) {
      var obs = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !played) { played = true; obs.disconnect(); setTimeout(function () { animateTo(21, 3200); }, 350); }
      }, { threshold: 0.45 });
      obs.observe(root);
    } else { render(21); }
  }

  /* ---------- «Ступені прожарювання» ---------- */
  function initRoast() {
    var root = $('[data-roast]');
    if (!root) return;
    // t — у центрі після відпочинку, off — коли знімати з вогню (на 2–3 °C раніше), °C
    // core — колір центру на розрізі, k — яку частку зрізу займає центр (решта — сіра смуга)
    var LEVELS = {
      'blue': { name: 'Blue', uk: 'майже сирий', t: [46, 49], off: '44–46', core: '#6d1521', k: .94,
        look: 'Темно-червоний, майже сирий центр — прогріта лише скоринка.',
        feel: 'Дуже м’який, волокна ще не стиснулись. Жир усередині не встигає розтанути.',
        fits: 'Міньйон. Мармуровим відрубам зарано — жир не розкриється.',
        tip: 'Дістань стейк з холодильника за 30–40 хв, інакше центр лишиться холодним.' },
      'rare': { name: 'Rare', uk: 'з кров’ю', t: [50, 52], off: '47–49', core: '#9f1f2e', k: .87,
        look: 'Яскраво-червоний центр, тонка сіра смужка під скоринкою.',
        feel: 'Ніжний і дуже соковитий, трохи «желейний» у центрі.',
        fits: 'Міньйон, фланк, топ сайд, ай раунд — нежирним відрубам низька температура на користь.',
        tip: 'Термометр вводь збоку в найтовщу частину, не торкаючись кістки.' },
      'medium-rare': { name: 'Medium rare', uk: 'рожевий і соковитий', t: [54, 57], off: '52–54', core: '#c03c4b', k: .79, rec: true,
        look: 'Рожево-червоний центр, теплий по всьому зрізу.',
        feel: 'Найбільше соку, мармур уже тане: стейк ніжний, але тримає форму.',
        fits: 'Рібай, нью-йорк, ковбой, томагавк, ті-бон, піканья — наш вибір за замовчуванням для мармурових стейків.',
        tip: 'Дай стейку відпочити 5 хв (томагавку — 10): сік розійдеться, а температура додасть ще 2–3 °C.' },
      'medium': { name: 'Medium', uk: 'рожевий центр', t: [60, 63], off: '57–60', core: '#cc7070', k: .63,
        look: 'Рожевий центр, широка сіра смуга по краю.',
        feel: 'Щільніший, соку менше, жир розтанув повністю.',
        fits: 'Жирні відруби: рібай, ковбой, піканья, спайдер. Для фланку, топ сайду й ай раунду це межа — далі стануть жорсткими.',
        tip: 'Жирну шапку піканьї чи край рібаю спершу витопи на пательні ребром, 2–3 хв.' },
      'medium-well': { name: 'Medium well', uk: 'майже просмажений', t: [65, 68], off: '62–65', core: '#ad8674', k: .42,
        look: 'Ледь рожевий відтінок лише в самому центрі.',
        feel: 'Щільний і помітно сухіший. Нежирні відруби вже жорсткі.',
        fits: 'Лише мармурові відруби — рібай, ковбой, томагавк. Фланк, топ сайд і міньйон так не радимо.',
        tip: 'Після скоринки доводь у духовці при 120–150 °C — край пересохне менше.' },
      'well-done': { name: 'Well done', uk: 'повністю просмажений', t: [70, 0], off: '67–68', core: '#7c5c4a', k: .2,
        look: 'Сіро-коричневий по всьому зрізу, без рожевого.',
        feel: 'Щільний і сухий, соку мало. Витримка тут майже не відчувається.',
        fits: 'Якщо любиш саме так — бери найжирніший рібай чи ковбой, або бургерну котлету.',
        tip: 'Не тисни стейк лопаткою під час смаження — так витискаєш останній сік.' }
    };
    var MIN = 40, MAX = 75;   // шкала термометра, °C
    var btns = $$('[data-roast-go]', root);
    var el = {};
    ['name', 'uk', 'rec', 'temp', 'off', 'look', 'feel', 'fits', 'tip'].forEach(function (k) { el[k] = $('[data-roast-' + k + ']', root); });
    var pos = function (c) { return Math.max(0, Math.min(1, (c - MIN) / (MAX - MIN))); };

    function render(id) {
      var L = LEVELS[id];
      if (!L) return;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.roastGo === id)); });
      root.style.setProperty('--core', L.core);
      // центр зрізу на фото doneness.webp (px із 1336) — для збільшеного кадру
      root.style.setProperty('--cx', ({ 'blue': 125, 'rare': 349, 'medium-rare': 565, 'medium': 776, 'medium-well': 996, 'well-done': 1206 })[id]);
      root.style.setProperty('--k', L.k);
      root.style.setProperty('--t', pos(L.t[1] ? (L.t[0] + L.t[1]) / 2 : L.t[0] + 2));
      root.style.setProperty('--off', pos(parseInt(L.off, 10)));
      el.name.textContent = L.name;
      el.uk.textContent = L.uk || '';
      el.rec.hidden = !L.rec;
      el.temp.textContent = L.t[1] ? L.t[0] + '–' + L.t[1] : L.t[0] + '+';
      el.off.textContent = L.off + ' °C';
      el.look.textContent = L.look; el.feel.textContent = L.feel; el.fits.textContent = L.fits; el.tip.textContent = L.tip;
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-roast-go]');
      if (b) render(b.dataset.roastGo);
    });
    // стрілки ← → між кнопками, як у звичайному перемикачі
    root.addEventListener('keydown', function (e) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      var next = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      next.focus(); render(next.dataset.roastGo);
    });
    render('medium-rare');
  }

  /* ---------- «Select · Choice · Prime»: фото класів ----------
     Шляхи — у src картинок в index.html (images/grade-*.webp). Поки файлів немає,
     лишається темна заглушка «Фото незабаром»; поклав файл — фото з’явиться само. */
  function initGradeImages() {
    $$('[data-grade-img]').forEach(function (img) {
      var fail = function () { img.hidden = true; };
      var ok = function () { img.closest('.ginfo__media').classList.add('has-img'); };
      if (img.complete) { img.naturalWidth ? ok() : fail(); }
      img.addEventListener('error', fail);
      img.addEventListener('load', ok);
    });
  }


  /* ---------- «Звідки який стейк»: схема туші ---------- */
  function initCowMap() {
    var root = $('[data-cowmap]');
    if (!root) return;
    // зона → назва, англ., опис і наші товари звідти (id з products.js)
    var ZONES = {
      chuck:      { name: 'Лопатка', en: 'Chuck', desc: 'Робоча частина: більше сполучної тканини, зате яскравий смак.', ids: ['top-blade'] },
      rib:        { name: 'Товстий край', en: 'Rib', desc: 'Найбільше мармуру — звідси найсоковитіші стейки.', ids: ['ribeye', 'cowboy', 'tomahawk'] },
      shortloin:  { name: 'Тонкий край', en: 'Short loin', desc: 'Щільне ніжне м’ясо вздовж хребта. Ті-бон і портерхаус — разом із шматком вирізки.', ids: ['striploin', 'club', 't-bone', 'porterhouse'] },
      tenderloin: { name: 'Вирізка', en: 'Tenderloin', desc: 'М’яз, який майже не працює, — найніжніше м’ясо туші.', ids: ['filet', 'shashlyk'] },
      sirloin:    { name: 'Кострець', en: 'Sirloin', desc: 'Між тонким краєм і огузком: м’ясний смак за помірну ціну.', ids: ['tri-tip'] },
      rump:       { name: 'Огузок', en: 'Rump', desc: 'Щільне м’ясо з глибоким смаком. Тут і піканья з жировою шапкою.', ids: ['picanha', 'rump', 'spider'] },
      round:      { name: 'Стегно', en: 'Round', desc: 'Найпісніша частина: швидко до medium rare і тонко поперек волокон — або тушкувати.', ids: ['topside', 'silverside', 'eye-round'] },
      flank:      { name: 'Пашина', en: 'Flank', desc: 'Плоскі стейки з довгими волокнами: смажити швидко, різати поперек.', ids: ['flank', 'bavette'] },
      plate:      { name: 'Покромка', en: 'Short plate', desc: 'Звідси шорт-ріб і скерт. Поки не продаємо.', ids: [] },
      brisket:    { name: 'Грудинка', en: 'Brisket', desc: 'Для копчення й довгого тушкування. Поки не продаємо.', ids: [] },
      shank:      { name: 'Гомілка', en: 'Shank', desc: 'Багато колагену: тушкувати 2–3 години — і м’ясо тане.', ids: ['ossobuco'] }
    };
    var zones = $$('.cz', root);
    // на телефоні підписи на схемі дрібні — дублюємо зони кнопками під нею
    var order = ['chuck', 'rib', 'shortloin', 'tenderloin', 'sirloin', 'rump', 'round', 'flank', 'plate', 'brisket', 'shank'];
    $('[data-cow-chips]', root).innerHTML = order.map(function (id) {
      return '<button type="button" class="cowchip" data-zone="' + id + '">' + esc(ZONES[id].name) + '</button>';
    }).join('');
    zones.forEach(function (z) {
      var Z = ZONES[z.dataset.zone];
      z.setAttribute('tabindex', '0'); z.setAttribute('role', 'button');
      z.setAttribute('aria-label', Z.name + (Z.ids.length ? ': ' + Z.ids.length + ' поз.' : ''));
    });
    function select(id) {
      var Z = ZONES[id];
      if (!Z) return;
      zones.forEach(function (z) { var on = z.dataset.zone === id; z.classList.toggle('is-on', on); z.setAttribute('aria-pressed', String(on)); });
      $$('.cowchip', root).forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.zone === id)); });
      $$('.cz__label', root).forEach(function (l) { l.classList.toggle('is-on', l.dataset.for === id); });
      $('[data-cow-name]', root).textContent = Z.name;
      $('[data-cow-en]', root).textContent = Z.en;
      $('[data-cow-desc]', root).textContent = Z.desc;
      var items = Z.ids.map(function (i) { return byId[i]; }).filter(Boolean);
      $('[data-cow-cuts]', root).innerHTML = items.length
        ? items.map(function (p) {
            return '<li><button class="cowcut" type="button" data-goto="' + p.id + '">' +
              (p.photo || (p.grades && byKey[gradeKey(p)].photo) ? '<span class="cowcut__img">' + media(p.grades ? byKey[gradeKey(p)] : p, 'thumb') + '</span>' : '') +
              '<span class="cowcut__name">' + esc(p.name) + '<small>' + esc(p.en) + '</small></span>' +
              '<svg class="i" aria-hidden="true"><use href="#i-back"/></svg></button></li>';
          }).join('')
        : '<li class="cowmap__none">З цієї частини зараз нічого не продаємо.</li>';
    }
    root.addEventListener('click', function (e) {
      var z = e.target.closest('.cz, .cowchip');
      if (z) { select(z.dataset.zone); return; }
      var g = e.target.closest('[data-goto]');
      if (g) gotoProduct(g.dataset.goto);
    });
    root.addEventListener('keydown', function (e) {
      var z = e.target.closest('.cz');
      if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(z.dataset.zone); }
    });
    select('rib');
  }
  // Прокрутити до картки товару й коротко підсвітити її
  function gotoProduct(id) {
    if (state.filter !== 'all') setFilter('all');
    var el = gridEl.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
    setTimeout(function () { el.classList.remove('is-flash'); }, 1800);
  }

  /* ---------- старт ---------- */
  load();
  codewordInput.value = state.codeword;
  applyConfig();
  $$('.cowmap, .section__head, .perks__list, .delivery__grid, .faq__list, .pains, .horeca__points, .about__grid, .contacts__grid, .gradeinfo, .gradeinfo__note, .roast').forEach(function (el) { el.setAttribute('data-reveal', ''); });
  observeReveal(document);
  renderTabs();
  renderGrid();
  renderCart();
  initAger();
  initRoast();
  initGradeImages();
  initCowMap();
})();
