// ─────────────────────────────────────────────────────────────────────────────
//  Transition Codex → Oblivion : le soleil (Circle.png) devient un trou noir,
//  une vraie spirale logarithmique (portée du disque d'accrétion d'Oblivion14.5)
//  apparaît, la caméra recule pour révéler l'ensemble (« OMG c'est un trou noir »),
//  puis le décor et le livre sont aspirés en spirale pendant que le vertigo
//  (dolly zoom) serre le cadre façon spaghettification → fondu au noir → Oblivion.
//
//  Deux mouvements caméra distincts :
//   - Reveal (avant l'aspiration) : simple recul (translate z), montre la spirale.
//   - Vertigo (pendant l'aspiration) : dolly zoom (fov + distance compensée) pour
//     l'étirement façon spaghetti, cf. event Fortnite Ch1 « The End ».
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const OBLIVION_URL = 'https://touvie.github.io/Oblivion/';

// Fond de la page (reader) vs fond pendant la spirale/trou noir
const CLEAR_BEIGE = new THREE.Color(0xE8D5A8);
const CLEAR_BLACK = new THREE.Color(0x000000);

// Poids d'un calque pour l'aspiration façon tornade : léger (arbres/rochers/nuages,
// débris qui s'envolent vite et loin) vs lourd (bâti/montagnes, plus lent, résiste).
function isLightLayer(file) {
    return /Tree|Rocks|Cloud/.test(file || '');
}
// Hash déterministe (pas de Math.random) : même trajectoire à chaque test/replay.
function hash01(seed) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

// Géométrie réelle du soleil dans Circle.png : le plan couvre tout l'écran (parallaxe),
// mais le disque dessiné est bien plus petit et décalé — voir PARAMS.sunRadiusFrac/
// sunOffsetYFrac. Centralisé ici pour que l'anneau, l'aspiration et la distorsion
// convergent tous vers le même point, au lieu du centre géométrique du plan (0,0).
function sunGeometry(circle) {
    const w = (circle.geometry.parameters && circle.geometry.parameters.width) || 6;
    const h = (circle.geometry.parameters && circle.geometry.parameters.height) || w * 0.6;
    // Le plan Circle.png est étiré pour remplir l'écran (visibleSizeAtZ, dicté par
    // camera.aspect), pas selon le ratio natif de l'image → le disque dessiné dedans
    // devient une ellipse dès que l'aspect écran diffère de l'aspect natif de l'image.
    // On calcule ce même facteur pour que l'anneau suive la même déformation.
    const img = circle.material.map && circle.material.map.image;
    const imgAspect = (img && img.width && img.height) ? img.width / img.height : w / h;
    const planeAspect = w / h;
    return {
        radius: w * PARAMS.sunRadiusFrac,
        cx: circle.position.x,
        cy: circle.position.y + h * PARAMS.sunOffsetYFrac,
        ellipseYScale: imgAspect / planeAspect,
        planeHeight: h,
    };
}

// Réglages par défaut (ajustables via le panneau de debug, touche « $ »)
const PARAMS = {
    bookCloseDur:  1.4,   // temps laissé au livre pour se fermer avant le reste (s)
    darkenDur:     1.5,   // durée soleil → noir + apparition des anneaux (s)
    aspirDuration: 6,     // durée d'aspiration de chaque élément (s)
    aspirStagger:  1.6,   // décalage entre 1er (près du trou) et dernier calque (s)
    spins:         4,     // nombre de tours en spiralant vers le centre
    swirlSpeed:    4,     // vitesse de rotation du tourbillon (rad/s)
    fadeDur:       1.3,   // durée du fondu au noir final (s)
    distortMax:    3.5,   // intensité max de la lentille gravitationnelle (0 = off)
    distortSwirl:  14,    // torsion (swirl) du warp au centre (rad)
    distortRadius: 1.8,   // rayon d'influence du warp (uv aspect-corrigé)
    distortDelay:  0,     // retard du warp après T_DARK (s)
    revealDelay:     3.5, // retard après l'apparition du trou (s)
    revealPull:      50,  // recul caméra pour révéler la spirale (unités monde)
    revealDuration:  3,   // durée du recul (s) — lent, on prend le temps de montrer
    vertigoFov:      118, // FOV cible pendant l'aspiration (° — 45 = désactivé)
    vertigoDelay:    7,   // retard après le début de l'aspiration (s)
    vertigoDuration: 0.3, // durée du dolly zoom (s)
    burstLight:      2.2, // éjection tornade des calques légers (arbres/rochers/nuages, unités)
    burstHeavy:      0.6, // éjection tornade des calques lourds (bâti/montagnes, unités)
    wobbleAmp:       0.5, // amplitude du tremblement de trajectoire (rad)
    wobbleFreq:      3,   // fréquence du tremblement (cycles sur la durée du calque)
    lightSpeedMult:  0.65,// multiplicateur de durée pour les calques légers (< 1 = plus rapide)
    heavySpeedMult:  1.25,// multiplicateur de durée pour les calques lourds (> 1 = plus lent)
    tumbleAmp:       4,   // rotation propre (tumbling) des calques légers sur eux-mêmes (rad)
    sunRadiusFrac:   0.275, // rayon réel du disque dans Circle.png, fraction de la largeur du plan — calé à l'œil
    sunOffsetYFrac: -0.15,  // décalage vertical du disque dans l'image, fraction de la hauteur du plan (négatif = vers le bas) — calé à l'œil
    ellipseYAdjust:  1.0,   // ajustement fin par-dessus l'ellipse auto-calculée (1 = tel quel, <1 = plus rond)
    // ── Variante v2 « siphon séquentiel » (caméra quasi fixe, objets aspirés un à
    //    un en spirale, chacun pivote pour suivre la tangente en s'étirant) ──
    v2SpiralDuration:   2.2, // durée de la spirale d'aspiration par objet (s)
    v2Spins:            2,   // nombre de tours en spiralant vers le centre, par objet
    v2SpinDir:          1,   // sens de rotation, COMMUN à tous les objets (1 ou -1)
    v2StaggerPerObject: 0.4, // décalage entre le début de chaque objet (s) — un par un
    v2TwistTurns:       6,   // nombre de tours de torsion (twirl) au centre de chaque objet
    v2TwistAttack:      2,   // courbe de montée de la torsion (t^attack) : <1 = monte vite au début SANS saut (continu, contrairement à un offset fixe)
    v2TwirlRadiusMult:  0.55,// rayon du swirl en unités UV (0.5 = bord de l'image, >0.5 déborde vers les coins)
    v2PivotEdgeDist:    0.35,// distance du pivot de torsion au centre, vers le bord (unités UV, 0 = centre, 0.5 = bord)
    v2AspirOffsetYFrac: 0.15,// centre d'aspiration des objets, DISSOCIÉ du centre de l'anneau — fraction de la hauteur du plan (positif = plus haut)
    v2VertigoFov:       50,  // FOV cible (° — 45 = désactivé)
    v2VertigoDuration:  8,   // durée du zoom FOV, étalée sur toute la séquence (s)
    v2FinalZoomFov:      8,  // FOV final : PETIT (téléobjectif) fait grossir le disque à l'écran = simule le plongeon (grand angle ferait l'inverse : paraître plus loin)
    v2FinalZoomDelay:    0,  // retard du plongeon après la fin de l'aspiration du dernier objet (s)
    v2FinalZoomDuration: 1.5,// durée du plongeon final (s)
};

