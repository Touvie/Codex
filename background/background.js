import * as THREE from 'three';

const IMG_PATH = 'background/images/';

const LAYERS = [
    { file: 'Circle.png',       z: -8,   parallax: 0.00, x:  0.00, y:  0.00 },
    { file: 'Shapes.png',       z: -7.9, parallax: 0.01, x:  0.00, y:  0.00 },
    { file: 'Cloud_1.png',      z: -6,   parallax: 0.04, x:  0.00, y:  0.00, speed: 0.0042, animX: 20 },
    { file: 'Cloud_2.png',      z: -6,   parallax: 0.05, x:  0.00, y:  0.00, speed: 0.0070, animX: 30 },
    { file: 'Cloud_3-2.png',    z: -5.8, parallax: 0.04, x:  0.00, y:  0.00, speed: 0.0035, animX: 40 },
    { file: 'Cloud_4-2.png',    z: -5.8, parallax: 0.06, x:  0.00, y:  0.00, speed: 0.0055, animX: 50 },
    { file: 'Mountains.png',    z: -5,   parallax: 0.07, x:  0.00, y:  0.00 },
    { file: 'Building.png',     z: -3,   parallax: 0.10, x:  0.00, y:  0.00 },
    { file: 'Ruins_1.png',      z: -3,   parallax: 0.10, x:  0.00, y:  0.00 },
    { file: 'Ruins_2.png',      z: -2.8, parallax: 0.11, x:  0.00, y:  1.50 },
    { file: 'Line.png',         z: -2,   parallax: 0.13, x:  0.00, y:  0.00 },
    // Floor_Shadow.png — non exporté depuis PS (à ajouter quand disponible)
    { file: 'Floor.png',        z: -1.8, parallax: 0.14, x:  0.00, y:  0.00 },
    { file: 'Rocks_1.png',      z: -1,   parallax: 0.17, x:  3.00, y: -0.55 },
    { file: 'Rocks_2.png',      z: -1,   parallax: 0.17, x:  1.00, y:  0.50 },
    { file: 'Rocks_3.png',      z: -1,   parallax: 0.17, x: -2.00, y:  1.40 },
    { file: 'Rocks_4.png',      z: -1,   parallax: 0.17, x: -3.00, y: -1.00 },
    // Shape.png — non exporté depuis PS (à ajouter quand disponible)
    { file: 'Tree_1.png',       z: -0.5, parallax: 0.22, x:  0.00, y:  0.00, sway: 0.0, segsY: 24 },
    { file: 'Tree_2.png',       z: -0.5, parallax: 0.22, x:  0.00, y:  0.00, sway: 1.3, segsY: 24 },
    { file: 'Tree_3.png',       z: -0.5, parallax: 0.22, x:  0.00, y:  0.00, sway: 2.6, segsY: 24 },
    { file: 'Tree_4.png',       z: -0.5, parallax: 0.22, x:  0.00, y:  0.00, sway: 3.9, segsY: 24 },
];

let _camera;
let _meshes = [];
let _parallaxActive = true;
let mx = 0, my = 0, tx = 0, ty = 0;
const LERP = 0.06;

const _invertUniform = { value: 0.0 };
const _swayTime      = { value: 0.0 };

function _addSwayShader(mat, phase) {
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime      = _swayTime;
        shader.uniforms.uAmplitude = { value: 0.50 };
        shader.uniforms.uFreq      = { value: 0.7  };
        shader.uniforms.uPhase     = { value: phase };
        shader.vertexShader =
            'uniform float uTime;\nuniform float uAmplitude;\nuniform float uFreq;\nuniform float uPhase;\n' +
            shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\nfloat swayFactor = uv.y * uv.y * uv.y;\ntransformed.x += sin(uTime * uFreq + uPhase) * uAmplitude * swayFactor;'
            );
    };
    mat.customProgramCacheKey = () => 'tree_sway_cubic_' + phase;
}

function _addInvertShader(mat) {
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uInvert = _invertUniform;
        shader.fragmentShader = 'uniform float uInvert;\n' + shader.fragmentShader;
        const last = shader.fragmentShader.lastIndexOf('}');
        shader.fragmentShader =
            shader.fragmentShader.slice(0, last) +
            '  gl_FragColor.rgb = mix(gl_FragColor.rgb, 1.0 - gl_FragColor.rgb, uInvert);\n}';
    };
    mat.customProgramCacheKey = () => 'bg_invert';
}

function visibleSizeAtZ(z) {
    const dist = _camera.position.z - z;
    const vFov = _camera.fov * Math.PI / 180;
    const h = 2 * Math.tan(vFov / 2) * dist;
    return { w: h * _camera.aspect, h };
}

