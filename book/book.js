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

// ─── Couverture galaxie (reflet équirectangulaire net, fait main) ─────────────
// Voie lactée réfléchie sur la couverture (devant/dos/tranche) — chaque face a
// sa propre normale, donc chacune "voit" une portion différente du panorama
// selon son orientation. PAS de MeshStandardMaterial+envMap : ça oblige à passer
// par PMREMGenerator, qui PRÉ-FLOUTE l'environnement (conçu pour de l'éclairage
// physique basse résolution ~1024×512, pas un reflet net) — incompatible avec
// une image 4K+ qu'on veut nette. Ici : ShaderMaterial fait main, échantillonne
// milkyway.jpg en pleine résolution selon le vecteur de réflexion, aucun flou.
const GALAXY_THEMES = {
    // Couleur native, même formule que le skybox d'Oblivion14.5 (app.js) :
    // pow(rgb, 3.0) * 1.5, un simple boost de contraste, pas de teinte.
    normal: { gamma: [3.0, 3.0, 3.0], gain: [1.5, 1.5, 1.5] },
    or:    { gamma: [2.0, 2.5, 4.5], gain: [2.5, 1.6, 0.15] },
    rouge: { gamma: [1.8, 4.5, 4.5], gain: [3.0, 0.1,  0.1 ] },
    blanc: { gamma: [0.7, 0.7, 0.7], gain: [1.6, 1.6,  1.8 ] },
    bleu:  { gamma: [4.0, 3.5, 1.8], gain: [0.2, 0.3,  2.5 ] },
};
const galaxyGamma = new THREE.Vector3(...GALAXY_THEMES.normal.gamma);
const galaxyGain  = new THREE.Vector3(...GALAXY_THEMES.normal.gain);
// Décalage global appliqué IDENTIQUEMENT aux 3 faces (cf. updateBook) : garde la
// continuité (même décalage partout, les coutures restent alignées) tout en
// redonnant du mouvement — sans lui la bande est figée tant qu'aucune face
// nouvelle n'apparaît physiquement.
const galaxyParallax  = { value: 0 }; // horizontal, piloté par book.rotation.y
const galaxyParallaxV = { value: 0 }; // vertical, piloté par book.rotation.x — sans lui, seul le sens gauche/droite bougeait
// Centre horizontal de la bande dans l'image (0..1) : partagé, réglable en live
// via le slider "orientation" (panneau debug), pour choisir la portion visible.
const galaxyUCenter = { value: 0.57 };

// Reflet-miroir abandonné : deux faces adjacentes d'une boîte ont des normales
// à 90° l'une de l'autre, donc un reflet ne peut PHYSIQUEMENT pas être continu
// à leurs arêtes (comme un vrai objet à angles vifs). À la place : une étiquette
// dépliée autour de la reliure — coordonnée U calculée en espace LOCAL (pas de
// caméra/reflet), continue aux deux coutures (devant↔tranche, tranche↔dos).
// Réagit quand même : tourner le livre révèle progressivement les faces, chacune
// montrant sa portion fixe et continue de la bande.
//   localUExpr : expression GLSL utilisant `position` (coordonnée locale brute,
//                avant décalage) — diffère par face selon son orientation.
//   halfWidth  : demi-largeur de CETTE face le long de l'axe d'enroulement.
//   stripOffset: où cette face commence dans la bande dépliée totale.
//   stripTotal : longueur totale de la bande (devant + tranche + dos).
//   bookHeight : hauteur du livre (H+OV*2), pour la coordonnée V.
// La bande galactique brillante n'occupe qu'une tranche étroite de l'image
// source (le reste est du ciel vide, en haut/bas) — recadrage vertical pour que
// la hauteur du livre corresponde à CETTE bande, pas à toute la hauteur de
// l'équirectangulaire (pôle à pôle), sinon la nébuleuse est écrasée sur une
// mince ligne au milieu avec du noir partout autour.
// Three.js flip verticalement les textures chargées depuis une image (flipY),
// donc la bande repérée visuellement en haut de l'image correspond à un V UV
// plus GRAND, pas plus petit — estimation à l'œil, pas mesurée au pixel près.
const GALAXY_V_MIN = 0.35, GALAXY_V_MAX = 0.68;
const GALAXY_V_SPAN = GALAXY_V_MAX - GALAXY_V_MIN;
const GALAXY_IMG_ASPECT = 2.0; // milkyway.jpg = 6000×3000
// uSpan calculé (pas deviné) pour que U et V utilisent la MÊME échelle pixels-
// monde : sans ça, comme on n'utilisait que 33% de la hauteur de l'image mais
// 100% de sa largeur, le rendu était étiré verticalement d'un facteur ~4 (l'aspect
// "pété"). Passé en paramètre plutôt que recalculé dans le shader (identique pour
// les 3 faces, autant le calculer une fois en JS).
function makeGalaxyMaterial(localUExpr, halfWidth, stripOffset, stripTotal, bookHeight, uSpan) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uGalaxyTex: { value: null }, // assignée une fois l'image chargée (cf. initBook)
            uGamma: { value: galaxyGamma },
            uGain:  { value: galaxyGain },
            uParallax:  galaxyParallax,  // même objet uniform partagé par les 3 faces
            uParallaxV: galaxyParallaxV,
            uUCenter:   galaxyUCenter,   // orientation choisie au slider (panneau debug)
        },
        vertexShader: `
            uniform float uParallax;
            uniform float uParallaxV;
            uniform float uUCenter;
            varying vec2 vGalaxyUv;
            void main() {
                float localU = (${localUExpr}) + ${halfWidth.toFixed(6)};
                float stripFrac = (localU + ${stripOffset.toFixed(6)}) / ${stripTotal.toFixed(6)};
                float u = uUCenter - ${(uSpan / 2).toFixed(6)} + stripFrac * ${uSpan.toFixed(6)} + uParallax * ${uSpan.toFixed(6)};
                float vRaw = position.y / ${bookHeight.toFixed(6)} + 0.5;
                float v = mix(${GALAXY_V_MIN.toFixed(6)}, ${GALAXY_V_MAX.toFixed(6)}, vRaw) + uParallaxV * ${GALAXY_V_SPAN.toFixed(6)};
                // u N'EST PAS wrappé ici (pas de fract) : une face n'a que 4 sommets, et
                // wrapper par sommet fait interpoler le GPU linéairement entre p.ex.
                // fract=0.97 et fract=0.02 en passant par 0.5 (tout l'inverse de l'image
                // au lieu de juste traverser la couture 0/1) dès que la fenêtre de crop
                // chevauche cette couture — c'était le vrai bug (bruit/rayures, uniquement
                // sur l'axe qui utilisait fract, jamais sur V). Le wrap se fait à la place
                // par pixel dans le fragment shader, où fract() d'une valeur interpolée en
                // continu est exact.
                vGalaxyUv = vec2(u, clamp(v, 0.0, 1.0));
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uGalaxyTex;
            uniform vec3 uGamma;
            uniform vec3 uGain;
            varying vec2 vGalaxyUv;
            void main() {
                vec3 c = texture2D(uGalaxyTex, vec2(fract(vGalaxyUv.x), vGalaxyUv.y)).rgb;
                c = pow(max(c, vec3(0.0001)), uGamma) * uGain;
                // Dither : casse les bandes de quantification 8-bit d'une courbe gamma
                // raide (ex. thème "or", canal bleu gamma=4.5) en grain imperceptible.
                float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453) - 0.5) / 255.0;
                c += dither;
                gl_FragColor = vec4(c, 1.0);
            }
        `,
    });
}

