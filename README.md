# Codex — Portfolio MLP BUT 2 (livre 3D interactif)

Portfolio web sous forme de grimoire 3D que l'on ouvre et feuillette.
Three.js + GSAP, sans build : tout se charge via CDN (importmap).
Version actuelle : **Beta 1.0** — publication prévue sur GitHub Pages.

## Arborescence

```text
Codex/
├── index.html            ← PAGE PRINCIPALE : scène, caméra, splash, focus,
│                            hotspots de téléchargement, toggle debug ($)
├── README.md             ← ce fichier
├── Flux.md               ← comportement du code (qui appelle qui)
│
├── book/
│   ├── book.js           ← le livre 3D : couverture/dos/reliure procéduraux (SVG → canvas),
│   │                        dorures, feuilles WebGL, animation de flip, PAGE_TEXTURES
│   ├── drag.js           ← rotation du livre au cliquer-glisser (souris + tactile),
│   │                        zoom molette (désactivés en mode focus)
│   ├── style.css         ← styles UI du livre (overlay-controls, debug-panel, lightbox)
│   ├── images/           ← pages du livre : 0.png à 19.png (4096×6144)
│   │                        1 feuille = 2 pages (recto/verso), voir PAGE_TEXTURES
│   │                        8-9 = trou noir cliquable (portail Oblivion), 19 = affiche
│   └── downloads/        ← fichiers servis par les boutons de téléchargement :
│                            PINARDAUD_Portfolio_BUT1.pdf (page 1)
│                            Attention.png / .pdf / .idml / .indd (page 19)
│
├── background/
│   ├── background.js     ← décor parallaxe : ~20 calques PNG étagés en Z (LAYERS),
│   │                        dérive des nuages, sway des arbres (shader), effet
│   │                        d'inversion des couleurs, panel debug des calques
│   ├── style.css         ← styles des panels debug background + mode-btn
│   └── images/           ← calques du décor (Circle, Clouds, Mountains, Ruins,
│                            Floor, Rocks, Trees...)
│
├── Pages/                ← exports de travail (non utilisés par le site)
├── Archives/             ← anciennes versions des prototypes
├── scene.html            ← ancien prototype décor seul (non utilisé)
├── book-3d-test.html     ← ancien prototype livre seul (non utilisé)
└── *.bak / *.bak2        ← backups créés avant chaque session de modification
```

## Points d'attention

- **Ajout d'une page** : déposer le PNG dans `book/images/` puis ajouter l'entrée
  dans `PAGE_TEXTURES` (book.js). 1 entrée = 1 feuille = [recto, verso].
  `null` = placeholder coloré.
- **Ajout d'une zone cliquable** : ajouter une entrée dans `HOTSPOTS` (index.html)
  avec le n° de spread, le rectangle UV et l'action.
- **Panels de debug** : masqués par défaut, touche `$` pour les afficher.
- **Poids GPU** : les 21 pages en 4096×6144 ≈ 2,7 Go de VRAM décompressée.
  À réduire en 2048×3072 avant la version finale (Mac à mémoire partagée).
- Compatibilité : Safari ≥ 16.4 requis (importmap + top-level await).
