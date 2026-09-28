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

   Щоб додати позицію — скопіюй рядок, зміни id і поля.
   Щоб сховати позицію — додай  hidden: true
   ========================================================= */
window.PRODUCTS = [
  // ---------- КЛАСИЧНІ ----------
  { id: 'ribeye',      cat: 'classic', name: 'Рібай',       en: 'Ribeye',       desc: 'Найсоковитіший, щедрий мармур',       perKg: 1700, weight: 350,  badge: 'Хіт',              photo: 'images/ribeye.webp', featured: true,
    cook: [['Просмаження', 'medium rare, 54–56 °C'], ['Сковорода', '3–4 хв з кожного боку, 5 хв відпочинку'], ['Порада', 'Посоли за 40 хв до смаження — скоринка буде кращою']] },
  { id: 'striploin',   cat: 'classic', name: 'Нью-Йорк',    en: 'Striploin',    desc: 'Щільний, з яскравим смаком',          perKg: 1200, weight: 350,  badge: 'Витримка 21 день', photo: 'images/striploin.webp' },
  { id: 't-bone',      cat: 'classic', name: 'Ті-бон',      en: 'T-bone',       desc: 'Два стейки на одній кістці',          perKg: 1250, weight: 500,  badge: '',                 photo: 'images/t-bone.webp' },
  { id: 'porterhouse', cat: 'classic', name: 'Портерхаус',  en: 'Porterhouse',  desc: 'Як ті-бон, але більше вирізки',       perKg: 1300, weight: 600,  badge: '',                 photo: 'images/porterhouse.webp' },
  { id: 'cowboy',      cat: 'classic', name: 'Ковбой',      en: 'Cowboy',       desc: 'Рібай на короткій кістці',            perKg: 1550, weight: 700,  badge: '',                 photo: 'images/cowboy.webp' },
  { id: 'tomahawk',    cat: 'classic', name: 'Томагавк',    en: 'Tomahawk',     desc: 'Рібай на довгій кістці, для компанії', perKg: 1600, weight: 1100, badge: 'Витримка 21 день', photo: 'images/tomahawk.webp', featured: true,
    cook: [['Просмаження', 'medium rare, 54–56 °C'], ['Як готувати', 'Духовка 120 °C до 50 °C всередині, потім 1–2 хв на бік на гриль'], ['Порція', 'на 2–3 людей']] },
  { id: 'filet',       cat: 'classic', name: 'Міньйон',     en: 'Filet mignon', desc: 'Найніжніший, з центру вирізки',       perKg: 2200, weight: 300,  badge: '',                 photo: 'images/filet-mignon.webp' },

  // ---------- АЛЬТЕРНАТИВНІ ----------
  { id: 'chuck-roll',  cat: 'alt', name: 'Чак-рол',     en: 'Chuck roll', desc: '«Рібай для своїх»',          perKg: 850, weight: 350, badge: '',    photo: 'images/chuck-roll.webp', like: 'Схожий на рібай, трохи щільніший' },
  { id: 'picanha',     cat: 'alt', name: 'Піканья',     en: 'Picanha',    desc: 'З жировою шапкою, хіт гриля', perKg: 950, weight: 350, badge: 'Хіт', photo: 'images/picanha.webp', like: 'Соковита, як рібай, завдяки жировій шапці' },
  { id: 'denver',      cat: 'alt', name: 'Денвер',      en: 'Denver',     desc: 'М’який і мармуровий',         perKg: 800, weight: 300, badge: '',    photo: 'images/denver.webp', like: 'Мармур як у рібаю, а ціна вдвічі нижча' },
  { id: 'flat-iron',   cat: 'alt', name: 'Флет-айрон',  en: 'Flat iron',  desc: 'Ніжний стейк з лопатки',      perKg: 850, weight: 300, badge: '',    photo: 'images/flat-iron.webp', like: 'Ніжність майже як у міньйону' },
  { id: 'tri-tip',     cat: 'alt', name: 'Трай-тип',    en: 'Tri-tip',    desc: 'Каліфорнійська класика',      perKg: 850, weight: 400, badge: '',    photo: 'images/tri-tip.webp', like: 'Цілий шматок на гриль для компанії' },
  { id: 'skirt',       cat: 'alt', name: 'Мачете',      en: 'Skirt',      desc: 'Смажиться за хвилини',        perKg: 900, weight: 300, badge: '',    photo: 'images/skirt.webp', like: 'Найяскравіший смак, 2 хв з кожного боку' },
  { id: 'flank',       cat: 'alt', name: 'Фланк',       en: 'Flank',      desc: 'Яскравий м’ясний смак',       perKg: 750, weight: 400, badge: '',    photo: 'images/flank.webp', like: 'Нежирний, різати тонко поперек волокон' },
  { id: 'bavette',     cat: 'alt', name: 'Бавет',       en: 'Bavette',    desc: 'Найкраще бере маринад',       perKg: 700, weight: 350, badge: '',    photo: '', like: 'Як фланк, але м’якший і соковитіший' },
  // ТОП БЛЕЙД: прихований, доки немає ціни й фото. Щоб показати — впиши perKg, photo і прибери hidden: true
  { id: 'top-blade',   cat: 'alt', name: 'Топ блейд',   en: 'Top blade',  desc: 'Лопатковий стейк з жилкою по центру', perKg: 0, weight: 300, badge: '', photo: '', like: 'Той самий м’яз, що й флет-айрон, але з жилкою — смак яскравіший', hidden: true },
  { id: 'hanger',      cat: 'alt', name: 'Хенгер',      en: 'Hanger',     desc: '«Стейк м’ясника»',            perKg: 900, weight: 300, badge: '',    photo: '', like: 'Насичений смак, улюблений у м’ясників' },

  // ---------- БУРГЕРИ ----------
  { id: 'burger-150', cat: 'burger', name: 'Бургерні котлети', en: 'Burger patties', desc: 'Фарш з обрізі витриманих стейків, 20% жиру, без добавок', price: 420, pack: '4 × 150 г', badge: 'Новинка', photo: '' },
  { id: 'burger-180', cat: 'burger', name: 'Бургерні котлети', en: 'Burger patties', desc: 'Фарш з обрізі витриманих стейків, 20% жиру, без добавок', price: 490, pack: '4 × 180 г', badge: '',        photo: '' },
  { id: 'smash-100',  cat: 'burger', name: 'Смеш-котлети',     en: 'Smash patties',  desc: 'Фарш з обрізі витриманих стейків, 20% жиру, без добавок', price: 450, pack: '6 × 100 г', badge: '',        photo: '' }
];

// Назви розділів (таби каталогу)
window.CATEGORIES = [
  { id: 'all',     label: 'Всі' },
  { id: 'classic', label: 'Класичні' },
  { id: 'alt',     label: 'Альтернативні' },
  { id: 'burger',  label: 'Бургери' }
];