// Change le thème de couleur en direct (tous les matériaux galaxie partagent
// les mêmes uniforms galaxyGamma/galaxyGain, donc un seul set suffit).
window._setGalaxyTheme = (name) => {
    const t = GALAXY_THEMES[name];
    if (!t) return;
    galaxyGamma.set(...t.gamma);
    galaxyGain.set(...t.gain);
};

// Orientation de la voie lactée (0..1, quelle portion horizontale de l'image
// est centrée sur les couvertures) — réglable en live via le slider debug.
window._setGalaxyOrientation = (v) => { galaxyUCenter.value = v; };

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
    // makeCoverTex()/makeSpineCoverTex()/makeCoverBumpTex() (étoiles + fond bleu
    // SVG, relief embossé) ne sont plus appelées : remplacées par le reflet
    // galaxie ci-dessous. Fonctions gardées telles quelles si on veut réintégrer
    // ces détails plus tard.

    const matLeather = new THREE.MeshStandardMaterial({ map:leatherTex, color:0x1c0e05, roughness:0.88, metalness:0.04 });
    const matSpine   = new THREE.MeshStandardMaterial({ map:spineTex,   color:0x1c0e05, roughness:0.88, metalness:0.04 });
    const matPages   = new THREE.MeshStandardMaterial({ color:0xf0e4d0, roughness:0.92, metalness:0.0 });
    const matPagesEdge = new THREE.MeshStandardMaterial({ map:pagesTex, color:0xf0e4d0, roughness:0.92, metalness:0.0 });
    const matPagesTop  = new THREE.MeshStandardMaterial({ map:pagesTexTop, color:0xf0e4d0, roughness:0.92, metalness:0.0 });
    // metalness haut (0.90 à l'origine) fait dépendre la couleur perçue presque
    // entièrement des reflets d'environnement (spéculaire), pas de l'albédo — sans
    // skybox/lumière riche à refléter, le métal tombe gris selon l'angle/l'éclairage
    // (constaté : blanc "sous la bonne lumière" seulement). Metalness baissé +
    // emissive de sécurité (même teinte, faible intensité) pour un rendu fiable.
    const matGold = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.30, metalness:0.55, emissive:0xffffff, emissiveIntensity:0.15 });
    // Couverture (devant, dos, tranche) : galaxie en étiquette dépliée continue
    // (cf. makeGalaxyMaterial), gradation couleur appliquée en live via
    // galaxyGamma/Gain. Bande dans l'ordre devant → tranche → dos, les deux
    // coutures (aux charnières) se raccordent exactement.
    const galaxyWf = W + OV;        // largeur devant/dos
    const galaxyWs = D + CT * 2;    // largeur tranche
    const galaxyStripTotal = galaxyWf + galaxyWs + galaxyWf;
    const galaxyBookHeight = H + OV * 2;
    // Échelle U cohérente avec le recadrage V (cf. commentaire sur GALAXY_V_SPAN) :
    // même nombre d'unités-monde par pixel source dans les deux sens → pas de
    // déformation, juste un zoom plus ou moins fort selon la taille du livre.
    const galaxyUSpan = galaxyStripTotal * GALAXY_V_SPAN / (galaxyBookHeight * GALAXY_IMG_ASPECT);
    const matGalaxyFront = makeGalaxyMaterial('-position.x', galaxyWf / 2, 0, galaxyStripTotal, galaxyBookHeight, galaxyUSpan);
    const matGalaxySpine = makeGalaxyMaterial('-position.z', galaxyWs / 2, galaxyWf, galaxyStripTotal, galaxyBookHeight, galaxyUSpan);
    const matGalaxyBack  = makeGalaxyMaterial('position.x',  galaxyWf / 2, galaxyWf + galaxyWs, galaxyStripTotal, galaxyBookHeight, galaxyUSpan);
    // Texture assignée une fois chargée (fichier de 8 Mo, ne pas bloquer le reste
    // de l'init dessus) — mêmes 3 matériaux, une seule texture.
    new THREE.TextureLoader().load('book/textures/milkyway.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping; // uParallax peut pousser stripU près de 0/1 (fract)
        // Sans anisotropie, une image aussi grande vue en biais (couverture pas
        // pile face caméra) donne des bandes de moiré/aliasing — même fix déjà
        // utilisé plus haut pour les textures de pages (_loadTex).
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        renderer.initTexture(tex);
        [matGalaxyFront, matGalaxySpine, matGalaxyBack].forEach(m => { m.uniforms.uGalaxyTex.value = tex; });
    });

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
    const backCover = new THREE.Mesh(new THREE.BoxGeometry(W+OV,H+OV*2,CT), [matLeather,matLeather,matLeather,matLeather,matLeather,matGalaxyBack]);
    backCover.position.set((W+OV)/2,0,-CT/2); backCover.castShadow=true; backPivot.add(backCover);

    const spineEl = new THREE.Mesh(new THREE.BoxGeometry(CT,H+OV*2,D+CT*2), [matLeather,matGalaxySpine,matLeather,matLeather,matSpine,matSpine]);
    spineEl.position.set(-(W/2+CT/2),0,0); spineEl.castShadow=true; book.add(spineEl);

    const frontPivot = new THREE.Group();
    frontPivot.position.set(-W/2,0,D/2);
    book.add(frontPivot);
    const frontCover = new THREE.Mesh(new THREE.BoxGeometry(W+OV,H+OV*2,CT), [matLeather,matLeather,matLeather,matLeather,matGalaxyFront,matLeather]);
    frontCover.position.set((W+OV)/2,0,CT/2); frontCover.castShadow=true; frontPivot.add(frontCover);
    const frontPages = new THREE.Mesh(new THREE.BoxGeometry(W,H,D/2), [matPagesEdge,matPages,matPagesTop,matPagesTop,matPages,matPages]);
    frontPages.position.set(W/2,0,-D/4); frontPages.castShadow=true; frontPivot.add(frontPages);

    // ─── Dorures (groupe réutilisé sur couverture avant ET arrière) ───────────
    const cornerSize=0.18, cornerT=0.008;
    const halfW=(W+OV)/2, topY=H/2+OV;
    const frameT=0.011, frameInsetX=0.025, frameInsetY=0.028;
    const frameW=(W+OV)-2*frameInsetX, frameH=(H+OV*2)-2*frameInsetY;
    const frameTopY=topY-frameInsetY, frameZ=CT+frameT/2;
    const ruleT=0.006;
    const circleScale=(W+OV)/512, circleR0=132*circleScale, circleR1=118*circleScale, circleZ=frameZ+0.004;

    // scale ne change QUE la taille des barres/anneaux dessinés, jamais leur
    // position (basée sur les constantes nominales cornerT/frameT/circleR
    // ci-dessus) — sinon les coins/cadres se décaleraient au lieu de juste
    // grossir/rétrécir sur place quand on ajuste "grosseur" en live.
    // opts.rings : les 2 anneaux du cadran de l'horloge.
    // Devant = coins + cadre seulement ("CODEX" + filet court ajoutés à part) ;
    // dos = coins + cadre + anneaux (horloge).
    function buildGoldOrnaments(scale, opts) {
        const withRings = !opts || opts.rings !== false;
        const cT=cornerT*scale, fT=frameT*scale;
        const g=new THREE.Group();
        const czp=CT+cornerT/2;
        // Coins
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sy]) => {
            const hBar=new THREE.Mesh(new THREE.BoxGeometry(cornerSize,cT,cT+0.002),matGold);
            hBar.position.set(sx*(halfW-cornerSize/2), topY*sy-sy*cornerT/2, czp);
            g.add(hBar);
            const vBar=new THREE.Mesh(new THREE.BoxGeometry(cT,cornerSize,cT+0.002),matGold);
            vBar.position.set(sx*(halfW-cornerT/2), topY*sy-sy*(cornerSize/2), czp);
            g.add(vBar);
        });
        // Cadre
        [[frameW+fT,fT,fT,0,frameTopY],[frameW+fT,fT,fT,0,-frameTopY],[fT,frameH,fT,-(halfW-frameInsetX),0],[fT,frameH,fT,halfW-frameInsetX,0]]
            .forEach(([bw,bh,bd,bx,by]) => { const bar=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),matGold); bar.position.set(bx,by,frameZ); g.add(bar); });
        if (withRings) {
            // Anneaux (cadran de l'horloge)
            [[circleR0,0.006*scale,6,90],[circleR1,0.004*scale,6,80]].forEach(([r,tube,rs,ts]) => {
                const ring=new THREE.Mesh(new THREE.TorusGeometry(r,tube,rs,ts),matGold);
                ring.position.set(0,0,circleZ); g.add(ring);
            });
        }
        return g;
    }

    // Filet court (barre + losange) au-dessus et en-dessous d'un contenu — PAS une
    // barre pleine largeur qui coupe toute la couverture. Même langage graphique
    // pour le cadran de l'horloge (dos, autour du cercle) et "CODEX" (devant,
    // autour du texte) : demandé explicitement après retour ("le style du CODEX...
    // sur la couverture de l'horloge" plutôt que l'inverse).
    function buildTitleRules(group, halfContentW, halfContentH) {
        const ruleW = halfContentW * 2 + 0.10, gapY = halfContentH + 0.05;
        [gapY, -gapY].forEach(ry => {
            const rule = new THREE.Mesh(new THREE.BoxGeometry(ruleW, ruleT, ruleT + 0.002), matGold);
            rule.position.set(0, ry, frameZ); group.add(rule);
            const d = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.012), matGold);
            d.rotation.z = Math.PI / 4; d.position.set(0, ry, frameZ + 0.006); group.add(d);
        });
    }

    // Devant = coins + cadre ("CODEX" + filet court ajoutés à part) ; dos = coins
    // + cadre + anneaux (horloge + filet court ajoutés à part). Mêmes options
    // utilisées à la reconstruction (_setGoldThickness).
    const FRONT_GOLD_OPTS = { rings:false };
    const BACK_GOLD_OPTS  = { rings:true  };

    // Groupe extérieur (frontGold/backGold) séparé du sous-groupe d'ornements
    // (frontOrnaments/backOrnaments) : on peut reconstruire juste les barres/
    // anneaux (changement de "grosseur") sans supprimer les chiffres romains ni
    // les aiguilles d'horloge, ajoutés plus tard comme AUTRES enfants du même
    // groupe extérieur.
    let goldThicknessScale = 1;
    let frontOrnaments = buildGoldOrnaments(goldThicknessScale, FRONT_GOLD_OPTS);
    const frontGold = new THREE.Group();
    frontGold.add(frontOrnaments);
    frontGold.position.set(halfW,0,0);
    frontPivot.add(frontGold);

    let backOrnaments = buildGoldOrnaments(goldThicknessScale, BACK_GOLD_OPTS);
    const backGold = new THREE.Group();
    backGold.add(backOrnaments);
    backGold.position.set(halfW,0,0);
    backGold.rotation.y=Math.PI; // face vers l'extérieur arrière
    backPivot.add(backGold);
    // +0.10 : dégage aussi les chiffres romains (posés à circleR0+0.062, hauteur
    // de texte ~0.036), pas juste l'anneau lui-même.
    buildTitleRules(backGold, circleR0 + 0.10, circleR0 + 0.10);

    // Chiffres romains : dos uniquement (horloge retirée du devant). "CODEX" en
    // dorure, centré, à la place sur la couverture avant.
    new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/optimer_bold.typeface.json', (font) => {
        ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((label,i) => {
            const a=Math.PI/2-(i/12)*Math.PI*2;
            // bevelEnabled:false partout où TextGeometry est utilisé dans ce fichier : le
            // bevel par défaut de ExtrudeGeometry (~0.1 d'épaisseur) est dimensionné pour
            // un texte de taille normale (ex. size:80) — sur ce texte minuscule (size
            // 0.036-0.16) il dévore la lettre et donne un bord déchiqueté ("écorché") de près.
            const geo=new TextGeometry(label,{font,size:0.036,height:0.010,curveSegments:4,bevelEnabled:false});
            geo.computeBoundingBox(); const bb=geo.boundingBox;
            geo.translate(-(bb.max.x-bb.min.x)/2,-(bb.max.y-bb.min.y)/2,0);
            const mesh=new THREE.Mesh(geo,matGold);
            mesh.position.set(Math.cos(a)*(circleR0+0.062),Math.sin(a)*(circleR0+0.062),CT+0.001);
            backGold.add(mesh);
        });
    });

    // "CODEX", couverture avant : police serif gravée (gentilis, pas la sans-serif
    // géométrique des chiffres romains) — plus proche du cuir/or gravé que
    // l'Optimer utilisé ailleurs. Filet court (buildTitleRules) ajusté à la
    // largeur/hauteur réelle du texte une fois la police chargée.
    new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/gentilis_bold.typeface.json', (font) => {
        const codexGeo=new TextGeometry('CODEX',{font,size:0.16,height:0.014,curveSegments:6,bevelEnabled:false});
        codexGeo.computeBoundingBox(); const cbb=codexGeo.boundingBox;
        const textW=cbb.max.x-cbb.min.x, textH=cbb.max.y-cbb.min.y;
        codexGeo.translate(-textW/2,-textH/2,0);
        const codexMesh=new THREE.Mesh(codexGeo,matGold);
        codexMesh.position.set(0,0,CT+0.002);
        frontGold.add(codexMesh);
        buildTitleRules(frontGold, textW / 2, textH / 2);
    });

    // ─── Vibe "trou noir" au centre du cadran (dos uniquement) ─────────────────
    // Jusqu'ici le centre de l'horloge laissait juste transparaître la texture
    // galaxie. Un disque noir plein + un mince anneau lumineux ambré à son bord
    // (écho de l'anneau de photons) donnent une vraie silhouette de trou noir —
    // le ciel/la nébuleuse restent visibles seulement entre les deux anneaux dorés.
    const bhDiscR = circleR1 * 0.94;
    const bhDisc = new THREE.Mesh(new THREE.CircleGeometry(bhDiscR, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    bhDisc.position.set(0, 0, circleZ + 0.001);
    backGold.add(bhDisc);
    const bhGlow = new THREE.Mesh(new THREE.TorusGeometry(bhDiscR, 0.003, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffddaa }));
    bhGlow.position.set(0, 0, circleZ + 0.002);
    backGold.add(bhGlow);

    // Rosace/guilloché : fins rayons sur le disque noir, entre celui-ci et les
    // aiguilles (z intermédiaire) — comble le vide central plat et double comme
    // motif "structure d'accrétion" cohérent avec la vibe trou noir. Matériau
    // dédié (semi-transparent, pas matGold) : la première version était trop
    // marquée — plus fin ET translucide pour rester discret quel que soit
    // l'angle/éclairage, plutôt que de deviner un seul curseur à ajuster.
    const matRosette = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.30, metalness:0.55, emissive:0xffffff, emissiveIntensity:0.15, transparent:true, opacity:0.35 });
    function buildRosette(radius, count) {
        const g = new THREE.Group();
        for (let i = 0; i < count; i++) {
            const spokeGeo = new THREE.BoxGeometry(0.0014, radius, 0.006);
            spokeGeo.translate(0, radius / 2, 0); // base au centre, comme les aiguilles
            const spoke = new THREE.Mesh(spokeGeo, matRosette);
            spoke.rotation.z = (i / count) * Math.PI * 2;
            g.add(spoke);
        }
        g.position.set(0, 0, circleZ + 0.005);
        return g;
    }
    backGold.add(buildRosette(bhDiscR * 0.88, 24));

    // ─── Aiguilles d'horloge (heure réelle, 3 aiguilles dorées) ────────────────
    // Remplace le point lumineux central par une vraie horloge. Base de chaque
    // aiguille translatée à l'origine locale (le pivot), pas positionnée à
    // distance — sinon rotation.z tournerait autour du CENTRE de l'aiguille,
    // pas autour du pivot de l'horloge.
    function makeHand(length, width, depth, z) {
        const geo = new THREE.BoxGeometry(width, length, depth);
        geo.translate(0, length / 2, 0); // base au pivot, pointe vers +Y (= XII)
        const mesh = new THREE.Mesh(geo, matGold);
        mesh.position.set(0, 0, z);
        return mesh;
    }
    function buildClockHands() {
        const g = new THREE.Group();
        const hourHand   = makeHand(circleR1 * 0.52, 0.016, 0.012, circleZ + 0.009);
        const minuteHand = makeHand(circleR1 * 0.78, 0.010, 0.012, circleZ + 0.011);
        const secondHand = makeHand(circleR1 * 0.85, 0.005, 0.012, circleZ + 0.013);
        g.add(hourHand, minuteHand, secondHand);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.016, 20), matGold);
        cap.rotation.x = Math.PI / 2; cap.position.set(0, 0, circleZ + 0.012); g.add(cap);
        return { group: g, hourHand, minuteHand, secondHand };
    }
    // Horloge : dos uniquement.
    const backClock = buildClockHands(); backGold.add(backClock.group);

    // rotation.z=0 pointe vers +Y (position de XII) ; angle négatif = sens horaire
    // vu de face — même convention que le placement des chiffres romains ci-dessus.
    function updateClockHands() {
        const now = new Date();
        const h = (now.getHours() % 12) + now.getMinutes() / 60;
        const m = now.getMinutes() + now.getSeconds() / 60;
        const s = now.getSeconds() + now.getMilliseconds() / 1000;
        backClock.hourHand.rotation.z   = -(h / 12) * Math.PI * 2;
        backClock.minuteHand.rotation.z = -(m / 60) * Math.PI * 2;
        backClock.secondHand.rotation.z = -(s / 60) * Math.PI * 2;
    }
    updateClockHands();

    // ─── Dorures du spine (face extérieure) ────────────────────────────────────
    // Même logique groupe-extérieur/sous-groupe que front/backGold : spineGold
    // porte juste le décalage de position (spineFaceX), spineOrnaments est le
    // sous-groupe reconstruit quand la "grosseur" change.
    const SD=D+CT*2, spineFaceX=-(W/2+CT)-0.004, sArm=0.07;
    function buildSpineOrnaments(scale) {
        const sT=0.006*scale;
        const g=new THREE.Group();
        // Coins (équerres)
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sz_,sy]) => {
            const zEdge=sz_*(SD/2-0.012), yEdge=sy*(topY-0.012);
            const zBar=new THREE.Mesh(new THREE.BoxGeometry(sT,sT,sArm),matGold);
            zBar.position.set(0, yEdge, zEdge-sz_*sArm/2); g.add(zBar);
            const yBar=new THREE.Mesh(new THREE.BoxGeometry(sT,sArm,sT),matGold);
            yBar.position.set(0, yEdge-sy*sArm/2, zEdge); g.add(yBar);
        });
        // Filets haut/bas + losanges (mêmes proportions que la texture SVG)
        [-(topY*0.867),topY*0.867].forEach(ry => {
            const rule=new THREE.Mesh(new THREE.BoxGeometry(sT,sT,SD-0.05),matGold);
            rule.position.set(0,ry,0); g.add(rule);
            const dw=0.012*scale, dh=0.035*scale;
            const d=new THREE.Mesh(new THREE.BoxGeometry(dw,dh,dh),matGold);
            d.rotation.x=Math.PI/4; d.position.set(0,ry,0); g.add(d);
        });
        return g;
    }
    let spineOrnaments = buildSpineOrnaments(goldThicknessScale);
    const spineGold = new THREE.Group();
    spineGold.position.set(spineFaceX,0,0);
    spineGold.add(spineOrnaments);
    book.add(spineGold);

    // ─── Devise sur la tranche, police convertie (Cinzel Bold) ─────────────────
    // Cinzel n'existe pas dans le jeu de polices three.js prêtes à l'emploi
    // (optimer/gentilis/...) : convertie hors-session depuis le TTF officiel
    // (Google Fonts) via opentype.js, même schéma JSON que FontLoader attend
    // (glyphs/o/ha/resolution) — script réutilisable pour d'autres polices.
    // book/fonts/cinzel_bold.typeface.json ne contient que MAJUSCULES + espace
    // (suffisant pour cette devise).
    new FontLoader().load('book/fonts/cinzel_bold.typeface.json', (font) => {
        const mottoGeo = new TextGeometry('PRO OPTIMO PRO IMPERIO', { font, size: 0.12, height: 0.010, curveSegments: 6, bevelEnabled: false });
        mottoGeo.computeBoundingBox(); const mbb = mottoGeo.boundingBox;
        mottoGeo.translate(-(mbb.max.x - mbb.min.x) / 2, -(mbb.max.y - mbb.min.y) / 2, 0);
        const mottoMesh = new THREE.Mesh(mottoGeo, matGold);
        // Le texte est plat dans son plan XY local (face = +Z, lecture = +X). La
        // tranche est étroite et haute : orientée pour lire de haut en bas le
        // long de la hauteur du livre (Y monde), face tournée vers l'extérieur
        // (-X monde). Base orthonormée directe (Y=Z×X vérifié) : pas de miroir.
        const basis = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(0, -1, 0), // lecture (local +X) -> vers le bas (monde -Y)
            new THREE.Vector3(0, 0, 1),  // haut du glyphe (local +Y) -> monde +Z
            new THREE.Vector3(-1, 0, 0)  // face du texte (local +Z) -> vers l'extérieur (monde -X)
        );
        mottoMesh.quaternion.setFromRotationMatrix(basis);
        spineGold.add(mottoMesh);
    });

    // ─── Debug : couleur & grosseur des dorures ────────────────────────────────
    // Couleur : simple propriété matériau, pas besoin de reconstruire la géométrie.
    // Couleur ET emissive : sans ça, choisir une autre couleur retomberait dans le
    // même défaut (gris selon l'éclairage) que celui corrigé ci-dessus pour le blanc.
    window._setGoldColor = (hex) => { matGold.color.set(hex); matGold.emissive.set(hex); matRosette.color.set(hex); matRosette.emissive.set(hex); };
    window._setGoldMetalness = (v) => { matGold.metalness = v; matRosette.metalness = v; };
    // Grosseur : reconstruit uniquement les sous-groupes d'ornements (pas les
    // chiffres romains ni les aiguilles d'horloge, enfants directs de front/backGold).
    window._setGoldThickness = (scale) => {
        goldThicknessScale = scale;
        frontGold.remove(frontOrnaments);
        frontOrnaments.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        frontOrnaments = buildGoldOrnaments(scale, FRONT_GOLD_OPTS);
        frontGold.add(frontOrnaments);

        backGold.remove(backOrnaments);
        backOrnaments.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        backOrnaments = buildGoldOrnaments(scale, BACK_GOLD_OPTS);
        backGold.add(backOrnaments);

        spineGold.remove(spineOrnaments);
        spineOrnaments.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        spineOrnaments = buildSpineOrnaments(scale);
        spineGold.add(spineOrnaments);
    };

    // ─── Feuilles WebGL ───────────────────────────────────────────────────────

    const PAGE_TEXTURES = [
        ['book/images-web/1.webp',  'book/images-web/2.webp' ], // feuille 1  : pages 1 / 2
        ['book/images-web/3.webp',  'book/images-web/4.webp' ], // feuille 2  : pages 3 / 4
        ['book/images-web/5.webp',  'book/images-web/6.webp' ], // feuille 3  : pages 5 / 6
        ['book/images-web/7.webp',  'book/images-web/8.webp' ], // feuille 4  : pages 7 / 8
        ['book/images-web/9.webp',  'book/images-web/10.webp'], // feuille 5  : pages 9 / 10
        ['book/images-web/11.webp', 'book/images-web/12.webp'], // feuille 6  : pages 11 / 12
        ['book/images-web/13.webp', 'book/images-web/14.webp'], // feuille 7  : pages 13 / 14
        ['book/images-web/15.webp', 'book/images-web/16.webp'], // feuille 8  : pages 15 / 16
        ['book/images-web/17.webp', 'book/images-web/18.webp'], // feuille 9  : pages 17 / 18
        ['book/images-web/19.webp', 'book/images-web/20.webp'], // feuille 10 : pages 19 / 20
        ['book/images-web/21.webp', 'book/images-web/22.webp'], // feuille 11 : pages 21 / 22
        ['book/images-web/23.webp', 'book/images-web/24.webp'], // feuille 12 : pages 23 / 24 (24 = trou noir gauche)
        ['book/images-web/25.webp', 'book/images-web/26.webp'], // feuille 13 : pages 25 / 26 (25 = trou noir droite)
        ['book/images-web/27.webp', 'book/images-web/28.webp'], // feuille 14 : pages 27 / 28
        ['book/images-web/29.webp', 'book/images-web/30.webp'], // feuille 15 : pages 29 / 30
        ['book/images-web/31.webp', 'book/images-web/32.webp'], // feuille 16 : pages 31 / 32
        ['book/images-web/33.webp', 'book/images-web/34.webp'], // feuille 17 : pages 33 / 34
        ['book/images-web/35.webp', null                ], // feuille 18 : pages 35 / 36 (36 vide → placeholder)
    ];

    function makePagePlaceholderTex(pageNum, side) {
        const cv=document.createElement('canvas'); cv.width=1024; cv.height=1536;
        const ctx=cv.getContext('2d'), isRecto=side==='recto';
        ctx.fillStyle=isRecto?'#cc2222':'#4a7c20'; ctx.fillRect(0,0,1024,1536);
        ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='bold 96px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('Page '+pageNum,512,680); ctx.font='64px Georgia'; ctx.fillText(isRecto?'recto':'verso',512,820);
        return new THREE.CanvasTexture(cv);
    }

    // Les pages viennent de book/images-web/ (.webp, ≤2048px, générées à
    // partir des PNG sources 4096×6144 de book/images/ — ceux-là restent
    // intacts pour le téléchargement PDF, cf. README.md). MAX_TEX_DIM reste
    // un filet de sécurité : si un fichier plus lourd atterrit un jour dans
    // ce dossier, on le redessine quand même dans un canvas réduit avant de
    // créer la texture, plutôt que de resaturer la VRAM (lag observé côté
    // BUT II avant ce passage en WebP, cf. session du 2026-09-13).
    const MAX_TEX_DIM = 2048;
    const _imgLoader = new THREE.ImageLoader();
    function _loadTex(path, fallback) {
        if (!path) return fallback();
        const canvas = document.createElement('canvas');
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        _imgLoader.load(path, (img) => {
            const scale = Math.min(1, MAX_TEX_DIM / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            tex.needsUpdate = true;
            // initTexture force l'upload GPU dès le chargement (évite le freeze au milieu du flip)
            renderer.initTexture(tex);
        });
        return tex;
    }

    const SPINE_X=-0.57, PAGE_Z=0.000, PAGE_EXT=0.12;
    const leafTextures=PAGE_TEXTURES.map(([rPath,vPath],i) => ({
        recto:_loadTex(rPath,()=>makePagePlaceholderTex(i*2+1,'recto')),
        verso:_loadTex(vPath,()=>makePagePlaceholderTex(i*2+2,'verso'))
    }));
    // Page 0 (page de garde) : affichée sur la page de gauche du premier spread
    const tex0=_loadTex('book/images-web/0.webp',()=>makePagePlaceholderTex(0,'verso'));
    // Liste ordonnée des pages réelles (0,1,2,...) pour la génération du PDF côté client
    window._pageImagePaths=['book/images-web/0.webp',...PAGE_TEXTURES.flat().filter(Boolean)];

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
        leftMat.map=spreadIndex>0?leafTextures[spreadIndex-1].verso:tex0; leftMat.needsUpdate=true;
        // Nombre de pages impair (35) : la dernière feuille n'a pas de verso réel
        // (PAGE_TEXTURES[...][1] === null) — sans ce garde-fou, la texture de
        // remplacement ("Page 36 / verso") s'affichait comme une vraie page.
        leftGroup.visible = !(spreadIndex>0 && !PAGE_TEXTURES[spreadIndex-1][1]);
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

    // Variante "porte qui clignote" (prototype, 2026-09-13) : quand la page 31
    // est affichée, bascule brièvement vers 31-1.png à des intervalles
    // aléatoires — un vrai clignotement, pas un cycle régulier. Page 31 =
    // leafTextures[15].recto (feuille 16), affichée sur rightMat.
    const tex31Alt = _loadTex('book/images-web/31-1.webp', () => null);
    function scheduleFlicker31() {
        const wait = 2000 + Math.random() * 5000; // 2 à 7 s avant le prochain clignotement
        setTimeout(() => {
            if (spreadIndex === 15 && !isFlipping && rightGroup.visible && tex31Alt) {
                rightMat.map = tex31Alt; rightMat.needsUpdate = true;
                setTimeout(() => {
                    if (spreadIndex === 15) { rightMat.map = leafTextures[15].recto; rightMat.needsUpdate = true; }
                    scheduleFlicker31();
                }, 60 + Math.random() * 120); // durée du flash
            } else {
                scheduleFlicker31();
            }
        }, wait);
    }
    scheduleFlicker31();

    // Dernière feuille sans verso réel (nombre de pages impair, page 35 =
    // dernier contenu) : inutile d'aller plus loin, il n'y a rien derrière —
    // sans ça "Suivant" menait à un état "après la fin" totalement vide.
    const _lastLeafHasNoVerso = !PAGE_TEXTURES[leafTextures.length-1][1];
    const _maxSpread = _lastLeafHasNoVerso ? leafTextures.length-1 : leafTextures.length;

    function flipForward() {
        if(isFlipping||spreadIndex>=_maxSpread)return; isFlipping=true;
        const recto=leafTextures[spreadIndex].recto, verso=leafTextures[spreadIndex].verso;
        animMat.map=recto; animMat.needsUpdate=true; animMesh.position.x=(W+PAGE_EXT)/2;
        animGroup.position.z=rightGroup.position.z; // même profondeur que la page statique remplacée (évite le décalage au début du flip)
        animGroup.rotation.y=-FOLD_ANGLE+TILT_ANGLE; animGroup.visible=true; rightGroup.visible=false;
        if(spreadIndex+1<leafTextures.length){rightMat.map=leafTextures[spreadIndex+1].recto;rightMat.needsUpdate=true;rightGroup.visible=true;}else{rightGroup.visible=false;}
        gsap.delayedCall(0.80,()=>{leftMat.map=verso;leftMat.needsUpdate=true;leftGroup.visible=true;});
        gsap.to(animGroup.rotation,{y:TILT_ANGLE-Math.PI/2,duration:0.64,ease:'power2.in',onComplete(){
            animMat.map=verso;animMat.needsUpdate=true;animMesh.position.x=-(W+PAGE_EXT)/2;animGroup.rotation.y=TILT_ANGLE+Math.PI/2;
            animGroup.position.z=leftGroup.position.z; // bascule vers la profondeur de la page de gauche (destination)
            gsap.to(animGroup.rotation,{y:FOLD_ANGLE+TILT_ANGLE,duration:0.64,ease:'power2.out',onComplete(){spreadIndex++;animGroup.visible=false;animMesh.position.x=(W+PAGE_EXT)/2;_updateStaticPages();isFlipping=false;updatePageIndicator();}});
        }});
    }

    function flipBack() {
        if(isFlipping||spreadIndex<=0)return; isFlipping=true; spreadIndex--;
        const verso=leafTextures[spreadIndex].verso, recto=leafTextures[spreadIndex].recto;
        animMat.map=verso;animMat.needsUpdate=true;animMesh.position.x=-(W+PAGE_EXT)/2;
        animGroup.position.z=leftGroup.position.z; // même profondeur que la page statique remplacée (évite le décalage au début du flip)
        animGroup.rotation.y=FOLD_ANGLE+TILT_ANGLE;animGroup.visible=true;leftGroup.visible=false;
        leftMat.map=spreadIndex>0?leafTextures[spreadIndex-1].verso:tex0;leftMat.needsUpdate=true;
        leftGroup.visible = !(spreadIndex>0 && !PAGE_TEXTURES[spreadIndex-1][1]);
        gsap.delayedCall(0.80,()=>{rightMat.map=recto;rightMat.needsUpdate=true;rightGroup.visible=true;});
        gsap.to(animGroup.rotation,{y:TILT_ANGLE+Math.PI/2,duration:0.64,ease:'power2.in',onComplete(){
            animMat.map=recto;animMat.needsUpdate=true;animMesh.position.x=(W+PAGE_EXT)/2;animGroup.rotation.y=TILT_ANGLE-Math.PI/2;
            animGroup.position.z=rightGroup.position.z; // bascule vers la profondeur de la page de droite (destination)
            gsap.to(animGroup.rotation,{y:-FOLD_ANGLE+TILT_ANGLE,duration:0.64,ease:'power2.out',onComplete(){animGroup.visible=false;animMesh.position.x=(W+PAGE_EXT)/2;_updateStaticPages();isFlipping=false;updatePageIndicator();}});
        }});
    }

    // ─── GSAP animations ──────────────────────────────────────────────────────

    let isOpen=false;
    // repeat:-1 — le livre doit rester visiblement 3D/vivant tant que
    // personne n'y touche, y compris pendant une longue attente sur le
    // preloader ; la séquence revient pile à 0 à la fin, donc la boucle est
    // sans à-coup. Tuée au premier drag (drag.js) ou à l'ouverture (plus bas).
    const introTl=gsap.timeline({delay:0.3, repeat:-1});
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

    // Dérive lente et autonome de la galaxie, indépendante de la rotation du
    // livre — donne un effet vivant même quand le livre ne bouge pas. Le SENS
    // de la dérive suit le dernier sens de rotation du livre (mémorisé tant
    // qu'on ne tourne pas dans l'autre sens) plutôt que d'être fixe.
    //
    // BORNE EN VA-ET-VIENT (pas de modulo libre) : milkyway.jpg est une vraie
    // photo, pas une texture raccord — si galaxyDriftTime dérivait sans limite
    // dans un sens, u finirait par boucler un tour complet (u = uUCenter +
    // ... + uParallax*uSpan, wrap par fract() dans le fragment shader), et le
    // bord gauche de la photo ne ressemble pas à son bord droit : ça se voyait
    // comme un "reset" brutal (~ toutes les 5-6 min à la vitesse actuelle, cf.
    // uSpan ≈ 0.247 → 1/uSpan ≈ 4.05 unités avant de boucler). La borne est
    // choisie confortablement sous ce seuil, marge gardée pour la contribution
    // de book.rotation.y*0.15 ci-dessous.
    const GALAXY_DRIFT_BOUND = 1.5;
    let galaxyDriftTime = 0;
    let galaxyDriftDir = 1;
    let _lastBookRotY = 0;

    function updateBook() {
        book.rotation.y+=(targetRot.y-book.rotation.y)*0.08;
        book.rotation.x+=(targetRot.x-book.rotation.x)*0.08;
        book.updateMatrixWorld();
        _spineEdgeWorld.copy(_spineEdgeLocal).applyMatrix4(book.matrixWorld);
        _spineNormalWorld.copy(_spineNormalLocal).transformDirection(book.matrixWorld).normalize();
        spineClipPlane.setFromNormalAndCoplanarPoint(_spineNormalWorld,_spineEdgeWorld);
        updateClockHands();
        const rotDelta = book.rotation.y - _lastBookRotY;
        _lastBookRotY = book.rotation.y;
        if (Math.abs(rotDelta) > 0.00005) galaxyDriftDir = Math.sign(rotDelta);
        galaxyDriftTime += 0.0002 * galaxyDriftDir;
        if (galaxyDriftTime > GALAXY_DRIFT_BOUND)       { galaxyDriftTime = GALAXY_DRIFT_BOUND;  galaxyDriftDir = -1; }
        else if (galaxyDriftTime < -GALAXY_DRIFT_BOUND) { galaxyDriftTime = -GALAXY_DRIFT_BOUND; galaxyDriftDir = 1; }
        galaxyParallax.value  = book.rotation.y * 0.15 + galaxyDriftTime; // même décalage sur les 3 faces, garde la continuité
        galaxyParallaxV.value = book.rotation.x * 0.5;  // sens haut/bas, séparé (rotation.x est un angle plus petit)
    }

    // Globals pour les scripts non-module (debug panel, navigation)
    window.flipForward=flipForward; window.flipBack=flipBack;
    window._book=book;
    window._leaves=leaves;
    window._setFold=(rad)=>{ FOLD_ANGLE=rad; _applyFold(); };
    window._setTilt=(rad)=>{ TILT_ANGLE=rad; _applyFold(); };
    window._getSpread=()=>({spreadIndex,isFlipping});
    // Saut vers une page lointaine (sommaire) : PAS un vrai feuilletage
    // page par page (beaucoup trop long jusqu'à la page 34), mais pas un
    // téléport instantané non plus — un seul flip, avec la page ACTUELLE
    // comme visuel de la page qui tourne (son contenu réel n'a pas
    // d'importance ici, seul le mouvement compte), qui atterrit directement
    // sur le contenu de la page cible. Donne l'illusion de tourner une page.
    window._jumpToSpread=(target)=>{
        target=Math.max(0,Math.min(target,leafTextures.length));
        if(isFlipping) return;
        if(target===spreadIndex){ showLeaves(); return; }
        isFlipping=true;
        const recto=leafTextures[spreadIndex].recto, verso=leafTextures[spreadIndex].verso;
        if(target>spreadIndex){
            animMat.map=recto; animMat.needsUpdate=true; animMesh.position.x=(W+PAGE_EXT)/2;
            animGroup.position.z=rightGroup.position.z;
            animGroup.rotation.y=-FOLD_ANGLE+TILT_ANGLE; animGroup.visible=true; rightGroup.visible=false;
            if(target<leafTextures.length){rightMat.map=leafTextures[target].recto;rightMat.needsUpdate=true;rightGroup.visible=true;}else{rightGroup.visible=false;}
            gsap.delayedCall(0.80,()=>{
                leftMat.map=target>0?leafTextures[target-1].verso:tex0; leftMat.needsUpdate=true;
                leftGroup.visible=!(target>0 && !PAGE_TEXTURES[target-1][1]);
            });
            gsap.to(animGroup.rotation,{y:TILT_ANGLE-Math.PI/2,duration:0.64,ease:'power2.in',onComplete(){
                // La face qui atterrit doit montrer le VRAI contenu de la page
                // cible (pas celui de la page de départ), sinon on voit un saut
                // net au moment où animGroup disparaît et laisse place à la
                // page statique (qui, elle, montre déjà la bonne image).
                animMat.map=target>0?leafTextures[target-1].verso:tex0;animMat.needsUpdate=true;animMesh.position.x=-(W+PAGE_EXT)/2;animGroup.rotation.y=TILT_ANGLE+Math.PI/2;
                animGroup.position.z=leftGroup.position.z;
                gsap.to(animGroup.rotation,{y:FOLD_ANGLE+TILT_ANGLE,duration:0.64,ease:'power2.out',onComplete(){
                    spreadIndex=target; animGroup.visible=false; animMesh.position.x=(W+PAGE_EXT)/2; _updateStaticPages(); isFlipping=false; updatePageIndicator();
                }});
            }});
        } else {
            animMat.map=verso;animMat.needsUpdate=true;animMesh.position.x=-(W+PAGE_EXT)/2;
            animGroup.position.z=leftGroup.position.z;
            animGroup.rotation.y=FOLD_ANGLE+TILT_ANGLE; animGroup.visible=true; leftGroup.visible=false;
            leftMat.map=target>0?leafTextures[target-1].verso:tex0; leftMat.needsUpdate=true;
            leftGroup.visible=!(target>0 && !PAGE_TEXTURES[target-1][1]);
            gsap.delayedCall(0.80,()=>{
                rightMat.map=target<leafTextures.length?leafTextures[target].recto:null; rightMat.needsUpdate=true;
                rightGroup.visible=target<leafTextures.length;
            });
            gsap.to(animGroup.rotation,{y:TILT_ANGLE+Math.PI/2,duration:0.64,ease:'power2.in',onComplete(){
                // Même correctif que la branche avant : la face qui atterrit
                // montre le vrai recto de la page cible, pas celui de la page
                // de départ, pour un raccord invisible avec la page statique.
                animMat.map=target<leafTextures.length?leafTextures[target].recto:null;animMat.needsUpdate=true;animMesh.position.x=(W+PAGE_EXT)/2;animGroup.rotation.y=TILT_ANGLE-Math.PI/2;
                animGroup.position.z=rightGroup.position.z;
                gsap.to(animGroup.rotation,{y:-FOLD_ANGLE+TILT_ANGLE,duration:0.64,ease:'power2.out',onComplete(){
                    spreadIndex=target; animGroup.visible=false; animMesh.position.x=(W+PAGE_EXT)/2; _updateStaticPages(); isFlipping=false; updatePageIndicator();
                }});
            }});
        }
    };

    return { book, updateBook, flipForward, flipBack, introTl, targetRot, frontPivot, backPivot, frontPages, backPages };
}
