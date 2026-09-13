// ===========================================================================
// Copie vendorisee depuis Projets/Projet Monetisation/Tik Tok/Note Climber/
// (2026-09-13), pour la texture de la porte du preloader Codex. Ce n'est PAS
// le fichier partage original — resynchroniser a la main si le rendu du
// labo Note Climber evolue.
// ===========================================================================
// note-renderer.js — dessine N notes avec le materiau du banc
//
// Le banc `labo-note.html` regle UNE note en couvrant tout l'ecran. La
// production en affiche cent. Ce fichier fait le pont : il monte le pipeline
// HDR une fois, puis dessine chaque note dans SON PROPRE rectangle, avec le
// meme shader et les memes reglages.
//
// Pourquoi un rectangle par note plutot qu'une passe plein ecran par note :
// cent passes plein ecran en 1080x1920 seraient injouables. Un rectangle ne
// coute que sa surface. Mesure du 2026-08-27 (outils/charge-notes.py) : cent
// notes avec 20 px de marge de halo coutent 2,6 ms sur RTX 4050 et 3,5 ms sur
// GPU integre, cascade comprise, sur les 16,7 ms d'une image a 60 fps.
//
// Le cout suit la SURFACE, pas le nombre de notes : la marge de halo est le
// vrai levier. La cascade, elle, est plein ecran et ne depend pas du nombre de
// notes — c'est un plancher, pas une variable.
//
// L'apparence vient entierement de `note-material.js`, partage avec le banc.
// Ici il n'y a que de la plomberie : cibles, cascade, composition.
//
// REGLE : aucun accent grave dans ce fichier non plus. Il n'y a pas de source
// GLSL ici, mais la discipline reste la meme d'un fichier a l'autre.
// ===========================================================================
(function (window) {
'use strict';

const MAT = window.NoteMaterial;

/** Cree un moteur, ou renvoie null si WebGL2 n'est pas disponible.
 *
 *  largeur/hauteur : la taille du rendu, en pixels (1080 x 1920 en production).
 */
function creer(largeur, hauteur) {
  if (!MAT) { console.error('note-renderer : note-material.js absent'); return null; }

  const canvas = document.createElement('canvas');
  canvas.width = largeur; canvas.height = hauteur;

  // `preserveDrawingBuffer` : le resultat est recopie dans le canvas 2D par un
  // drawImage qui a lieu APRES le rendu. Sans lui, le tampon peut avoir ete
  // vide entre-temps et on recopie du noir.
  const gl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false,
  });
  if (!gl) { console.warn('note-renderer : WebGL2 indisponible'); return null; }

  const echecs = [];
  for (const f of MAT.verifierSources()) echecs.push('source : ' + f);

  const FLOTTANT = gl.getExtension('EXT_color_buffer_float');
  let FORMAT = { interne: gl.RGBA8, type: gl.UNSIGNED_BYTE, nom: 'RGBA8' };

  // Le quadrilatere unique, reutilise par toutes les passes.
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const prog      = MAT.lier(gl, 'fs', echecs);
  const progSeuil = MAT.lier(gl, 'fsSeuil', echecs);
  const progFlou  = MAT.lier(gl, 'fsFlou', echecs);
  const progComp  = MAT.lier(gl, 'fsComp', echecs);
  const progRed   = MAT.lier(gl, 'fsReduire', echecs);
  if (echecs.length) {
    console.error('note-renderer : ' + echecs.join(' | '));
    return null;
  }

  for (const p of [prog, progSeuil, progFlou, progComp, progRed]) {
    gl.useProgram(p);
    const a = gl.getAttribLocation(p, 'aPos');
    if (a >= 0) { gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
  }

  const U = MAT.localiser(gl, prog);

  function cible(w, h, filtre) {
    const f = filtre || gl.LINEAR;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, FORMAT.interne, w, h, 0, gl.RGBA, FORMAT.type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex: tex, fbo: fbo, w: w, h: h };
  }

  // Choix du format. Sur des tampons 8 bits, tout ce qui depasse 1,0 est
  // ecrete AVANT le flou : les coeurs d'arc, precisement ce qui doit rayonner,
  // seraient ramenes au niveau du corps et le halo perdrait sa hierarchie. On
  // teste donc l'ecriture reellement, on ne se fie pas a la presence de
  // l'extension.
  if (FLOTTANT) {
    for (const e of [{ interne: gl.RGBA16F, type: gl.HALF_FLOAT, nom: 'RGBA16F' },
                     { interne: gl.RGBA16F, type: gl.FLOAT, nom: 'RGBA16F/float' }]) {
      const memoire = FORMAT;
      FORMAT = e;
      const c = cible(64, 64);
      gl.bindFramebuffer(gl.FRAMEBUFFER, c.fbo);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(c.fbo); gl.deleteTexture(c.tex);
      if (ok) break;
      FORMAT = memoire;
    }
  }

  let scene, seuille, nivG, nivB, tampon;
  function batirCibles() {
    scene = cible(canvas.width, canvas.height, gl.NEAREST);
    seuille = cible(canvas.width >> 1, canvas.height >> 1);
    nivG = []; nivB = []; tampon = [];
    for (let i = 0; i < Math.max(MAT.NIV_GLOW, MAT.NIV_BLOOM); i++) {
      const w = Math.max(2, canvas.width >> (i + 1));
      const h = Math.max(2, canvas.height >> (i + 1));
      if (i < MAT.NIV_GLOW)  nivG.push(cible(w, h));
      if (i < MAT.NIV_BLOOM) nivB.push(cible(w, h));
      tampon.push(cible(w, h));
    }
  }
  batirCibles();

  function passe(p, dest) {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dest ? dest.fbo : null);
    gl.viewport(0, 0, dest ? dest.w : canvas.width, dest ? dest.h : canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function poserTex(p, nom, unite, tex) {
    gl.activeTexture(gl.TEXTURE0 + unite);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(p, nom), unite);
  }

  /** La cascade : reduction de moitie puis flou separable, etage par etage.
   *
   *  La reduction est une passe DEDIEE, en texels de la SOURCE. Espacer les
   *  prises d'un texel de la CIBLE reviendrait a sauter un texel sur deux en
   *  confiant la moyenne au filtrage bilineaire — et quand ce filtrage ne se
   *  comporte pas comme prevu (constate sur NVIDIA/D3D11), une note de 37 px
   *  passe entre les mailles des le deuxieme etage.
   */
  function descendre(src, niveaux) {
    let source = src;
    for (let i = 0; i < niveaux.length; i++) {
      const n = niveaux[i], tmp = tampon[i];
      gl.useProgram(progRed);
      poserTex(progRed, 'uSrc', 0, source.tex);
      gl.uniform2f(gl.getUniformLocation(progRed, 'uTexel'), 1 / source.w, 1 / source.h);
      passe(progRed, n);

      gl.useProgram(progFlou);
      poserTex(progFlou, 'uSrc', 0, n.tex);
      gl.uniform2f(gl.getUniformLocation(progFlou, 'uPas'), 1 / n.w, 0);
      passe(progFlou, tmp);
      poserTex(progFlou, 'uSrc', 0, tmp.tex);
      gl.uniform2f(gl.getUniformLocation(progFlou, 'uPas'), 0, 1 / n.h);
      passe(progFlou, n);

      source = n;
    }
  }

  /** Dessine toutes les notes.
   *
   *  R      les reglages du materiau (sortie de MAT.profilVersReglages)
   *  notes  [{x, y, w, h, couleur:[r,g,b]}] en pixels, y compte du HAUT.
   *         C'est la GEOMETRIE COMPLETE de la note, meme la partie sortie du
   *         cadre — voir `clip`.
   *  opts   { temps, marge, clip:{y0, y1} }
   *
   *  Pourquoi `clip` et pas une note raccourcie : le motif est ancre a la note.
   *  Si on raccourcissait la note quand elle passe sous la barre de jeu, le
   *  shader recevrait une note plus courte, et le motif se comprimerait avec
   *  elle — les filaments se mettraient a glisser vers le haut a l'approche de
   *  la barre. La note garde donc sa taille reelle, et c'est un ciseau
   *  (SCISSOR_TEST) qui l'empeche de deborder sous la barre.
   *
   *  Les notes sont dessinees sur fond noir. La composition avec la scene se
   *  fait cote appelant, en additif : une note est une source de lumiere, et
   *  le noir d'un additif ne depose rien.
   */
  function dessiner(R, notes, opts) {
    opts = opts || {};
    const marge = (opts.marge !== undefined) ? opts.marge : 20;
    const temps = opts.temps || 0;
    const L = canvas.width, H = canvas.height;

    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);      // le nettoyage doit couvrir toute la cible
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, L, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Le ciseau borne ce qui s'affiche sans toucher a la geometrie : la note
    // garde sa taille reelle, donc son motif reste stable, et rien ne deborde
    // sous la barre de jeu.
    if (opts.clip) {
      const y0 = Math.max(0, Math.min(H, opts.clip.y0));
      const y1 = Math.max(0, Math.min(H, opts.clip.y1));
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, H - y1, L, Math.max(0, y1 - y0));
    }

    gl.useProgram(prog);
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      // Le rectangle alloue : la note plus sa marge de halo, de chaque cote.
      const qw = n.w + 2 * marge, qh = n.h + 2 * marge;
      if (qw <= 0 || qh <= 0) continue;
      // WebGL compte les Y depuis le BAS, le reste du projet depuis le haut.
      const vx = Math.round(n.x - marge);
      const vy = Math.round(H - (n.y + n.h) - marge);
      gl.viewport(vx, vy, Math.round(qw), Math.round(qh));

      MAT.poserUniformes(gl, U, R, {
        largPx: n.w, hautPx: n.h,
        // Le demi-quad couvre qw/2 pixels, et 540 px valent une unite.
        echelle: [qw / 1080, qh / 1080],
        viewportPx: [qw, qh],
        // Position du centre de la note DANS L'ECRAN, en unites. Quand le
        // motif est ancre a l'ecran, c'est ce qui fait que chaque note revele
        // sa propre portion d'une seule grande matiere — comme un vitrail
        // decoupe dedans — au lieu que toutes montrent le meme bout.
        // Y est inverse : l'ecran compte vers le bas, le repere du shader vers
        // le haut.
        decalage: [(n.x + n.w / 2) / 540, -(n.y + n.h / 2) / 540],
        temps: temps,
        couleur: n.couleur,
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Les passes qui suivent travaillent sur des cibles entieres : le ciseau,
    // regle pour le cadre de la scene, les mutilerait.
    gl.disable(gl.SCISSOR_TEST);

    // Glow : part de la scene ENTIERE (leur Glow n'a pas de seuil).
    descendre(scene, nivG);

    // Bloom : seulement ce qui depasse le seuil.
    gl.useProgram(progSeuil);
    poserTex(progSeuil, 'uSrc', 0, scene.tex);
    gl.uniform1f(gl.getUniformLocation(progSeuil, 'uSeuil'), R.seuil);
    passe(progSeuil, seuille);
    descendre(seuille, nivB);

    gl.useProgram(progComp);
    poserTex(progComp, 'uScene', 0, scene.tex);
    for (let i = 0; i < MAT.NIV_GLOW; i++)  poserTex(progComp, 'uG' + i, 1 + i, nivG[i].tex);
    for (let i = 0; i < MAT.NIV_BLOOM; i++) poserTex(progComp, 'uB' + i, 4 + i, nivB[i].tex);
    gl.uniform1f(gl.getUniformLocation(progComp, 'uGlowI'),  R.glowI);
    gl.uniform1f(gl.getUniformLocation(progComp, 'uGlowS'),  R.glowS);
    gl.uniform1f(gl.getUniformLocation(progComp, 'uBloomI'), R.bloomI);
    gl.uniform1f(gl.getUniformLocation(progComp, 'uBloomS'), R.bloomS);
    passe(progComp, null);
  }

  return {
    canvas: canvas,
    gl: gl,
    // Exposes pour le diagnostic : comparer les uniformes reellement poses ici
    // et dans le banc est la seule facon de prouver que les deux pages rendent
    // la meme chose, plutot que de le supposer.
    prog: prog,
    U: U,
    format: FORMAT.nom,
    dessiner: dessiner,
    redimensionner: function (w, h) {
      canvas.width = w; canvas.height = h; batirCibles();
    },
  };
}

window.NoteRenderer = { creer: creer };
if (typeof module !== 'undefined' && module.exports) module.exports = window.NoteRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
