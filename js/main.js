import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initBackground, updateBackground, setParallaxActive, setInvertEffect, getLayerMeshes, setTransitionActive } from '../background/background.js';
import { initBook } from '../book/book.js';
import { initDrag } from '../book/drag.js';
import { initOblivionTransition, BlackHoleDistortShader } from '../book/oblivion-transition.js';

// ─── Splash de chargement ─────────────────────────────────────────────────
// Le splash ne se débloque que quand DEUX conditions sont réunies :
// 1. l'init complète du site est terminée (toutes les requêtes de textures lancées)
// 2. le DefaultLoadingManager est au repos (tout ce qui a été lancé est arrivé)
// Sinon onLoad se déclenche dès la première vague et le splash part trop tôt.
const splashEl = document.getElementById('splash');
const splashBar = document.getElementById('splash-bar');
const splashEnter = document.getElementById('splash-enter');
let splashGone = false, managerIdle = false, appInitDone = false;

const splashPct = document.getElementById('splash-pct');

// Messages de chargement en clin d'œil aux Métiers du Livre — remplacent le
// texte de statut, tournent tant que le splash est affiché.
const SPLASH_MESSAGES = [
    'En attente du BAT...',
    'Impression CMJN en cours...',
    'Massicotage des marges...',
    'Assemblage des cahiers...',
    'Contrôle du repérage couleur...',
    'Façonnage en cours...',
    'Brochage dos carré collé...',
    'Vérification du colophon...',
    'Calibrage de la tranchefile...',
    'Correction des dernières coquilles...',
    'Mise en presse...',
    'Reliure en cours...',
];
const splashStatus = document.getElementById('splash-status');
let splashMsgIdx = 0;
const splashMsgTimer = setInterval(() => {
    if (splashGone) { clearInterval(splashMsgTimer); return; }
    splashMsgIdx = (splashMsgIdx + 1) % SPLASH_MESSAGES.length;
    splashStatus.textContent = SPLASH_MESSAGES[splashMsgIdx];
}, 1800);

// La texture procédurale Note Climber sur la porte a été retirée (bug de
// composition jamais résolu, cf. session du 2026-09-13) — la porte affiche
// désormais simplement l'illustration statique du PNG de l'arche.

function enterReady() {
    if (splashGone) return;
    splashBar.style.width = '100%';
    splashPct.textContent = '100%';
    splashEnter.classList.add('ready');
}
function maybeReady() { if (managerIdle && appInitDone) enterReady(); }

