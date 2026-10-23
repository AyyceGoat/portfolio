# Portfolio — Ahouet Yao Yann Christ Emmanuel

Portfolio de développeur d'applications full-stack basé à Abidjan, en Côte
d'Ivoire. Page unique en React et Vite, mise en scène comme un plan-séquence
spatial piloté par le défilement.

**Le site :** [christ-ahouet.netlify.app](https://christ-ahouet.netlify.app)
**Me contacter :** [github.com/AyyceGoat](https://github.com/AyyceGoat)

---

## Le parcours

Un astronaute marche sur un chemin de lumière vers une planète. Le
défilement pilote tout : quand on descend, il avance et la caméra avance
avec lui ; les contenus arrivent du fond de la scène, un à un, puis passent
derrière nous. Quand on remonte, tout recule exactement en sens inverse.

1. **Ouverture** — le nom, en très grand, et le titre. Au premier geste,
   les lettres se détachent et volent vers l'objectif.
2. **Profil** — portrait, présentation, formation et recherche.
3. **Projets** — chaque réalisation arrive en profondeur, sa capture
   pivotant vers le visiteur. Le projet sous confidentialité est présenté
   par un schéma de ses couches, sans nom de client ni donnée.
4. **Arrivée** — l'éclairage a tourné pendant le voyage : planète éclairée
   de face, puis éclipse, puis lever de soleil sur le limbe. La caméra
   plonge dans l'atmosphère.
5. **L'atelier** — en orbite, face au lever de soleil, le développeur à son
   poste ; ses compétences flottent autour de lui, reliées à l'ordinateur.
6. **Contact** — téléchargement du CV, e-mail (rédaction dans Gmail),
   GitHub et LinkedIn.

## Ajouter un projet

Un seul fichier : [`src/data/projects.js`](src/data/projects.js). Copier un
bloc, le compléter, déposer les deux captures (1400 et 700 px de large, WebP,
format 16:10) dans `public/captures/`. La scène, la navigation, la jauge de
progression et le compteur de projets s'adaptent seuls.

Les textes s'écrivent avec des apostrophes droites : l'apostrophe
typographique et les espaces insécables de la typographie française sont
posées à l'affichage ([`src/lib/typo.js`](src/lib/typo.js)).

Le reste du contenu (présentation, compétences, liens, CV) est dans
[`src/data/profil.js`](src/data/profil.js). Le lien LinkedIn n'est affiché
que si son adresse y est renseignée.

## Démarrer

```bash
npm install     # React, Vite, GSAP, Lenis
npm run dev     # serveur de développement
npm run build   # build client, rendu serveur, injection dans dist/
npm run preview # sert le résultat du build
```

Node 20.11 ou plus récent.

## Technique

**Une chronologie, un défilement.** Toute la mise en scène est une seule
chronologie GSAP ([`src/scene/parcours.js`](src/scene/parcours.js)),
attachée au défilement par ScrollTrigger et amortie par Lenis. Le
défilement ne fait que déplacer la tête de lecture : marche, caméra,
soleil et contenus en découlent, ce qui rend le retour en arrière exact.
Une seule boucle d'images : Lenis, puis la chronologie, puis le monde.

**Le monde en WebGL brut, sans bibliothèque**
([`src/scene/monde.js`](src/scene/monde.js), [`glsl.js`](src/scene/glsl.js)).
Trois appels de dessin par image : un triangle plein écran (ciel, planète
lancée en rayons avec atmosphère, soleil, reflets d'objectif, grain), une
bande pour la lueur du chemin, un nuage de points (étoiles sur deux plans
de parallaxe, poussière en suspension, grains du chemin). La surface de la
planète et la Voie lactée sont calculées une seule fois au démarrage dans
deux textures. L'initialisation est découpée en étapes, une par image, pour
ne jamais bloquer le fil principal. Toutes les positions sont relatives à
la caméra : aucune perte de précision au fil du voyage.

**Qualité adaptative.** Trois niveaux de détail choisis selon l'appareil
(processeur, mémoire, écran tactile). En cours de route, si la cadence
faiblit, la résolution de rendu baisse par paliers, puis le nombre de
grains. Sans processeur graphique (rendu logiciel), le WebGL n'est pas
lancé : une affiche rendue par le même moteur prend le relais et joue le
voyage par un simple zoom.

**Premier affichage immédiat.** La page est rendue au build et injectée
dans le HTML ; l'affiche de la scène d'ouverture est préchargée et peinte
avant tout JavaScript. GSAP, Lenis et la scène sont chargés ensuite, à
part. Les lettres du nom entrent par une transformation seule : elles sont
visibles dès la première image.

**On n'anime que `transform` et `opacity`**, y compris la marche de
l'astronaute (attributs `transform` de ses membres) et le flottement des
compétences, suspendu hors de l'écran.

**Mouvement réduit, ou sans JavaScript** : la page redevient une suite de
sections ordinaires devant un décor immobile. Le basculement est décidé en
CSS (`scripting` et `prefers-reduced-motion`), sans aucun saut de mise en
page au chargement.

## Mesures

Lighthouse 13.5, build de production servi compressé avec les en-têtes de
`netlify.toml` :

| | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Mobile | 97 | 100 | 100 | 100 |
| Ordinateur | 97 | 100 | 100 | 100 |

Mobile : premier affichage 1,6 s, plus grand affichage 2,2 s, blocage
total 110 ms, décalage cumulé 0. Ordinateur : 0,9 s, 1,1 s, 0 ms, 0.

Coût du fil principal par image pendant un défilement continu, chemin
WebGL complet : médiane inférieure à 1 ms, 95ᵉ centile 5 ms ; processeur
bridé quatre fois : 95ᵉ centile 13 ms. Le budget d'une image à 60 i/s est
de 16,7 ms.

## Accessibilité

- Navigation au clavier complète : un élément qui reçoit le focus amène sa
  scène à l'écran ; les ancres de la navigation mènent au bon instant du
  parcours.
- Lien d'évitement, focus toujours visible, titres découpés en lettres qui
  gardent leur texte entier pour les lecteurs d'écran.
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
  captures/    captures des projets
  fonts/       Archivo et IBM Plex Mono (WOFF2)
src/
  data/        projets, profil, compétences, logos — le contenu
  scene/       chronologie, monde WebGL, shaders, astronaute
  components/  sections de la page et personnage de l'atelier
  lib/         typographie française
  hooks/       téléchargement du CV
  entry-server rendu au build
scripts/       injection du rendu dans dist/index.html
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait et les captures d'écran des projets, qui restent la
propriété de leur auteur.

Tous les visuels de la scène (planète, ciel, astronaute, personnage de
l'atelier) sont créés pour ce site, en code. Les logos des compétences
proviennent de [Simple Icons](https://simpleicons.org) (CC0 1.0) ; les
marques restent la propriété de leurs détenteurs. Les fontes Archivo et
IBM Plex Mono sont distribuées sous
[SIL Open Font License 1.1](https://scripts.sil.org/OFL).