// ── Shader de distorsion trou noir (post-process, 1 seul pass) ──────────────
// Lentille gravitationnelle : les pixels sont aspirés/tordus vers le centre.
// À uStrength = 0 → identité (aucun effet pendant la lecture normale).
export const BlackHoleDistortShader = {
    uniforms: {
        tDiffuse:  { value: null },
        uStrength: { value: 0.0 },
        uCenter:   { value: new THREE.Vector2(0.5, 0.5) },
        uAspect:   { value: 1.0 },
        uRadius:   { value: 1.05 },
        uSwirl:    { value: 3.2 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uStrength;
        uniform vec2  uCenter;
        uniform float uAspect;
        uniform float uRadius;
        uniform float uSwirl;
        varying vec2 vUv;
        void main() {
            vec2 d = vUv - uCenter;
            d.x *= uAspect;
            float dist = length(d);
            float infl = smoothstep(uRadius, 0.0, dist);   // 1 au centre → 0 au bord
            float pinch = uStrength * infl;
            float ang = uSwirl * uStrength * infl * infl;  // swirl plus serré au centre
            float ca = cos(ang), sa = sin(ang);
            vec2 rot = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
            rot *= max(0.03, 1.0 - pinch * 0.97);          // aspiration vers le centre (clampée)
            rot.x /= uAspect;
            vec2 suv = uCenter + rot;
            gl_FragColor = texture2D(tDiffuse, suv);
        }
    `,
};

export function initOblivionTransition(ctx) {
    const { scene, camera, bookRef, renderer, getLayerMeshes, setTransitionActive, setParallaxActive, distortPass } = ctx;

    let playing = false;
    let snapshot = null;
    let swirl = null;
    let fadeEl = null;
    let tickerFn = null;

    // ── Bruit procédural (porté d'Oblivion14.5 app.js:generateNoiseTexture) ──
    function generateNoiseTexture(size = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx2d = canvas.getContext('2d');
        const imageData = ctx2d.createImageData(size, size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let value = 0;
                value += Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5;
                value += Math.sin(x * 0.1 + y * 0.1) * 0.3;
                value += Math.random() * 0.2;
                const normalized = ((value + 1) * 0.5) * 255;
                const i = (y * size + x) * 4;
                imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = normalized;
                imageData.data[i + 3] = 255;
            }
        }
        ctx2d.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    // ── Tourbillon : spirale logarithmique shader (disque d'accrétion), même
    //    technique que le trou noir d'Oblivion14.5 (app.js) — bien plus lisible
    //    qu'un semis de traits aléatoires, et tout aussi léger (1 mesh, 1 pass).
    function buildSwirl() {
        const meshes = getLayerMeshes();
        const circle = meshes[0];
        const sun = sunGeometry(circle);
        const innerR = sun.radius;
        const outerR = sun.radius * 2.6; // même ratio que l'ancien calage (w*0.5 → w*1.3)
        // Oblivion14.5 calibre son twist/bruit pour un rayon 4→60 (BH_RADIUS→disque).
        // Le décor Codex est à une tout autre échelle (Circle.png couvre l'écran à
        // z=-8, donc w ≈ 20+) : on ramène r à l'échelle de référence d'Oblivion
        // avant ces formules pour garder le même aspect visuel quelle que soit
        // la taille réelle du décor, au lieu de copier les constantes telles quelles.
        const scaleRef = 60 / outerR;
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                u_time:         { value: 0 },
                u_noiseTexture: { value: generateNoiseTexture(256) },
                uOpacity:       { value: 0 },
                uInnerR:        { value: innerR },
                uOuterR:        { value: outerR },
                uScaleRef:      { value: scaleRef },
            },
            vertexShader: `
                varying vec3 vPos;
                void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: `
                varying vec3 vPos;
                uniform float u_time;
                uniform sampler2D u_noiseTexture;
                uniform float uOpacity;
                uniform float uInnerR;
                uniform float uOuterR;
                uniform float uScaleRef;
                mat2 rotate2d(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
                void main() {
                    float r = length(vPos.xy);
                    float rr = r * uScaleRef; // rayon ramené à l'échelle de référence (twist + bruit)
                    float twistAngle = 3.0 * log(rr) - (min(u_time, 20.0) * 2.0 / (rr * 0.5 + 0.1)) - (u_time * 0.2);
                    vec2 tc = rotate2d(twistAngle) * (vPos.xy * uScaleRef);
                    float n = texture2D(u_noiseTexture, tc * 0.05 + vec2(u_time * 0.02, u_time * 0.015)).r;
                    n += 0.5 * texture2D(u_noiseTexture, tc * 0.12 + vec2(u_time * 0.03)).r;
                    n = n * 0.5 + 0.25;
                    float arms = smoothstep(0.3, 0.7, n);
                    float rp = clamp((r - uInnerR) / (uOuterR - uInnerR), 0.0, 1.0);
                    vec3 col = mix(vec3(1.0, 0.5, 0.05), vec3(0.6, 0.05, 0.0), pow(rp, 0.5));
                    col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.1, 0.0, rp));
                    col *= (0.9 + 0.1 * sin(rr * 2.0 + n * 2.0)) * (arms * 1.5 + 0.2);
                    float alpha = smoothstep(uInnerR * 1.02, uInnerR * 1.2, r) * smoothstep(uOuterR * 0.92, uOuterR * 0.58, r) * smoothstep(0.1, 0.6, n);
                    gl_FragColor = vec4(col, alpha * uOpacity);
                }
            `,
            transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const mesh = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR, 128, 1), mat);
        // DERRIÈRE le disque : le trou noir masque le centre, l'anneau dépasse autour.
        // Centré sur le vrai disque (sun.cx/cy), pas sur le centre géométrique du plan.
        mesh.position.set(sun.cx, sun.cy, circle.position.z - 0.05);
        mesh.scale.y = sun.ellipseYScale * PARAMS.ellipseYAdjust; // suit l'étirement du disque + ajustement fin
        mesh.renderOrder = -1;
        scene.add(mesh);
        return mesh;
    }

    function ensureFade() {
        if (fadeEl) return fadeEl;
        fadeEl = document.createElement('div');
        fadeEl.id = 'oblivion-fade';
        Object.assign(fadeEl.style, {
            position: 'fixed', inset: '0', background: '#000',
            opacity: '0', pointerEvents: 'none', zIndex: '5000', transition: 'none',
        });
        document.body.appendChild(fadeEl);
        return fadeEl;
    }

    // ── Capture / restauration de l'état (pour rejouer en mode test) ─────────
    function capture() {
        const meshes = getLayerMeshes();
        const circle = meshes[0];
        return {
            meshes: meshes.map(m => ({ m, p: m.position.clone(), s: m.scale.clone(), r: m.rotation.clone() })),
            circleColor: circle.material.color.clone(),
            book: {
                o: bookRef.book, p: bookRef.book.position.clone(),
                s: bookRef.book.scale.clone(), r: bookRef.book.rotation.clone(),
            },
            camera: { p: camera.position.clone(), fov: camera.fov },
        };
    }

    function restore(snap) {
        snap.meshes.forEach(({ m, p, s, r }) => {
            m.position.copy(p); m.scale.copy(s); m.rotation.copy(r);
            if (m.material.userData.uTwist) m.material.userData.uTwist.value = 0;
        });
        snap.meshes[0].m.material.color.copy(snap.circleColor);
        snap.book.o.position.copy(snap.book.p);
        snap.book.o.scale.copy(snap.book.s);
        snap.book.o.rotation.copy(snap.book.r);
        if (swirl) { swirl.material.uniforms.uOpacity.value = 0; swirl.material.uniforms.u_time.value = 0; }
        if (fadeEl) fadeEl.style.opacity = '0';
        if (distortPass) distortPass.uniforms.uStrength.value = 0;
        camera.position.copy(snap.camera.p);
        camera.fov = snap.camera.fov;
        camera.updateProjectionMatrix();
        renderer.setClearColor(CLEAR_BEIGE);
    }

    // ── Aperçu spirale seule (positionnement, sans jouer toute la séquence) ──
    let previewOn = false;
    let previewTickerFn = null;

    function setPreview(on) {
        if (!swirl) swirl = buildSwirl();
        previewOn = on;
        if (on) {
            swirl.material.uniforms.uOpacity.value = 1;
            renderer.setClearColor(CLEAR_BLACK);
            if (!previewTickerFn) {
                let last = performance.now();
                previewTickerFn = () => {
                    const now = performance.now();
                    const dt = (now - last) / 1000; last = now;
                    swirl.material.uniforms.u_time.value += PARAMS.swirlSpeed * dt;
                };
                gsap.ticker.add(previewTickerFn);
            }
        } else {
            swirl.material.uniforms.uOpacity.value = 0;
            renderer.setClearColor(CLEAR_BEIGE);
            if (previewTickerFn) { gsap.ticker.remove(previewTickerFn); previewTickerFn = null; }
        }
    }

    // Rebuild à chaud de l'anneau (géométrie figée à la création) quand on ajuste
    // sunRadiusFrac/sunOffsetYFrac depuis le panneau — sinon le slider ne fait rien.
    function rebuildSwirl() {
        if (!swirl) return;
        const wasOpaque = swirl.material.uniforms.uOpacity.value > 0;
        const t = swirl.material.uniforms.u_time.value;
        scene.remove(swirl);
        swirl.geometry.dispose();
        swirl.material.dispose();
        swirl = buildSwirl();
        swirl.material.uniforms.u_time.value = t;
        swirl.material.uniforms.uOpacity.value = wasOpaque ? 1 : 0;
    }

    function togglePreview() {
        if (playing) return previewOn;
        setPreview(!previewOn);
        return previewOn;
    }

    // ── v2 : torsion (twirl) — PAS une déformation de géométrie (ça ne fait que
    //    tordre le carré une fois, en bloc). C'est un swirl de l'ÉCHANTILLONNAGE
    //    DE TEXTURE, par pixel, en espace UV (0..1, centré 0.5) : chaque pixel va
    //    chercher sa couleur à une position tournée d'un angle qui dépend de sa
    //    distance au centre. Comme la rotation peut dépasser 2π, le même anneau de
    //    pixels source se répète plusieurs fois en tournant → bandes qui s'enroulent
    //    en spirale (l'effet visé, façon filtre Torsion/pixel-stretch). Aucun besoin
    //    de subdiviser la géométrie, ça marche même sur un quad à 4 sommets.
    function patchTwirlMaterial(mat, radiusUv, pivotUv) {
        if (mat.userData._twirlPatched) {
            mat.userData.uTwirlRadius.value = radiusUv; // réajustable en live (slider)
            mat.userData.uTwirlPivot.value.copy(pivotUv);
            return;
        }
        mat.userData._twirlPatched = true;
        mat.userData.uTwist = { value: 0 };
        mat.userData.uTwirlRadius = { value: radiusUv };
        mat.userData.uTwirlPivot = { value: pivotUv.clone() };
        const prevCompile = mat.onBeforeCompile;
        mat.onBeforeCompile = (shader) => {
            if (prevCompile) prevCompile(shader);
            shader.uniforms.uTwist = mat.userData.uTwist;
            shader.uniforms.uTwirlRadius = mat.userData.uTwirlRadius;
            shader.uniforms.uTwirlPivot = mat.userData.uTwirlPivot;
            // vMapUv (pas vUv) : c'est la varying que <map_fragment> lit réellement
            // (déclarée dès que USE_MAP est actif, ce qui est toujours le cas ici).
            // Note : on ne peut pas détecter ça en inspectant shader.fragmentShader ici
            // — les #include ne sont pas encore dépliés à ce stade, donc "vMapUv"
            // n'apparaît jamais dans la chaîne quel que soit le cas.
            // vMapUv arrive en fragment shader comme un "in" (WebGL2/GLSL ES 3.00) :
            // en lecture seule, on ne peut pas lui réassigner une valeur directement
            // ("l-value required"). Contournement : redéclarer une variable LOCALE du
            // même nom, qui masque l'input pour la suite de main() (pas de {} ici,
            // sinon le masquage ne survivrait pas jusqu'à <map_fragment>).
            // Pivot décalé (uTwirlPivot, pas toujours 0.5,0.5) : un objet dont le
            // contenu est dessiné pile au centre de son canevas (le temple) tournerait
            // sur place sans direction visible. Décaler le pivot vers un bord donne
            // l'impression que son contenu est « attiré » vers ce point, même si
            // l'objet lui-même ne se déplace pas.
            shader.fragmentShader =
                'uniform float uTwist;\nuniform float uTwirlRadius;\nuniform vec2 uTwirlPivot;\n' +
                shader.fragmentShader.replace(
                    '#include <map_fragment>',
                    `vec2 twC = vMapUv - uTwirlPivot;
                    float twR = length(twC);
                    float twFall = smoothstep(uTwirlRadius, 0.0, twR);
                    float twAng = uTwist * twFall;
                    float twCa = cos(twAng), twSa = sin(twAng);
                    vec2 vMapUv = vec2(twC.x * twCa - twC.y * twSa, twC.x * twSa + twC.y * twCa) + uTwirlPivot;
                    #include <map_fragment>`
                );
        };
        const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
        mat.customProgramCacheKey = () => prevKey + '_v2twirlfrag';
        mat.needsUpdate = true;
    }

    // ── La séquence ──────────────────────────────────────────────────────────
    function play(testMode) {
        if (playing) return;
        playing = true;
        if (previewOn) setPreview(false);

        if (!swirl) swirl = buildSwirl();
        ensureFade();
        snapshot = capture();

        setTransitionActive(true);
        setParallaxActive(false);

        // Ferme le livre proprement (réutilise la logique du bouton « Ouvrir »).
        // Remet aussi la caméra à zéro AVANT (même ordre que le bouton overlay-close),
        // sinon en mode focus (lecture zoomée) la scène reste zoomée pendant toute
        // la transition si on lance depuis le portail à l'intérieur du livre ouvert.
        if (window._resetView) window._resetView();
        if (window._bookIsOpen) document.getElementById('btn').click();
        // Le clic remet la parallaxe : on la re-gèle immédiatement
        setTransitionActive(true);
        setParallaxActive(false);

        const meshes = getLayerMeshes();
        const circle = meshes[0];
        const sun = sunGeometry(circle);
        const cx = sun.cx, cy = sun.cy; // vrai centre du disque, pas le centre géométrique du plan

        // Distorsion : centre = projection écran du trou (caméra fixe → calc une fois)
        if (distortPass) {
            const ndc = new THREE.Vector3(cx, cy, circle.position.z).project(camera);
            distortPass.uniforms.uCenter.value.set(ndc.x * 0.5 + 0.5, ndc.y * 0.5 + 0.5);
            distortPass.uniforms.uAspect.value = camera.aspect;
            distortPass.uniforms.uRadius.value = PARAMS.distortRadius;
            distortPass.uniforms.uSwirl.value  = PARAMS.distortSwirl;
            distortPass.uniforms.uStrength.value = 0;
        }

        // Le temps du shader tourne pendant toute la séquence (torsion de la spirale)
        let last = performance.now();
        tickerFn = () => {
            const now = performance.now();
            const dt = (now - last) / 1000; last = now;
            if (swirl) swirl.material.uniforms.u_time.value += PARAMS.swirlSpeed * dt;
        };
        gsap.ticker.add(tickerFn);

        const tl = gsap.timeline({
            onComplete: () => {
                gsap.ticker.remove(tickerFn); tickerFn = null;
                if (testMode) {
                    gsap.delayedCall(0.5, () => {
                        restore(snapshot);
                        setTransitionActive(false);
                        setParallaxActive(true);
                        playing = false;
                    });
                } else {
                    window.location.href = OBLIVION_URL;
                }
            },
        });

        // ── Phase 1 → 2 : après la fermeture du livre, le soleil vire au noir
        //    ET les anneaux rouges apparaissent en fondu, en même temps.
        const T_DARK = PARAMS.bookCloseDur;
        tl.to(circle.material.color, {
            r: 0, g: 0, b: 0, duration: PARAMS.darkenDur, ease: 'power2.inOut',
        }, T_DARK);
        tl.to(swirl.material.uniforms.uOpacity, {
            value: 1, duration: PARAMS.darkenDur, ease: 'power2.out',
        }, T_DARK);
        const clearProxy = { r: CLEAR_BEIGE.r, g: CLEAR_BEIGE.g, b: CLEAR_BEIGE.b };
        tl.to(clearProxy, {
            r: CLEAR_BLACK.r, g: CLEAR_BLACK.g, b: CLEAR_BLACK.b,
            duration: PARAMS.darkenDur, ease: 'power2.inOut',
            onUpdate: () => renderer.setClearColor(new THREE.Color(clearProxy.r, clearProxy.g, clearProxy.b)),
        }, T_DARK);

        // ── Phase 2bis : reveal. La caméra recule (simple translate, pas de FOV)
        //    pour montrer l'ensemble de la spirale avant que l'aspiration ne
        //    resserre le cadre — le temps de voir « OMG c'est un trou noir ».
        //    La distorsion démarre AVANT le recul (cf. plus bas, dès T_DARK) :
        //    sinon le décor reste visible, immobile et non déformé pendant le
        //    reveal, ce qui trahit que ce sont des calques plats qui reculent.
        const T_REVEAL = T_DARK + PARAMS.revealDelay;
        tl.to(camera.position, {
            z: camera.position.z + PARAMS.revealPull, duration: PARAMS.revealDuration, ease: 'sine.inOut',
            onUpdate: () => camera.lookAt(0, 0, 0),
        }, T_REVEAL);

        // ── Phase 3 : aspiration en spirale. Les calques les plus PROCHES du trou
        //    (au fond, près de z=-8 : formes, nuages, montagnes) partent en premier,
        //    le premier plan (rochers, arbres) en dernier. Le livre est aspiré tôt.
        const T_ASPIR = T_DARK + PARAMS.darkenDur;
        // Les calques lourds durent plus longtemps que PARAMS.aspirDuration (cf. ci-dessous) :
        // on cale la fin de phase sur eux pour que la distorsion/fondu n'arrivent pas
        // avant qu'ils aient fini d'être aspirés.
        const T_END = T_ASPIR + PARAMS.aspirStagger + PARAMS.aspirDuration * PARAMS.heavySpeedMult;
        meshes.forEach((m, i) => {
            if (i === 0) return;                              // le disque reste = trou noir
            const dx = m.position.x - cx, dy = m.position.y - cy;
            const r0 = Math.hypot(dx, dy);
            // Beaucoup de calques (fonds plein écran) sont centrés en (0,0) → r0=0,
            // donc aucune direction réelle où s'envoler. On leur donne un angle de
            // départ pseudo-aléatoire mais déterministe (même trajectoire à chaque test).
            const a0 = r0 > 0.05 ? Math.atan2(dy, dx) : hash01(i * 7.13) * Math.PI * 2;
            const s0x = m.scale.x, s0y = m.scale.y;
            const light = isLightLayer(m.userData.file);
            const burst = light ? PARAMS.burstLight : PARAMS.burstHeavy;
            const speedMult = light ? PARAMS.lightSpeedMult : PARAMS.heavySpeedMult;
            const spinDir = hash01(i * 3.71) > 0.5 ? 1 : -1;
            const wobblePhase = hash01(i * 5.19) * Math.PI * 2;
            const tumbleAmp = (light ? PARAMS.tumbleAmp : PARAMS.tumbleAmp * 0.25) * spinDir;
            // depth : 0 = collé au trou (fond), 1 = premier plan
            const depth = THREE.MathUtils.clamp((m.position.z + 8) / 7.5, 0, 1);
            const proxy = { t: 0 };
            tl.to(proxy, {
                t: 1, duration: PARAMS.aspirDuration * speedMult, ease: 'power2.in',
                onUpdate: () => {
                    const t = proxy.t;
                    // Tornade : éjection vers l'extérieur (pic ~mi-course), puis aspiration
                    // franche jusqu'au centre — pas un simple rétrécissement sur place.
                    const r = r0 * (1 - t) + burst * 4 * t * (1 - t);
                    const wobble = PARAMS.wobbleAmp * Math.sin(t * PARAMS.wobbleFreq * Math.PI * 2 + wobblePhase);
                    const a = a0 + spinDir * t * PARAMS.spins * Math.PI * 2 + wobble;
                    m.position.x = cx + Math.cos(a) * r;
                    m.position.y = cy + Math.sin(a) * r;
                    m.rotation.z = tumbleAmp * t;
                    const s = Math.max(0.0001, 1 - t);
                    m.scale.set(s0x * s, s0y * s, 1);
                },
            }, T_ASPIR + depth * PARAMS.aspirStagger);
        });

        // Le livre : aspiré tôt (juste après le début de l'aspiration)
        const book = bookRef.book;
        const bx = book.position.x, by = book.position.y, bz = book.position.z;
        const bproxy = { t: 0 };
        tl.to(bproxy, {
            t: 1, duration: PARAMS.aspirDuration, ease: 'power2.in',
            onUpdate: () => {
                const t = bproxy.t;
                book.position.set(bx * (1 - t), by * (1 - t), bz * (1 - t));
                const s = Math.max(0.0001, 1 - t);
                book.scale.set(s, s, s);
            },
        }, T_ASPIR + 0.2);

        // ── Effet vertigo (dolly zoom) : le FOV s'ouvre pendant que la caméra
        //    avance le long de z, en compensant pour garder le trou noir à taille
        //    fixe à l'écran (formule classique du dolly zoom / effet Hitchcock) —
        //    c'est l'étirement façon spaghettification. Démarre avec l'aspiration :
        //    le décor spirale déjà, donc l'étirement se fond dans ce mouvement.
        //    d0 (distance caméra↔trou) est capturée à onStart, PAS à la construction
        //    de la timeline : le reveal a bougé la caméra entre-temps.
        {
            const fov0 = camera.fov;
            const tan0 = Math.tan(fov0 * Math.PI / 180 / 2);
            const vproxy = { fov: fov0 };
            let d0 = 0;
            tl.to(vproxy, {
                fov: PARAMS.vertigoFov, duration: PARAMS.vertigoDuration, ease: 'power2.inOut',
                onStart: () => { d0 = camera.position.z - circle.position.z; },
                onUpdate: () => {
                    camera.fov = vproxy.fov;
                    const tanF = Math.tan(vproxy.fov * Math.PI / 180 / 2);
                    camera.position.z = circle.position.z + d0 * tan0 / tanF;
                    camera.updateProjectionMatrix();
                },
            }, T_ASPIR + PARAMS.vertigoDelay);
        }

        // Distorsion « lentille gravitationnelle » : démarre dès l'apparition du
        // trou (T_DARK), donc AVANT le reveal — le temps qu'elle ait déjà un effet
        // visible quand la caméra commence à reculer, plutôt que de démarrer pile
        // en même temps (revealDelay peut être grand, distortDelay reste réglable
        // indépendamment). Monte progressivement (power3.in) jusqu'à la fin de
        // l'aspiration.
        if (distortPass) {
            const distortStart = T_DARK + PARAMS.distortDelay;
            tl.to(distortPass.uniforms.uStrength, {
                value: PARAMS.distortMax,
                duration: Math.max(0.1, T_END - distortStart),
                ease: 'power3.in',
            }, distortStart);
        }

        // ── Phase 4 : fondu au noir (caméra immobile, scène fake) → navigation
        tl.to(fadeEl, {
            opacity: 1, duration: PARAMS.fadeDur, ease: 'power2.in',
        }, T_END - PARAMS.fadeDur * 0.45);
    }

    // ── Variante v2 : caméra quasi fixe (léger changement de FOV seulement), les
    //    objets sont aspirés UN À UN, en spirale (comme v1 mais séquentiel, pas
    //    tous en même temps), et se font franchement déformer par la distorsion
    //    post-process en approchant du trou — pas d'étirement par-vertex (trop
    //    aléatoire à l'usage). Le sol (Floor.png) ne bouge jamais.
    const FLOOR_RE = /Floor/;
    function playV2(testMode) {
        if (playing) return;
        playing = true;
        if (previewOn) setPreview(false);

        if (!swirl) swirl = buildSwirl();
        ensureFade();
        snapshot = capture();

        setTransitionActive(true);
        setParallaxActive(false);
        // Remet la caméra à zéro AVANT de fermer (même ordre que overlay-close),
        // sinon la scène reste zoomée (mode focus) si on lance depuis le portail
        // à l'intérieur du livre ouvert.
        if (window._resetView) window._resetView();
        if (window._bookIsOpen) document.getElementById('btn').click();
        setTransitionActive(true);
        setParallaxActive(false);

        const meshes = getLayerMeshes();
        const circle = meshes[0];
        const sun = sunGeometry(circle);
        // Centre d'aspiration des objets, VOLONTAIREMENT dissocié du centre de
        // l'anneau (sun.cx/cy) — plus haut, réglable indépendamment.
        const cx = sun.cx, cy = circle.position.y + sun.planeHeight * PARAMS.v2AspirOffsetYFrac;

        let last = performance.now();
        tickerFn = () => {
            const now = performance.now();
            const dt = (now - last) / 1000; last = now;
            if (swirl) swirl.material.uniforms.u_time.value += PARAMS.swirlSpeed * dt;
        };
        gsap.ticker.add(tickerFn);

        const tl = gsap.timeline({
            onComplete: () => {
                gsap.ticker.remove(tickerFn); tickerFn = null;
                if (testMode) {
                    gsap.delayedCall(0.5, () => {
                        restore(snapshot);
                        setTransitionActive(false);
                        setParallaxActive(true);
                        playing = false;
                    });
                } else {
                    window.location.href = OBLIVION_URL;
                }
            },
        });

        // Soleil → noir + anneau + fond noir : identique à v1.
        const T_DARK = PARAMS.bookCloseDur;
        tl.to(circle.material.color, {
            r: 0, g: 0, b: 0, duration: PARAMS.darkenDur, ease: 'power2.inOut',
        }, T_DARK);
        tl.to(swirl.material.uniforms.uOpacity, {
            value: 1, duration: PARAMS.darkenDur, ease: 'power2.out',
        }, T_DARK);
        const clearProxy = { r: CLEAR_BEIGE.r, g: CLEAR_BEIGE.g, b: CLEAR_BEIGE.b };
        tl.to(clearProxy, {
            r: CLEAR_BLACK.r, g: CLEAR_BLACK.g, b: CLEAR_BLACK.b,
            duration: PARAMS.darkenDur, ease: 'power2.inOut',
            onUpdate: () => renderer.setClearColor(new THREE.Color(clearProxy.r, clearProxy.g, clearProxy.b)),
        }, T_DARK);

        // Pas de reveal (recul caméra) en v2 : la caméra reste quasi fixe.
        const T_ASPIR = T_DARK + PARAMS.darkenDur;

        // Un objet après l'autre : sa position converge en spirale vers le trou
        // (comme v1, mais séquentiel — un seul objet à la fois), PENDANT que sa
        // propre géométrie se tord sur elle-même (twirl, cf. patchTwirlMaterial) —
        // un carré plat qui finit par s'enrouler en spirale, pas juste glisser dessus.
        let seq = 0;
        meshes.forEach((m, i) => {
            if (i === 0) return; // le disque reste = trou noir
            const file = m.userData.file || '';
            if (FLOOR_RE.test(file)) return; // le sol ne bouge jamais
            const startT = T_ASPIR + seq * PARAMS.v2StaggerPerObject;
            seq++;

            // Plus de déplacement en spirale : l'objet reste à sa place, seule sa
            // texture se tord (twirl) puis il rétrécit sur lui-même — le mélange
            // déplacement + torsion en même temps faisait un effet incohérent.
            const spinDir = PARAMS.v2SpinDir >= 0 ? 1 : -1;
            const s0x = m.scale.x, s0y = m.scale.y;
            // Pivot excentré (angle d'or, déterministe) : sans ça, un objet dessiné
            // pile au centre de son canevas (le temple) tourne sur place sans qu'on
            // voie de direction. Avec un pivot vers le bord, son contenu semble
            // « attiré » vers ce point avant de se faire consumer.
            const pivotAngle = i * 2.399963;
            const pivotUv = new THREE.Vector2(
                0.5 + Math.cos(pivotAngle) * PARAMS.v2PivotEdgeDist,
                0.5 + Math.sin(pivotAngle) * PARAMS.v2PivotEdgeDist
            );
            // Rayon en unités UV (0..~0.7 = coin de l'image) — indépendant de la
            // taille réelle de l'objet, ça marche pareil sur un rocher ou un bâtiment.
            patchTwirlMaterial(m.material, PARAMS.v2TwirlRadiusMult, pivotUv);
            const uTwist = m.material.userData.uTwist;
            uTwist.value = 0;
            const proxy = { t: 0 };
            tl.to(proxy, {
                t: 1, duration: PARAMS.v2SpiralDuration, ease: 'power2.in',
                onUpdate: () => {
                    const t = proxy.t;
                    // Courbe continue t^attack : avec attack<1 ça monte très vite dès
                    // les premières frames (effet visible tôt) SANS saut initial —
                    // contrairement à un offset fixe qui sautait de 0 à sa valeur de
                    // base dès la première frame de la tween.
                    const twistFrac = Math.pow(t, PARAMS.v2TwistAttack);
                    uTwist.value = spinDir * twistFrac * PARAMS.v2TwistTurns * Math.PI * 2;
                    const s = Math.max(0.0001, 1 - t);
                    m.scale.set(s0x * s, s0y * s, 1);
                },
            }, startT);
        });
        const T_V2_END = T_ASPIR + Math.max(0, seq - 1) * PARAMS.v2StaggerPerObject + PARAMS.v2SpiralDuration;

        // Le livre : aspiration simple en ligne droite, dès le début de la séquence.
        const book = bookRef.book;
        const bx = book.position.x, by = book.position.y, bz = book.position.z;
        const bproxy = { t: 0 };
        tl.to(bproxy, {
            t: 1, duration: PARAMS.v2SpiralDuration, ease: 'power2.in',
            onUpdate: () => {
                const t = bproxy.t;
                book.position.set(bx * (1 - t), by * (1 - t), bz * (1 - t));
                const s = Math.max(0.0001, 1 - t);
                book.scale.set(s, s, s);
            },
        }, T_ASPIR);

        // Simple changement de FOV, étalé sur toute la séquence — pas de dolly zoom
        // compensé (la caméra ne bouge pas du tout, contrairement à v1) : juste
        // l'objectif qui se resserre/s'ouvre légèrement.
        tl.to(camera, {
            fov: PARAMS.v2VertigoFov, duration: PARAMS.v2VertigoDuration, ease: 'sine.inOut',
            onUpdate: () => camera.updateProjectionMatrix(),
        }, T_ASPIR);

        // Plongeon final : plutôt qu'un simple fondu au noir, la caméra zoome très
        // fort (FOV) sur le disque/anneau après la fin de l'aspiration — simule la
        // caméra qui « rentre » dans le trou, sans vraiment déplacer la caméra en Z
        // (la scène est en calques plats à des profondeurs fixes, un vrai déplacement
        // risquerait de les traverser et de révéler que c'est plat).
        const finalZoomStart = T_V2_END + PARAMS.v2FinalZoomDelay;
        tl.to(camera, {
            fov: PARAMS.v2FinalZoomFov, duration: PARAMS.v2FinalZoomDuration, ease: 'power2.in',
            onUpdate: () => camera.updateProjectionMatrix(),
        }, finalZoomStart);
        const T_TRUE_END = finalZoomStart + PARAMS.v2FinalZoomDuration;

        tl.to(fadeEl, {
            opacity: 1, duration: PARAMS.fadeDur, ease: 'power2.in',
        }, T_TRUE_END - PARAMS.fadeDur * 0.45);
    }

    let mode = 'v2';
    function playDispatch(testMode) {
        return mode === 'v2' ? playV2(testMode) : play(testMode);
    }
    function toggleMode() {
        mode = mode === 'v1' ? 'v2' : 'v1';
        return mode;
    }

    buildDebugPanel({ PARAMS, play: playDispatch, togglePreview, rebuildSwirl, toggleMode });

    return { play: playDispatch };
}

