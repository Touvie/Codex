import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// ─── Textures ─────────────────────────────────────────────────────────────────

function makeLeatherTex(baseHex) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');
    const r = (baseHex >> 16) & 0xff, g = (baseHex >> 8) & 0xff, b = baseHex & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 30000; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const a = Math.random() * 0.13, light = Math.random() > 0.7;
        ctx.fillStyle = light ? `rgba(255,200,130,${a*0.3})` : `rgba(0,0,0,${a})`;
        ctx.fillRect(x, y, Math.random() * 2 + 0.3, Math.random() * 2 + 0.3);
    }
    for (let i = 0; i < 14; i++) {
        const x1 = Math.random() * 512, y1 = Math.random() * 512;
        ctx.strokeStyle = `rgba(255,185,100,${Math.random() * 0.04})`;
        ctx.lineWidth = Math.random() * 1.2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x1+Math.random()*130-65, y1+Math.random()*130-65, x1+Math.random()*260-130, y1+Math.random()*260-130);
        ctx.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

function makePagesTex() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 512;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#f0e5d2';
    ctx.fillRect(0, 0, 256, 512);
    for (let x = 0; x < 256; x += 7) {
        const v = Math.floor(Math.random() * 22);
        ctx.fillStyle = `rgba(${140-v},${118-v},${95-v},0.38)`;
        ctx.fillRect(x, 0, 4, 512);
    }
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(155,115,75,0.28)');
    grad.addColorStop(0.1, 'rgba(155,115,75,0)');
    grad.addColorStop(0.9, 'rgba(155,115,75,0)');
    grad.addColorStop(1, 'rgba(155,115,75,0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);
    return new THREE.CanvasTexture(cv);
}

