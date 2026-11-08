let THREE; // Three.js підвантажується окремо, щоб ліва панель працювала навіть без 3D

/* =========================================================
   1. НАЛАШТУВАННЯ — чарми, ціни, картка
   Шляхи до картинок рахуються від index.html
   ========================================================= */

// Базовий дармовис, який завжди є в підсумку
const BASE = { name: 'Дармовис «Диявол у деталях»', price: 365 };

// Новий чарм = новий рядок. ring: 'top' — верхнє кільце, 'bottom' — нижнє
const CHARMS = [
    { name: 'Серце', price: 120, image: 'images/charms/serze.png', ring: 'top' },
    { name: 'Квітка', price: 120, image: 'images/charms/kvitka.png', ring: 'top' },
    { name: 'Коник', price: 120, image: 'images/charms/konuk.png', ring: 'bottom' },
    { name: 'Більярдна куля', price: 120, image: 'images/charms/bilyardna-kulya.png', ring: 'bottom' },
    { name: 'Серце', price: 120, image: 'images/charms/godunnuk.png', ring: 'top' },
    { name: 'Дизайн', price: 120, image: 'images/charms/design.png', ring: 'bottom' },
    { name: 'Диско куля', price: 120, image: 'images/charms/disko-kulya.png', ring: 'top' },
    { name: 'Жетон', price: 120, image: 'images/charms/jeton.png', ring: 'top' },
    { name: 'Мікрофон', price: 120, image: 'images/charms/microfon.png', ring: 'top' },
    { name: 'Клевер', price: 120, image: 'images/charms/klever.png', ring: 'top' },
    { name: 'Клавіатура', price: 120, image: 'images/charms/klaviatura.png', ring: 'top' },
    { name: 'Смайл', price: 120, image: 'images/charms/smile.png', ring: 'bottom' },
    { name: 'Срібне серце', price: 120, image: 'images/charms/sribne-serze.png', ring: 'bottom' },
    { name: 'Стакан', price: 120, image: 'images/charms/stakan.png', ring: 'bottom' },
    { name: 'AI', price: 120, image: 'images/charms/ai.png', ring: 'bottom' },
    { name: 'Photoshop', price: 120, image: 'images/charms/ps.png', ring: 'bottom' },
];

const CARD = {
    logo: 'images/card-logo.png',
    logoCrop: [270, 156, 516, 434], // яку частину картинки лого показувати (з Figma); null = всю
    color: '#ffffff',               // колір картки і звороту
    textColor: '#1b1b1d',
    cut: 8,                         // зріз кутів, у пікселях картки 122×176
};

/* =========================================================
   2. ФОРМА СТІЙКИ ТА КАМЕРА (одиниці 3D-сцени)
   ========================================================= */
const HOOKS = 8;                              // гачків на кільці
const STEP = (Math.PI * 2) / HOOKS;
const TIER_Y = { top: 0.71, bottom: -0.71 };  // висота кілець
const HUB_R = 0.09;      // муфта на стовпі
const RING_R = 0.28;     // центральне кільце
const ARM_R1 = 0.82;     // де гачок загинається вгору
const ARM_R2 = 0.98;     // кінець гачка
const ARM_LIFT = 0.16;   // наскільки піднятий кінець гачка
const ARM_W = 0.035;     // половина ширини петлі гачка
const WIRE = 0.011;      // товщина дроту
const CARD_R = 0.72;     // де на гачку висить картка
const CARD_W = 0.48;     // ширина картки

const VIEW_H = 4.3;      // менше число = стійка більша
const VIEW_W = 2.7;      // зменшуй у тій самій пропорції, що й VIEW_H
const VIEW_CY = -0.4;   // більший мінус = стійка вище, низ стовпа обрізається
const CAMERA_TILT = 9;   // погляд згори, градуси
const FOV = 28;

const DRAG_SPEED = 0.006; // поворот кільця за 1px руху
const INERTIA = 0.18;     // наскільки кільце докручується після відпускання