// Ouverture de la porte : la porte (#splash-door-tex) est PAR-DESSUS le fond
// beige (bgEl) — donc la faire disparaître en opacité ne révélerait que le
// beige derrière elle, pas la scène 3D. Ce qu'on veut : que la porte passe
// de la texture voie lactée à un vrai "trou" qui laisse voir à travers le
// fond beige. Solution : découper la silhouette de la porte (même forme que
// le clip-path CSS de #splash-door-tex) dans l'arche ET dans le fond beige
// DÈS le clic, MAIS ce trou reste invisible tant que la texture de la porte
// (opaque, par-dessus) le masque encore — il n'apparaît qu'au fur et à
// mesure que cette texture s'efface en fondu. L'arche et le fond beige eux-
// mêmes ne disparaissent jamais : seule la texture de la porte s'efface, et
// le trou déjà découpé prend le relais visuellement.
splashEnter.addEventListener('click', () => {
    if (splashGone) return;
    splashGone = true;
    const archEl = document.getElementById('splash-arch');
    const bgEl = document.getElementById('splash-bg');
    const doorEl = document.getElementById('splash-door-tex');
    const r = archEl.getBoundingClientRect();
    const doorLeft = r.left + r.width * 0.342;
    const doorRight = r.left + r.width * 0.658;
    const doorTop = r.top + r.height * 0.405;
    const doorBottom = r.top + r.height * 0.90;
    const rad = (doorRight - doorLeft) / 2;
    const cx = doorLeft + rad, archY = doorTop + rad;

    // Même technique "trou de serrure" que l'ancienne animation d'encoche,
    // mais appliquée une seule fois, à sa taille finale — pas de croissance
    // animée du clip-path (c'était la source du lag), juste un trou fixe.
    function doorHole(w, h, ox, oy) {
        const dL = doorLeft - ox, dR = doorRight - ox, aY = archY - oy, nb = doorBottom - oy;
        const pts = [[0, 0], [w, 0], [w, h], [dR, h], [dR, nb], [dR, aY]];
        const steps = 16;
        for (let i = 1; i <= steps; i++) {
            const t = (i / steps) * Math.PI;
            pts.push([cx - ox + rad * Math.cos(t), aY - rad * Math.sin(t)]);
        }
        pts.push([dL, nb], [dR, nb], [dR, h], [0, h]);
        return `polygon(${pts.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
    }
    archEl.style.clipPath = doorHole(r.width, r.height, r.left, r.top);
    bgEl.style.clipPath   = doorHole(innerWidth, innerHeight, 0, 0);

    const doorCenterX = (doorLeft + doorRight) / 2;
    const doorCenterY = (archY + doorBottom) / 2;
    const archOriginX = ((doorCenterX - r.left) / r.width) * 100;
    const archOriginY = ((doorCenterY - r.top) / r.height) * 100;
    const bgOriginX = (doorCenterX / innerWidth) * 100;
    const bgOriginY = (doorCenterY / innerHeight) * 100;

    // Le zoom se contente d'un facteur modeste (x3) — plus la peine de
    // pousser à x14 puisque l'arche et le fond ne s'effacent plus, seul le
    // scale les fait sortir du cadre. will-change force la promotion en
    // couche GPU avant le premier frame animé (évite le lag observé quand
    // le navigateur re-rastérisait l'image à chaque frame).
    gsap.set([archEl, bgEl], { willChange: 'transform' });
    gsap.to(doorEl, { opacity: 0, duration: 0.5, ease: 'power1.out' });
    gsap.to(archEl, { scale: 10, transformOrigin: `${archOriginX}% ${archOriginY}%`, duration: 0.9, ease: 'power2.in' });
    gsap.to(bgEl,   { scale: 10, transformOrigin: `${bgOriginX}% ${bgOriginY}%`,   duration: 0.9, ease: 'power2.in', onComplete: () => splashEl.remove() });

    gsap.to(['.splash-desc', '#splash-status', '.splash-track', '#splash-pct', '#splash-enter']
        .map(sel => document.querySelector(sel)), { opacity: 0, duration: 0.3 });
});

THREE.DefaultLoadingManager.onStart = () => { managerIdle = false; };
THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100) + '%';
    splashBar.style.width = pct;
    splashPct.textContent = pct;
};
THREE.DefaultLoadingManager.onLoad = () => { managerIdle = true; maybeReady(); };
setTimeout(enterReady, 25000); // garde-fou si une ressource ne répond jamais

// ─── Renderer ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.domElement.style.zIndex = '3';
renderer.setClearColor(0xE8D5A8, 1);
document.body.appendChild(renderer.domElement);

// ─── Scène & caméra ───────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

// ─── Post-process : pass de distorsion trou noir (identité tant que uStrength=0) ─
const _dbSize = renderer.getDrawingBufferSize(new THREE.Vector2());
const _composerRT = new THREE.WebGLRenderTarget(_dbSize.x, _dbSize.y, { samples: 4 });
const composer = new EffectComposer(renderer, _composerRT);
composer.addPass(new RenderPass(scene, camera));
const distortPass = new ShaderPass(BlackHoleDistortShader);
composer.addPass(distortPass);
composer.addPass(new OutputPass());   // tone mapping + sRGB : couleurs identiques à l'original

// ─── Init modules ─────────────────────────────────────────────────────────
// On laisse le navigateur peindre au moins une image AVANT de lancer le
// chargement lourd (texture 4K de la couverture, polices, construction du
// livre) : sans ça, ce travail — surtout synchrone (upload GPU des
// textures, construction de la géométrie) — démarre sur la MÊME image que
// le splash et peut geler sa première boucle d'affichage, y compris celle
// de la texture de la porte (déjà programmée plus haut). Un seul yield
// garantit que le preloader a fini de s'afficher avant que le reste ne
// vienne concurrencer le thread principal.
await new Promise(requestAnimationFrame);
initBackground(scene, camera);
const bookRef = await initBook(scene, renderer);
initDrag(renderer, camera, bookRef,
    () => setParallaxActive(false),
    () => { if (!window._bookIsOpen) setParallaxActive(true); }
);

// Init terminée : toutes les requêtes de ressources sont désormais lancées
appInitDone = true;
maybeReady();

window._setParallaxActive = setParallaxActive;

// ─── Transition Codex → Oblivion (trou noir + aspiration + vertigo) ───────
const oblivionTransition = initOblivionTransition({
    scene, camera, bookRef, renderer,
    getLayerMeshes, setTransitionActive, setParallaxActive, distortPass,
});

// ─── Hotspots cliquables sur les pages ────────────────────────────────────
// Zones UV : u gauche→droite, v bas→haut sur l'image de la page.
// side : 'left' = page de gauche (verso), 'right' = page de droite (recto).
const oblivionMenu = document.getElementById('oblivion-menu');
const openOblivionMenu = () => oblivionMenu.classList.add('visible');
// Seul le hotspot Oblivion existe encore sur les nouvelles pages (2026-09-13) —
// les hotspots téléchargement (page 19) et portfolios (page 1) ont été
// retirés en même temps que les pages qui les portaient. #download-menu et
// #but-menu restent dans le HTML (fermeture générique + génération du PDF
// BUT2 intactes) mais ne sont plus atteignables depuis le livre tant qu'un
// nouveau déclencheur ne leur est pas donné.
// Sommaire cliquable (pages 2-3, spread 1) : saut direct vers la page cible
// (pas de feuilletage animé, trop loin pour un flip à chaque fois). Zones UV
// estimées visuellement (pas d'accès navigateur pour les mesurer au pixel) —
// à ajuster après un premier test si le clic tombe à côté de la ligne visée.
function jumpToPage(p) { if (window._jumpToSpread) window._jumpToSpread(Math.floor(p / 2)); }
const TOC_HOTSPOTS = [
    // Page 2 (gauche) — sommaire BUT I
    { side: 'left', vMin: 0.68,  vMax: 0.72,  page: 4  }, // Préface
    { side: 'left', vMin: 0.61,  vMax: 0.655, page: 6  }, // Il dipinto dell'anno
    { side: 'left', vMin: 0.545, vMax: 0.585, page: 8  }, // In principio
    { side: 'left', vMin: 0.48,  vMax: 0.52,  page: 10 }, // Il teatro della cultura FNAC
    { side: 'left', vMin: 0.415, vMax: 0.455, page: 12 }, // Stage saison 2
    { side: 'left', vMin: 0.35,  vMax: 0.39,  page: 14 }, // Alternatives
    { side: 'left', vMin: 0.285, vMax: 0.325, page: 16 }, // Postremo
    // Page 3 (droite) — sommaire BUT II
    { side: 'right', vMin: 0.705, vMax: 0.75,  page: 20 }, // Il dipinto dell'anno
    { side: 'right', vMin: 0.64,  vMax: 0.685, page: 22 }, // In principio
    { side: 'right', vMin: 0.575, vMax: 0.62,  page: 24 }, // Torn to Oblivion
    { side: 'right', vMin: 0.51,  vMax: 0.555, page: 26 }, // Mi piacciono le keftédès
    { side: 'right', vMin: 0.445, vMax: 0.49,  page: 28 }, // Colibrì dei libri
    { side: 'right', vMin: 0.38,  vMax: 0.425, page: 30 }, // Et sequentes
    { side: 'right', vMin: 0.315, vMax: 0.36,  page: 32 }, // Postremo
    { side: 'right', vMin: 0.25,  vMax: 0.295, page: 34 }, // ???
].map(({ side, vMin, vMax, page }) => ({
    spread: 1, side, uv: { uMin: 0.06, uMax: 0.94, vMin, vMax },
    action: () => jumpToPage(page),
}));

const HOTSPOTS = [
    // Pages 24-25 : cœur du trou noir (à cheval sur la reliure) → portail Oblivion
    { spread: 12, side: 'left',  uv: { uMin: 0.86, uMax: 1.00, vMin: 0.42, vMax: 0.58 }, action: openOblivionMenu },
    { spread: 12, side: 'right', uv: { uMin: 0.00, uMax: 0.15, vMin: 0.42, vMax: 0.58 }, action: openOblivionMenu },
    ...TOC_HOTSPOTS,
];
const _dlRay = new THREE.Raycaster();
const _dlPtr = new THREE.Vector2();

function hotspotAt(e) {
    if (!window._bookIsOpen || !window._getSpread || !window._leaves) return null;
    const { spreadIndex, isFlipping } = window._getSpread();
    if (isFlipping) return null;
    const spots = HOTSPOTS.filter(h => h.spread === spreadIndex);
    if (!spots.length) return null;
    _dlPtr.x =  (e.clientX / innerWidth)  * 2 - 1;
    _dlPtr.y = -(e.clientY / innerHeight) * 2 + 1;
    _dlRay.setFromCamera(_dlPtr, camera);
    for (const spot of spots) {
        const group = spot.side === 'left' ? window._leaves[0] : window._leaves[1];
        if (!group || !group.visible) continue;
        const hit = _dlRay.intersectObject(group.children[0], false)[0];
        if (!hit || !hit.uv) continue;
        if (hit.uv.x >= spot.uv.uMin && hit.uv.x <= spot.uv.uMax
         && hit.uv.y >= spot.uv.vMin && hit.uv.y <= spot.uv.vMax) return spot;
    }
    return null;
}

renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = hotspotAt(e) ? 'pointer' : '';
});
renderer.domElement.addEventListener('click', (e) => {
    const spot = hotspotAt(e);
    if (spot) spot.action();
});

// Fermeture des overlays : croix, clic hors cadre, ou bouton d'annulation
document.querySelectorAll('.overlay-menu').forEach(menu => {
    menu.addEventListener('click', (e) => { if (e.target === menu) menu.classList.remove('visible'); });
    menu.querySelector('.menu-close').addEventListener('click', () => menu.classList.remove('visible'));
});
const versionDropdown = document.getElementById('version-dropdown');
document.getElementById('beta-tag').addEventListener('click', (e) => {
    e.stopPropagation();
    versionDropdown.classList.toggle('visible');
});
document.addEventListener('click', (e) => {
    if (versionDropdown.classList.contains('visible') && !versionDropdown.contains(e.target)) {
        versionDropdown.classList.remove('visible');
    }
});
document.getElementById('oblivion-cancel').addEventListener('click', (e) => {
    e.preventDefault();
    oblivionMenu.classList.remove('visible');
});
document.getElementById('oblivion-go').addEventListener('click', (e) => {
    e.preventDefault();
    oblivionMenu.classList.remove('visible');
    oblivionTransition.play(false);
});

// ─── Navigation pages ───────────────────────────────────────────────────────
document.getElementById('next-page').onclick    = () => window.flipForward && window.flipForward();
document.getElementById('prev-page').onclick    = () => window.flipBack    && window.flipBack();
document.getElementById('overlay-close').onclick = () => {
    if (window._resetView) window._resetView();
    document.getElementById('btn').click();
};
document.getElementById('lightbox').onclick = function() { this.classList.remove('active'); };

// ─── Génération du PDF Portfolio BUT 2 depuis les pages actuelles du livre ──
// Chemin de fer : 1 page PDF = 1 double page, paire à gauche, impaire à droite.
// La liste window._pageImagePaths (book.js) ne contient que les pages réelles,
// les placeholders sont donc exclus d'office.
function _loadScript(src) {
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
    });
}
function _loadImage(src) {
    return new Promise((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
    });
}
async function generateBut2Pdf(onProgress) {
    if (!window.jspdf) await _loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    const { jsPDF } = window.jspdf;
    const pages = window._pageImagePaths || [];
    if (!pages.length) throw new Error('Liste des pages indisponible');
    const PW = 1024, PH = 1536; // résolution par page dans le PDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PW * 2, PH], hotfixes: ['px_scaling'], compress: true });
    const cv = document.createElement('canvas');
    cv.width = PW * 2; cv.height = PH;
    const ctx = cv.getContext('2d');
    for (let i = 0; i < pages.length; i += 2) {
        const [imL, imR] = await Promise.all([
            _loadImage(pages[i]),
            pages[i + 1] ? _loadImage(pages[i + 1]) : Promise.resolve(null)
        ]);
        ctx.fillStyle = '#E9E1D2';
        ctx.fillRect(0, 0, PW * 2, PH);
        if (imL) ctx.drawImage(imL, 0, 0, PW, PH);
        if (imR) ctx.drawImage(imR, PW, 0, PW, PH);
        if (i > 0) doc.addPage([PW * 2, PH], 'landscape');
        doc.addImage(cv.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, PW * 2, PH);
        onProgress(Math.min(100, Math.round(((i + 2) / pages.length) * 100)));
        await new Promise(r => setTimeout(r)); // laisse l'UI respirer entre les spreads
    }
    doc.save('PINARDAUD_Portfolio_BUT2.pdf');
}

const but2Btn = document.getElementById('but2-pdf');
const but2Label = but2Btn.textContent;
let pdfBusy = false;
but2Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (pdfBusy) return;
    pdfBusy = true;
    try {
        await generateBut2Pdf((pct) => { but2Btn.textContent = 'Génération… ' + pct + '%'; });
        but2Btn.textContent = but2Label;
    } catch (err) {
        console.error('Génération PDF échouée :', err);
        but2Btn.textContent = 'Erreur — réessayer';
    }
    pdfBusy = false;
});

const _clearNormal   = new THREE.Color(0xE8D5A8);
const _clearInverted = new THREE.Color(1 - _clearNormal.r, 1 - _clearNormal.g, 1 - _clearNormal.b);
const _clearCurrent  = { r: _clearNormal.r, g: _clearNormal.g, b: _clearNormal.b };

// Mode négatif du décor à l'ouverture : désactivé (passer à true pour le réactiver)
const INVERT_EFFECT_ENABLED = false;

window._setInvertEffect = (active) => {
    if (!INVERT_EFFECT_ENABLED) active = false;
    setInvertEffect(active);
    const target = active ? _clearInverted : _clearNormal;
    gsap.to(_clearCurrent, {
        r: target.r, g: target.g, b: target.b,
        duration: 0.8, ease: 'power2.inOut',
        onUpdate() { renderer.setClearColor(new THREE.Color(_clearCurrent.r, _clearCurrent.g, _clearCurrent.b)); }
    });
};

// ─── UI au-dessus du canvas ───────────────────────────────────────────────
['overlay-controls','btn','hint','beta-tag','debug-panel','bg-debug-panel','mode-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) document.body.appendChild(el);
});

// ─── Panels de debug masqués par défaut (CSS), touche "$" pour basculer ──
let debugVisible = false;
const _debugIds = ['debug-panel', 'bg-debug-panel', 'mode-btn'];
function _applyDebugVisibility() {
    _debugIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = debugVisible ? 'block' : 'none';
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === '$') { debugVisible = !debugVisible; _applyDebugVisibility(); }
});

// ─── OrbitControls (mode debug) ───────────────────────────────────────────
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 0, 0);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.enabled = false;
orbit.maxDistance = 80; // dézoom large pour inspecter le décor, reste sous le far plane (100)
let orbitMode = false;
window._orbitMode = false;

document.getElementById('mode-btn').addEventListener('click', () => {
    orbitMode = !orbitMode;
    window._orbitMode = orbitMode;
    orbit.enabled = orbitMode;
    setParallaxActive(!orbitMode);
    bookRef.book.visible = !orbitMode; // le livre ne doit pas gêner l'inspection du décor
    document.getElementById('mode-btn').textContent = orbitMode ? '✦ Parallaxe' : '🔭 Orbite';
    if (!orbitMode) {
        camera.position.set(0, 0.3, 3.5);
        camera.lookAt(0, 0, 0);
        orbit.target.set(0, 0, 0);
        orbit.update();
    }
});

// ─── Mode focus (lock caméra + livre face aux pages) ──────────────────────
let focusLock = false;
window._focusLock = false;
const _focusCenter = new THREE.Vector3();

function fitCameraToSpread() {
    // Bounding box des pages visibles → distance pour remplir l'écran
    const box = new THREE.Box3();
    const lv = window._leaves;
    if (lv) {
        // Toujours inclure les deux feuilles, même invisibles : le cadrage
        // reste centré sur le livre quand un seul côté a une page (couverture, fin)
        box.expandByObject(lv[0]);
        box.expandByObject(lv[1]);
    }
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.2, 2.1, 0.1));
    const center = box.getCenter(_focusCenter);
    const size = box.getSize(new THREE.Vector3());
    const vFov = camera.fov * Math.PI / 180;
    const distH = (size.y / 2) / Math.tan(vFov / 2);
    const distW = (size.x / 2) / (Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(distH, distW) * 1.12;
    gsap.to(camera.position, {
        x: center.x, y: center.y, z: center.z + size.z / 2 + dist,
        duration: 0.5, ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(_focusCenter.x, _focusCenter.y, _focusCenter.z)
    });
}

function resetCameraView() {
    gsap.to(camera.position, {
        x: 0, y: 0, z: 5, duration: 0.9, ease: 'power2.inOut',
        onUpdate: () => camera.lookAt(0, 0, 0)
    });
}

const focusBtn = document.getElementById('focus-mode');
function setFocus(lock) {
    focusLock = lock;
    window._focusLock = lock;
    focusBtn.textContent = lock ? 'Focus' : 'Libre'; // affiche l'état courant, pas l'action
    if (lock) {
        // Replace le livre en position ouverte de face, puis cadre la caméra
        bookRef.targetRot.x = 0; bookRef.targetRot.y = -Math.PI / 2;
        gsap.to(bookRef.book.rotation, { x: 0, y: -Math.PI / 2, duration: 0.4, ease: 'power2.inOut', onComplete: fitCameraToSpread });
    } else {
        resetCameraView();
    }
}
focusBtn.addEventListener('click', () => setFocus(!focusLock));

// Focus automatique à l'ouverture du livre (une fois l'animation terminée)
document.getElementById('btn').addEventListener('click', () => {
    if (window._bookIsOpen) {
        gsap.delayedCall(2.1, () => { if (window._bookIsOpen && !focusLock) setFocus(true); });
    }
});

// Sortie propre du focus quand on ferme le livre
window._resetView = () => {
    if (focusLock) { focusLock = false; window._focusLock = false; focusBtn.textContent = 'Libre'; }
    resetCameraView();
};

// ─── Caméra au clavier (livre ouvert, hors focus/orbite) ──────────────────
document.addEventListener('keydown', (e) => {
    if (!window._bookIsOpen || focusLock || orbitMode) return;
    const step = 0.08, lim = 0.9;
    if      (e.key === 'ArrowUp')    camera.position.y = Math.min( lim, camera.position.y + step);
    else if (e.key === 'ArrowDown')  camera.position.y = Math.max(-lim, camera.position.y - step);
    else if (e.key === 'ArrowLeft')  camera.position.x = Math.max(-lim, camera.position.x - step);
    else if (e.key === 'ArrowRight') camera.position.x = Math.min( lim, camera.position.x + step);
    else return;
    e.preventDefault();
});

// ─── Resize ───────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    distortPass.uniforms.uAspect.value = camera.aspect;
    if (focusLock) fitCameraToSpread();
});

// ─── Boucle ───────────────────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    if (orbitMode) orbit.update();
    bookRef.updateBook();
    updateBackground();
    composer.render();
}
animate();
