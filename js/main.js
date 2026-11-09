/* =========================================================
   СЦЕНА: прогрес скролу → CSS-змінні та поява описів
   ========================================================= */
(() => {
  const scene = document.querySelector('[data-scene]');
  if (!scene) return;

  const product = scene.querySelector('[data-scene-product]');
  const target = scene.querySelector('[data-scene-target]');
  // описи в тому порядку, як вони стоять у HTML
  const callouts = [...scene.querySelectorAll('.callout')];
  const header = document.querySelector('.header');

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  /* Коли з'являються описи (частки всього скролу сцени) */
  const CALLOUTS_START = 0.55;  // перший опис
  const CALLOUTS_STEP = 0.07;   // проміжок між описами

  function measure() {
    const scale = target.offsetHeight / product.offsetHeight;
    const shiftY = target.offsetTop - product.offsetTop;
    scene.style.setProperty('--zoom-s', scale);
    scene.style.setProperty('--zoom-y', `${shiftY}px`);
  }

  function update() {
    // останній екран сцени — на нього наїжджає наступна секція
    const headerH = header ? header.offsetHeight : 0;
    const stageH = window.innerHeight - headerH;   // висота сцени під хедером
    const coverLength = stageH;
    const distance = scene.offsetHeight - stageH - coverLength;
    const scrolled = headerH - scene.getBoundingClientRect().top;
    const p = clamp(scrolled / distance);

    // 0 → 1, поки наступна секція наїжджає
    scene.style.setProperty('--cover', clamp((scrolled - distance) / coverLength));

    //                       початок  кінець
    const out = ease(range(p, 0, 0.2));   // hero йде вгору
    const zoom = ease(range(p, 0.05, 0.45));  // дармовис росте
    const appear = ease(range(p, 0.4, 0.55));  // з'являється заголовок

    scene.style.setProperty('--out', out);
    scene.style.setProperty('--zoom', zoom);
    scene.style.setProperty('--appear', appear);

    // hero зник → його кнопки більше не клікаються
    scene.classList.toggle('is-base', p >= 0.2);

    // описи: кожен має свою точку появи
    callouts.forEach((callout, i) => {
      const showAt = CALLOUTS_START + i * CALLOUTS_STEP;
      callout.classList.toggle('is-visible', p >= showAt);
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    update();
  });

  /* =========================================================
     МАГНІТ: конструктор м'яко доїжджає до верху екрана
     ========================================================= */
  if (!document.querySelector('.cover')) return;

  const SNAP_DOWN = 0.2;  // яку частину наїзду треба прокрутити вниз, щоб далі доїхало саме
  const SNAP_UP = 0.8;    // і вгору (0.8 = прокрутили вгору п'яту частину)
  const SLOW = 0.35;      // швидкість скролу (px/мс), нижче якої вважаємо, що людина «відпускає»
  const IDLE = 90;        // мс без скролу = зупинка
  const STOP = 350;       // мс «стоп-моменту» після приземлення, гасить інерцію
  const SNAP_OFFSET = 40; // на скільки px конструктор зупиняється вище за верх екрана
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  let lastY = window.scrollY;
  let lastT = performance.now();
  let velocity = 0;      // згладжена швидкість скролу
  let direction = 0;     // 1 = вниз, -1 = вгору
  let anim = null;       // поточне підтягування
  let stopUntil = 0;     // до якого часу гасимо скрол колесом
  let caught = false;    // чи вже зупиняли проліт на цьому проході
  let navigating = false; // людина перейшла за посиланням у меню — магніт не чіпає
  let idleTimer = null;

  // ключові точки: кінець сцени та «конструктор нагорі»
  function points() {
    const headerH = header ? header.offsetHeight : 0;
    const stageH = window.innerHeight - headerH;
    const coverLength = stageH;
    const distance = scene.offsetHeight - stageH - coverLength;
    const scrolled = headerH - scene.getBoundingClientRect().top;
    const sceneTop = window.scrollY - scrolled;
    return {
      cover: (scrolled - distance) / coverLength,
      sceneEnd: sceneTop + distance,
      builderTop: sceneTop + distance + coverLength + SNAP_OFFSET,
    };
  }

  // приземлення: коротка пауза, щоб інерція не прогорнула далі
  function land() {
    anim = null;
    velocity = 0;
    stopUntil = performance.now() + STOP;
  }

  function animateTo(to) {
    const from = window.scrollY;
    const dist = Math.abs(to - from);
    if (dist < 2) return;

    if (reduceMotion) {
      window.scrollTo(0, to);
      land();
      return;
    }

    // чим далі їхати, тим довше, але в межах 0.4–0.9 с
    anim = { from, to, start: performance.now(), duration: clamp(dist * 0.9, 400, 900) };
    requestAnimationFrame(step);
  }

  function step(now) {
    if (!anim) return;
    const t = Math.min((now - anim.start) / anim.duration, 1);
    window.scrollTo(0, anim.from + (anim.to - anim.from) * easeOut(t));
    if (t < 1) requestAnimationFrame(step);
    else land();
  }

  function trySnap() {
    if (anim) return;
    const { cover, sceneEnd, builderTop } = points();
    // магніт працює лише там, де конструктор наїжджає на сцену
    if (cover <= 0.01 || cover >= 0.99) return;

    if (direction > 0 && cover > SNAP_DOWN) animateTo(builderTop);
    else if (direction < 0 && cover < SNAP_UP) animateTo(sceneEnd);
  }
  // клік по посиланню-якорю (#reviews, #builder…) — вимикаємо магніт на час переходу
  document.addEventListener('click', (e) => {
    if (!e.target.closest('a[href^="#"]')) return;
    navigating = true;
    anim = null;
    clearTimeout(idleTimer);
    setTimeout(() => { navigating = false; }, 1000);
  });
  window.addEventListener('scroll', () => {
    if (anim) return;
    if (navigating) {
      lastY = window.scrollY;
      lastT = performance.now();
      return;
    }

    const now = performance.now();
    const y = window.scrollY;
    const v = (y - lastY) / Math.max(now - lastT, 1);
    velocity = velocity * 0.7 + v * 0.3;
    if (y !== lastY) direction = y > lastY ? 1 : -1;

    const { cover, builderTop } = points();

    // швидкий проліт вниз: зупиняємо рівно на конструкторі
    if (direction > 0 && !caught && lastY < builderTop && y > builderTop) {
      caught = true;
      window.scrollTo(0, builderTop);
      land();
    }
    if (cover <= 0) caught = false; // повернулись до сцени — можна ловити знову

    // людина сповільнилась або зупинилась → підтягуємо
    clearTimeout(idleTimer);
    idleTimer = setTimeout(trySnap, IDLE);
    if (Math.abs(velocity) < SLOW) trySnap();

    lastY = window.scrollY;
    lastT = now;
  }, { passive: true });

  // колесо / трекпад: під час підтягування і «стоп-моменту» гасимо інерцію
  window.addEventListener('wheel', (e) => {
    const now = performance.now();

    if (anim) {
      // різкий рух у протилежний бік — людина передумала, віддаємо їй керування
      const against = Math.sign(e.deltaY) !== Math.sign(anim.to - anim.from);
      if (against && Math.abs(e.deltaY) > 20) {
        anim = null;
        return;
      }
      e.preventDefault();
      return;
    }

    if (now < stopUntil) {
      e.preventDefault();
      stopUntil = now + 120; // поки інерція триває, пауза подовжується
    }
  }, { passive: false });

  // палець або клавіатура — одразу віддаємо керування
  const release = () => { anim = null; };
  window.addEventListener('touchstart', release, { passive: true });
  window.addEventListener('keydown', release);
})();