function makeCoverSVG() {
    const W = 512, H = 768, cx = W/2, cy = H/2;
    let seed = 77777;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967295; };
    const starsHTML = Array.from({length: 110}, () => {
        const x=(8+rand()*(W-16)).toFixed(1), y=(rand()*H).toFixed(1);
        const r=(rand()*1.4+0.3).toFixed(2), o=(rand()*0.55+0.15).toFixed(2);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${o}"/>`;
    }).join('');
    const R = [132, 118, 98, 78, 58, 36, 16];
    const spokesHTML = Array.from({length: 24}, (_, i) => {
        const a=(i/24)*Math.PI*2-Math.PI/2, maj=i%2===0;
        const x1=(cx+Math.cos(a)*R[2]).toFixed(2), y1=(cy+Math.sin(a)*R[2]).toFixed(2);
        const x2=(cx+Math.cos(a)*R[1]).toFixed(2), y2=(cy+Math.sin(a)*R[1]).toFixed(2);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${maj?'rgba(140,200,255,0.7)':'rgba(100,170,240,0.3)'}" stroke-width="${maj?1.5:0.7}"/>`;
    }).join('');
    const innerSpokesHTML = Array.from({length: 12}, (_, i) => {
        const a=(i/12)*Math.PI*2-Math.PI/2;
        const x1=(cx+Math.cos(a)*R[4]).toFixed(2), y1=(cy+Math.sin(a)*R[4]).toFixed(2);
        const x2=(cx+Math.cos(a)*R[3]).toFixed(2), y2=(cy+Math.sin(a)*R[3]).toFixed(2);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(120,200,255,0.5)" stroke-width="1"/>`;
    }).join('');
    const moonOps = [1.0,0.85,0.65,0.45,0.15,0.45,0.65,0.85,1.0,0.8,0.5,0.3];
    const moonPhasesHTML = Array.from({length: 12}, (_, i) => {
        const a=(i/12)*Math.PI*2-Math.PI/2, mr=(R[0]+R[1])/2;
        const mx_=(cx+Math.cos(a)*mr).toFixed(2), my_=(cy+Math.sin(a)*mr).toFixed(2);
        return `<circle cx="${mx_}" cy="${my_}" r="5.5" fill="rgba(200,230,255,${moonOps[i].toFixed(2)})" filter="url(#glow)"/>`;
    }).join('');
    const innerDotsHTML = Array.from({length: 6}, (_, i) => {
        const a=(i/6)*Math.PI*2-Math.PI/2;
        const dx=(cx+Math.cos(a)*R[5]).toFixed(2), dy=(cy+Math.sin(a)*R[5]).toFixed(2);
        return `<circle cx="${dx}" cy="${dy}" r="2.5" fill="rgba(190,225,255,0.8)" filter="url(#glow)"/>`;
    }).join('');
    const ticksHTML = Array.from({length: 12}, (_, i) => {
        const a=(i/12)*Math.PI*2-Math.PI/2, r=R[2]+6, ta=a+Math.PI/2;
        const x1=(cx+Math.cos(a)*r-Math.cos(ta)*5).toFixed(2), y1=(cy+Math.sin(a)*r-Math.sin(ta)*5).toFixed(2);
        const x2=(cx+Math.cos(a)*r+Math.cos(ta)*5).toFixed(2), y2=(cy+Math.sin(a)*r+Math.sin(ta)*5).toFixed(2);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(140,200,255,0.6)" stroke-width="1.5"/>`;
    }).join('');
    const cornersHTML = [{x:13,y:13,dx:28,dy:28},{x:W-13,y:13,dx:-28,dy:28},{x:W-13,y:H-13,dx:-28,dy:-28},{x:13,y:H-13,dx:28,dy:-28}]
        .map(({x,y,dx,dy}) => `<line x1="${x}" y1="${y}" x2="${x+dx}" y2="${y}" stroke="#d4a832" stroke-width="2.5"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y+dy}" stroke="#d4a832" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3.5" fill="#f0cc60"/><circle cx="${x}" cy="${y}" r="1.5" fill="#7a4a10"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#060516"/><stop offset="30%" stop-color="#0b1038"/><stop offset="70%" stop-color="#0b1038"/><stop offset="100%" stop-color="#060516"/></linearGradient><radialGradient id="skyGlow" cx="50%" cy="47%" r="42%"><stop offset="0%" stop-color="#1830b0" stop-opacity="0.45"/><stop offset="100%" stop-color="#060516" stop-opacity="0"/></radialGradient><radialGradient id="wheelBg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#0a1845"/><stop offset="100%" stop-color="#040a1a"/></radialGradient><radialGradient id="cGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="1"/><stop offset="18%" stop-color="#b8deff" stop-opacity="0.95"/><stop offset="45%" stop-color="#4488dd" stop-opacity="0.45"/><stop offset="100%" stop-color="#002299" stop-opacity="0"/></radialGradient><radialGradient id="wGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#2255ee" stop-opacity="0.35"/><stop offset="100%" stop-color="#2255ee" stop-opacity="0"/></radialGradient><linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4a2e06"/><stop offset="25%" stop-color="#c08830"/><stop offset="50%" stop-color="#f0cc60"/><stop offset="75%" stop-color="#c08830"/><stop offset="100%" stop-color="#4a2e06"/></linearGradient><linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a2e06"/><stop offset="25%" stop-color="#c08830"/><stop offset="50%" stop-color="#f0cc60"/><stop offset="75%" stop-color="#c08830"/><stop offset="100%" stop-color="#4a2e06"/></linearGradient><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="inner"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs><rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#skyGlow)"/><g clip-path="url(#inner)">${starsHTML}</g><rect x="10" y="10" width="${W-20}" height="${H-20}" fill="none" stroke="url(#goldH)" stroke-width="3"/><rect x="18" y="18" width="${W-36}" height="${H-36}" fill="none" stroke="rgba(200,160,60,0.4)" stroke-width="1"/>${cornersHTML}<line x1="18" y1="${cy-195}" x2="${W-18}" y2="${cy-195}" stroke="rgba(200,160,60,0.5)" stroke-width="0.8"/><line x1="18" y1="${cy+195}" x2="${W-18}" y2="${cy+195}" stroke="rgba(200,160,60,0.5)" stroke-width="0.8"/><polygon points="${cx},${cy-201} ${cx+7},${cy-195} ${cx},${cy-189} ${cx-7},${cy-195}" fill="#d4a832"/><polygon points="${cx},${cy+201} ${cx+7},${cy+195} ${cx},${cy+189} ${cx-7},${cy+195}" fill="#d4a832"/><circle cx="${cx}" cy="${cy}" r="170" fill="url(#wGlow)"/><circle cx="${cx}" cy="${cy}" r="${R[0]}" fill="url(#wheelBg)"/>${moonPhasesHTML}<circle cx="${cx}" cy="${cy}" r="${R[0]}" fill="none" stroke="#c9a030" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="${R[1]}" fill="none" stroke="#a07820" stroke-width="1.5"/>${spokesHTML}${ticksHTML}<circle cx="${cx}" cy="${cy}" r="${R[2]}" fill="none" stroke="rgba(120,190,255,0.55)" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${R[3]}" fill="none" stroke="rgba(100,175,255,0.45)" stroke-width="1"/>${innerSpokesHTML}<circle cx="${cx}" cy="${cy}" r="${R[4]}" fill="none" stroke="rgba(140,210,255,0.5)" stroke-width="1.2"/><circle cx="${cx}" cy="${cy}" r="${R[5]}" fill="none" stroke="rgba(160,220,255,0.5)" stroke-width="1"/>${innerDotsHTML}<circle cx="${cx}" cy="${cy}" r="${R[6]}" fill="rgba(180,225,255,0.12)" stroke="rgba(180,225,255,0.45)" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="55" fill="url(#cGlow)" filter="url(#bigGlow)"/><circle cx="${cx}" cy="${cy}" r="22" fill="rgba(210,240,255,0.65)" filter="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="8" fill="rgba(240,250,255,0.9)" filter="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="white"/></svg>`;
}

async function makeCoverTex() {
    const W = 2048, H = 3072;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const svgStr = makeCoverSVG();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { cv.getContext('2d').drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url); resolve(new THREE.CanvasTexture(cv)); };
        img.onerror = reject;
        img.src = url;
    });
}

