// ===========================================================================
// Copie vendorisee depuis Projets/Projet Monetisation/Tik Tok/Note Climber/
// (2026-09-13), pour la texture de la porte du preloader Codex. Ce n'est PAS
// le fichier partage original — resynchroniser a la main si le materiau du
// labo Note Climber evolue.
// ===========================================================================
// note-material.js — LE MATERIAU DES NOTES, PARTAGE
//
// Ce fichier est la seule definition du materiau. `labo-note.html` (le banc,
// une note plein ecran, pour regler) et `NoteClimber.html` (la production, cent
// notes) le chargent tous les deux par <script src>. C'est ce qui garantit
// qu'un profil regle dans le banc rend exactement pareil en production : s'il y
// avait deux copies du shader, elles divergeraient en quelques jours.
//
// ---------------------------------------------------------------------------
// REGLE ABSOLUE : AUCUN ACCENT GRAVE DANS LES SOURCES GLSL CI-DESSOUS.
//
// Les sources sont des chaines a gabarit. Un accent grave dans un commentaire
// GLSL ferme la chaine, et la page ne demarre plus — sans message utile. C'est
// arrive quatre fois sur NoteClimber.html. Les commentaires du projet citent
// normalement le code entre accents graves ; ici, et ici seulement, on cite
// entre apostrophes droites.
//
// Deux garde-fous font respecter la regle sans compter sur la memoire :
//   - `NoteMaterial.verifierSources()` au chargement, dans le navigateur ;
//   - `node outils/lint-shader.js`, hors navigateur, avant meme d'ouvrir la page.
// ---------------------------------------------------------------------------
//
// Extrait de labo-note.html le 2026-08-27, sans modification du GLSL autre que
// le remplacement des accents graves de commentaires par des apostrophes.
// ===========================================================================
(function (window) {
'use strict';

// ---------------------------------------------------------------------------
// LES SOURCES GLSL
// ---------------------------------------------------------------------------
const SOURCES = {};

SOURCES.vs = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

SOURCES.fs = `
precision highp float;
varying vec2 vUv;

uniform vec2  uTaille;      // demi-largeur, demi-hauteur de la note
uniform float uArrondi;
uniform float uProfondeur, uI1, uA1, uI2, uAmb, uSpec;
uniform float uDyn, uDynType, uVit;
uniform float uFreq;              // mailles par unite de canvas
uniform float uNCoeur, uNJupe;    // exposants deduits des largeurs
uniform float uCoeur, uJupe, uBlancheur;
uniform float uArcAngle, uArcAmbiante;
uniform float uBord, uBordEclat;
uniform vec3  uCouleur;
uniform float uTemps;
// Unites couvertes par le DEMI-quadrilatere, sur chaque axe.
//
// C'etait un scalaire (uZoom), ce qui supposait un quadrilatere carre : x et y
// recevaient la meme echelle. Vrai dans le banc, dont le canvas est carre ;
// faux des qu'on dessine une note dans son propre rectangle de 15 x 300 px,
// ou l'axe vertical couvre vingt fois plus de pixels que l'horizontal. La note
// sortait ecrasee. Deux composantes, et la forme reste juste quel que soit le
// rapport du rectangle.
uniform vec2  uEchelle;
// Couche de reflet artificiel — noms repris de leur shader.
uniform float uFresStr, uFresPow;      // _FresnelStrength · _FresnelPower
uniform float uCielDegrade;            // 0 = ciel uniforme, 1 = plein degrade
uniform float uReflContraste, uReflCompression;  // _ReflectionContrast · _ReflectionCompression
uniform float uBroadStr, uBroadPow;    // _BroadSpecStrength · _BroadSpecPower
uniform float uClearStr, uClearPow;    // _ClearSpecStrength · _ClearSpecPower
uniform float uProfil;                 // NoteShape3D : 0 round 1 gem 2 ridge 3 angled
uniform float uTopEclat, uTopHauteur;  // _TopColor · _TopFaceMinXY/MaxXY
uniform float uOctaves, uLacunarite, uGain, uEvolution;  // Turbulence* · Octave* · EvolutionSpeed
uniform float uDynLum, uDynContraste, uDynSat;  // DynamicLightBrightness/Contrast · DynamicSaturation
uniform float uGlintForce, uGlintTaille, uGlintRot;  // NoteCornerGlintSprite
uniform vec3  uCouleur2;               // seconde couleur du dégradé
uniform float uDegradeCorps;           // ColorMode gradient · 0 = corps uni
uniform float uReflExpo, uReflTop;     // _ReflectionExposure · _ReflectionTopBoost
uniform float uReflFace, uReflSat;     // _ReflectionFaceFade · _ReflectionSaturation
uniform float uBrillance;              // _OverallBrightness
uniform float uPixel;  // taille d'un pixel ecran, en unites
// Position de la note DANS L'ECRAN, en unites, sur les deux axes.
//
// C'etait un simple flottant, donc un decalage vertical seulement. Suffisant
// dans le banc, ou il n'y a qu'une note : le motif y defilait avec le temps.
// En production, chaque note est dessinee dans son propre rectangle centre sur
// elle — sans decalage horizontal, deux notes eloignees de 400 px montraient
// EXACTEMENT le meme bout de motif. Le mode 'ancre a l'ecran' ne tenait donc
// que sur un axe. Avec les deux, les notes se comportent comme des fenetres
// decoupees dans une seule grande matiere.
uniform vec2  uDecalage;
uniform float uMotifSuit; // 1 : le motif voyage avec la note

// ---------------------------------------------------------------------------
// FORME. Un rectangle arrondi décrit par sa DISTANCE SIGNÉE : négative dedans,
// positive dehors, nulle sur le bord. Tout le reste en découle — le contour,
// la normale, le halo. C'est la façon propre de faire, et elle remplace la
// carte de relief peinte en 2D qu'on trimballe dans l'app principale.
// ---------------------------------------------------------------------------
float distanceNote(vec2 p) {
  vec2 d = abs(p) - uTaille + uArrondi;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uArrondi;
}

// Normale déduite de la distance : le gradient donne la direction du bord, et
// on relève la composante Z selon la profondeur voulue.
//
// La largeur du biseau est le point delicat. Au premier jet il s'etalait sur
// toute la demi-largeur de la note : la face entiere prenait un degrade, une
// bande claire en haut et une bande sombre en bas, et Touvie l'a lu — a juste
// titre — comme un faux reflet et une fausse ombre. SeeMusic donne pourtant du
// volume a ses notes : 'NoteDepth 0.3696' sur une forme 'round'. Mais sur une
// forme ronde, cette profondeur ne se voit que sur la TRANCHE. La face reste
// plate. C'est la largeur du biseau qui etait fausse, pas le principe.
vec3 normaleNote(vec2 p, float d) {
  vec2 e = vec2(uPixel, 0.0);
  vec2 g = vec2(distanceNote(p + e.xy) - distanceNote(p - e.xy),
                distanceNote(p + e.yx) - distanceNote(p - e.yx)) / (2.0 * uPixel);
  // Le biseau occupe une bande absolue depuis le bord, pas une fraction de la
  // note : une note fine et une note large ont la meme tranche.
  float larg = max(uProfondeur * uTaille.x, 0.0002);
  // 'across' vaut 1 au coeur de la note et 0 sur son bord.
  float across = clamp(-d / max(uTaille.x, 1e-5), 0.0, 1.0);

  // NoteShape3D. Le profil decide de la FORME de la tranche, donc de la facon
  // dont la lumiere court en travers de la note — c'est lui qui distingue leurs
  // materiaux les uns des autres bien plus que les couleurs.
  float tranche;
  if (uProfil < 0.5) {
    tranche = smoothstep(-larg, 0.0, d);              // round : congé doux
  } else if (uProfil < 1.5) {
    tranche = clamp(-d / larg, 0.0, 1.0);             // gem : pan droit, arête franche
    tranche = 1.0 - tranche;
  } else if (uProfil < 2.5) {
    tranche = 1.0 - across;                           // ridge : toiture, arête centrale
    tranche = 1.0 - abs(1.0 - 2.0 * (1.0 - across));
    tranche = 1.0 - tranche;
  } else {
    tranche = mix(0.35, 1.0, 1.0 - across);           // angled : un seul pan incliné
  }
  return normalize(vec3(g * tranche * 3.0, 0.30));
}

// --------------------------------------------------------------- bruit -----
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
vec2 cellules(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash21(n + g), hash21(n + g + 17.3));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2);
}

// ----------------------------------------------------------- eclat de coin ---
// Un eclat, ce n'est pas un point lumineux : c'est un coeur vif et deux
// trainees perpendiculaires qui s'etirent. Ce sont ces trainees qui font lire
// l'angle comme une arete taillee — un simple halo rond donnerait une bulle.
// L'exponentielle croisee produit la croix sans avoir a la dessiner.
float eclatCoin(vec2 p, vec2 centre, float taille, float angle) {
  vec2 d = (p - centre) / max(taille, 1e-5);
  float ca = cos(angle), sa = sin(angle);
  d = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
  float croix = max(exp(-abs(d.x) * 16.0 - abs(d.y) * 1.1),
                    exp(-abs(d.y) * 16.0 - abs(d.x) * 1.1));
  float coeur = exp(-length(d) * 5.0);
  return (croix * 0.75 + coeur) * smoothstep(2.2, 0.0, length(d));
}

// ------------------------------------------------------------ caustique ---
// Rend la PROXIMITE d'une crete, entre 0 et 1 environ : 1 pile sur la ligne,
// 0 loin d'elle. Aucun exposant ici — main() en tire DEUX largeurs a partir du
// meme champ, un coeur fin et une jupe large autour. Un arc electrique, c'est
// exactement ca : un filament sur-expose entoure d'une lueur qui deborde. Un
// seul exposant ne donne qu'un trait, jamais un arc.
// Le champ de bruit, avec LEUR recette. 'uLacunarite' est le rapport de
// frequence d'une octave a la suivante et 'uGain' le rapport d'amplitude —
// 'OctaveScale' et 'OctaveMultiplier' chez eux. Une lacunarite proche de 1 met
// deux couches presque a la meme echelle : elles battent l'une contre l'autre
// et etirent les structures. Une lacunarite de 2 les separe nettement et donne
// un filet fin. C'est ce reglage, plus que tout autre, qui change la FORME des
// filaments — j'avais code 2,1 en dur, eux sont a 1,25 sur 'clarity'.
float champ(vec2 p) {
  float s = 0.0, amp = 1.0, norm = 0.0, f = 1.0;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uOctaves) break;
    s += vnoise(p * f) * amp;
    norm += amp;
    f *= uLacunarite;
    amp *= uGain;
  }
  return s / max(norm, 1e-4);
}

float caustique(vec2 p, float t) {
  // 'EvolutionSpeed' fait morpher le champ sur place ; 'TextureSpeed', porte par
  // 't', le fait deriver. Deux mouvements distincts, comme chez eux.
  float e = t * uEvolution;
  vec2 q = p + vec2(t * 0.13, t * 0.07) + e * 0.21;
  vec2 r = p * 1.37 + vec2(-t * 0.09, t * 0.11) + 31.7 - e * 0.17;
  // Champ LISSE, deux octaves. Les cretes d'un champ lisse sont de longues
  // courbes qui se rejoignent ; celles d'un fbm a quatre octaves se brisent en
  // pointilles et donnent des taches de moisissure.
  float a = champ(q);
  float b = champ(r + 41.0);
  float r1 = 1.0 - abs(2.0 * a - 1.0);
  float r2 = 1.0 - abs(2.0 * b - 1.0);
  // 'max' et non '+' : deux lignes qui se superposent ne font pas une ligne
  // deux fois plus claire, elles font la meme ligne. Le petit terme croise
  // ajoute la surbrillance des noeuds, la ou les deux nappes se croisent.
  return (max(r1, r2) + r1 * r2 * 0.30) / 1.30;
}

// --------------------------------------------------- lumiere dynamique -----
// 'water' : du bruit REPLIE. 1-|2n-1| transforme un bruit doux en cretes
// fines ; deux couches decalees se croisent et forment les mailles. C'est ce
// que fait la lumiere refractee au fond d'une piscine.
float motif(vec2 p, float t) {
  if (uDynType < 1.5) {
    vec2 d = cellules(p * 0.8);
    float arete = smoothstep(0.0, 0.10, d.y - d.x);
    float face = hash21(floor(p * 0.8));
    return mix(1.0, face * (0.7 + 0.3 * sin(t * 0.7 + face * 6.28)), 0.6)
         * mix(1.4, 1.0, arete);
  }
  float a = fbm(p * 0.42 + vec2(t * 0.06, -t * 0.04));
  float b = fbm(p * 0.23 + vec2(-t * 0.03, t * 0.05) + 9.1);
  return clamp(0.3 + 1.6 * (a * 0.65 + b * 0.35 - 0.35), 0.0, 1.5);
}

void main() {
  // Une unite vaut 540 px d'un rendu 1080 de large. 'uEchelle' dit combien
  // d'unites couvre la moitie du quadrilatere sur chaque axe : dans le banc
  // c'est l'inverse du zoom d'inspection (rapprocher la camera SANS changer le
  // motif, pour inspecter un filament de 3 px sans se mentir sur sa taille) ;
  // en production, c'est la demi-taille du rectangle alloue a la note.
  vec2 p = (vUv - 0.5) * 2.0 * uEchelle;
  // Repere de la NOTE : l'origine suit la note dans sa chute. Toute la forme et
  // l'eclairage se calculent dedans, sinon le biseau et le contour resteraient
  // accroches a l'ecran pendant que la note passe devant.
  vec2 pn = p;
  float d = distanceNote(pn);

  // Position le long de la note, 0 au pied et 1 au sommet. Elle sert au dégradé
  // du corps, au ciel du reflet et à la face du dessus — donc elle se calcule
  // une fois, ici, avant tout le monde.
  float haut = clamp((pn.y + uTaille.y) / max(2.0 * uTaille.y, 0.0001), 0.0, 1.0);

  // ColorMode gradient : leur corps n'est pas uni, deux couleurs s'y fondent.
  vec3 couleurNote = mix(uCouleur, uCouleur2, uDegradeCorps * haut);

  // --- 1. la forme, avec un bord antialiase
  float dedans = smoothstep(uPixel, -uPixel, d);

  // --- 2. l'eclairage
  vec3 n = normaleNote(pn, d);
  float a = radians(uA1);
  vec3 L1 = normalize(vec3(cos(a), sin(a), 0.75));
  vec3 L2 = normalize(vec3(-cos(a), -sin(a) * 0.5, 0.9));
  // Les deux lumieres ne sculptent QUE le bord.
  //
  // Une directionnelle appliquee telle quelle eclaire aussi la face plate : sa
  // normale pointe vers l'observateur, donc elle recoit 'L.z' fois l'intensite,
  // uniformement. Resultat, monter les lumieres pour donner du relief au bord
  // delavait tout le corps — le dilemme que Touvie decrit le 2026-08-24 : soit
  // du contraste et un corps pale, soit un corps propre et aucun relief.
  //
  // En retranchant ce que recevrait une face PLATE, l'ambiante redevient seule
  // maitresse du niveau du corps, et les lumieres n'ajoutent ou ne retirent que
  // la ou la normale s'incline — c'est-a-dire sur la tranche.
  vec3 nPlat = vec3(0.0, 0.0, 1.0);
  float plat = max(dot(nPlat, L1), 0.0) * uI1 + max(dot(nPlat, L2), 0.0) * uI2;
  float diff = uAmb + max(dot(n, L1), 0.0) * uI1
                    + max(dot(n, L2), 0.0) * uI2 - plat;
  // Deux lobes speculaires au lieu d'un. Le large pose le volume, le serre y
  // pique un point vif. C'est la recette de leur 'LightRayShader', et c'est ce
  // qui separe un rendu de verre riche d'un simple reflet.
  vec3 h = normalize(L1 + vec3(0.0, 0.0, 1.0));
  float cosSpec = max(dot(n, h), 0.0);
  float spec = (pow(cosSpec, max(uBroadPow, 1.0)) * uBroadStr
              + pow(cosSpec, max(uClearPow, 1.0)) * uClearStr) * uSpec;

  // La couleur du corps de la note. Uni, ou presque : c'est le constat de
  // Touvie sur SeeMusic — leur fond ne raconte rien, tout se joue au-dessus.
  vec3 base = couleurNote * diff + vec3(spec);

  // --- 3. la lumiere dynamique
  //
  // L'arc s'ajoute ICI, apres la multiplication par la couleur, et non dans
  // 'diff' comme avant. La difference est tout le sujet : dans 'diff' la
  // caustique MULTIPLIAIT la couleur de la note, donc sur un fond bleu une
  // caustique forte donnait du bleu tres vif — jamais du blanc, jamais un arc.
  // Ajoutee apres, elle apporte sa PROPRE lumiere. Le degrade que Touvie
  // decrit — bleu fonce, bleu clair, blanc — n'a alors pas besoin d'etre
  // programme : c'est ce que fait du blanc ajoute a du bleu, en quantite
  // croissante.
  if (uDyn > 0.001) {
    // La densite MULTIPLIE la frequence. Premier essai : 'p / uDens', soit
    // trois cycles en travers de la note — le motif devenait des nuages larges
    // au lieu de filaments. Avec x60, la plage 0,15-0,50 de SeeMusic donne 9 a
    // 30 cycles, et les mailles apparaissent.
    // Le motif est ancre en espace CANVAS, avec une maille de taille fixe en
    // pixels — la meme sur une note fine et sur une note large. C'est ce qui
    // fait qu'une note etroite de SeeMusic ne montre qu'un ou deux filaments
    // qui la traversent, au lieu d'un reseau complet comprime dedans.
    // p va de -1 a 1 sur la largeur, donc une unite vaut 540 px d'un rendu
    // 1080 ; uFreq porte deja la conversion.
    // C'est ICI que se joue 'TextureMovesWithNotes'. Avec le repere de la note,
    // le motif est solidaire d'elle : un filament reste sur le meme point de la
    // note du debut a la fin de sa course. Avec le repere de l'ecran, la note
    // traverse un motif immobile et son contenu defile a l'interieur d'elle.
    // 'TextureMovesWithNotes' : accroche a la note, le motif ne bouge pas par
    // rapport a elle — un filament reste sur le meme point du debut a la fin de
    // sa course. Accroche a l'ecran, la note traverse un motif immobile, donc
    // dans son repere a elle le motif remonte a la vitesse de chute et son
    // contenu defile a l'interieur d'elle.
    vec2 pm = (p + uDecalage * (1.0 - uMotifSuit)) * uFreq;
    float tm = uTemps * uVit;
    if (uDynType < 0.5) {
      float c = clamp(caustique(pm, tm), 0.0, 1.0);
      // Les exposants ne sont plus choisis : ils viennent des largeurs
      // mesurees sur 'Water.jpg'. Voir le calcul cote JS.
      float coeur = pow(c, uNCoeur);   // le filament sur-expose
      float jupe  = pow(c, uNJupe);    // la lueur large autour

      // La couche dynamique a SA PROPRE lumiere, distincte de celle de la note.
      // SeeMusic la declare separement : 'TextureLight1' a ses angles a lui
      // (20, -20) quand la note est eclairee a (25, 50), et surtout
      // 'TextureLightAmbient' vaut ZERO. Une ambiante nulle veut dire que la
      // couche n'apporte rien la ou elle n'est pas eclairee — les filaments
      // s'allument et s'eteignent le long de leur parcours au lieu de briller
      // uniformement. C'est ce qui manquait pour que ca ressemble a des arcs.
      float pas = uPixel * uFreq;   // un pixel ecran, exprime en unites de motif
      vec2 ea = vec2(pas, 0.0);
      vec2 gc = vec2(caustique(pm + ea.xy, tm) - caustique(pm - ea.xy, tm),
                     caustique(pm + ea.yx, tm) - caustique(pm - ea.yx, tm))
              / (2.0 * pas);
      vec3 na = normalize(vec3(-gc * 0.35, 1.0));
      float aa = radians(uArcAngle);
      vec3 La = normalize(vec3(cos(aa), sin(aa), 0.6));
      float ecl = uArcAmbiante + max(dot(na, La), 0.0) * (1.0 - uArcAmbiante);

      vec3 teinte = mix(couleurNote, vec3(1.0), uBlancheur);
      // DynamicSaturation : ils desaturent la couche dynamique a 0,75.
      float lumT = dot(teinte, vec3(0.299, 0.587, 0.114));
      teinte = mix(vec3(lumT), teinte, uDynSat);
      // DynamicLightContrast puis Brightness, dans cet ordre : le contraste
      // ecarte les valeurs, la luminosite decale l'ensemble.
      float k = (coeur * uCoeur + jupe * uJupe) * uDynContraste + uDynLum;
      base += teinte * max(k, 0.0) * uDyn * ecl;
    } else {
      // Cristal et lumieres restent des modulations du materiau, pas des arcs.
      float k = motif(pm, tm);
      base *= mix(1.0, 0.55 + k * 0.9, uDyn);
    }
  }

  // --- 4. le contour : une bande centree sur la distance nulle
  if (uBord > 0.001) {
    float bande = 1.0 - smoothstep(0.0, uBord, abs(d));
    base += couleurNote * bande * uBordEclat * dedans;
  }

  // --- 3 bis · LE REFLET ARTIFICIEL
  //
  // Ce que Touvie percevait comme « une plaque de verre devant ». Ce n'en est
  // pas une : c'est une reponse de surface qu'on n'avait pas.
  //
  // FRESNEL. Une surface reflechit d'autant plus que le regard la rase. Au
  // centre d'une note, la normale pointe vers nous et le reflet est faible ;
  // sur la tranche arrondie, elle s'incline et le reflet monte d'un coup. C'est
  // ce lisere clair sur les bords qui fait lire un objet comme du verre, et
  // aucun eclairage diffus ne peut l'imiter — c'est pour ca qu'aucun de nos
  // curseurs d'eclairage ne changeait rien a l'impression.
  // 'pow(0.0, n)' est un cas limite que la specification laisse indefini des
  // que l'exposant peut valoir zero, et dont plusieurs pilotes rendent NaN. Sur
  // une face parfaitement plate 'rasance' vaut exactement zero, donc le cas se
  // presente sur la majorite des pixels de la note. Un plancher minuscule le
  // supprime sans rien changer au resultat.
  float rasance = max(1.0 - clamp(n.z, 0.0, 1.0), 1e-4);
  float fresnel = pow(rasance, max(uFresPow, 1e-3)) * uFresStr;

  // REFLET D'ENVIRONNEMENT. Eux echantillonnent une cubemap. On n'en a pas, et
  // c'est sans importance : le mot 'Artificial' de leur nom de shader dit qu'ils
  // trichent deja. Un ciel vertical suffit — clair en haut, sombre en bas.
  // A 0 le ciel est uniforme et le reflet ne depend plus de la hauteur ; a 1 le
  // pied de la note ne recoit qu'un quart de ce que recoit son sommet.
  float ciel = mix(1.0, mix(0.25, 1.0, haut), uCielDegrade);
  // _ReflectionTopBoost : le sommet de la note attrape plus de ciel.
  ciel *= 1.0 + uReflTop * smoothstep(0.70, 1.0, haut);
  // _ReflectionContrast puis _ReflectionCompression : on durcit l'ecart entre
  // les zones claires et sombres du ciel, puis on ramene les hautes lumieres
  // avant qu'elles ne saturent. Les deux existent chez eux et nous manquaient.
  ciel = pow(max(ciel, 0.0), max(uReflContraste, 0.05));
  ciel = ciel / (1.0 + ciel * uReflCompression);
  // _ReflectionFaceFade : un FONDU, pas une coupure. La face garde '1 - fade'
  // du reflet — c'est ce residu qui pose le voile de verre sur tout le corps.
  // Mettre le curseur a 1 rend le reflet purement periferique, ce qui est
  // l'ancien comportement et un cas particulier, pas la regle.
  float face = smoothstep(0.35, 1.0, n.z);      // 1 au centre, 0 sur la tranche
  float part = mix(1.0, 1.0 - uReflFace, face);  // ce que la surface garde

  // Le Fresnel s'AJOUTE a cette base au lieu de la conditionner : il decrit un
  // supplement en incidence rasante, pas l'existence meme du reflet.
  vec3 tonReflet = mix(vec3(1.0), couleurNote, 1.0 - uReflSat);
  base += tonReflet * ciel * (part + fresnel) * uReflExpo;

  // _TopColor / Top Face Tint. Le bord d'attaque de la note — celui qui arrive
  // vers le clavier — porte sa propre couleur chez eux. Sur une note qui tombe
  // c'est ce liseré qui donne le sentiment d'un objet et non d'un trait peint.
  float bandeHaut = smoothstep(1.0 - max(uTopHauteur, 0.001), 1.0, haut);
  base += mix(couleurNote, vec3(1.0), 0.55) * bandeHaut * uTopEclat;

  // Les quatre coins. Le rayon d'arrondi les rentre vers l'interieur : l'eclat
  // doit se poser sur le sommet de la courbe, pas sur l'angle theorique du
  // rectangle, sinon il flotte a cote de la note.
  if (uGlintForce > 0.001) {
    vec2 c = uTaille - uArrondi * 0.45;
    float g = eclatCoin(pn, vec2( c.x,  c.y), uGlintTaille * uTaille.x, uGlintRot)
            + eclatCoin(pn, vec2(-c.x,  c.y), uGlintTaille * uTaille.x, uGlintRot)
            + eclatCoin(pn, vec2( c.x, -c.y), uGlintTaille * uTaille.x, uGlintRot)
            + eclatCoin(pn, vec2(-c.x, -c.y), uGlintTaille * uTaille.x, uGlintRot);
    base += mix(couleurNote, vec3(1.0), 0.8) * g * uGlintForce;
  }

  base *= uBrillance;   // _OverallBrightness

  // Sortie LINEAIRE et non bornee. Le halo et la compression des hautes
  // lumieres se font au composite, apres la cascade — un halo doit savoir ou
  // sont les zones vives de l'image, ce qu'un calcul par pixel ignore.
  // Borne de securite avant de livrer.
  //
  // La sortie reste en lumiere lineaire non bornee — c'est tout l'interet du
  // rendu flottant — mais un NaN ou un infini qui s'y glisserait contaminerait
  // le seuillage, puis les dix niveaux de flou, puis le composite : l'image
  // s'eteint et ne se rallume plus, puisque chaque etage relit un etage deja
  // corrompu. 'clamp' ramene aussi les NaN a une valeur finie sur les pilotes
  // qui les propagent. Le plafond est tres au-dessus de tout ce que la scene
  // produit legitimement : il ne coupe rien, il attrape les accidents.
  vec3 col = clamp(base * dedans, 0.0, 64.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

SOURCES.fsMinimal = `
precision highp float;
varying vec2 vUv;
// Le shader le plus simple possible : une couleur constante. Il emprunte
// exactement le meme chemin que le shader de scene — meme sommet, meme tampon,
// meme cible. S'il passe la ou l'autre echoue, la panne est dans le CONTENU du
// shader de scene, pas dans le chemin.
void main() { gl_FragColor = vec4(0.6, 0.4, 0.9, 1.0); }
`;

SOURCES.fsSeuil = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform float uSeuil;
// Ne garde que ce qui depasse le seuil, et le garde a sa VALEUR EXCEDENTAIRE.
// Un simple masque binaire ferait baver autant une zone a peine au-dessus du
// seuil qu'un coeur d'arc dix fois plus vif.
void main() {
  vec3 c = texture2D(uSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = max(l - uSeuil, 0.0) / max(l, 0.0001);
  gl_FragColor = vec4(c * k, 1.0);
}
`;

SOURCES.fsReduire = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;   // taille d'un texel de la SOURCE, pas de la cible
// Reduction de moitie en treize prises.
//
// Le piege qu'elle evite : espacer les prises d'un texel de la CIBLE revient a
// en sauter un sur deux dans la source, et a confier la moyenne au filtrage
// bilineaire. Si ce filtrage n'est pas celui qu'on croit — cas constate sur
// NVIDIA/D3D11 en RGBA16F le 2026-08-26 — un detail fin disparait des la
// deuxieme reduction.
//
// Ici les prises sont exprimees en texels SOURCE et couvrent tout le carre
// reduit : quatre au centre, qui portent la moitie du poids, et neuf en
// couronne. Aucun pixel de la source n'est ignore, avec ou sans filtrage.
void main() {
  vec2 t = uTexel;
  vec3 a = texture2D(uSrc, vUv + t * vec2(-1.0, -1.0)).rgb;
  vec3 b = texture2D(uSrc, vUv + t * vec2( 1.0, -1.0)).rgb;
  vec3 c = texture2D(uSrc, vUv + t * vec2(-1.0,  1.0)).rgb;
  vec3 d = texture2D(uSrc, vUv + t * vec2( 1.0,  1.0)).rgb;
  vec3 e = texture2D(uSrc, vUv).rgb;
  vec3 f = texture2D(uSrc, vUv + t * vec2(-2.0, -2.0)).rgb;
  vec3 g = texture2D(uSrc, vUv + t * vec2( 0.0, -2.0)).rgb;
  vec3 h = texture2D(uSrc, vUv + t * vec2( 2.0, -2.0)).rgb;
  vec3 i = texture2D(uSrc, vUv + t * vec2(-2.0,  0.0)).rgb;
  vec3 j = texture2D(uSrc, vUv + t * vec2( 2.0,  0.0)).rgb;
  vec3 k = texture2D(uSrc, vUv + t * vec2(-2.0,  2.0)).rgb;
  vec3 l = texture2D(uSrc, vUv + t * vec2( 0.0,  2.0)).rgb;
  vec3 m = texture2D(uSrc, vUv + t * vec2( 2.0,  2.0)).rgb;
  vec3 r = (a + b + c + d) * 0.125
         + (e + g + i + j + l) * 0.0555555
         + (f + h + k + m) * 0.0277777;
  gl_FragColor = vec4(r, 1.0);
}
`;

SOURCES.fsFlou = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uPas;     // un texel de la source, dans la direction du flou
// Gaussienne separable a 9 prises. Appliquee en descendant d'un niveau a
// chaque fois, elle donne une famille de flous dont les rayons doublent — la
// cascade. Sommer ces niveaux reconstruit un halo tres large pour un cout qui
// reste celui d'une poignee de passes.
void main() {
  float w[5];
  w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216;
  w[3] = 0.0540540541; w[4] = 0.0162162162;
  vec3 c = texture2D(uSrc, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 o = uPas * float(i);
    c += texture2D(uSrc, vUv + o).rgb * w[i];
    c += texture2D(uSrc, vUv - o).rgb * w[i];
  }
  gl_FragColor = vec4(c, 1.0);
}
`;

SOURCES.fsComp = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uG0, uG1, uG2;         // cascade Glow  — proche
uniform sampler2D uB0, uB1, uB2, uB3, uB4; // cascade Bloom — large
uniform float uGlowI, uGlowS;
uniform float uBloomI, uBloomS;

// Le poids d'un niveau decroit geometriquement : 'scatter^i'. Un scatter bas
// concentre le halo sur les niveaux fins, donc pres de la source ; un scatter
// haut donne du poids aux niveaux grossiers et etale le halo au loin. C'est
// exactement ce que decrivent 'GlowScatter 0.6' et 'BloomScatter 0.65'.
vec3 cascade3(vec3 a, vec3 b, vec3 c, float sc) {
  float w0 = 1.0, w1 = sc, w2 = sc * sc;
  return (a * w0 + b * w1 + c * w2) / (w0 + w1 + w2);
}
vec3 cascade5(vec3 a, vec3 b, vec3 c, vec3 d, vec3 e, float sc) {
  float w0 = 1.0, w1 = sc, w2 = sc*sc, w3 = sc*sc*sc, w4 = sc*sc*sc*sc;
  return (a*w0 + b*w1 + c*w2 + d*w3 + e*w4) / (w0 + w1 + w2 + w3 + w4);
}

void main() {
  vec3 col = texture2D(uScene, vUv).rgb;

  col += cascade3(texture2D(uG0, vUv).rgb, texture2D(uG1, vUv).rgb,
                  texture2D(uG2, vUv).rgb, uGlowS) * uGlowI;

  col += cascade5(texture2D(uB0, vUv).rgb, texture2D(uB1, vUv).rgb,
                  texture2D(uB2, vUv).rgb, texture2D(uB3, vUv).rgb,
                  texture2D(uB4, vUv).rgb, uBloomS) * uBloomI;

  // Compression des hautes lumieres, tout a la fin : les etages s'additionnent
  // bien au-dela de 1 et tout ce qui depasse se collerait a du blanc pur.
  // Courbe ACES (approximation de Narkowicz) — les blancs roulent au lieu de
  // claquer, et une note gardee sa couleur jusque dans ses hautes lumieres.
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14),
              0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// VERSION DE LA SEMANTIQUE DES REGLAGES
//
// Un profil n'est qu'une liste de valeurs de curseurs. Ce qu'elles VEULENT DIRE,
// c'est ce fichier qui le decide. Le jour ou un reglage change de sens, les
// anciens profils rendent autre chose sans rien signaler : ce numero est la pour
// que l'import le dise. A incrementer quand un reglage change de sens, jamais
// quand on en ajoute un.
// ---------------------------------------------------------------------------
const VERSION_PROFIL = 1;

// Nombre d'etages de chaque cascade. Partages : le banc et la production
// doivent flouter sur la meme profondeur, sinon un halo regle dans l'un
// n'a pas la meme portee dans l'autre.
//
// Deux moteurs distincts chez SeeMusic, pas deux reglages du meme effet :
// Glow (asset MK Glow) part de la note entiere et n'a pas de seuil ; Bloom
// (Universal Render Pipeline) ne prend que ce qui depasse BloomThreshold.
const NIV_GLOW = 3, NIV_BLOOM = 5;

// ---------------------------------------------------------------------------
// LA TABLE DES REGLAGES
//
// C'est la piece maitresse du partage. Chaque ligne dit : quel curseur (id),
// quelle grandeur du materiau (cle), et par combien diviser la valeur brute du
// curseur pour obtenir la grandeur (div). Les curseurs HTML ne connaissent que
// les entiers ; c'est ici que 105 devient 1,05.
//
// Le banc genere ses liaisons depuis cette table, et NoteClimber lit les profils
// du banc avec la meme table. Sans elle, chaque page reinterprete les nombres a
// sa facon et un profil ne rend plus pareil des deux cotes.
//
//   id    identifiant du controle dans le panneau
//   cle   nom de la grandeur dans l'objet de reglages
//   div   diviseur (1 = la valeur du curseur EST la grandeur)
//   dec   decimales a afficher en regard du curseur
//   menu  le controle est un <select>
//   case  le controle est une case a cocher
//   banc  condition d'OBSERVATION, pas matiere : le zoom d'inspection et la
//         vitesse de defilement decrivent comment on regarde la note dans le
//         banc, pas de quoi elle est faite. Ces lignes ne partent donc pas dans
//         les profils — en production, la taille a l'ecran et la vitesse de
//         chute viennent de la partition, pas d'un curseur.
// ---------------------------------------------------------------------------
const REGLAGES = [
  // 1 - Forme
  { id: 'p_arrondi',     cle: 'arrondi',     div: 100,  dec: 2 },
  { id: 'p_largPx',      cle: 'largPx',      div: 1,    dec: 0 },
  { id: 'p_hautPx',      cle: 'hautPx',      div: 1,    dec: 0 },
  { id: 'p_zoom',        cle: 'zoom',        div: 100,  dec: 2, banc: true },
  { id: 'p_vitesse',     cle: 'vitesse',     div: 1,    dec: 0, banc: true },
  { id: 'p_profondeur',  cle: 'profondeur',  div: 100,  dec: 2 },
  { id: 's_profil',      cle: 'profil',      div: 1,    dec: 0, menu: true },

  // 2 - Eclairage
  { id: 'p_i1',          cle: 'i1',          div: 100,  dec: 2 },
  { id: 'p_a1',          cle: 'a1',          div: 1,    dec: 0 },
  { id: 'p_i2',          cle: 'i2',          div: 100,  dec: 2 },
  { id: 'p_amb',         cle: 'amb',         div: 100,  dec: 2 },
  { id: 'p_spec',        cle: 'spec',        div: 100,  dec: 2 },
  { id: 'p_broadStr',    cle: 'broadStr',    div: 100,  dec: 2 },
  { id: 'p_broadPow',    cle: 'broadPow',    div: 1,    dec: 0 },
  { id: 'p_clearStr',    cle: 'clearStr',    div: 100,  dec: 2 },
  { id: 'p_clearPow',    cle: 'clearPow',    div: 1,    dec: 0 },

  // 3 - Reflet artificiel (Custom/NoteArtificialReflectionShader)
  { id: 'p_fresStr',     cle: 'fresStr',     div: 100,  dec: 2 },
  { id: 'p_fresPow',     cle: 'fresPow',     div: 100,  dec: 2 },
  { id: 'p_reflExpo',    cle: 'reflExpo',    div: 100,  dec: 2 },
  { id: 'p_cielDegrade', cle: 'cielDegrade', div: 100,  dec: 2 },
  { id: 'p_reflTop',     cle: 'reflTop',     div: 100,  dec: 2 },
  { id: 'p_reflFace',    cle: 'reflFace',    div: 100,  dec: 2 },
  { id: 'p_reflSat',     cle: 'reflSat',     div: 100,  dec: 2 },
  { id: 'p_reflContraste',   cle: 'reflContraste',   div: 100, dec: 2 },
  { id: 'p_reflCompression', cle: 'reflCompression', div: 100, dec: 2 },
  { id: 'p_brillance',   cle: 'brillance',   div: 100,  dec: 2 },

  // Eclat de coin et face du dessus
  { id: 'p_glintForce',  cle: 'glintForce',  div: 100,  dec: 2 },
  { id: 'p_glintTaille', cle: 'glintTaille', div: 100,  dec: 2 },
  { id: 'p_glintRot',    cle: 'glintRot',    div: 1,    dec: 0 },
  { id: 'p_topEclat',    cle: 'topEclat',    div: 100,  dec: 2 },
  { id: 'p_topHauteur',  cle: 'topHauteur',  div: 1000, dec: 3 },

  // 4 - Caustiques
  { id: 'c_dyn',         cle: 'dynOn',       case: true },
  { id: 's_motif',       cle: 'motif',       div: 1,    dec: 0, menu: true },
  { id: 'p_dyn',         cle: 'dyn',         div: 100,  dec: 2 },
  { id: 'p_octaves',     cle: 'octaves',     div: 1,    dec: 0 },
  { id: 'p_lacunarite',  cle: 'lacunarite',  div: 100,  dec: 2 },
  { id: 'p_gain',        cle: 'gain',        div: 100,  dec: 2 },
  { id: 'p_evolution',   cle: 'evolution',   div: 100,  dec: 2 },
  { id: 'p_dynLum',      cle: 'dynLum',      div: 100,  dec: 2 },
  { id: 'p_dynContraste', cle: 'dynContraste', div: 100, dec: 2 },
  { id: 'p_dynSat',      cle: 'dynSat',      div: 100,  dec: 2 },
  { id: 'p_maille',      cle: 'maille',      div: 1,    dec: 0 },
  { id: 'p_filament',    cle: 'filament',    div: 1000, dec: 3 },
  { id: 'p_lueur',       cle: 'lueur',       div: 1000, dec: 3 },
  { id: 'c_suit',        cle: 'motifSuit',   case: true },
  { id: 'p_vit',         cle: 'vit',         div: 100,  dec: 2 },
  { id: 'p_coeur',       cle: 'coeur',       div: 100,  dec: 2 },
  { id: 'p_jupe',        cle: 'jupe',        div: 100,  dec: 2 },
  { id: 'p_blancheur',   cle: 'blancheur',   div: 100,  dec: 2 },
  { id: 'p_arcAngle',    cle: 'arcAngle',    div: 1,    dec: 0 },
  { id: 'p_arcAmbiante', cle: 'arcAmbiante', div: 100,  dec: 2 },

  // Contour
  { id: 'p_bord',        cle: 'bord',        div: 1000, dec: 3 },
  { id: 'p_becl',        cle: 'bordEclat',   div: 100,  dec: 2 },

  // 5 - Halo
  { id: 'p_glowI',       cle: 'glowI',       div: 100,  dec: 2 },
  { id: 'p_glowS',       cle: 'glowS',       div: 100,  dec: 2 },
  { id: 'p_seuil',       cle: 'seuil',       div: 100,  dec: 2 },
  { id: 'p_bloomI',      cle: 'bloomI',      div: 100,  dec: 2 },
  { id: 'p_bloomS',      cle: 'bloomS',      div: 100,  dec: 2 },

  // Couleurs
  { id: 'p_teinte',      cle: 'teinte',      div: 1,    dec: 0 },
  { id: 'p_sat',         cle: 'sat',         div: 100,  dec: 2 },
  { id: 'p_degradeCorps', cle: 'degradeCorps', div: 100, dec: 2 },
  { id: 'p_teinte2',     cle: 'teinte2',     div: 1,    dec: 0 },
  { id: 'p_sat2',        cle: 'sat2',        div: 100,  dec: 2 },
];

/** Traduit un profil (valeurs BRUTES des curseurs, telles qu'enregistrees) en
 *  objet de reglages utilisable par le shader.
 *
 *  C'est la fonction dont NoteClimber a besoin : il n'aura pas les curseurs du
 *  banc, seulement le texte d'un profil. Les cles absentes gardent la valeur
 *  d'usine — un profil ecrit avant l'ajout d'un reglage reste lisible.
 */
function profilVersReglages(profil, base) {
  const R = Object.assign({}, base || DEFAUTS);
  if (!profil) return R;
  for (const r of REGLAGES) {
    if (!(r.id in profil)) continue;
    const v = profil[r.id];
    if (r.case) R[r.cle] = (v === true || v === 'true');
    else R[r.cle] = (+v) / (r.div || 1);
  }
  return R;
}

/** L'inverse : des reglages vers les valeurs brutes de curseurs. Sert a semer un
 *  profil ecrit a la main dans le code, et aux tests aller-retour. */
function reglagesVersProfil(R) {
  const p = { _version: VERSION_PROFIL };
  for (const r of REGLAGES) {
    if (r.banc || !(r.cle in R)) continue;
    p[r.id] = r.case ? !!R[r.cle] : String(Math.round(R[r.cle] * (r.div || 1)));
  }
  return p;
}

/** Les controles qu'un profil ne doit PAS capturer : outils du banc et champs
 *  de l'interface. Vit ici pour que le banc et la production s'accordent sur ce
 *  qui traverse le pont. */
const HORS_PROFIL = REGLAGES.filter(r => r.banc).map(r => r.id)
  .concat(['i_nomProfil', 's_profils', 's_style', 't_transport']);

// ---------------------------------------------------------------------------
// VALEURS D'USINE
//
// Le point de depart quand aucun profil n'est charge. Les valeurs annotees
// viennent de mesures : clarity.smsettings pour les reglages de SeeMusic,
// Water.jpg pour la geometrie du motif.
// ---------------------------------------------------------------------------
const DEFAUTS = {
  // Largeur reelle d'une note sur un rendu 1080 : 1080 / 52 touches blanches
  // = 20,8 px, dont 0,72 de remplissage = 15 px. Mesure du 2026-08-22.
  arrondi: 1.05, largPx: 15, hautPx: 300, zoom: 3,
  profondeur: 0.37, i1: 0.70, a1: 50, i2: 0.30, amb: 0.30, spec: 0.0,
  fresStr: 0.0, fresPow: 3.0, reflExpo: 0.90, reflTop: 0.0,
  reflFace: 0.0, reflSat: 0.35, brillance: 1.0, cielDegrade: 0.0,
  // Valeurs de 'clarity', sauf indication contraire.
  reflContraste: 1.0, reflCompression: 0.0,      // _ReflectionContrast/Compression
  broadStr: 1.0, broadPow: 8.0,                  // _BroadSpec*
  clearStr: 0.6, clearPow: 64.0,                 // _ClearSpec*
  profil: 0,                                     // NoteShape3D round
  topEclat: 0.0, topHauteur: 0.04,               // _TopColor
  octaves: 2, lacunarite: 2.10, gain: 0.47, evolution: 0.0,  // leur recette exacte
  dynLum: 0.0, dynContraste: 1.0, dynSat: 1.0,   // DynamicLight*/DynamicSaturation
  glintForce: 0.0, glintTaille: 0.9, glintRot: 0,  // NoteCornerGlintSprite
  // Seconde couleur du degrade. 214 degres correspond au RGB (0, 0.024, 0.8)
  // trouve en fin de leur fichier 'clarity' — le bleu profond de leurs notes.
  teinte2: 214, sat2: 1.0, degradeCorps: 0.0,
  dynOn: true, motif: 0, dyn: 0.45, vit: 0.70,
  // Les trois valeurs mesurees sur Water.jpg le 2026-08-24.
  maille: 258, filament: 0.033, lueur: 0.33,
  coeur: 2.2, jupe: 0.55, blancheur: 1.0, arcAngle: -20, arcAmbiante: 0.0,
  bord: 0.0, bordEclat: 1.25,
  vitesse: 450, motifSuit: true, sansCascade: false,
  // Valeurs exactes de clarity.smsettings.
  glowI: 0.25, glowS: 0.60, seuil: 0.80, bloomI: 1.10, bloomS: 0.65,
  teinte: 248, sat: 0.72,
};

// ---------------------------------------------------------------------------
// OUTILS DE CALCUL
// ---------------------------------------------------------------------------

/** HSL vers RGB lineaire approche, tel qu'utilise par le banc. */
function hsl(h, s, l) {
  const f = k => {
    const a = (k + h / 30) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(a - 3, 9 - a, 1));
  };
  return [f(0), f(8), f(4)];
}

/** Largeur a mi-hauteur d'une puissance, inversee.
 *
 *  pow(c, n) vaut la moitie quand c = 0.5^(1/n), et c descend de 1 a 0 sur une
 *  demi-maille. D'ou largeur = 1 - 0.5^(1/n), donc n = ln(0.5) / ln(1 - largeur).
 *  Verifie sur la mesure : largeur 0,033 (Water.jpg) donne n = 20,6, et c'est
 *  bien l'exposant qui reproduit leurs filaments. C'est ce calcul qui remplace
 *  le reglage a l'oeil.
 */
function expo(w) {
  return Math.log(0.5) / Math.log(1 - Math.min(Math.max(w, 0.002), 0.9));
}

/** Une seule plainte par session : ce controle tourne cent fois par image. */
const plainte = { faite: false };

/** Localise tous les uniformes du shader de scene, une fois pour toutes. */
function localiser(gl, prog) {
  const U = {};
  for (const n of UNIFORMES) U[n] = gl.getUniformLocation(prog, n);
  return U;
}

const UNIFORMES = [
  'uTaille', 'uArrondi', 'uProfondeur', 'uI1', 'uA1', 'uI2', 'uAmb', 'uSpec',
  'uEchelle', 'uPixel', 'uDecalage', 'uMotifSuit',
  'uFresStr', 'uFresPow', 'uReflExpo', 'uReflTop', 'uReflFace', 'uReflSat',
  'uBrillance', 'uCielDegrade', 'uReflContraste', 'uReflCompression',
  'uBroadStr', 'uBroadPow', 'uClearStr', 'uClearPow', 'uProfil',
  'uTopEclat', 'uTopHauteur', 'uOctaves', 'uLacunarite', 'uGain', 'uEvolution',
  'uDynLum', 'uDynContraste', 'uDynSat',
  'uGlintForce', 'uGlintTaille', 'uGlintRot', 'uCouleur2', 'uDegradeCorps',
  'uDyn', 'uDynType', 'uVit', 'uFreq', 'uNCoeur', 'uNJupe', 'uBord', 'uBordEclat',
  'uCoeur', 'uJupe', 'uBlancheur', 'uArcAngle', 'uArcAmbiante',
  'uCouleur', 'uTemps',
];

/** Pose l'integralite des uniformes du shader de scene.
 *
 *  gl   contexte WebGL2, avec le programme de scene DEJA courant
 *  U    table des emplacements, telle que rendue par localiser()
 *  R    les reglages du materiau (sortie de profilVersReglages)
 *  ctx  ce qui ne vient PAS du profil mais de la scene :
 *
 *    largPx, hautPx    taille de CETTE note, en pixels d'un rendu 1080
 *    echelle           [ex, ey] unites couvertes par le DEMI-quadrilatere.
 *                      Banc : [1/zoom, 1/zoom]. Production : la demi-taille du
 *                      rectangle alloue a la note, en unites (px / 1080).
 *    viewportPx        [vw, vh] taille du quadrilatere en pixels d'ecran, d'ou
 *                      se deduit ce que mesure UN pixel — c'est ce qui garde
 *                      l'anticrenelage a exactement un pixel de transition,
 *                      que la note fasse 15 px ou que le banc la grossisse.
 *    defile            decalage vertical du motif, en unites
 *    temps             instant, en secondes
 *    couleur           [r,g,b] du corps de la note
 *    couleur2          [r,g,b] de la seconde couleur du degrade
 *
 *  Pourquoi cette separation : dans le banc il y a UNE note, dont la taille et
 *  la couleur sont des reglages. Dans Note Climber il y en a cent, chacune avec
 *  sa taille et sa couleur, sur le meme materiau. Ce qui est propre a la note
 *  passe donc par ctx, ce qui decrit la MATIERE reste dans R.
 */
function poserUniformes(gl, U, R, ctx) {
  const largPx = (ctx.largPx !== undefined) ? ctx.largPx : R.largPx;
  const hautPx = (ctx.hautPx !== undefined) ? ctx.hautPx : R.hautPx;

  // La note se declare en pixels d'un rendu 1080. 540 px = 1 unite.
  const hw = largPx / 2 / 540, hh = hautPx / 2 / 540;
  gl.uniform2f(U.uTaille, hw, hh);

  // Echelle du quadrilatere. Sans `ctx.echelle`, on retombe sur le zoom
  // d'inspection du banc, isotrope.
  const ez = 1 / (ctx.zoom !== undefined ? ctx.zoom : R.zoom);
  const ech = ctx.echelle || [ez, ez];
  gl.uniform2f(U.uEchelle, ech[0], ech[1]);

  // Ce que mesure UN pixel d'ecran, en unites : le demi-quad couvre ech[0]
  // unites sur vw/2 pixels. C'est ce qui rend l'anticrenelage et le gradient
  // independants du zoom et de la taille de la note — un bord fait toujours
  // exactement un pixel de transition.
  //
  // UNE seule valeur, reutilisee par le prefiltrage plus bas. Les deux ont
  // diverge une fois : uPixel etait calcule ici depuis `viewportPx` tandis que
  // le prefiltrage lisait encore `ctx.pixelEnUnites`, absent en production.
  // Resultat, une division par `undefined`, et uCoeur / uJupe / uNCoeur /
  // uNJupe partis en NaN — donc toute la couche de caustiques perdue, sans la
  // moindre erreur signalee. Trouve en comparant les uniformes reellement
  // poses des deux cotes.
  const vw = ctx.viewportPx ? ctx.viewportPx[0] : null;
  const pixelEnUnites = vw ? (2 * ech[0] / vw) : ctx.pixelEnUnites;
  gl.uniform1f(U.uPixel, pixelEnUnites);
  // Ou se trouve cette note dans l'ecran, en unites. Sert uniquement quand le
  // motif est ancre a l'ecran (motifSuit decoche) : c'est ce decalage qui fait
  // que chaque note revele SA portion d'une seule grande matiere, au lieu que
  // toutes montrent le meme bout. `ctx.defile` reste accepte pour le banc, ou
  // il n'y a qu'une note et ou le motif defile avec le temps.
  const dec = ctx.decalage || [0, ctx.defile || 0];
  gl.uniform2f(U.uDecalage, dec[0], dec[1]);
  gl.uniform1f(U.uMotifSuit, R.motifSuit ? 1 : 0);
  gl.uniform1f(U.uArrondi, Math.min(R.arrondi * hw * 0.5, Math.min(hw, hh) * 0.99));
  gl.uniform1f(U.uProfondeur, R.profondeur);

  gl.uniform1f(U.uI1, R.i1); gl.uniform1f(U.uA1, R.a1);
  gl.uniform1f(U.uI2, R.i2); gl.uniform1f(U.uAmb, R.amb);
  gl.uniform1f(U.uSpec, R.spec);
  gl.uniform1f(U.uFresStr, R.fresStr);   gl.uniform1f(U.uFresPow, R.fresPow);
  gl.uniform1f(U.uReflExpo, R.reflExpo); gl.uniform1f(U.uReflTop, R.reflTop);
  gl.uniform1f(U.uReflFace, R.reflFace); gl.uniform1f(U.uReflSat, R.reflSat);
  gl.uniform1f(U.uBrillance, R.brillance);
  gl.uniform1f(U.uCielDegrade, R.cielDegrade);
  gl.uniform1f(U.uReflContraste, R.reflContraste);
  gl.uniform1f(U.uReflCompression, R.reflCompression);
  gl.uniform1f(U.uBroadStr, R.broadStr); gl.uniform1f(U.uBroadPow, R.broadPow);
  gl.uniform1f(U.uClearStr, R.clearStr); gl.uniform1f(U.uClearPow, R.clearPow);
  gl.uniform1f(U.uProfil, R.profil);
  gl.uniform1f(U.uTopEclat, R.topEclat); gl.uniform1f(U.uTopHauteur, R.topHauteur);
  gl.uniform1f(U.uOctaves, R.octaves); gl.uniform1f(U.uLacunarite, R.lacunarite);
  gl.uniform1f(U.uGain, R.gain); gl.uniform1f(U.uEvolution, R.evolution);
  gl.uniform1f(U.uDynLum, R.dynLum); gl.uniform1f(U.uDynContraste, R.dynContraste);
  gl.uniform1f(U.uDynSat, R.dynSat);
  gl.uniform1f(U.uGlintForce, R.glintForce);
  gl.uniform1f(U.uGlintTaille, R.glintTaille);
  gl.uniform1f(U.uGlintRot, R.glintRot * Math.PI / 180);
  gl.uniform3fv(U.uCouleur2, ctx.couleur2 || hsl(R.teinte2, R.sat2, 0.62));
  gl.uniform1f(U.uDegradeCorps, R.degradeCorps);
  gl.uniform1f(U.uDyn, R.dynOn ? R.dyn : 0);
  gl.uniform1f(U.uDynType, R.motif);

  const freq = 540 / Math.max(R.maille, 20);
  gl.uniform1f(U.uFreq, freq);

  // PREFILTRAGE. Un detail plus fin qu'un pixel ne peut pas etre echantillonne
  // correctement : il apparait et disparait selon ou tombe le centre du pixel,
  // et quand l'image defile ca donne un fourmillement. Le remede n'est pas d'y
  // envoyer plus d'echantillons, c'est de ne jamais descendre sous le pixel : on
  // elargit le detail au minimum visible et on baisse son amplitude dans le meme
  // rapport, ce qui laisse la lumiere TOTALE inchangee. C'est le principe du
  // mipmap, applique a un motif procedural qui n'en a pas.
  const mailleEnPx = (1 / freq) / pixelEnUnites;
  const MIN_PX = 1.6;
  function sur(w) {
    const px = w * mailleEnPx;
    if (px >= MIN_PX) return [w, 1];
    return [MIN_PX / mailleEnPx, px / MIN_PX];   // elargi, amplitude compensee
  }
  // Un NaN ne leve aucune erreur GL : il se propage dans le shader, contamine
  // le seuillage puis toute la cascade, et l'image change sans que rien ne le
  // dise. On le refuse ici, une fois, avec le nom du coupable — plutot que de
  // le chercher ensuite dans une image bizarre.
  if (!plainte.faite) {
    const suspects = { pixelEnUnites: pixelEnUnites, freq: freq,
                       'echelle.x': ech[0], 'echelle.y': ech[1],
                       largPx: largPx, hautPx: hautPx, temps: ctx.temps };
    for (const nom in suspects) {
      if (!isFinite(suspects[nom])) {
        plainte.faite = true;
        console.error('NoteMaterial : ' + nom + ' vaut ' + suspects[nom]
          + '. Tout ce qui en derive part en NaN et la couche disparait en '
          + 'silence. Contexte recu : ' + JSON.stringify(ctx));
        break;
      }
    }
  }

  const cC = sur(R.filament), cJ = sur(R.lueur);
  gl.uniform1f(U.uNCoeur, expo(cC[0]));
  gl.uniform1f(U.uNJupe, expo(cJ[0]));
  gl.uniform1f(U.uCoeur, R.coeur * cC[1]); gl.uniform1f(U.uJupe, R.jupe * cJ[1]);
  gl.uniform1f(U.uBlancheur, R.blancheur);
  gl.uniform1f(U.uArcAngle, R.arcAngle);
  gl.uniform1f(U.uArcAmbiante, R.arcAmbiante);
  gl.uniform1f(U.uVit, R.vit);
  gl.uniform1f(U.uBord, R.bord); gl.uniform1f(U.uBordEclat, R.bordEclat);
  gl.uniform3fv(U.uCouleur, ctx.couleur || hsl(R.teinte, R.sat, 0.62));
  gl.uniform1f(U.uTemps, ctx.temps);
}

// ---------------------------------------------------------------------------
// COMPILATION
//
// Rassemblee ici pour que les deux pages compilent le meme texte de la meme
// facon, et pour qu'un echec soit rapporte au meme endroit.
// ---------------------------------------------------------------------------

/** Compile une source. Renvoie le shader, ou null en poussant le journal
 *  d'erreur dans le tableau `echecs` fourni. */
function compiler(gl, source, type, nom, echecs) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    if (echecs) echecs.push(nom + ' : ' + log);
    else console.error(nom, log);
    return null;
  }
  return s;
}

