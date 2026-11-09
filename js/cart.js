/* =========================================================
   1. ТОВАР І КОШИК
   ========================================================= */

// Базовий дармовис — те, що купують кнопкою «Хочу цей»
export const PRODUCT = {
    name: 'Дармовис «Диявол у деталях»',
    note: 'Базовий набір',
    price: 365,
    image: 'images/hero-keychain.png',
};

const state = { qty: 0, withBase: true, charms: [] };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export const cart = {
    get qty() { return state.qty; },
    get withBase() { return state.withBase; },
    get charms() { return [...state.charms]; },
    // порожній: нічого не поклали або прибрали і дармовис, і всі чарми
    get isEmpty() { return state.qty === 0 || (!state.withBase && !state.charms.length); },
    // ціна одного набору: дармовис (якщо є) + обрані чарми
    get setPrice() {
        return state.charms.reduce((sum, c) => sum + c.price, state.withBase ? PRODUCT.price : 0);
    },
    get total() { return this.setPrice * state.qty; },

    hasCharm(charm) { return state.charms.includes(charm); },

    toggleCharm(charm) {
        if (this.hasCharm(charm)) {
            state.charms = state.charms.filter((c) => c !== charm);
        } else {
            state.charms.push(charm);
            if (!state.qty) state.qty = 1;
        }
        emit();
    },

    setQty(n) {
        state.qty = Math.min(99, Math.max(1, n));
        emit();
    },

    // прибрати / повернути сам дармовис (можна замовити лише чарми)
    setBase(on) {
        state.withBase = on;
        if (!on) state.qty = Math.min(state.qty, 1);
        emit();
    },

    // «Хочу цей»: кладемо саме дармовис
    ensureItem() {
        state.withBase = true;
        if (!state.qty) state.qty = 1;
        emit();
    },

    // «Оформити замовлення» в конструкторі: беремо те, що зібрано
    ensureQty() {
        if (!state.qty) state.qty = 1;
        emit();
    },

    clear() {
        state.qty = 0;
        state.withBase = true;
        state.charms = [];
        emit();
    },

    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};

export const formatPrice = (n) => `${n.toLocaleString('uk-UA')}\u00a0₴`;

/* =========================================================
   2. ВІДПРАВКА ЗАМОВЛЕННЯ
   Тут пізніше буде запит до платіжного сервісу / сервера.
   Зараз це заглушка: просто повертає номер замовлення.
   ========================================================= */
async function submitOrder(order) {
    console.info('Замовлення:', order);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return `ZB-${String(Date.now()).slice(-6)}`;
}

/* =========================================================
   3. ПАНЕЛЬ ЗАМОВЛЕННЯ
   ========================================================= */
const dialog = document.querySelector('[data-checkout]');
if (dialog) initCheckout(dialog);