function makeCoverBumpTex() {
    const W = 512, H = 768;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const cx = W/2, cy = H/2;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 6;
    ctx.strokeRect(60, 10, W-120, H-20);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(68, 18, W-136, H-36);
    const corners = [[63,13,42,42],[W-63,13,-42,42],[W-63,H-13,-42,-42],[63,H-13,42,-42]];
    corners.forEach(([x,y,dx,dy]) => {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(Math.min(x,x+dx)-2, Math.min(y,y+dy)-2, Math.abs(dx)+4, Math.abs(dy)+4);
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5; ctx.lineCap = 'square';
        ctx.beginPath(); ctx.moveTo(x+dx,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x+dx*0.7,y+Math.sign(dy)*4); ctx.lineTo(x+Math.sign(dx)*4,y+Math.sign(dy)*4); ctx.lineTo(x+Math.sign(dx)*4,y+dy*0.7); ctx.stroke();
        const cg = ctx.createRadialGradient(x,y,0,x,y,10);
        cg.addColorStop(0,'rgba(255,255,255,1)'); cg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
    });
    [cy-165,cy+165].forEach(lineY => {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(72,lineY); ctx.lineTo(W-72,lineY); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.moveTo(cx,lineY-8); ctx.lineTo(cx+10,lineY); ctx.lineTo(cx,lineY+8); ctx.lineTo(cx-10,lineY); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0,0,55,H); ctx.fillRect(W-55,0,55,H);
    return new THREE.CanvasTexture(cv);
}

function makeSpineSVG() {
    const W = 256, H = 1430, cx = W/2, cy = H/2;
    let seed = 424242;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967295; };
    const starsHTML = Array.from({length: 70}, () => {
        const x=(12+rand()*(W-24)).toFixed(1), y=(rand()*H).toFixed(1);
        const r=(rand()*1.3+0.3).toFixed(2), o=(rand()*0.5+0.15).toFixed(2);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${o}"/>`;
    }).join('');
    const cornersHTML = [{x:13,y:13,dx:22,dy:22},{x:W-13,y:13,dx:-22,dy:22},{x:W-13,y:H-13,dx:-22,dy:-22},{x:13,y:H-13,dx:22,dy:-22}]
        .map(({x,y,dx,dy}) => `<line x1="${x}" y1="${y}" x2="${x+dx}" y2="${y}" stroke="#d4a832" stroke-width="2.5"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y+dy}" stroke="#d4a832" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3" fill="#f0cc60"/><circle cx="${x}" cy="${y}" r="1.3" fill="#7a4a10"/>`).join('');
    const moonOps = [0.2,0.4,0.6,0.85];
    const moonsHTML = [-4,-3,-2,-1,1,2,3,4].map(k => {
        const my_=cy+k*115, op=moonOps[4-Math.abs(k)] ?? 0.2;
        return `<circle cx="${cx}" cy="${my_}" r="6" fill="rgba(200,230,255,${op.toFixed(2)})" filter="url(#glow)"/>`;
    }).join('');
    const rulesHTML = [95, H-95].map(ry =>
        `<line x1="20" y1="${ry}" x2="${W-20}" y2="${ry}" stroke="rgba(200,160,60,0.5)" stroke-width="0.8"/><polygon points="${cx},${ry-7} ${cx+8},${ry} ${cx},${ry+7} ${cx-8},${ry}" fill="#d4a832"/>`
    ).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#060516"/><stop offset="30%" stop-color="#0b1038"/><stop offset="70%" stop-color="#0b1038"/><stop offset="100%" stop-color="#060516"/></linearGradient><linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a2e06"/><stop offset="25%" stop-color="#c08830"/><stop offset="50%" stop-color="#f0cc60"/><stop offset="75%" stop-color="#c08830"/><stop offset="100%" stop-color="#4a2e06"/></linearGradient><radialGradient id="cGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="1"/><stop offset="18%" stop-color="#b8deff" stop-opacity="0.95"/><stop offset="45%" stop-color="#4488dd" stop-opacity="0.45"/><stop offset="100%" stop-color="#002299" stop-opacity="0"/></radialGradient><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="${W}" height="${H}" fill="url(#bg)"/>${starsHTML}<rect x="9" y="9" width="${W-18}" height="${H-18}" fill="none" stroke="url(#goldV)" stroke-width="3"/><rect x="16" y="16" width="${W-32}" height="${H-32}" fill="none" stroke="rgba(200,160,60,0.4)" stroke-width="1"/>${cornersHTML}${rulesHTML}${moonsHTML}<circle cx="${cx}" cy="${cy}" r="42" fill="url(#cGlow)" filter="url(#bigGlow)"/><circle cx="${cx}" cy="${cy}" r="16" fill="rgba(210,240,255,0.65)" filter="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="6" fill="rgba(240,250,255,0.9)" filter="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="white"/></svg>`;
}

async function makeSpineCoverTex() {
    const W = 512, H = 2860;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const svgStr = makeSpineSVG();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { cv.getContext('2d').drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url); resolve(new THREE.CanvasTexture(cv)); };
        img.onerror = reject;
        img.src = url;
    });
}