/** Lie un programme a partir du sommet commun et d'un fragment nomme. */
function lier(gl, nomFs, echecs) {
  const vs = compiler(gl, SOURCES.vs, gl.VERTEX_SHADER, 'vs', echecs);
  const fs = compiler(gl, SOURCES[nomFs], gl.FRAGMENT_SHADER, nomFs, echecs);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    if (echecs) echecs.push('lien ' + nomFs + ' : ' + log);
    else console.error('lien', nomFs, log);
    return null;
  }
  return p;
}

/** Controle de discipline, execute au chargement.
 *
 *  Les sources vivent dans des chaines a gabarit. Un accent grave dans un
 *  commentaire GLSL fermerait la chaine et casserait la page sans rien dire —
 *  c'est arrive quatre fois sur NoteClimber.html. La regle est donc : AUCUN
 *  accent grave dans les sources. Ce controle la fait respecter, et
 *  outils/lint-shader.js la verifie hors navigateur, avant meme d'ouvrir la
 *  page.
 */
function verifierSources() {
  const fautifs = [];
  for (const nom of Object.keys(SOURCES)) {
    const s = SOURCES[nom];
    if (s.indexOf(String.fromCharCode(96)) >= 0) fautifs.push(nom + ' : accent grave');
    if (s.indexOf('$' + '{') >= 0) fautifs.push(nom + ' : interpolation');
    if (!s.trim()) fautifs.push(nom + ' : source vide');
  }
  return fautifs;
}

window.NoteMaterial = {
  VERSION_PROFIL: VERSION_PROFIL,
  NIV_GLOW: NIV_GLOW,
  NIV_BLOOM: NIV_BLOOM,
  SOURCES: SOURCES,
  UNIFORMES: UNIFORMES,
  REGLAGES: REGLAGES,
  HORS_PROFIL: HORS_PROFIL,
  DEFAUTS: DEFAUTS,
  profilVersReglages: profilVersReglages,
  reglagesVersProfil: reglagesVersProfil,
  poserUniformes: poserUniformes,
  localiser: localiser,
  compiler: compiler,
  lier: lier,
  hsl: hsl,
  expo: expo,
  verifierSources: verifierSources,
};

// Le meme objet en CommonJS, pour que le controle Node puisse charger ce
// fichier sans navigateur.
if (typeof module !== 'undefined' && module.exports) module.exports = window.NoteMaterial;
})(typeof window !== 'undefined' ? window : globalThis);