/* Картка в макеті: 122×176 */
const CW = 122;
const CH = 176;
const TEX_SCALE = 6;      // чіткість текстури картки
const CARD_H = CARD_W * (CH / CW);

/* =========================================================
   3. ДОПОМІЖНЕ
   ========================================================= */
const mod = (n, m) => ((n % m) + m) % m;
const formatPrice = (n) => `${n.toLocaleString('uk-UA')}\u00a0₴`;

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`Не вдалося завантажити: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

function cardShape(ctx) {
    const c = CARD.cut;
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.lineTo(CW - c, 0);
    ctx.lineTo(CW, c);
    ctx.lineTo(CW, CH - c);
    ctx.lineTo(CW - c, CH);
    ctx.lineTo(c, CH);
    ctx.lineTo(0, CH - c);
    ctx.lineTo(0, c);
    ctx.closePath();
}

// Малює картку на canvas: основа, лого, чарм, назва, проріз
function drawCard({ charmImg = null, logoImg = null, name = '' } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = CW * TEX_SCALE;
    canvas.height = CH * TEX_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(TEX_SCALE, TEX_SCALE);

    cardShape(ctx);
    ctx.fillStyle = CARD.color;
    ctx.fill();

    if (logoImg) {
        if (CARD.logoCrop) ctx.drawImage(logoImg, ...CARD.logoCrop, 7, 7, 26, 22);
        else ctx.drawImage(logoImg, 7, 7, 26, 22);
    }

    if (charmImg) ctx.drawImage(charmImg, 8, 39, 104, 104);

    if (name) {
        ctx.fillStyle = CARD.textColor;
        ctx.font = '400 7.6px Arimo, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), CW / 2, 160, CW - 16);
    }

    // проріз під гачок: вирізаємо наскрізь
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(46, 7, 30, 4, 2);
    ctx.fill();

    return canvas;
}

// Ламана лінія з м'якими кутами (для дроту)
function roundedPath(points, radius) {
    const path = new THREE.CurvePath();
    let prev = points[0].clone();
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1];
        const p = points[i];
        const b = points[i + 1];
        const r = Math.min(radius, p.distanceTo(a) / 2, p.distanceTo(b) / 2);
        const start = p.clone().addScaledVector(p.clone().sub(a).normalize(), -r);
        const end = p.clone().addScaledVector(b.clone().sub(p).normalize(), r);
        path.add(new THREE.LineCurve3(prev, start));
        path.add(new THREE.QuadraticBezierCurve3(start, p.clone(), end));
        prev = end;
    }
    path.add(new THREE.LineCurve3(prev, points[points.length - 1].clone()));
    return path;
}

/* =========================================================
   4. КОНСТРУКТОР
   ========================================================= */
const section = document.querySelector('[data-builder]');
if (section) init();

async function init() {
    const canvas = section.querySelector('[data-builder-canvas]');
    const stage = canvas.parentElement;
    const linesEl = section.querySelector('[data-summary-lines]');
    const totalEl = section.querySelector('[data-summary-total]');

    /* ---------- стан ---------- */
    const added = new Set();
    const tiers = ['top', 'bottom'].map((key) => ({
        key,
        charms: CHARMS.filter((c) => c.ring === key),
        ui: section.querySelector(`[data-ring="${key}"]`),
        step: 0,        // який чарм спереду
        angle: 0,       // поточний поворот кільця
        vel: 0,
        swing: 0,       // гойдання карток
        swingVel: 0,
        layoutStep: null,
        group: null,
        hooks: [],
    }));

    const selected = (t) => (t.charms.length ? t.charms[mod(t.step, t.charms.length)] : null);

    /* ---------- інтерфейс зліва ---------- */
    function renderRing(t) {
        const charm = selected(t);
        const addBtn = t.ui.querySelector('[data-ring-add]');
        t.ui.querySelector('[data-ring-name]').textContent = charm ? charm.name : 'Скоро тут будуть чарми';
        t.ui.querySelector('[data-ring-price]').textContent = charm ? formatPrice(charm.price) : '';

        const isAdded = Boolean(charm && added.has(charm));
        addBtn.disabled = !charm;
        addBtn.textContent = isAdded ? 'Прибрати з дармовиса' : 'Додати до дармовиса';
        addBtn.classList.toggle('is-added', isAdded);

        t.ui.querySelectorAll('[data-dir]').forEach((btn) => {
            btn.disabled = t.charms.length < 2;
        });
    }

    function summaryLine(item, removable) {
        const li = document.createElement('li');
        li.className = 'summary__line';

        const name = document.createElement('span');
        name.className = 'summary__line-name';
        name.textContent = item.name;

        const end = document.createElement('span');
        end.className = 'summary__line-end';

        const price = document.createElement('span');
        price.className = 'summary__line-price';
        price.textContent = formatPrice(item.price);
        end.append(price);

        if (removable) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'summary__remove';
            btn.setAttribute('aria-label', `Прибрати «${item.name}»`);
            btn.textContent = '×';
            btn.addEventListener('click', () => toggle(item));
            end.append(btn);
        }

        li.append(name, end);
        return li;
    }

    function renderSummary() {
        const charms = CHARMS.filter((c) => added.has(c));
        linesEl.replaceChildren(summaryLine(BASE, false), ...charms.map((c) => summaryLine(c, true)));
        const total = charms.reduce((sum, c) => sum + c.price, BASE.price);
        totalEl.textContent = formatPrice(total);
    }

    function toggle(charm) {
        if (added.has(charm)) added.delete(charm);
        else added.add(charm);
        tiers.filter((t) => t.key === charm.ring).forEach(renderRing);
        renderSummary();
    }

    function rotateBy(t, dir) {
        if (t.charms.length < 2) return;
        t.step += dir;
        renderRing(t);
    }

    tiers.forEach((t) => {
        t.ui.querySelectorAll('[data-dir]').forEach((btn) => {
            btn.addEventListener('click', () => rotateBy(t, Number(btn.dataset.dir)));
        });
        t.ui.querySelector('[data-ring-add]').addEventListener('click', () => {
            const charm = selected(t);
            if (charm) toggle(charm);
        });
        renderRing(t);
    });
    renderSummary();

    /* ---------- 3D ---------- */
    try {
        await setupScene();
    } catch (err) {
        console.warn('3D-стійка недоступна:', err);
        section.classList.add('is-no3d');
    }

    async function setupScene() {
        THREE = await import('three');
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(2, 4, 5);
        scene.add(light);

        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);

        /* --- картинки та текстури --- */
        await document.fonts.load('400 16px Arimo');
        const [logoImg, ...charmImgs] = await Promise.all([
            loadImage(CARD.logo),
            ...CHARMS.map((c) => loadImage(c.image)),
        ]);

        const makeTexture = (cnv) => {
            const tex = new THREE.CanvasTexture(cnv);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            return tex;
        };

        const textures = new Map();
        CHARMS.forEach((c, i) => {
            textures.set(c, makeTexture(drawCard({ charmImg: charmImgs[i], logoImg, name: c.name })));
        });
        const backTexture = makeTexture(drawCard());

        const cardMaterial = (map) => new THREE.MeshStandardMaterial({
            map,
            emissive: 0xffffff,
            emissiveMap: map,
            emissiveIntensity: 0.3,
            roughness: 0.7,
            metalness: 0,
            alphaTest: 0.5,
            toneMapped: false,
        });

        /* --- стійка --- */
        const metal = new THREE.MeshStandardMaterial({ color: 0x0d0d10, metalness: 0.6, roughness: 0.35 });

        const addCylinder = (parent, r, h, y, rBottom = r) => {
            const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, rBottom, h, 40), metal);
            mesh.position.y = y;
            parent.add(mesh);
            return mesh;
        };

        addCylinder(scene, 0.065, 8, 1.34 - 4);     // нижня частина стовпа
        addCylinder(scene, 0.078, 0.1, 1.34);       // муфта
        addCylinder(scene, 0.052, 1.41, 2.045);     // верхня частина
        const cap = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 12, 32), metal);
        cap.rotation.x = Math.PI / 2;
        cap.position.y = 2.75;
        scene.add(cap);

        const armGeometry = new THREE.TubeGeometry(
            roundedPath([
                new THREE.Vector3(-ARM_W, 0, HUB_R),
                new THREE.Vector3(-ARM_W, 0, ARM_R1),
                new THREE.Vector3(-ARM_W, ARM_LIFT, ARM_R2),
                new THREE.Vector3(ARM_W, ARM_LIFT, ARM_R2),
                new THREE.Vector3(ARM_W, 0, ARM_R1),
                new THREE.Vector3(ARM_W, 0, HUB_R),
            ], 0.03),
            160, WIRE, 8, false,
        );
        const ringGeometry = new THREE.TorusGeometry(RING_R, WIRE, 8, 96);

        const cardGeometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
        // точка підвісу — проріз картки
        cardGeometry.translate(0, -CARD_H / 2 + CARD_H * (9 / CH), 0);

        tiers.forEach((t) => {
            const group = new THREE.Group();
            group.position.y = TIER_Y[t.key];
            scene.add(group);
            t.group = group;

            addCylinder(group, HUB_R, 0.24, 0.02);
            addCylinder(group, HUB_R, 0.1, -0.15, 0.065);

            const ring = new THREE.Mesh(ringGeometry, metal);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);

            for (let k = 0; k < HOOKS; k++) {
                const holder = new THREE.Group();
                holder.rotation.y = k * STEP;
                group.add(holder);
                holder.add(new THREE.Mesh(armGeometry, metal));

                const card = new THREE.Group();
                card.position.z = CARD_R;
                holder.add(card);

                const front = new THREE.Mesh(cardGeometry, cardMaterial(backTexture));
                front.position.z = 0.003;
                const back = new THREE.Mesh(cardGeometry, cardMaterial(backTexture));
                back.rotation.y = Math.PI;
                back.position.z = -0.003;
                card.add(front, back);
                card.visible = false;

                const hook = { index: k, card, front, charm: null };
                front.userData = { tier: t, hook };
                back.userData = { tier: t, hook };
                t.hooks.push(hook);
            }
        });

        /* --- які чарми на яких гачках --- */
        function layoutCards(t) {
            const s = Math.round(t.angle / STEP);
            if (s === t.layoutStep) return;
            t.layoutStep = s;

            const n = t.charms.length;
            for (let d = -3; d <= 4; d++) {
                const hook = t.hooks[mod(s + d, HOOKS)];
                const inWindow = n >= HOOKS || (d >= -Math.floor((n - 1) / 2) && d <= Math.ceil((n - 1) / 2));
                if (!n || !inWindow) {
                    hook.card.visible = false;
                    hook.charm = null;
                    continue;
                }
                const charm = t.charms[mod(s + d, n)];
                const tex = textures.get(charm);
                hook.charm = charm;
                hook.card.visible = true;
                hook.front.material.map = tex;
                hook.front.material.emissiveMap = tex;
            }
        }

        /* --- камера під розмір блоку --- */
        function fit() {
            const w = stage.clientWidth;
            const h = stage.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            const viewH = Math.max(VIEW_H, VIEW_W / camera.aspect);
            const dist = viewH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
            const tilt = THREE.MathUtils.degToRad(CAMERA_TILT);
            camera.position.set(0, VIEW_CY + Math.sin(tilt) * dist, Math.cos(tilt) * dist);
            camera.lookAt(0, VIEW_CY, 0);
            camera.updateProjectionMatrix();
        }
        fit();
        new ResizeObserver(fit).observe(stage);

        /* --- перетягування мишкою / пальцем --- */
        const drag = { tier: null, id: null, startX: 0, startAngle: 0, lastT: 0, moved: false };

        function pickTier(e) {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            let best = tiers[0];
            let bestDist = Infinity;
            tiers.forEach((t) => {
                // трохи нижче кільця, бо там висять картки
                const p = new THREE.Vector3(0, TIER_Y[t.key] - 0.25, 0).project(camera);
                const dist = Math.abs(((1 - p.y) / 2) * rect.height - y);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = t;
                }
            });
            return best;
        }

        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();

        function handleClick(e) {
            const rect = canvas.getBoundingClientRect();
            ndc.set(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1,
            );
            raycaster.setFromCamera(ndc, camera);
            const meshes = tiers.flatMap((t) => t.hooks.filter((h) => h.card.visible).flatMap((h) => h.card.children));
            const hit = raycaster.intersectObjects(meshes, false)[0];
            if (!hit) return;

            const { tier, hook } = hit.object.userData;
            const d = mod(hook.index - tier.step + 4, HOOKS) - 4;
            if (d === 0 && hook.charm) toggle(hook.charm);   // передня картка: додати / прибрати
            else rotateBy(tier, d);                          // бокова: підкрутити до себе
        }

        canvas.addEventListener('pointerdown', (e) => {
            const t = pickTier(e);
            drag.tier = t;
            drag.id = e.pointerId;
            drag.startX = e.clientX;
            drag.startAngle = t.angle;
            drag.lastT = performance.now();
            drag.moved = false;
            canvas.setPointerCapture(e.pointerId);
        });

        canvas.addEventListener('pointermove', (e) => {
            const t = drag.tier;
            if (!t || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.startX;
            if (!drag.moved && Math.abs(dx) > 6 && t.charms.length > 1) {
                drag.moved = true;
                canvas.classList.add('is-dragging');
            }
            if (!drag.moved) return;

            const now = performance.now();
            const dt = Math.max((now - drag.lastT) / 1000, 1 / 120);
            const prev = t.angle;
            t.angle = drag.startAngle - dx * DRAG_SPEED;
            t.vel = t.vel * 0.6 + ((t.angle - prev) / dt) * 0.4;
            drag.lastT = now;
        });

        const endDrag = (e) => {
            const t = drag.tier;
            if (!t || e.pointerId !== drag.id) return;
            if (drag.moved) {
                t.step = Math.round((t.angle + t.vel * INERTIA) / STEP);
                renderRing(t);
            } else if (e.type === 'pointerup') {
                handleClick(e);
            }
            drag.tier = null;
            canvas.classList.remove('is-dragging');
        };
        canvas.addEventListener('pointerup', endDrag);
        canvas.addEventListener('pointercancel', endDrag);

        /* --- анімація --- */
        function animateTier(t, dt) {
            if (drag.tier !== t || !drag.moved) {
                // пружина: кільце м'яко доїжджає до потрібного чарму
                const k = 120;
                const acc = k * (t.step * STEP - t.angle) - 2 * Math.sqrt(k) * t.vel;
                t.vel += acc * dt;
                t.angle += t.vel * dt;
            }
            t.group.rotation.y = -t.angle;
            layoutCards(t);

            // картки гойдаються, коли кільце крутиться
            const swingTarget = THREE.MathUtils.clamp(-t.vel * 0.08, -0.35, 0.35);
            t.swingVel += (70 * (swingTarget - t.swing) - 5 * t.swingVel) * dt;
            t.swing += t.swingVel * dt;
            t.hooks.forEach((h) => {
                h.card.rotation.z = t.swing;
            });
        }

        const clock = new THREE.Clock();
        let running = false;

        function frame() {
            if (!running) return;
            const dt = Math.min(clock.getDelta(), 1 / 30);
            tiers.forEach((t) => animateTier(t, dt));
            renderer.render(scene, camera);
            requestAnimationFrame(frame);
        }

        // малюємо тільки коли блок видно на екрані
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !running) {
                running = true;
                clock.getDelta();
                requestAnimationFrame(frame);
            } else if (!entry.isIntersecting) {
                running = false;
            }
        }).observe(stage);
    }
}