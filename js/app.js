/* =========================================================
   «Шо по стейкам?» — каталог, кошик, оформлення.
   Дані: js/products.js, налаштування: js/config.js
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.CONFIG;
  var PRODUCTS = window.PRODUCTS.filter(function (p) { return !p.hidden; });
  var CATS = window.CATEGORIES;
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  var STORE_KEY = 'shopostejkam.cart.v1';
  var state = { cart: {}, codeword: '', filter: 'all', method: 'kyiv' };

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
  function weightLabel(g) { return g >= 1000 ? (g / 1000).toLocaleString('uk-UA') + ' кг' : g + ' г'; }
  function metaLabel(p) {
    return p.price ? p.pack : money(p.perKg) + '/кг · ≈ ' + weightLabel(p.weight);
  }
  // Кодове слово: без регістру, пробілів, лапок і розділових знаків.
  // \p{L} ловить кирилицю (на відміну від \w).
  function norm(s) { return String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
  function codewordOk() { return state.codeword !== '' && norm(state.codeword) === norm(CFG.codeword); }

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      Object.keys(saved.cart || {}).forEach(function (id) {
        if (byId[id] && saved.cart[id] > 0) state.cart[id] = Math.min(99, saved.cart[id] | 0);
      });
      state.codeword = saved.codeword || '';
    } catch (e) { /* приватний режим або заблоковане сховище — працюємо без нього */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ cart: state.cart, codeword: state.codeword })); } catch (e) {}
  }

  /* ---------- підрахунки ---------- */
  function lines() {
    return Object.keys(state.cart).map(function (id) {
      var p = byId[id];
      return { p: p, qty: state.cart[id], sum: unitPrice(p) * state.cart[id] };
    });
  }
  function totals() {
    var ls = lines();
    var count = ls.reduce(function (a, l) { return a + l.qty; }, 0);
    var subtotal = ls.reduce(function (a, l) { return a + l.sum; }, 0);
    var free = codewordOk();
    var delivery = count === 0 ? 0 : (free ? 0 : CFG.deliveryFee[state.method]);
    return { lines: ls, count: count, subtotal: subtotal, delivery: delivery, free: free, total: subtotal + delivery, left: Math.max(0, CFG.minOrder - subtotal) };
  }

  function setQty(id, qty) {
    qty = Math.max(0, Math.min(99, qty));
    if (qty === 0) delete state.cart[id]; else state.cart[id] = qty;
    save();
    renderCardAction(id);
    renderCart();
  }

  /* ---------- каталог ---------- */
  var gridEl = $('[data-grid]');
  var tabsEl = $('[data-tabs]');

  // Заголовки груп і фон смуги бургерів
  var GROUPS = {
    classic: { title: 'Класичні', lead: 'Перевірені часом відруби' },
    alt: { title: 'Альтернативні', lead: 'Для тих, хто вже скуштував рібай і хоче далі' },
    burger: { title: 'Бургери', lead: 'Фарш з обрізі витриманих стейків, 20% жиру, без добавок',
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
      (kind === 'thumb' ? '' : '<span class="ph__cap">Фото незабаром</span>') + '</div>';
  }

  function badge(p, cls) {
    if (!p.badge) return '';
    var outline = p.badge.indexOf('Витримка') === 0;
    return '<span class="badge ' + (cls || 'card__badge') + (outline ? ' badge--outline' : '') + '">' + esc(p.badge) + '</span>';
  }

  function priceHTML(p, cls) {
    return '<span class="' + cls + '">' + (isApprox(p) ? '<small>≈</small>' : '') + money(unitPrice(p)) + '</span>';
  }

  // КЛАСИЧНІ — великі картки, featured — на 2 колонки
  function classicCardHTML(p) {
    return '<article class="card' + (p.featured ? ' card--hero' : '') + '" data-id="' + p.id + '">' +
      '<div class="card__media">' + media(p, p.featured ? 'hero' : 'card') + badge(p) + '</div>' +
      '<div class="card__body">' +
        '<h4 class="card__name">' + esc(p.name) + '</h4>' +
        '<p class="card__en">' + esc(p.en) + '</p>' +
        '<p class="card__desc">' + esc(p.desc) + '</p>' +
        '<div class="card__foot">' +
          '<div class="card__price">' + priceHTML(p, 'card__sum') + '<span class="card__meta">' + metaLabel(p) + '</span></div>' +
          '<div class="card__action" data-action="' + p.id + '" data-kind="full"></div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // АЛЬТЕРНАТИВНІ — компактне меню
  function altRowHTML(p) {
    return '<li class="mrow" data-id="' + p.id + '">' +
      '<div class="mrow__img">' + media(p, 'thumb') + '</div>' +
      '<div class="mrow__main">' +
        '<h4 class="mrow__name">' + esc(p.name) + badge(p, 'mrow__badge') + '</h4>' +
        '<p class="mrow__en">' + esc(p.en) + '</p>' +
        '<p class="mrow__desc">' + esc(p.desc) + '</p>' +
      '</div>' +
      '<div class="mrow__side">' + priceHTML(p, 'mrow__sum') +
        '<span class="mrow__meta">' + money(p.perKg || p.price) + (p.perKg ? '/кг' : '') + '</span>' +
        '<div class="mrow__action" data-action="' + p.id + '" data-kind="compact"></div>' +
      '</div>' +
    '</li>';
  }

  // БУРГЕРИ — картки на фото-смузі
  function burgerCardHTML(p) {
    return '<article class="bcard" data-id="' + p.id + '">' +
      (p.photo ? '<div class="bcard__img">' + media(p, 'card') + '</div>' : '') +
      '<div class="bcard__top"><p class="bcard__pack">' + esc(p.pack) + '</p>' + badge(p, 'bcard__badge') + '</div>' +
      '<h4 class="bcard__name">' + esc(p.name) + '</h4>' +
      '<p class="bcard__en">' + esc(p.en) + '</p>' +
      '<div class="bcard__foot">' + priceHTML(p, 'bcard__sum') +
        '<div class="card__action" data-action="' + p.id + '" data-kind="full"></div>' +
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
        '<div class="cgrid" data-reveal>' + list.map(classicCardHTML).join('') + '</div></div></div>';
    }
    if (cat === 'alt') {
      return '<div class="cgroup cgroup--alt" id="group-alt"><div class="container">' + groupHead(cat) +
        '<ul class="mlist" data-reveal>' + list.map(altRowHTML).join('') + '</ul>' +
        '<div class="helpbar" data-reveal><p><strong>Не знаєш, що обрати?</strong> Напиши, під що готуєш — гриль, пательня чи духовка, — і на скільки людей. Підкажемо відруб і вагу.</p>' +
        '<a class="btn btn--outline" href="' + esc(CFG.telegram) + '" target="_blank" rel="noopener">Написати в Telegram</a></div>' +
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

  function renderCardAction(id) {
    var slot = gridEl.querySelector('[data-action="' + id + '"]');
    if (!slot) return;
    var qty = state.cart[id] || 0;
    var p = byId[id];
    var hadFocus = slot.contains(document.activeElement) ? document.activeElement : null;
    var focusKind = hadFocus && (hadFocus.hasAttribute('data-dec') ? 'dec' : hadFocus.hasAttribute('data-inc') ? 'inc' : 'add');
    var addBtn = slot.dataset.kind === 'compact'
      ? '<button class="btn-plus" type="button" data-add="' + id + '" aria-label="Додати в кошик: ' + esc(p.name) + '"><svg class="i" aria-hidden="true"><use href="#i-plus"/></svg></button>'
      : '<button class="btn btn--outline" type="button" data-add="' + id + '">В кошик</button>';
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
    if (b.dataset.add) { setQty(b.dataset.add, 1); bump(); }
    else if (b.dataset.inc) { setQty(b.dataset.inc, (state.cart[b.dataset.inc] || 0) + 1); bump(); }
    else if (b.dataset.dec) setQty(b.dataset.dec, (state.cart[b.dataset.dec] || 0) - 1);
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
    if (view === 'thanks') setView('cart');
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
    if (view === 'thanks') setView('cart');
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
    hint.textContent = t.free ? 'Кодове слово прийнято — доставка безкоштовна' : typed ? 'Слово не підходить. Перевір написання' : 'Перша доставка безкоштовна';
    hint.classList.toggle('is-ok', t.free);

    // підсумки (у кошику й у формі)
    $$('[data-subtotal]').forEach(function (el) { el.textContent = money(t.subtotal); });
    $$('[data-delivery]').forEach(function (el) {
      el.textContent = t.free ? '0 ₴ — кодове слово' : money(CFG.deliveryFee[state.method]);
      el.classList.toggle('is-free', t.free);
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

  function updateMethodUI() {
    if (state.method === 'np') {
      addrLabel.textContent = 'Місто і відділення Нової Пошти';
      addrInput.placeholder = 'Напр.: Львів, відділення № 12';
      addrInput.setAttribute('autocomplete', 'off');
    } else {
      addrLabel.textContent = 'Адреса доставки';
      addrInput.placeholder = 'Вулиця, будинок, квартира';
      addrInput.setAttribute('autocomplete', 'street-address');
    }
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
    if (f.address.value.trim().length < 3) errs.address = state.method === 'np' ? 'Вкажи місто і номер відділення' : 'Вкажи адресу доставки';
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
        method: state.method === 'np' ? 'Нова Пошта' : 'Київ, кур’єр',
        address: f.address.value.trim(),
        comment: f.comment.value.trim()
      },
      items: t.lines.map(function (l) {
        return {
          id: l.p.id, name: l.p.name + (l.p.pack ? ' ' + l.p.pack : ''), qty: l.qty,
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
    if (!CFG.orderEndpoint) {
      console.info('[Шо по стейкам?] Замовлення (orderEndpoint не заданий):', order, '\n\n' + orderText(order));
      return Promise.resolve();
    }
    return fetch(CFG.orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: order, text: orderText(order) })
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errBox = $('[data-form-error]');
    errBox.hidden = true;
    if (!validate()) return;
    var btn = $('[data-submit]');
    btn.disabled = true; btn.textContent = 'Надсилаємо…';
    var order = buildOrder();
    sendOrder(order).then(function () {
      state.cart = {}; state.codeword = ''; codewordInput.value = '';
      save();
      form.reset(); state.method = 'kyiv';
      updateMethodUI();
      $('[data-order-no]').textContent = order.number;
      renderCart();
      PRODUCTS.forEach(function (p) { renderCardAction(p.id); });
      setView('thanks');
      $('#drawer-title').focus();
    }).catch(function () {
      errBox.textContent = 'Не вдалося надіслати замовлення. Спробуй ще раз або зателефонуй: ' + CFG.phone;
      errBox.hidden = false;
    }).then(function () {
      btn.disabled = false; btn.textContent = 'Підтвердити замовлення';
    });
  });

  /* ---------- контакти з config.js ---------- */
  function applyConfig() {
    $$('[data-cfg="phone"]').forEach(function (el) { el.textContent = CFG.phone; });
    $$('[data-cfg="minOrder"]').forEach(function (el) { el.textContent = money(CFG.minOrder); });
    $$('[data-cfg="deliveryFee"]').forEach(function (el) {
      var k = CFG.deliveryFee.kyiv, n = CFG.deliveryFee.np;
      el.textContent = k === n ? money(k) : 'Київ ' + money(k) + ' · НП ' + money(n);
    });
    var phoneLink = $('[data-link="phone"]');
    if (CFG.phoneHref) phoneLink.href = 'tel:' + CFG.phoneHref;
    else phoneLink.removeAttribute('href');
    [['instagram', CFG.instagram], ['telegram', CFG.telegram]].forEach(function (x) {
      var a = $('[data-link="' + x[0] + '"]');
      a.href = x[1];
      if (x[1] && x[1] !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- старт ---------- */
  load();
  codewordInput.value = state.codeword;
  applyConfig();
  $$('.section__head, .perks__list, .delivery__grid, .reviews__list').forEach(function (el) { el.setAttribute('data-reveal', ''); });
  observeReveal(document);
  renderTabs();
  renderGrid();
  renderCart();
})();
