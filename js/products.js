/* =========================================================
   КАТАЛОГ «Шо по стейкам?» — усі товари в одному місці.

   Поля:
     id         — унікальний латиницею, не міняти після запуску
     cat        — 'classic' | 'alt' | 'burger'
     name       — назва українською
     en         — англійська назва (золотий капс під назвою)
     desc       — один рядок опису
     perKg      — ціна за кг, ₴ (для стейків). Ціна порції рахується сама: perKg × weight
     weight     — орієнтовна вага порції, г (для стейків)
     price      — фіксована ціна за упаковку, ₴ (для бургерних котлет, замість perKg)
     pack       — підпис фасування, напр. '4 × 150 г'
     badge      — 'Хіт' | 'Новинка' | 'Витримка 21 день' | '' (без бейджа)
     photo      — шлях до фото, напр. 'images/ribeye.webp'; порожньо — темна заглушка.
                  Поруч мають лежати images/<назва>-600.webp і images/thumb/<назва>.webp
                  (їх робить скрипт з інструкції)
     featured   — true: велика картка на 2 колонки (тільки для «Класичних»)
     cook       — (для featured) як готувати: список пар ['Назва', 'текст']
     like       — (для альтернативних) на що схоже, один рядок
     grades     — (необов’язково) класи мармуру: у картці з’являється перемикач,
                  і кожен клас іде в кошик окремим рядком («Рібай · Prime»).
                  Як заповнити — див. «КЛАСИ МАРМУРУ» в кінці файлу.

   Щоб додати позицію — скопіюй рядок, зміни id і поля.
   Щоб сховати позицію — додай  hidden: true
   ========================================================= */
