# Portfolio — Ahouet Yao Yann Christ Emmanuel

Portfolio de développeur d'applications full-stack basé à Abidjan, en Côte
d'Ivoire. Page unique en React et Vite, mise en scène comme un plan-séquence
spatial piloté par le défilement.

**Le site :** [christ-ahouet.netlify.app](https://christ-ahouet.netlify.app)
**Me contacter :** [github.com/AyyceGoat](https://github.com/AyyceGoat)

---

## Le parcours

Un astronaute marche sur un chemin de lumière vers une planète. Chaque
geste — un cran de molette, un glissement du doigt, une flèche du
clavier — mène au chapitre suivant par une transition animée : il
avance, la caméra avance avec lui, les contenus arrivent du fond de la
scène puis passent derrière nous. En sens inverse, tout recule exactement.

1. **Ouverture** — le nom en capitales étendues, gravé dans la lumière de
   la planète (lueur, reflet qui balaie le métal, profondeur qui suit la
   souris), le titre et « Software Engineer ». Bouton **Visite guidée**.
2. **Profil** — portrait en orbite, présentation, formation et recherche.
3. **Projets** — « Mes réalisations. », puis chaque projet sur un écran
   holographique incliné, projeté par un socle, avec ses lignes qui
   arrivent une à une. Le projet sous confidentialité est présenté par un
   schéma de ses couches, sans nom de client ni donnée.
4. **Arrivée** — l'éclairage a tourné pendant le voyage : planète éclairée
   de face, éclipse, puis lever de soleil sur le limbe ; le chemin aboutit
   à un point lumineux sur la planète. Plongée : traits de vitesse, plasma
   de rentrée, nuages qui défilent, éclair, onde de choc.
5. **L'atelier** — en orbite, le développeur à son bureau noir mat, sur
   une plateforme flottante. Il respire, bouge la tête, cligne des yeux,
   frappe au clavier ; la lumière de l'écran varie sur son visage. Ses
   compétences flottent autour de lui, reliées au bureau par des liaisons
   où circulent des impulsions.
6. **Contact** — le regard se lève vers les étoiles ; CV, e-mail (rédaction
   dans Gmail), GitHub et LinkedIn. « Revenir au départ » rembobine tout
   le voyage.

La **visite guidée** enchaîne tous les chapitres avec des bandeaux de
cinéma ; Échap, la molette, le doigt ou le bouton l'arrêtent à tout
moment.

## Ajouter un projet

Un seul fichier : [`src/data/projects.js`](src/data/projects.js). Copier un
bloc, le compléter, déposer les deux captures (1400 et 700 px de large, WebP,
format 16:10) dans `public/captures/` et écrire leurs chemins sans barre
initiale. La scène, la navigation, les chapitres, la jauge et les étiquettes
s'adaptent seuls.

Les textes s'écrivent avec des apostrophes droites : l'apostrophe
typographique et les espaces insécables de la typographie française sont
posées à l'affichage ([`src/lib/typo.js`](src/lib/typo.js)).

Le reste du contenu (présentation, compétences, liens, CV) est dans
[`src/data/profil.js`](src/data/profil.js). **LinkedIn** : renseigner
`linkedin` avec l'adresse du profil ; tant qu'il est vide, le lien ouvre la
recherche LinkedIn sur le nom.

## Démarrer

```bash
npm install     # React, Vite, GSAP, Lenis
npm run dev     # serveur de développement
npm run build   # build client, rendu serveur, injection dans dist/
npm run preview # sert le résultat du build
npm run apercu  # version hébergeable dans un sous-dossier (apercu/site)
```

Node 20.11 ou plus récent.

## Technique

**Une chronologie, des chapitres.** Toute la mise en scène est une seule
chronologie GSAP ([`src/scene/parcours.js`](src/scene/parcours.js)),
attachée au défilement par ScrollTrigger. La position de la page est
animée par Lenis, de chapitre en chapitre ; la chronologie suit, ce qui
rend le retour en arrière exact. Une seule boucle d'images : Lenis, puis
la chronologie, puis le monde.

**Le monde en WebGL brut, sans bibliothèque**
([`src/scene/monde.js`](src/scene/monde.js), [`glsl.js`](src/scene/glsl.js)).
Cinq appels de dessin par image : ciel et planète lancée en rayons (sol,
nuages et leurs ombres, villes, atmosphère bleue et crépusculaire, soleil,
reflets d'objectif, effets de plongée), voiles de nébuleuse en parallaxe,
halo et cœur du chemin, et un nuage de points (étoiles sur deux plans,
poussière, grains du chemin). Surface, nuages et Voie lactée sont calculés
une seule fois au démarrage ; l'initialisation est découpée en étapes, une
par image.

**Le personnage** est l'illustration fournie, préparée par
[`scripts/preparer-personnage.py`](scripts/preparer-personnage.py) : plateau
en bois et pieds d'origine retirés (le bureau noir mat est dessiné en SVG),
découpe haut / bas, liseré bleu et version éclairée par l'écran cuits dans
les images. L'animation superpose des copies de la même image (tête,
paupières, main), comme les professeurs de l'Échiquier : transformations
et opacité seulement, en pause hors de l'écran.

**Qualité adaptative.** Trois niveaux de détail selon l'appareil ; en
cours de route, si la cadence faiblit, la résolution baisse par paliers,
puis le nombre de grains. Sans processeur graphique, le WebGL n'est pas
lancé : une affiche rendue par le même moteur joue le voyage par un zoom.

**Premier affichage immédiat.** Page rendue au build, affiche de la scène
préchargée, hydratation React après la première image et par tranches,
GSAP, Lenis et la scène chargés ensuite, calques du personnage demandés
une fois la page chargée.

**On n'anime que `transform` et `opacity`.** Mouvement réduit ou absence
de JavaScript : la page redevient une suite de sections ordinaires.

## Mesures

Lighthouse 13.5, build de production servi compressé avec les en-têtes de
`netlify.toml` :

| | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Mobile (5 passages) | 94 à 96 | 100 | 100 | 100 |
| Ordinateur (3 passages) | 100 | 100 | 100 | 100 |

Mobile : premier affichage 1,5 s, plus grand affichage 2,4 s, blocage
total 130 à 210 ms, décalage cumulé 0.

Coût du fil principal par image pendant les transitions de chapitres :
orchestration seule (chronologie, Lenis, DOM), 95ᵉ centile 0,5 ms, et
2,6 ms processeur bridé quatre fois. Le budget d'une image à 60 i/s est de
16,7 ms.

## Accessibilité

- Navigation complète au clavier (flèches, Page suivante, Début, Fin,
  Échap) ; un élément qui reçoit le focus amène sa scène à l'écran.
- Lien d'évitement, focus visible, titres découpés en lettres qui gardent
  leur texte entier pour les lecteurs d'écran.
- Préférence de mouvement réduit respectée.

## Sécurité

- Site entièrement statique : aucune clé, aucun secret.
- Politique de sécurité stricte (`netlify.toml`), sans `unsafe-inline` ni
  `unsafe-eval`, vérifiée sur le site construit. Le build échoue si le
  rendu serveur contient un attribut `style`.
- Aucune ressource externe : polices et visuels sont servis par le site.
- L'adresse e-mail n'apparaît pas en clair dans les fichiers servis.

## Structure

```
public/
  scene/       affiches de la scène, rendues par le moteur WebGL (WebP)
  atelier/     calques du personnage (WebP), produits par le script
  captures/    captures des projets
  fonts/       Archivo, Archivo étendue et IBM Plex Mono (WOFF2)
sources/       illustration d'origine du personnage
src/
  data/        projets, profil, compétences, logos — le contenu
  scene/       chronologie, navigation, monde WebGL, shaders, astronaute
  components/  sections de la page, personnage de l'atelier
  lib/         typographie française, chemins des médias
  hooks/       téléchargement du CV
scripts/       rendu au build, aperçu, préparation du personnage
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait, l'illustration du personnage et les captures d'écran des
projets, qui restent la propriété de leur auteur.

Les visuels de la scène (planète, ciel, astronaute, bureau, plateforme)
sont créés pour ce site, en code ; le personnage de l'atelier est
l'illustration fournie par l'auteur. Les logos des compétences
proviennent de [Simple Icons](https://simpleicons.org) (CC0 1.0) ; les
marques restent la propriété de leurs détenteurs. Les fontes Archivo et
IBM Plex Mono sont distribuées sous
[SIL Open Font License 1.1](https://scripts.sil.org/OFL).