function makeSpineTex() {
    const CW=256, CH=512;
    const cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0e0802'; ctx.fillRect(0,0,CW,CH);
    for (let i=0;i<10000;i++) { const x=Math.random()*CW, y=Math.random()*CH; ctx.fillStyle=`rgba(0,0,0,${Math.random()*0.12})`; ctx.fillRect(x,y,Math.random()*2,Math.random()*2); }
    const GOLD = '#c9a84c';
    [0.15,0.3,0.7,0.85].forEach(pct => { const y=CH*pct; ctx.strokeStyle=GOLD; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(CW-10,y); ctx.stroke(); });
    const cx_=CW/2, cy_=CH/2;
    ctx.strokeStyle=GOLD; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(cx_,cy_-14); ctx.lineTo(cx_+10,cy_); ctx.lineTo(cx_,cy_+14); ctx.lineTo(cx_-10,cy_); ctx.closePath(); ctx.stroke();
    return new THREE.CanvasTexture(cv);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initBook(scene, renderer) {
    const W=1.4, H=2.1, D=0.30, OV=0.055, CT=0.048;

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffd580, 3.5);
    keyLight.position.set(4,7,5); keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048,2048);
    keyLight.shadow.camera.near=1; keyLight.shadow.camera.far=25;
    keyLight.shadow.camera.left=-5; keyLight.shadow.camera.right=5;
    keyLight.shadow.camera.top=5; keyLight.shadow.camera.bottom=-5;
    keyLight.shadow.bias=-0.001;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x2244aa, 1.2);
    rimLight.position.set(-4,2,-5); scene.add(rimLight);
    const glowLight = new THREE.PointLight(0xbb5500, 2.5, 7);
    glowLight.position.set(0,-3,1.5); scene.add(glowLight);

    // Niveau de lumière chaude (filtre jauni), 0 = blanc neutre, 1 = chaud max
    const _warmColor = new THREE.Color(0xffd580);
    const _whiteColor = new THREE.Color(0xffffff);
    window._setWarmLight = (level) => {
        const t = typeof level === 'boolean' ? (level ? 1 : 0) : level;
        keyLight.color.copy(_whiteColor).lerp(_warmColor, t);
        glowLight.intensity = 2.5 * t;
    };
    window._setWarmLight(0.5);

    // Matériaux
    const leatherTex  = makeLeatherTex(0x120a04);
    const spineTex    = makeSpineTex();
    const pagesTex    = makePagesTex();
    const pagesTexTop = makePagesTex();
    pagesTexTop.rotation = Math.PI/2; pagesTexTop.center.set(0.5,0.5);
    const coverTex     = await makeCoverTex();
    const coverBumpTex = makeCoverBumpTex();
    const spineCoverTex = await makeSpineCoverTex();

    const matLeather = new THREE.MeshStandardMaterial({ map:leatherTex, color:0x1c0e05, roughness:0.88, metalness:0.04 });
    const matSpine   = new THREE.MeshStandardMaterial({ map:spineTex,   color:0x1c0e05, roughness:0.88, metalness:0.04 });
    const matPages   = new THREE.MeshStandardMaterial({ color:0xf0e4d0, roughness:0.92, metalness:0.0 });
    const matPagesEdge = new THREE.MeshStandardMaterial({ map:pagesTex, color:0xf0e4d0, roughness:0.92, metalness:0.0 });
    const matPagesTop  = new THREE.MeshStandardMaterial({ map:pagesTexTop, color:0xf0e4d0, roughness:0.92, metalness:0.0 });
    const matGold = new THREE.MeshStandardMaterial({ color:0xc9a84c, roughness:0.22, metalness:0.90 });
    const matCoverFront = new THREE.MeshStandardMaterial({ map:coverTex, bumpMap:coverBumpTex, bumpScale:0.5, roughness:0.84, metalness:0.05 });
    const matSpineCover = new THREE.MeshStandardMaterial({ map:spineCoverTex, roughness:0.84, metalness:0.05 });

    const spineClipPlane = new THREE.Plane();
    const _spineEdgeLocal  = new THREE.Vector3(-W/2,0,0);
    const _spineNormalLocal = new THREE.Vector3(1,0,0);
    const _spineEdgeWorld  = new THREE.Vector3();
    const _spineNormalWorld = new THREE.Vector3();
    [matPages, matPagesEdge, matPagesTop].forEach(m => m.clippingPlanes = [spineClipPlane]);

    // Assemblage livre
    const book = new THREE.Group();
    book.scale.set(1.00,1.00,1.00);
    scene.add(book);

    const backPivot = new THREE.Group();
    backPivot.position.set(-W/2,0,-D/2);
    book.add(backPivot);
    const backPages = new THREE.Mesh(new THREE.BoxGeometry(W,H,D/2), [matPagesEdge,matPages,matPagesTop,matPagesTop,matPages,matPages]);
    backPages.position.set(W/2,0,D/4); backPages.castShadow=true; backPivot.add(backPages);
    const backCover = new THREE.Mesh(new THREE.BoxGeometry(W+OV,H+OV*2,CT), [matLeather,matLeather,matLeather,matLeather,matLeather,matCoverFront]);
    backCover.position.set((W+OV)/2,0,-CT/2); backCover.castShadow=true; backPivot.add(backCover);

    const spineEl = new THREE.Mesh(new THREE.BoxGeometry(CT,H+OV*2,D+CT*2), [matLeather,matSpineCover,matLeather,matLeather,matSpine,matSpine]);
    spineEl.position.set(-(W/2+CT/2),0,0); spineEl.castShadow=true; book.add(spineEl);

    const frontPivot = new THREE.Group();
    frontPivot.position.set(-W/2,0,D/2);
    book.add(frontPivot);
    const frontCover = new THREE.Mesh(new THREE.BoxGeometry(W+OV,H+OV*2,CT), [matLeather,matLeather,matLeather,matLeather,matCoverFront,matLeather]);
    frontCover.position.set((W+OV)/2,0,CT/2); frontCover.castShadow=true; frontPivot.add(frontCover);
    const frontPages = new THREE.Mesh(new THREE.BoxGeometry(W,H,D/2), [matPagesEdge,matPages,matPagesTop,matPagesTop,matPages,matPages]);
    frontPages.position.set(W/2,0,-D/4); frontPages.castShadow=true; frontPivot.add(frontPages);

    // ─── Dorures (groupe réutilisé sur couverture avant ET arrière) ───────────
    const cornerSize=0.18, cornerT=0.008;
    const halfW=(W+OV)/2, topY=H/2+OV;
    const frameT=0.011, frameInsetX=0.025, frameInsetY=0.028;
    const frameW=(W+OV)-2*frameInsetX, frameH=(H+OV*2)-2*frameInsetY;
    const frameTopY=topY-frameInsetY, frameZ=CT+frameT/2;
    const ruleY=195/768*(H+OV*2), ruleW=frameW, ruleT=0.006;
    const circleScale=(W+OV)/512, circleR0=132*circleScale, circleR1=118*circleScale, circleZ=frameZ+0.004;

    function buildGoldOrnaments() {
        const g=new THREE.Group();
        const czp=CT+cornerT/2;
        // Coins
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sy]) => {
            const hBar=new THREE.Mesh(new THREE.BoxGeometry(cornerSize,cornerT,cornerT+0.002),matGold);
            hBar.position.set(sx*(halfW-cornerSize/2), topY*sy-sy*cornerT/2, czp);
            g.add(hBar);
            const vBar=new THREE.Mesh(new THREE.BoxGeometry(cornerT,cornerSize,cornerT+0.002),matGold);
            vBar.position.set(sx*(halfW-cornerT/2), topY*sy-sy*(cornerSize/2), czp);
            g.add(vBar);
        });
        // Cadre
        [[frameW+frameT,frameT,frameT,0,frameTopY],[frameW+frameT,frameT,frameT,0,-frameTopY],[frameT,frameH,frameT,-(halfW-frameInsetX),0],[frameT,frameH,frameT,halfW-frameInsetX,0]]
            .forEach(([bw,bh,bd,bx,by]) => { const bar=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),matGold); bar.position.set(bx,by,frameZ); g.add(bar); });
        // Règles + losanges
        [-ruleY,ruleY].forEach(ry => {
            const rule=new THREE.Mesh(new THREE.BoxGeometry(ruleW,ruleT,ruleT+0.002),matGold);
            rule.position.set(0,ry,frameZ); g.add(rule);
            const d=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.055,0.013),matGold);
            d.rotation.z=Math.PI/4; d.position.set(0,ry,frameZ+0.007); g.add(d);
        });
        const dotSz=frameT*2.5;
        [-ruleY,ruleY].forEach(ry => [-(halfW-frameInsetX),halfW-frameInsetX].forEach(rx => {
            const dot=new THREE.Mesh(new THREE.BoxGeometry(dotSz,dotSz,dotSz),matGold);
            dot.position.set(rx,ry,frameZ); g.add(dot);
        }));
        // Anneaux
        [[circleR0,0.006,6,90],[circleR1,0.004,6,80]].forEach(([r,tube,rs,ts]) => {
            const ring=new THREE.Mesh(new THREE.TorusGeometry(r,tube,rs,ts),matGold);
            ring.position.set(0,0,circleZ); g.add(ring);
        });
        return g;
    }

    const frontGold=buildGoldOrnaments();
    frontGold.position.set(halfW,0,0);
    frontPivot.add(frontGold);

    const backGold=buildGoldOrnaments();
    backGold.position.set(halfW,0,0);
    backGold.rotation.y=Math.PI; // face vers l'extérieur arrière
    backPivot.add(backGold);

    // Chiffres romains (ajoutés aux deux couvertures au chargement de la police)
    new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/optimer_bold.typeface.json', (font) => {
        [frontGold,backGold].forEach(group => {
            ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((label,i) => {
                const a=Math.PI/2-(i/12)*Math.PI*2;
                const geo=new TextGeometry(label,{font,size:0.036,height:0.010,curveSegments:4});
                geo.computeBoundingBox(); const bb=geo.boundingBox;
                geo.translate(-(bb.max.x-bb.min.x)/2,-(bb.max.y-bb.min.y)/2,0);
                const mesh=new THREE.Mesh(geo,matGold);
                mesh.position.set(Math.cos(a)*(circleR0+0.062),Math.sin(a)*(circleR0+0.062),CT+0.001);
                group.add(mesh);
            });
        });
    });

    // ─── Dorures du spine (face extérieure) ───────────────────────────────────
    const SD=D+CT*2, spineFaceX=-(W/2+CT)-0.004, sT=0.006, sArm=0.07;
    const spineGold=new THREE.Group(); book.add(spineGold);
    // Coins (équerres)
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sz_,sy]) => {
        const zEdge=sz_*(SD/2-0.012), yEdge=sy*(topY-0.012);
        const zBar=new THREE.Mesh(new THREE.BoxGeometry(sT,sT,sArm),matGold);
        zBar.position.set(spineFaceX, yEdge, zEdge-sz_*sArm/2); spineGold.add(zBar);
        const yBar=new THREE.Mesh(new THREE.BoxGeometry(sT,sArm,sT),matGold);
        yBar.position.set(spineFaceX, yEdge-sy*sArm/2, zEdge); spineGold.add(yBar);
    });
    // Filets haut/bas + losanges (mêmes proportions que la texture SVG)
    [-(topY*0.867),topY*0.867].forEach(ry => {
        const rule=new THREE.Mesh(new THREE.BoxGeometry(sT,sT,SD-0.05),matGold);
        rule.position.set(spineFaceX,ry,0); spineGold.add(rule);
        const d=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.035,0.035),matGold);
        d.rotation.x=Math.PI/4; d.position.set(spineFaceX,ry,0); spineGold.add(d);
    });



    // ─── Feuilles WebGL ───────────────────────────────────────────────────────

    const PAGE_TEXTURES = [
        ['book/images/1.png',  'book/images/2.png' ], // feuille 1  : pages 1 / 2
        ['book/images/3.png',  'book/images/4.png' ], // feuille 2  : pages 3 / 4
        ['book/images/5.png',  'book/images/6.png' ], // feuille 3  : pages 5 / 6
        ['book/images/7.png',  'book/images/8.png' ], // feuille 4  : pages 7 / 8 (8 = trou noir gauche)
        ['book/images/9.png',  'book/images/10.png'], // feuille 5  : pages 9 / 10 (9 = trou noir droite)
        ['book/images/11.png', 'book/images/12.png'], // feuille 6  : pages 11 / 12
        ['book/images/13.png', 'book/images/14.png'], // feuille 7  : pages 13 / 14
        ['book/images/15.png', 'book/images/16.png'], // feuille 8  : pages 15 / 16
        ['book/images/17.png', 'book/images/18.png'], // feuille 9  : pages 17 / 18
        ['book/images/19.png', null                ], // feuille 10 : pages 19 / 20 (19 = affiche, 20 vide → placeholder)
    ];

    function makePagePlaceholderTex(pageNum, side) {
        const cv=document.createElement('canvas'); cv.width=1024; cv.height=1536;
        const ctx=cv.getContext('2d'), isRecto=side==='recto';
        ctx.fillStyle=isRecto?'#cc2222':'#4a7c20'; ctx.fillRect(0,0,1024,1536);
        ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='bold 96px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('Page '+pageNum,512,680); ctx.font='64px Georgia'; ctx.fillText(isRecto?'recto':'verso',512,820);
        return new THREE.CanvasTexture(cv);
    }

    const _texLoader=new THREE.TextureLoader();
    function _loadTex(path, fallback) {
        if (!path) return fallback();
        // initTexture force l'upload GPU dès le chargement (évite le freeze au milieu du flip)
        const t=_texLoader.load(path, (tex)=>renderer.initTexture(tex));
        t.colorSpace=THREE.SRGBColorSpace;
        t.anisotropy=renderer.capabilities.getMaxAnisotropy();
        return t;
    }

    const SPINE_X=-0.57, PAGE_Z=0.000, PAGE_EXT=0.12;
    const leafTextures=PAGE_TEXTURES.map(([rPath,vPath],i) => ({
        recto:_loadTex(rPath,()=>makePagePlaceholderTex(i*2+1,'recto')),
        verso:_loadTex(vPath,()=>makePagePlaceholderTex(i*2+2,'verso'))
    }));
    // Page 0 (page de garde) : affichée sur la page de gauche du premier spread
    const tex0=_loadTex('book/images/0.png',()=>makePagePlaceholderTex(0,'verso'));
    // Liste ordonnée des pages réelles (0,1,2,...) pour la génération du PDF côté client
    window._pageImagePaths=['book/images/0.png',...PAGE_TEXTURES.flat().filter(Boolean)];

    let spreadIndex=0, isFlipping=false;
    let FOLD_ANGLE=10*Math.PI/180, TILT_ANGLE=90*Math.PI/180;

    function _makeMat(tex) {
        const m = new THREE.MeshStandardMaterial({map:tex||null,side:THREE.DoubleSide,roughness:0.9,metalness:0});
        // Biais mipmap négatif : force un niveau de détail plus net sur les zones
        // inclinées/éloignées (côté reliure quand le livre est ouvert à 80°)
        m.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                '#ifdef USE_MAP\n\tvec4 sampledDiffuseColor = texture2D( map, vMapUv, -0.8 );\n\tdiffuseColor *= sampledDiffuseColor;\n#endif'
            );
        };
        m.customProgramCacheKey = () => 'leaf_sharp';
        return m;
    }

    const leftGroup=new THREE.Group(); leftGroup.position.set(SPINE_X,0,PAGE_Z); leftGroup.visible=false; book.add(leftGroup);
    const leftMat=_makeMat(null);
    const leftMesh=new THREE.Mesh(new THREE.PlaneGeometry(W+PAGE_EXT,H),leftMat);
    leftMesh.position.x=-(W+PAGE_EXT)/2; leftGroup.add(leftMesh);

    const rightGroup=new THREE.Group(); rightGroup.position.set(SPINE_X,0,PAGE_Z+0.001); rightGroup.visible=false; book.add(rightGroup);
    const rightMat=_makeMat(null);
    const rightMesh=new THREE.Mesh(new THREE.PlaneGeometry(W+PAGE_EXT,H),rightMat);
    rightMesh.position.x=(W+PAGE_EXT)/2; rightGroup.add(rightMesh);

    const animGroup=new THREE.Group(); animGroup.position.set(SPINE_X,0,PAGE_Z+0.002); animGroup.visible=false; book.add(animGroup);
    const animMat=_makeMat(null); animMat.depthTest=false; animMat.transparent=true;
    const animMesh=new THREE.Mesh(new THREE.PlaneGeometry(W+PAGE_EXT,H),animMat);
    animMesh.position.x=(W+PAGE_EXT)/2; animMesh.renderOrder=999; animGroup.add(animMesh);

    const leaves=[leftGroup,rightGroup,animGroup];

    function _applyFold() { leftGroup.rotation.y=FOLD_ANGLE+TILT_ANGLE; rightGroup.rotation.y=-FOLD_ANGLE+TILT_ANGLE; }
    function _updateStaticPages() {
        leftMat.map=spreadIndex>0?leafTextures[spreadIndex-1].verso:tex0; leftMat.needsUpdate=true; leftGroup.visible=true;
        rightMat.map=spreadIndex<leafTextures.length?leafTextures[spreadIndex].recto:null; rightMat.needsUpdate=true; rightGroup.visible=spreadIndex<leafTextures.length;
        _applyFold();
    }
    function updatePageIndicator() {
        const ind=document.getElementById('page-indicator'); if(!ind)return;
        if(spreadIndex>=leafTextures.length) ind.textContent='Fin';
        else ind.textContent='Pages '+(spreadIndex*2)+' – '+(spreadIndex*2+1);
    }
    function showLeaves() { _updateStaticPages(); updatePageIndicator(); }
    function hideLeaves() { spreadIndex=0; isFlipping=false; leftGroup.visible=rightGroup.visible=animGroup.visible=false; }

    function flipForward() {
        if(isFlipping||spreadIndex>=leafTextures.length)return; isFlipping=true;
        const recto=leafTextures[spreadIndex].recto, verso=leafTextures[spreadIndex].verso;
        animMat.map=recto; animMat.needsUpdate=true; animMesh.position.x=(W+PAGE_EXT)/2;
        animGroup.rotation.y=-FOLD_ANGLE+TILT_ANGLE; animGroup.visible=true; rightGroup.visible=false;
        if(spreadIndex+1<leafTextures.length){rightMat.map=leafTextures[spreadIndex+1].recto;rightMat.needsUpdate=true;rightGroup.visible=true;}else{rightGroup.visible=false;}
        gsap.delayedCall(0.80,()=>{leftMat.map=verso;leftMat.needsUpdate=true;leftGroup.visible=true;});
        gsap.to(animGroup.rotation,{y:TILT_ANGLE-Math.PI/2,duration:0.64,ease:'power2.in',onComplete(){
            animMat.map=verso;animMat.needsUpdate=true;animMesh.position.x=-(W+PAGE_EXT)/2;animGroup.rotation.y=TILT_ANGLE+Math.PI/2;
            gsap.to(animGroup.rotation,{y:FOLD_ANGLE+TILT_ANGLE,duration:0.64,ease:'power2.out',onComplete(){spreadIndex++;animGroup.visible=false;animMesh.position.x=(W+PAGE_EXT)/2;_updateStaticPages();isFlipping=false;updatePageIndicator();}});
        }});
    }

    function flipBack() {
        if(isFlipping||spreadIndex<=0)return; isFlipping=true; spreadIndex--;
        const verso=leafTextures[spreadIndex].verso, recto=leafTextures[spreadIndex].recto;
        animMat.map=verso;animMat.needsUpdate=true;animMesh.position.x=-(W+PAGE_EXT)/2;
        animGroup.rotation.y=FOLD_ANGLE+TILT_ANGLE;animGroup.visible=true;leftGroup.visible=false;
        leftMat.map=spreadIndex>0?leafTextures[spreadIndex-1].verso:tex0;leftMat.needsUpdate=true;leftGroup.visible=true;
        gsap.delayedCall(0.80,()=>{rightMat.map=recto;rightMat.needsUpdate=true;rightGroup.visible=true;});
        gsap.to(animGroup.rotation,{y:TILT_ANGLE+Math.PI/2,duration:0.64,ease:'power2.in',onComplete(){
            animMat.map=recto;animMat.needsUpdate=true;animMesh.position.x=(W+PAGE_EXT)/2;animGroup.rotation.y=TILT_ANGLE-Math.PI/2;
            gsap.to(animGroup.rotation,{y:-FOLD_ANGLE+TILT_ANGLE,duration:0.64,ease:'power2.out',onComplete(){animGroup.visible=false;animMesh.position.x=(W+PAGE_EXT)/2;_updateStaticPages();isFlipping=false;updatePageIndicator();}});
        }});
    }

    // ─── GSAP animations ──────────────────────────────────────────────────────

    let isOpen=false;
    const introTl=gsap.timeline({delay:0.3});
    introTl.to(book.rotation,{y:0.65,duration:2.2,ease:'power2.inOut'})
           .to(book.rotation,{y:-0.45,duration:2.8,ease:'power2.inOut'})
           .to(book.rotation,{y:0.0,duration:1.6,ease:'power2.out'});

    const targetRot={x:0,y:0};

    const btn=document.getElementById('btn');
    btn.addEventListener('click',()=>{
        introTl.kill(); gsap.killTweensOf(book.rotation);
        const expandX=1.2;
        if(!isOpen){
            gsap.to(frontPivot.rotation,{y:-(80*Math.PI/180),duration:2.0,ease:'power3.inOut'});
            gsap.to(backPivot.rotation, {y: (80*Math.PI/180),duration:2.0,ease:'power3.inOut'});
            gsap.to(frontPages.scale,   {x:expandX,duration:2.0,ease:'power3.inOut'});
            gsap.to(backPages.scale,    {x:expandX,duration:2.0,ease:'power3.inOut'});
            gsap.to(frontPages.position,{x:W*(1-expandX/2),duration:2.0,ease:'power3.inOut'});
            gsap.to(backPages.position, {x:W*(1-expandX/2),duration:2.0,ease:'power3.inOut'});
            gsap.killTweensOf(book.rotation); targetRot.x=0; targetRot.y=-Math.PI/2;
            gsap.to(book.rotation,{y:-Math.PI/2,x:0,duration:1.4,ease:'power2.inOut'});
            if(window._setParallaxActive) window._setParallaxActive(false);
            if(window._setInvertEffect)   window._setInvertEffect(true);
            btn.style.opacity='0'; btn.style.pointerEvents='none';
            gsap.delayedCall(2.0,()=>{ showLeaves(); document.getElementById('overlay-controls').classList.add('visible'); });
        } else {
            hideLeaves(); document.getElementById('overlay-controls').classList.remove('visible');
            gsap.killTweensOf(book.rotation); targetRot.x=0; targetRot.y=0;
            gsap.to(book.rotation,{y:0,x:0,duration:1.8,ease:'power2.inOut'});
            if(window._setParallaxActive) window._setParallaxActive(true);
            if(window._setInvertEffect)   window._setInvertEffect(false);
            setTimeout(()=>{
                gsap.to(frontPivot.rotation,{y:0,duration:1.8,ease:'power2.inOut'});
                gsap.to(backPivot.rotation, {y:0,duration:1.8,ease:'power2.inOut'});
                gsap.to(frontPages.scale,   {x:1,duration:1.8,ease:'power2.inOut'});
                gsap.to(backPages.scale,    {x:1,duration:1.8,ease:'power2.inOut'});
                gsap.to(frontPages.position,{x:W/2,duration:1.8,ease:'power2.inOut'});
                gsap.to(backPages.position, {x:W/2,duration:1.8,ease:'power2.inOut'});
            },450);
            setTimeout(()=>{ btn.style.opacity='1'; btn.style.pointerEvents='auto'; },2300);
        }
        isOpen=!isOpen;
        window._bookIsOpen=isOpen;
    });

    // ─── Update (appelé chaque frame) ─────────────────────────────────────────

    function updateBook() {
        book.rotation.y+=(targetRot.y-book.rotation.y)*0.08;
        book.rotation.x+=(targetRot.x-book.rotation.x)*0.08;
        book.updateMatrixWorld();
        _spineEdgeWorld.copy(_spineEdgeLocal).applyMatrix4(book.matrixWorld);
        _spineNormalWorld.copy(_spineNormalLocal).transformDirection(book.matrixWorld).normalize();
        spineClipPlane.setFromNormalAndCoplanarPoint(_spineNormalWorld,_spineEdgeWorld);
    }

    // Globals pour les scripts non-module (debug panel, navigation)
    window.flipForward=flipForward; window.flipBack=flipBack;
    window._book=book;
    window._leaves=leaves;
    window._setFold=(rad)=>{ FOLD_ANGLE=rad; _applyFold(); };
    window._setTilt=(rad)=>{ TILT_ANGLE=rad; _applyFold(); };
    window._getSpread=()=>({spreadIndex,isFlipping});

    return { book, updateBook, flipForward, flipBack, introTl, targetRot, frontPivot, backPivot, frontPages, backPages };
}