window.PRODUCTS = [
  // ---------- КЛАСИЧНІ ----------
  { id: 'ribeye',      cat: 'classic', name: 'Рібай',       en: 'Ribeye',       desc: 'Найсоковитіший, щедрий мармур',       perKg: 1700, weight: 350,  badge: 'Хіт',              photo: 'images/ribeye.webp', featured: true,
    cook: [['Просмаження', 'medium rare, 54–56 °C'], ['Сковорода', '3–4 хв з кожного боку, 5 хв відпочинку'], ['Порада', 'Посоли за 40 хв до смаження — скоринка буде кращою']],
    grades: [
      { id: 'select', label: 'Select', perKg: 0, photo: 'images/ribeye-select.webp' },
      { id: 'choice', label: 'Choice', perKg: 0, photo: 'images/ribeye-choice.webp' },
      { id: 'prime',  label: 'Prime',  perKg: 0, photo: 'images/ribeye-prime.webp' }
    ] },
  { id: 'striploin',   cat: 'classic', name: 'Нью-Йорк',    en: 'Striploin',    desc: 'Щільний, з яскравим смаком',          perKg: 1200, weight: 350,  badge: 'Витримка 21 день', photo: 'images/striploin.webp',
    grades: [
      { id: 'select', label: 'Select', perKg: 0, photo: 'images/striploin-select.webp' },
      { id: 'choice', label: 'Choice', perKg: 0, photo: 'images/striploin-choice.webp' },
      { id: 'prime',  label: 'Prime',  perKg: 0, photo: 'images/striploin-prime.webp' }
    ] },
  { id: 't-bone',      cat: 'classic', name: 'Ті-бон',      en: 'T-bone',       desc: 'Два стейки на одній кістці',          perKg: 1250, weight: 500,  badge: '',                 photo: 'images/t-bone.webp',
    grades: [
      { id: 'classic', label: 'Класичний', perKg: 0, photo: 'images/t-bone-classic.webp' },
      { id: 'prime',   label: 'Prime',     perKg: 0, photo: 'images/t-bone-prime.webp' }
    ] },
  { id: 'porterhouse', cat: 'classic', name: 'Портерхаус',  en: 'Porterhouse',  desc: 'Як ті-бон, але більше вирізки',       perKg: 1300, weight: 600,  badge: '',                 photo: 'images/porterhouse.webp',
    grades: [
      { id: 'classic', label: 'Класичний', perKg: 0, photo: 'images/porterhouse-classic.webp' },
      { id: 'prime',   label: 'Prime',     perKg: 0, photo: 'images/porterhouse.webp' }
    ] },
  { id: 'cowboy',      cat: 'classic', name: 'Ковбой',      en: 'Cowboy',       desc: 'Рібай на короткій кістці',            perKg: 1550, weight: 700,  badge: '',                 photo: 'images/cowboy.webp',
    grades: [
      { id: 'select', label: 'Select', perKg: 0, photo: 'images/cowboy-select.webp' },
      { id: 'choice', label: 'Choice', perKg: 0, photo: 'images/cowboy-choice.webp' },
      { id: 'prime',  label: 'Prime',  perKg: 0, photo: 'images/cowboy.webp' }
    ] },
  { id: 'tomahawk',    cat: 'classic', name: 'Томагавк',    en: 'Tomahawk',     desc: 'Рібай на довгій кістці, для компанії', perKg: 1600, weight: 1100, badge: 'Витримка 21 день', photo: 'images/tomahawk.webp', featured: true,
    cook: [['Просмаження', 'medium rare, 54–56 °C'], ['Як готувати', 'Духовка 120 °C до 50 °C всередині, потім 1–2 хв на бік на гриль'], ['Порція', 'на 2–3 людей']],
    grades: [
      { id: 'select', label: 'Select', perKg: 0, photo: 'images/tomahawk-select.webp' },
      { id: 'choice', label: 'Choice', perKg: 0, photo: 'images/tomahawk-choice.webp' },
      { id: 'prime',  label: 'Prime',  perKg: 0, photo: 'images/tomahawk-prime.webp' }
    ] },
  { id: 'club',        cat: 'classic', name: 'Клаб-стейк',  en: 'Club steak',   desc: 'Нью-Йорк на кістці',                   perKg: 0,    weight: 450,  badge: '',                 photo: '',
    grades: [
      { id: 'classic', label: 'Класичний', perKg: 0, photo: 'images/club-classic.webp' },
      { id: 'prime',   label: 'Prime',     perKg: 0, photo: 'images/club-prime.webp' }
    ] },
  { id: 'filet',       cat: 'classic', name: 'Міньйон',     en: 'Filet mignon', desc: 'Найніжніший, з центру вирізки',       perKg: 2200, weight: 300,  badge: '',                 photo: 'images/filet-mignon.webp', featured: true,  // без класів мармуру — одна позиція
    cook: [['Просмаження', 'rare — medium rare, 50–56 °C'], ['Сковорода', '2–3 хв з кожного боку, наприкінці — шматочок масла'], ['Порада', 'Нежирний: далі medium не смаж, інакше пересохне']] },

  // ---------- АЛЬТЕРНАТИВНІ (склад від 29.09) ----------
  // perKg: 0 / price: 0 — ціна ще не вказана: на сайті «Ціну уточнюйте» і кнопка дзвінка замість «В кошик».
  { id: 'picanha',     cat: 'alt', name: 'Піканья',       en: 'Picanha',      desc: 'З жировою шапкою, хіт гриля',             perKg: 950, weight: 350, badge: 'Хіт', photo: 'images/picanha.webp', like: 'Соковита, як рібай, завдяки жировій шапці' },
  { id: 'rump',        cat: 'alt', name: 'Рамп',          en: 'Rump',         desc: 'Щільний стейк з огузка',                  perKg: 0,   weight: 350, badge: '',    photo: 'images/rump.webp', like: 'Нежирний, з глибоким «м’ясним» смаком' },
  { id: 'topside',     cat: 'alt', name: 'Топ сайд',      en: 'Topside',      desc: 'Нежирний стейк з внутрішньої частини стегна', perKg: 0, weight: 350, badge: '', photo: 'images/topside.webp', like: 'До medium rare і тонко поперек волокон — або цілим на ростбіф' },
  { id: 'silverside',  cat: 'alt', name: 'Сильвер сайд',  en: 'Silverside',   desc: 'Нежирний стейк із зовнішньої частини стегна', perKg: 0, weight: 350, badge: '', photo: 'images/silverside.webp', like: 'Найкраще — маринад і швидке смаження або довге тушкування' },
  { id: 'tri-tip',     cat: 'alt', name: 'Трай-тип',      en: 'Tri-tip',      desc: 'Каліфорнійська класика',                  perKg: 850, weight: 400, badge: '',    photo: 'images/tri-tip.webp', like: 'Цілий шматок на гриль для компанії' },
  { id: 'eye-round',   cat: 'alt', name: 'Ай раунд',      en: 'Eye of round', desc: 'Круглий нежирний медальйон зі стегна',    perKg: 0,   weight: 300, badge: '',    photo: 'images/eye-round.webp', like: 'Формою як міньйон, але щільніший — не пересмажуй' },
  { id: 'top-blade',   cat: 'alt', name: 'Топ блейд',     en: 'Top blade',    desc: 'Лопатковий стейк з жилкою по центру',     perKg: 0,   weight: 300, badge: '',    photo: 'images/top-blade.webp', like: 'Ніжний, з яскравим смаком — той самий м’яз, що й флет-айрон' },
  { id: 'spider',      cat: 'alt', name: 'Спайдер',       en: 'Spider steak', desc: 'Рідкісний «стейк м’ясника» зі стегна',    perKg: 0,   weight: 250, badge: '',    photo: 'images/spider.webp', like: 'Мармур павутинкою, дуже соковитий — з однієї туші лише два' },
  { id: 'flank',       cat: 'alt', name: 'Фланк',         en: 'Flank',        desc: 'Яскравий м’ясний смак',                   perKg: 750, weight: 400, badge: '',    photo: 'images/flank.webp', like: 'Нежирний, різати тонко поперек волокон' },
  { id: 'bavette',     cat: 'alt', name: 'Бавет',         en: 'Bavette',      desc: 'Найкраще бере маринад',                   perKg: 700, weight: 350, badge: '',    photo: 'images/bavette.webp', like: 'Як фланк, але м’якший і соковитіший' },

  // ---------- ДЛЯ ГРИЛЯ Й КАЗАНА (cat 'burger' — історична назва групи) ----------
  { id: 'ossobuco',    cat: 'burger', name: 'Оссобуко',         en: 'Ossobuco',         desc: 'Зріз гомілки з мозковою кісткою. Не для пательні: тушкувати 2–3 год', perKg: 470, weight: 450, badge: '', photo: 'images/ossobuco.webp' },
  { id: 'shashlyk',    cat: 'burger', name: 'Шашлик з вирізки', en: 'Tenderloin kebab', desc: 'Сирий: кубики яловичої вирізки в маринаді, у вакуумі — одразу на мангал', perKg: 800, weight: 1000, badge: 'Новинка', photo: 'images/shashlyk.webp' },
  { id: 'lula',        cat: 'burger', name: 'Люля-кебаб',       en: 'Lula kebab',       desc: 'Сирий: рубаний фарш з цибулею й зеленню на шампурах, у вакуумі', perKg: 0, weight: 500, badge: 'Новинка', photo: 'images/lula.webp' },
  { id: 'burger-200',  cat: 'burger', name: 'Бургерна котлета', en: 'Burger patty',     desc: 'Фарш з обрізі витриманих стейків, 20% жиру, без добавок', price: 0, pack: '200 г', badge: '', photo: 'images/patties-200.webp' }
];

