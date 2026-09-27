# Codex — Architecture (main.js, le chef d'atelier)

Codex se présente lui-même comme un livre qu'on fabrique ("Impression CMJN...", "Massicotage des marges...", "Brochage dos carré collé...", "Reliure en cours..." — les messages de chargement du splash). On garde cette image : **`main.js` est le chef d'atelier** qui ne fabrique rien lui-même, mais commande à chaque poste de travail (les autres fichiers importés) et tient le planning.

Ce document couvre `js/main.js` en entier — c'est le fichier d'orchestration, celui qui démarre tout et connecte les autres. Les postes de travail eux-mêmes (`background.js`, `book.js`, `drag.js`, `oblivion-transition.js`) auront chacun leur propre `Architecture.md` local plus tard, sur le même principe qu'Oblivion.

---

## La spine — les groupes de symboles (façon barre d'outline VS Code)

VS Code liste tous les noms du fichier avec une icône : hexagone violet = fonction, icône bleue = variable. Ce document reprend cette même liste, mais **regroupée par poste de travail** plutôt qu'à plat — sinon 50+ entrées isolées ne racontent rien.

```
main.js
 ├─ 📦 IMPORTS               → three.js, addons, et les 4 postes de travail (modules/*.js)
 ├─ 🎫 SPLASH (l'accueil)     → splashEl, splashBar, splashPct, splashStatus, SPLASH_MESSAGES,
 │                              splashMsgIdx, splashMsgTimer, splashGone, managerIdle,
 │                              appInitDone, enterReady(), maybeReady(), doorHole()
 ├─ 🖨️ RENDERER/SCÈNE/CAMÉRA → renderer, scene, camera
 ├─ 🌀 POST-PROCESS           → composer, distortPass, _composerRT
 ├─ 🔧 INIT DES POSTES        → initBackground(), initBook(), initDrag(), bookRef
 ├─ 🕳️ TRANSITION OBLIVION    → oblivionTransition
 ├─ 👆 HOTSPOTS (clics livre) → TOC_HOTSPOTS, HOTSPOTS, hotspotAt(), _dlRay, _dlPtr
 ├─ 🪟 OVERLAYS & MENUS       → écouteurs .overlay-menu, version-dropdown, oblivion-menu
 ├─ 📖 NAVIGATION PAGES       → next-page, prev-page, overlay-close, lightbox
 ├─ 📄 EXPORT PDF             → _loadScript(), _loadImage(), generateBut2Pdf(), but2Btn
 ├─ 🎨 MODE NÉGATIF DÉCOR     → INVERT_EFFECT_ENABLED, _setInvertEffect()
 ├─ 🐛 PANNEAUX DEBUG         → debugVisible, _applyDebugVisibility(), touche "$"
 ├─ 🕹️ ORBITCONTROLS (debug)  → orbit, orbitMode, mode-btn
 ├─ 🎯 MODE FOCUS             → focusLock, fitCameraToSpread(), resetCameraView(), setFocus()
 ├─ ⌨️ CAMÉRA CLAVIER          → flèches directionnelles (hors focus/orbite)
 ├─ 📐 RESIZE                 → écouteur resize
 └─ 🔁 BOUCLE                 → animate()
```

17 postes de travail dans un seul fichier — c'est volontairement PAS découpé en modules ES comme Oblivion (à part les 4 gros postes importés). Pour naviguer dedans dans VS Code : Ctrl+Maj+O ouvre cette même liste en version cliquable.

---

## 1. Le ticket d'accueil (splash)

