/* =========================================================
   ХЕДЕР: ховається при скролі вниз, з'являється при скролі вгору
   ========================================================= */
(() => {
    const header = document.querySelector('.header');
    if (!header) return;

    const THRESHOLD = 6;   // мінімальний рух, на який реагуємо (px): не смикається від тремтіння трекпада
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
        const y = window.scrollY;
        const delta = y - lastY;

        if (Math.abs(delta) >= THRESHOLD) {
            const atTop = y < 8; // самий верх сторінки (hero) — хедер завжди видно

            header.classList.toggle('is-hidden', delta > 0 && !atTop);
            header.classList.toggle('is-scrolled', !atTop);
            lastY = y;
        }
        ticking = false;
    }

    // оновлюємо не частіше, ніж браузер малює кадр
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    // людина перейшла в хедер клавішею Tab — показуємо його
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
})();