/* ---------- КЛАСИ МАРМУРУ (поле grades) ----------
   Рібай, нью-йорк, ковбой, томагавк — Select / Choice / Prime.
   Ті-бон, портерхаус, клаб-стейк — Класичний / Prime.
   Перший клас у списку — той, що обраний у картці за замовчуванням.

   Як заповнити клас:
     perKg — ціна за кг саме цього класу, ₴. Поки 0 — на сайті «Ціну уточнюйте»,
             кнопка дзвінка замість «В кошик», і в кошик цей клас не потрапить.
             Вагу порції бере з товару (weight).
     photo — фото саме цього класу, напр. 'images/ribeye-prime.webp'
             (поруч так само -600.webp і thumb/). Порожньо — показуємо фото товару.
   id класу не міняти після запуску: він входить у ключ кошика ('ribeye@prime').
   Коли в товару є grades, його власні perKg і photo на сайті не показуються
   (photo лишається запасним для класів без фото). */

// Підказка під перемикачем класів у картці — одна на id класу
window.GRADE_HINTS = {
  select:  'Мінімум мармуру, щільніший і нежирний',
  choice:  'Помірний мармур — баланс ніжності й ціни',
  prime:   'Виразний мармур, найсоковитіший',
  classic: 'Помірний мармур, класичний смак'
};

// Назви розділів (таби каталогу)
window.CATEGORIES = [
  { id: 'all',     label: 'Всі' },
  { id: 'classic', label: 'Класичні' },
  { id: 'alt',     label: 'Альтернативні' },
  { id: 'burger',  label: 'Гриль і казан' }
];