// ─── Panneau de debug (sliders live + tests) — touche « $ » pour afficher ────
function buildDebugPanel({ PARAMS, play, togglePreview, rebuildSwirl, toggleMode }) {
    const panel = document.createElement('div');
    panel.id = 'oblivion-debug-panel';
    Object.assign(panel.style, {
        position: 'fixed', top: '12px', right: '12px', zIndex: '6000',
        background: 'rgba(20,14,6,0.92)', color: '#E9E1D2', display: 'none',
        font: "11px 'Space Mono', monospace", padding: '12px 14px',
        border: '1px solid rgba(153,84,56,0.7)', width: '240px',
        maxHeight: '92vh', overflowY: 'auto',
    });
    // Groupe 'commun' = toujours visible ; 'v1'/'v2' = seulement dans la variante active
    // (sinon trop de paramètres affichés d'un coup).
    const rows = [
        ['bookCloseDur',  'Fermeture livre (s)',   0.5, 3,  0.1, 'commun'],
        ['darkenDur',     'Noircissement (s)',     0.3, 3,  0.1, 'commun'],
        ['swirlSpeed',    'Vitesse tourbillon',    0,   4,  0.05, 'commun'],
        ['fadeDur',       'Fondu noir (s)',        0.3, 3,  0.1, 'commun'],
        ['sunRadiusFrac',  'Rayon soleil (frac. w)',   0.05, 0.6,  0.005, 'commun'],
        ['sunOffsetYFrac', 'Décalage Y soleil (frac. h)', -0.5, 0.5, 0.005, 'commun'],
        ['ellipseYAdjust', 'Ajust. ellipse (×)',    0.7, 1.3, 0.01, 'commun'],
        ['aspirDuration', 'Aspiration (s)',        1,   6,  0.1, 'v1'],
        ['aspirStagger',  'Décalage calques (s)',  0,   4,  0.1, 'v1'],
        ['spins',         'Tours spirale',         0,   4,  0.1, 'v1'],
        ['burstLight',      'Éjection légers (unités)', 0,   5,   0.1, 'v1'],
        ['burstHeavy',      'Éjection lourds (unités)', 0,   3,   0.1, 'v1'],
        ['wobbleAmp',       'Tremblement (rad)',        0,   2,   0.05, 'v1'],
        ['wobbleFreq',      'Tremblement fréq.',        0,   8,   0.1, 'v1'],
        ['lightSpeedMult',  'Vitesse légers (×)',       0.2, 1.5, 0.05, 'v1'],
        ['heavySpeedMult',  'Vitesse lourds (×)',       0.5, 2.5, 0.05, 'v1'],
        ['tumbleAmp',       'Rotation légers (rad)',    0,   12,  0.2, 'v1'],
        ['distortMax',    'Distorsion (max)',      0,   3.5, 0.05, 'v1'],
        ['distortSwirl',  'Distorsion swirl',      0,   14, 0.1, 'v1'],
        ['distortRadius', 'Distorsion rayon',      0.3, 1.8, 0.05, 'v1'],
        ['distortDelay',  'Distorsion retard (s)', 0,   10,  0.1, 'v1'],
        ['revealDelay',     'Reveal retard (s)',     0,   10,  0.1, 'v1'],
        ['revealPull',      'Reveal recul (unités)', 0,   50,  1, 'v1'],
        ['revealDuration',  'Reveal durée (s)',      0.3, 8,   0.1, 'v1'],
        ['vertigoFov',      'Vertigo FOV cible (°)', 20, 200, 1, 'v1'],
        ['vertigoDelay',    'Vertigo retard (s)',    0,  10,   0.1, 'v1'],
        ['vertigoDuration', 'Vertigo durée (s)',     0.3, 6,  0.1, 'v1'],
        ['v2SpiralDuration',   'V2 durée spirale (s)',   0.5, 6,   0.1, 'v2'],
        ['v2Spins',            'V2 tours spirale',       0,   4,   0.1, 'v2'],
        ['v2SpinDir',          'V2 sens rotation',       -1,  1,   2, 'v2'],
        ['v2StaggerPerObject', 'V2 décalage objets (s)', 0,   2,   0.05, 'v2'],
        ['v2TwistTurns',       'V2 tours de torsion',      0,  6,   0.1, 'v2'],
        ['v2TwistAttack',      'V2 montée torsion (courbe)', 0.1, 2, 0.05, 'v2'],
        ['v2TwirlRadiusMult',  'V2 rayon swirl (UV)',      0.1, 1.4, 0.02, 'v2'],
        ['v2PivotEdgeDist',    'V2 pivot vers bord (UV)',  0,   0.6, 0.02, 'v2'],
        ['v2AspirOffsetYFrac', 'V2 centre aspiration (frac. h)', -0.5, 0.8, 0.01, 'v2'],
        ['v2VertigoFov',       'V2 zoom FOV cible (°)',  30,  90,  1, 'v2'],
        ['v2VertigoDuration',  'V2 zoom durée (s)',      0.5, 8,   0.1, 'v2'],
        ['v2FinalZoomFov',      'V2 plongeon FOV (°)',   1,   45, 1, 'v2'],
        ['v2FinalZoomDelay',    'V2 plongeon retard (s)', 0,  5,  0.1, 'v2'],
        ['v2FinalZoomDuration', 'V2 plongeon durée (s)', 0.3, 3,   0.1, 'v2'],
    ];
    let html = '<div style="letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;color:#c98a5a;">Transition Oblivion</div>';
    rows.forEach(([key, label, min, max, step, group]) => {
        html += `<div data-group="${group}" style="margin-bottom:8px;">
            <label style="display:block;margin-bottom:2px;">${label} <span id="ov-${key}-v">${PARAMS[key]}</span></label>
            <input type="range" id="ov-${key}" min="${min}" max="${max}" step="${step}" value="${PARAMS[key]}" style="width:100%;">
        </div>`;
    });
    html += `<button id="ov-mode" style="width:100%;margin-top:4px;padding:7px;cursor:pointer;background:#3a2f6b;color:#E9E1D2;border:none;letter-spacing:1px;text-transform:uppercase;">Variante : V2 Siphon</button>
             <button id="ov-preview" style="width:100%;margin-top:6px;padding:7px;cursor:pointer;background:transparent;color:#E9E1D2;border:1px solid rgba(233,225,210,0.4);letter-spacing:1px;text-transform:uppercase;">Spirale seule : OFF</button>
             <button id="ov-test" style="width:100%;margin-top:6px;padding:7px;cursor:pointer;background:#995438;color:#F4EFE4;border:none;letter-spacing:1px;text-transform:uppercase;">Tester (sans naviguer)</button>
             <button id="ov-go" style="width:100%;margin-top:6px;padding:7px;cursor:pointer;background:transparent;color:#c98a5a;border:1px solid rgba(153,84,56,0.7);letter-spacing:1px;text-transform:uppercase;">Aller sur Oblivion</button>`;
    panel.innerHTML = html;
    document.body.appendChild(panel);

    const GEOM_KEYS = ['sunRadiusFrac', 'sunOffsetYFrac', 'ellipseYAdjust']; // géométrie figée à la création, besoin d'un rebuild
    rows.forEach(([key]) => {
        const inp = document.getElementById('ov-' + key);
        inp.addEventListener('input', () => {
            PARAMS[key] = parseFloat(inp.value);
            document.getElementById('ov-' + key + '-v').textContent = inp.value;
            if (GEOM_KEYS.includes(key)) rebuildSwirl();
        });
    });
    function applyGroupVisibility(currentMode) {
        panel.querySelectorAll('[data-group]').forEach(el => {
            const g = el.dataset.group;
            el.hidden = !(g === 'commun' || g === currentMode);
        });
    }
    applyGroupVisibility('v2');
    const modeBtn = document.getElementById('ov-mode');
    modeBtn.addEventListener('click', () => {
        const m = toggleMode();
        modeBtn.textContent = `Variante : ${m === 'v2' ? 'V2 Siphon' : 'V1 Tornade'}`;
        applyGroupVisibility(m);
    });
    const previewBtn = document.getElementById('ov-preview');
    previewBtn.addEventListener('click', () => {
        const on = togglePreview();
        previewBtn.textContent = `Spirale seule : ${on ? 'ON' : 'OFF'}`;
    });
    document.getElementById('ov-test').addEventListener('click', () => play(true));
    document.getElementById('ov-go').addEventListener('click', () => play(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === '$') panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
}