Le splash (l'écran "En attente du BAT...") ne se ferme QUE quand deux conditions sont réunies en même temps — comme un colis qui n'est livré que si le camion ET le client sont prêts au même moment :

```js
let splashGone = false, managerIdle = false, appInitDone = false;
function maybeReady() { if (managerIdle && appInitDone) enterReady(); }
```

- `managerIdle` = "toutes les textures/ressources three.js demandées sont arrivées" (mis à jour par `THREE.DefaultLoadingManager.onLoad`)
- `appInitDone` = "le code a fini de LANCER toutes ses demandes" (mis à `true` juste après `initBook()`)

Pourquoi les deux et pas un seul : si on n'écoutait que `managerIdle`, il pourrait passer à `true` après la PREMIÈRE petite texture chargée, bien avant que le reste du code ait fini de demander les grosses (la couverture 4K). Le commentaire du fichier le dit texto : *"sinon onLoad se déclenche dès la première vague et le splash part trop tôt."* Un garde-fou (`setTimeout(enterReady, 25000)`) force quand même l'ouverture au bout de 25s si une ressource ne répond jamais.

**L'ouverture de la porte** (`splashEnter` cliqué) est le geste le plus travaillé du fichier — vaut la peine d'être traduit en détail, avec la métaphore du trou de serrure :

```js
function doorHole(w, h, ox, oy) {
    const pts = [/* les coins du cadre */];
    // ajoute un demi-cercle pour la partie arrondie de la porte
    for (let i = 1; i <= steps; i++) { pts.push([...]); }
    return `polygon(${pts...})`;
}
archEl.style.clipPath = doorHole(...);
bgEl.style.clipPath   = doorHole(...);
```

Imagine une feuille de papier opaque avec un trou en forme de porte découpé dedans — `clip-path: polygon(...)` EST ce découpage, en CSS pur. Le piège que le commentaire explique : la texture de la porte est PAR-DESSUS le fond beige, donc la faire disparaître en fondu ne révélerait QUE le beige, pas la scène 3D derrière. La solution retenue : découper le trou dans l'arche ET le fond dès le clic, mais ce trou reste invisible tant que la texture de la porte (opaque, par-dessus) le cache encore — il apparaît progressivement SEULEMENT parce que cette texture s'efface en fondu par-dessus. L'arche et le fond eux-mêmes ne s'effacent jamais.

---

## 2. Renderer, scène, caméra — l'atelier physique

Trois objets three.js de base, posés une fois au démarrage : `renderer` (la machine qui dessine à l'écran), `scene` (le plateau où sont posés les objets 3D), `camera` (l'œil qui regarde le plateau). Rien de spécifique à Codex ici — c'est le socle standard de tout projet three.js.

## 3. Post-process — le filtre appliqué après coup

```js
const composer = new EffectComposer(renderer, _composerRT);
composer.addPass(new RenderPass(scene, camera));
const distortPass = new ShaderPass(BlackHoleDistortShader);
composer.addPass(distortPass);
composer.addPass(new OutputPass());
```

Le `composer` est une chaîne de filtres Instagram appliqués en série à l'image déjà rendue : d'abord le rendu normal de la scène (`RenderPass`), puis un filtre de distorsion "trou noir" (`distortPass` — inactif tant que sa force `uStrength` est à 0, utilisé pendant la transition vers Oblivion), puis une passe finale qui remet les couleurs au bon format d'affichage (`OutputPass`).

## 4. Init des postes de travail — qui fabrique quoi

```js
await new Promise(requestAnimationFrame);   // laisse le navigateur peindre le splash d'abord
initBackground(scene, camera);
const bookRef = await initBook(scene, renderer);
initDrag(renderer, camera, bookRef, ...);
appInitDone = true;
maybeReady();
```

Ordre volontaire et expliqué dans le commentaire : le `await new Promise(requestAnimationFrame)` force le navigateur à afficher au moins une image AVANT de lancer le travail lourd (texture 4K, construction du livre) — sinon ce travail, surtout synchrone, démarre sur la MÊME image que le splash et peut geler son affichage. Ensuite, chaque poste est initialisé dans l'ordre : le décor (`initBackground`), puis le livre lui-même (`initBook`, dont on récupère une référence `bookRef` réutilisée partout ensuite), puis le système de glisser-déposer pour tourner les pages (`initDrag`).

## 5. Transition vers Oblivion — le passage secret

```js
const oblivionTransition = initOblivionTransition({ scene, camera, bookRef, renderer, ... });
```

Un poste de travail à part, câblé sur les mêmes objets (`scene`, `camera`, `bookRef`) plus le `distortPass` du post-process (poste 3) — c'est lui qui va faire monter `uStrength` du filtre trou noir à zéro quand on quitte Codex pour aller vers Oblivion. Son fonctionnement interne appartient à son propre fichier (`book/oblivion-transition.js`), pas traité ici.

## 6. Hotspots — les zones cliquables sur les pages du livre

Deux listes de zones cliquables fusionnées en une seule (`HOTSPOTS`), chacune définie par une page du livre et une zone rectangulaire en coordonnées UV (0 à 1, comme un pourcentage de la largeur/hauteur de l'image de la page) :

```js
{ spread: 12, side: 'left', uv: { uMin: 0.86, uMax: 1.00, vMin: 0.42, vMax: 0.58 }, action: openOblivionMenu }
```

`hotspotAt(e)` traduit un clic souris en rayon 3D (`Raycaster`, la même technique de "lancer de rayon" qu'un jeu vidéo pour savoir sur quoi on a cliqué en 3D), regarde où ce rayon touche la page ouverte, convertit le point d'impact en coordonnées UV, et cherche si une zone de `HOTSPOTS` correspond à cette page ET contient ce point. Si oui, `spot.action()` s'exécute (ouvrir le menu Oblivion, ou sauter à une page du sommaire).

**Historique** : selon le commentaire du fichier, les hotspots "téléchargement" (page 19) et "portfolios" (page 1) ont été retirés le 2026-09-13 en même temps que les pages qui les portaient — seul le hotspot Oblivion (pages 24-25) existe encore sur les nouvelles pages.

## 7. Overlays, menus, navigation, export PDF, debug — le reste de l'atelier

Le reste du fichier suit tous le même schéma simple **clic → petite action directe** (afficher/masquer une classe CSS, appeler une fonction globale exposée par `book.js` via `window._xxx`) :

- **Overlays/menus** : ferme au clic sur la croix, en dehors du cadre, ou sur "annuler"
- **Navigation pages** : `next-page`/`prev-page` appellent `window.flipForward`/`window.flipBack` (définies dans `book.js`, pas ici — `main.js` ne fait qu'appeler)
- **Export PDF** (`generateBut2Pdf`) : charge la librairie `jsPDF` depuis un CDN à la demande (pas au chargement de la page, pour ne pas alourdir le poids initial), puis assemble chaque paire de pages du livre en une image, page PDF par page PDF. `pdfBusy` empêche de relancer une génération pendant qu'une autre tourne.
- **Mode négatif du décor** (`_setInvertEffect`) : **désactivé** actuellement (`INVERT_EFFECT_ENABLED = false`) — le code reste présent et fonctionnel, juste coupé à la source.
- **Panneaux debug** : masqués par défaut, bascule avec la touche `$`.

## 8. OrbitControls et Mode Focus — les deux façons d'utiliser la caméra en debug

`orbit` (OrbitControls, une librairie three.js standard) permet de tourner librement autour de la scène — désactivé par défaut (`orbit.enabled = false`), activé par le bouton "🔭 Orbite" qui bascule aussi la visibilité du livre (pour ne pas gêner l'inspection du décor).

`setFocus(lock)` fait l'inverse conceptuellement : au lieu de laisser libre, elle VERROUILLE la caméra face à la double page ouverte. `fitCameraToSpread()` calcule la boîte englobante des deux pages visibles et recule la caméra juste assez pour qu'elles remplissent l'écran (trigonométrie : distance = taille/2 ÷ tan(angle de vue/2)). Se déclenche automatiquement 2,1s après l'ouverture du livre.

## 9. Clavier, resize, boucle — la mécanique de fond

- **Flèches directionnelles** : déplacent la caméra manuellement, seulement si le livre est ouvert et qu'on n'est ni en focus ni en orbite
- **Resize** : recalcule la taille du renderer, du composer, et le ratio d'aspect du shader de distorsion à chaque redimensionnement de fenêtre
- **`animate()`** : la boucle infinie classique three.js — se rappelle elle-même à chaque image (`requestAnimationFrame`), met à jour l'orbite si active, le livre, le décor, puis demande au `composer` de dessiner l'image finale (au lieu du `renderer` directement, puisque le filtre trou noir doit s'appliquer après coup)

---

## Historique des décisions

Ce que le fichier documente déjà lui-même sur sa propre évolution, dans ses commentaires :

- **2026-09-13** — la texture procédurale Note Climber sur la porte du splash a été retirée : bug de composition jamais résolu. La porte affiche désormais l'illustration statique du PNG de l'arche à la place.
- **2026-09-13** — les hotspots "téléchargement" (page 19) et "portfolios" (page 1) retirés en même temps que les pages qui les portaient. `#download-menu`/`#but-menu` restent dans le HTML (fermeture + génération PDF BUT2 intactes) mais ne sont plus atteignables sans nouveau déclencheur.
- **Animation d'ouverture de porte** — l'ancienne version faisait grandir le trou (`clip-path`) de façon animée à chaque frame, ce qui causait du lag (le navigateur re-rastérise l'image à chaque changement de `clip-path`). Version actuelle : le trou est découpé UNE FOIS à sa taille finale, fixe — seule l'opacité de la texture de la porte s'anime.
- **Zoom de sortie du splash** — le facteur de zoom est à ×10, avec un commentaire indiquant que ×14 n'est plus nécessaire : dans une version antérieure, l'arche et le fond devaient probablement s'effacer en même temps que zoomer (d'où un zoom plus fort pour masquer la coupure), alors que maintenant seul le `scale` fait sortir les éléments du cadre.
- **Mode négatif du décor** — implémenté et fonctionnel, mais désactivé par défaut (`INVERT_EFFECT_ENABLED = false`) : décision de garder le code plutôt que le supprimer, au cas où il serait réactivé plus tard.

*Cette section est destinée à s'enrichir à chaque session qui touche `main.js` — contrairement au corps explicatif ci-dessus (qui reste calibré avec Touvie en session), ce journal peut être complété plus librement au fil des changements, façon `Flux.md`.*