function initCheckout(dialog) {
    const $ = (sel) => dialog.querySelector(sel);
    const $$ = (sel) => [...dialog.querySelectorAll(sel)];

    const TITLES = { cart: 'Кошик', delivery: 'Доставка', payment: 'Оплата' };
    const ORDER = ['cart', 'delivery', 'payment'];
    let step = 'cart';

    /* ---------- відкрити / закрити ---------- */
    function open() {
        goTo('cart');
        document.documentElement.classList.add('is-locked');
        dialog.showModal();
    }

    function close() {
        document.documentElement.classList.remove('is-locked');
        dialog.close();
    }

    dialog.addEventListener('close', () => {
        document.documentElement.classList.remove('is-locked');
        if (step === 'done') goTo('cart');
    });

    // клік по затемненню поза панеллю
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) close();
    });

    // кнопки на сторінці:
    // data-cart-open — просто відкрити кошик
    // data-cart-buy — покласти дармовис і відкрити
    // data-cart-checkout — відкрити з тим, що зібрано в конструкторі
    document.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-cart-open], [data-cart-buy], [data-cart-checkout]');
        if (opener) {
            e.preventDefault();
            if (opener.hasAttribute('data-cart-buy')) cart.ensureItem();
            if (opener.hasAttribute('data-cart-checkout')) cart.ensureQty();
            open();
            return;
        }
        if (e.target.closest('[data-checkout-close]')) close();
    });

    /* ---------- кроки ---------- */
    function goTo(next) {
        step = next;
        $$('[data-step]').forEach((el) => { el.hidden = el.dataset.step !== next; });

        const isDone = next === 'done';
        $('[data-checkout-head]').hidden = isDone;
        if (!isDone) {
            $('[data-checkout-title]').textContent = TITLES[next];
            $('[data-checkout-back]').hidden = next === 'cart';
            const index = ORDER.indexOf(next);
            $$('[data-progress]').forEach((el, i) => {
                el.classList.toggle('is-active', i <= index);
                el.classList.toggle('is-current', i === index);
            });
        }

        if (next === 'payment') renderPayment();
        dialog.querySelector('.checkout__panel').scrollTop = 0;
        $$('.checkout__body').forEach((b) => { b.scrollTop = 0; });
    }

    $('[data-checkout-back]').addEventListener('click', () => {
        goTo(ORDER[Math.max(0, ORDER.indexOf(step) - 1)]);
    });

    /* ---------- крок 1: кошик ---------- */
    const qtyValue = $('[data-qty-value]');
    const charmsList = $('[data-cart-charms]');

    function renderCart() {
        const empty = cart.isEmpty;
        $('[data-cart-empty]').hidden = !empty;
        $('[data-cart-filled]').hidden = empty;
        $('[data-cart-footer]').hidden = empty;
        if (empty) return;

        // без дармовиса: ховаємо його блок, чарми показуємо як основні
        $('[data-cart-product]').hidden = !cart.withBase;
        $('[data-cart-charms-block] .checkout__label').textContent =
            cart.withBase ? 'Додаткові чарми' : 'Чарми';

        qtyValue.textContent = cart.qty;
        // на одиниці мінус прибирає дармовис із замовлення
        $('[data-qty-minus]').setAttribute('aria-label', cart.qty > 1 ? 'Менше' : 'Прибрати дармовис');

        const charms = cart.charms;
        $('[data-cart-charms-block]').hidden = !charms.length;
        charmsList.replaceChildren(...charms.map((charm) => {
            const li = document.createElement('li');
            li.className = 'cart-charms__item';

            const name = document.createElement('span');
            name.textContent = charm.name;

            const price = document.createElement('span');
            price.className = 'cart-charms__price';
            price.textContent = `${cart.withBase ? '+' : ''}${formatPrice(charm.price)}`;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'cart-charms__remove';
            remove.setAttribute('aria-label', `Прибрати «${charm.name}»`);
            remove.textContent = '×';
            remove.addEventListener('click', () => cart.toggleCharm(charm));

            li.append(name, price, remove);
            return li;
        }));
    }

    function renderTotals() {
        $$('[data-cart-total]').forEach((el) => { el.textContent = formatPrice(cart.total); });
        $('[data-pay-label]').textContent = payLabel();
    }

    $('[data-qty-minus]').addEventListener('click', () => {
        if (cart.qty > 1) cart.setQty(cart.qty - 1);
        else cart.setBase(false);
    });
    $('[data-qty-plus]').addEventListener('click', () => cart.setQty(cart.qty + 1));
    $('[data-go-delivery]').addEventListener('click', () => goTo('delivery'));

    $('[data-product-name]').textContent = PRODUCT.name;
    $('[data-product-note]').textContent = PRODUCT.note;
    $('[data-product-price]').textContent = formatPrice(PRODUCT.price);
    $('[data-product-image]').src = PRODUCT.image;

    /* ---------- крок 2: доставка ---------- */
    const deliveryForm = $('[data-delivery-form]');

    // Відділення / Поштомат: міняємо підпис поля
    deliveryForm.addEventListener('change', (e) => {
        if (e.target.name !== 'deliveryType') return;
        const isLocker = e.target.value === 'locker';
        $('[data-branch-label]').textContent = isLocker ? 'Поштомат' : 'Відділення';
        $('[data-branch-input]').placeholder = isLocker ? 'Номер поштомата' : 'Номер відділення';
    });

    const toPayment = () => {
        if (deliveryForm.reportValidity()) goTo('payment');
    };
    $('[data-go-payment]').addEventListener('click', toPayment);
    // Enter у полі форми — теж «До оплати», без перезавантаження сторінки
    deliveryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        toPayment();
    });

    function deliveryData() {
        return Object.fromEntries(new FormData(deliveryForm));
    }

    /* ---------- крок 3: оплата ---------- */
    const paymentForm = $('[data-payment-form]');

    function renderPayment() {
        const d = deliveryData();
        const place = d.deliveryType === 'locker' ? 'поштомат' : 'відділення';
        $('[data-summary-person]').textContent = `${d.firstName} ${d.lastName} · ${d.phone}`;
        $('[data-summary-address]').textContent = `${d.city}, ${place} №${d.branch}`;
        renderTotals();
        toggleCardFields();
    }

    $('[data-edit-delivery]').addEventListener('click', () => goTo('delivery'));

    const method = () => paymentForm.elements.payMethod.value;
    const payLabel = () => (method() === 'cod'
        ? 'Підтвердити замовлення'
        : `Оплатити ${formatPrice(cart.total)}`);

    // поля картки потрібні лише для оплати карткою
    function toggleCardFields() {
        const isCard = method() === 'card';
        $$('[data-card-field]').forEach((input) => { input.required = isCard; });
    }

    paymentForm.addEventListener('change', () => {
        toggleCardFields();
        renderTotals();
    });

    // форматування полів картки під час введення
    const digits = (v) => v.replace(/\D/g, '');
    $('[data-card-number]').addEventListener('input', (e) => {
        e.target.value = digits(e.target.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    });
    $('[data-card-exp]').addEventListener('input', (e) => {
        const d = digits(e.target.value).slice(0, 4);
        e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    });
    $('[data-card-cvv]').addEventListener('input', (e) => {
        e.target.value = digits(e.target.value).slice(0, 3);
    });

    async function placeOrder(payMethod) {
        // Apple Pay / Google Pay: поля картки не потрібні, лише згода з офертою
        const isWallet = payMethod === 'apple-pay' || payMethod === 'google-pay';
        const valid = isWallet
            ? paymentForm.elements.offer.reportValidity()
            : paymentForm.reportValidity();
        if (!valid) return;

        const button = $('[data-place-order]');
        button.disabled = true;
        button.classList.add('is-loading');

        try {
            const number = await submitOrder({
                product: cart.withBase ? PRODUCT.name : null,
                qty: cart.qty,
                charms: cart.charms.map((c) => c.name),
                total: cart.total,
                delivery: deliveryData(),
                payMethod,
            });
            $('[data-order-number]').textContent = `№${number}`;
            cart.clear();
            paymentForm.reset();
            deliveryForm.reset();
            // повертаємо підпис «Відділення» після очищення форми
            deliveryForm.querySelector('[value="branch"]').dispatchEvent(new Event('change', { bubbles: true }));
            goTo('done');
        } finally {
            button.disabled = false;
            button.classList.remove('is-loading');
        }
    }

    $('[data-place-order]').addEventListener('click', () => placeOrder(method()));
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        placeOrder(method());
    });
    $$('[data-wallet]').forEach((btn) => {
        btn.addEventListener('click', () => placeOrder(btn.dataset.wallet));
    });

    /* ---------- старт ---------- */
    cart.subscribe(() => {
        renderCart();
        renderTotals();
    });
    renderCart();
    renderTotals();
}