export function initBackground(scene, camera) {
    _camera = camera;

    const loader = new THREE.TextureLoader();

    LAYERS.forEach((layer, i) => {
        const tex = loader.load(IMG_PATH + layer.file);
        tex.minFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;

        const { w, h } = visibleSizeAtZ(layer.z);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
        _addInvertShader(mat);
        if (layer.sway !== undefined) _addSwayShader(mat, layer.sway);
        const segsY = layer.segsY || 1;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.15, h * 1.15, 1, segsY), mat);
        mesh.position.set(layer.x, layer.y, layer.z);
        mesh.renderOrder = i;
        scene.add(mesh);
        _meshes.push(mesh);
    });

    document.addEventListener('mousemove', (e) => {
        if (!_parallaxActive) return;
        tx = (e.clientX / window.innerWidth  - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('resize', () => {
        _meshes.forEach((mesh, i) => {
            const { w, h } = visibleSizeAtZ(LAYERS[i].z);
            mesh.geometry.dispose();
            const segsY = LAYERS[i].segsY || 1;
            mesh.geometry = new THREE.PlaneGeometry(w * 1.15, h * 1.15, 1, segsY);
        });
    });

    _buildDebugPanel();
}

export function updateBackground() {
    _swayTime.value += 0.016;

    if (_parallaxActive) {
        mx += (tx - mx) * LERP;
        my += (ty - my) * LERP;
    }

    _meshes.forEach((mesh, i) => {
        const layer = LAYERS[i];

        // Dérive horizontale des nuages (toujours active, indépendante du parallaxe)
        if (layer.speed !== undefined) {
            layer.animX -= layer.speed;
            if (layer.animX < -20) layer.animX = 20; // téléport côté droit
        }

        const ax = layer.animX || 0;
        const p  = layer.parallax;
        mesh.position.x = layer.x + ax + (_parallaxActive ? mx * p * 0.7 : 0);
        mesh.position.y = layer.y;
    });
}

export function setInvertEffect(active) {
    gsap.to(_invertUniform, { value: active ? 1.0 : 0.0, duration: 0.8, ease: 'power2.inOut' });
}

export function setParallaxActive(active) {
    _parallaxActive = active;
    if (!active) {
        tx = 0; ty = 0; mx = 0; my = 0;
        _meshes.forEach((mesh, i) => {
            const ax = LAYERS[i].animX || 0;
            mesh.position.x = LAYERS[i].x + ax;
            mesh.position.y = LAYERS[i].y;
        });
    }
}

// ─── Debug panel ─────────────────────────────────────────────────────────────

function _buildDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'bg-debug-panel';
    panel.innerHTML = `
        <div id="bg-debug-header">
            <span>Positions calques</span>
            <span id="bg-debug-arrow">▼</span>
        </div>
        <div id="bg-debug-body" class="hidden">
            <div id="bg-warm-row" style="margin-bottom:8px;">
                <label style="display:block;margin-bottom:2px;">Lumière chaude (filtre jauni)</label>
                <input type="range" id="bg-warm-slider" min="0" max="1" step="0.05" value="0.5" style="width:70%;vertical-align:middle;">
                <span id="bg-warm-val">0.50</span>
            </div>
            <div id="bg-sliders"></div>
            <button id="bg-copy-btn">Copier les valeurs JSON</button>
            <div id="bg-copy-output"></div>
        </div>`;
    document.body.appendChild(panel);

    document.getElementById('bg-warm-slider').addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        document.getElementById('bg-warm-val').textContent = v.toFixed(2);
        if (window._setWarmLight) window._setWarmLight(v);
    });

    document.getElementById('bg-debug-header').addEventListener('click', () => {
        const body  = document.getElementById('bg-debug-body');
        const arrow = document.getElementById('bg-debug-arrow');
        body.classList.toggle('hidden');
        arrow.textContent = body.classList.contains('hidden') ? '▼' : '▲';
    });

    const container = document.getElementById('bg-sliders');
    LAYERS.forEach((layer, i) => {
        const row = document.createElement('div');
        row.className = 'bg-layer-row';
        row.innerHTML = `<div class="bg-layer-name">${layer.file.replace('.png','')}</div>
            <div class="bg-slider-row">
                <label>X</label>
                <input type="range" min="-4" max="4" step="0.05" value="${layer.x}" data-idx="${i}" data-axis="x">
                <span class="val" id="bgvx${i}">${layer.x.toFixed(2)}</span>
            </div>
            <div class="bg-slider-row">
                <label>Y</label>
                <input type="range" min="-3" max="3" step="0.05" value="${layer.y}" data-idx="${i}" data-axis="y">
                <span class="val" id="bgvy${i}">${layer.y.toFixed(2)}</span>
            </div>`;
        container.appendChild(row);
    });

    container.addEventListener('input', (e) => {
        const idx  = +e.target.dataset.idx;
        const axis = e.target.dataset.axis;
        const val  = parseFloat(e.target.value);
        LAYERS[idx][axis] = val;
        document.getElementById(`bgv${axis}${idx}`).textContent = val.toFixed(2);
    });

    document.getElementById('bg-copy-btn').addEventListener('click', () => {
        const out = LAYERS.map(l =>
            `{ file:'${l.file}', z:${l.z}, parallax:${l.parallax}, x:${l.x.toFixed(2)}, y:${l.y.toFixed(2)} }`
        ).join('\n');
        navigator.clipboard.writeText(out).catch(() => {});
        const div = document.getElementById('bg-copy-output');
        div.style.display = 'block';
        div.textContent = 'Copié !';
        setTimeout(() => { div.style.display = 'none'; }, 2000);
    });

    // Mode btn
    const btn = document.createElement('button');
    btn.id = 'mode-btn';
    btn.textContent = '🔭 Orbite';
    document.body.appendChild(btn);
}
