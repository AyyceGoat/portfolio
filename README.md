# Portfolio — Ahouet Yao Yann Christ Emmanuel

Portfolio de développeur d'applications full-stack basé à Abidjan, en Côte
d'Ivoire. Page unique en React et Vite : un voyage dans l'espace, piloté
par le défilement.

**Le site :** [christ-ahouet.netlify.app](https://christ-ahouet.netlify.app)
**Me contacter :** [github.com/AyyceGoat](https://github.com/AyyceGoat)

---

## Le parcours

1. **Introduction** — un astronaute, vu de dos, se tient sur une passerelle
   suspendue dans l'espace, face à une planète. Le titre « Portfolio —
   Christ Emmanuel » et deux chevrons qui invitent à défiler. Le décor vit
   discrètement : étoiles qui scintillent, nébuleuses qui ondulent,
   astéroïdes qui dérivent, rares météores, reflets sur la passerelle.
2. **Le voyage** — le défilement pilote tout, en continu : l'astronaute
   marche, la caméra le suit, la passerelle défile sous ses pieds. Il
   s'arrête quand on s'arrête ; quand on remonte, tout repart en sens
   inverse. Le menu (Profil, Projets, Compétences, Contact, CV) apparaît
   dès le premier geste.
3. **Les projets** — pendant la marche, chaque projet arrive dans un
   panneau de verre sombre, depuis la gauche ou la droite en alternance :
   nom, aperçu, une phrase, technologies, lien. Un clic ouvre la
   présentation détaillée, sans quitter le voyage.
4. **L'arrivée** — au bout de la passerelle, sur la plateforme, la caméra
   s'élève et se tourne vers la planète. Puis la présentation : photo, nom,
   titre, présentation, parcours académique, domaines d'expertise et
   ambitions.
5. **Le poste de travail** — le développeur à son bureau, sur la
   plateforme, la planète derrière lui ; ses compétences l'entourent, logos
   dans leurs couleurs officielles, reliés au bureau par des filets.
6. **Contact** — CV, e-mail (rédaction dans Gmail), GitHub et LinkedIn.

## Ajouter un projet

Un seul fichier : [`src/data/projects.js`](src/data/projects.js). Copier un
bloc, le compléter, déposer les deux captures (1400 et 700 px de large, WebP,
format 16:10) dans `public/captures/` et écrire leurs chemins sans barre
initiale. La longueur du voyage et de la passerelle, l'ordre et le côté des
panneaux s'adaptent seuls au nombre de projets.

Les textes s'écrivent avec des apostrophes droites : l'apostrophe
typographique et les espaces insécables de la typographie française sont
posées à l'affichage ([`src/lib/typo.js`](src/lib/typo.js)).

Le reste du contenu (présentation, expertise, compétences, liens, CV) est
dans [`src/data/profil.js`](src/data/profil.js). **LinkedIn** : renseigner
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

**L'image de référence, découpée en plans.** Le ciel, la planète et les
astéroïdes viennent de l'image de référence
([`sources/reference.webp`](sources/reference.webp)), découpée par
[`scripts/asteroides.py`](scripts/asteroides.py) et
[`scripts/plans.py`](scripts/plans.py) : un ciel vide (sans planète, sans
astéroïdes, sans passerelle ni astronaute), la planète détourée avec son
atmosphère, et un atlas d'astéroïdes. Ils sont posés sur une sphère à
l'infini, dans [`src/scene/monde.js`](src/scene/monde.js).

**Ce qui doit bouger est calculé.** Une image ne permet pas d'avancer :
la passerelle est donc reconstruite en 3D le long de son tracé (plancher de
métal réfléchissant, joints, tranches, lisses, montants, vitres, bandeaux
lumineux, plateforme d'arrivée). L'astronaute est un modèle articulé : ses
pieds se posent sur le plancher et n'en bougent plus pendant l'appui ; les
genoux suivent (cinématique inverse) ; la foulée est liée à la distance
parcourue, donc rien ne glisse ni ne se déforme. Son reflet et son ombre
de contact le posent sur la passerelle.

**WebGL brut, sans bibliothèque** ([`monde.js`](src/scene/monde.js),
[`glsl.js`](src/scene/glsl.js)) : un ciel plein écran (nébuleuses qui
ondulent, étoiles qui scintillent, planète qui grandit à l'approche,
météores rares), la passerelle en un seul maillage, les étoiles proches en
parallaxe, les astéroïdes, l'astronaute. Les textures sont chargées une
fois ; l'initialisation est découpée en étapes, une par image.

**Le défilement** ([`src/scene/voyage.js`](src/scene/voyage.js)) : Lenis
adoucit le défilement, une chronologie GSAP attachée à ScrollTrigger fait
avancer l'astronaute et entrer les panneaux ; après le voyage, trois plans
de caméra accompagnent la présentation, le poste de travail et le contact.
Les liens du menu y mènent en douceur.

**Le personnage** du poste de travail est l'illustration fournie, préparée
par [`scripts/preparer-personnage.py`](scripts/preparer-personnage.py) ;
son animation superpose des copies de la même image (tête, paupières,
main), en transformations et opacité seulement, en pause hors de l'écran.

**Qualité adaptative.** Trois niveaux de détail selon l'appareil ; si la
cadence faiblit, la résolution baisse. Sans processeur graphique, le WebGL
n'est pas lancé : une affiche rendue par le même moteur reste en place.

**Mouvement réduit ou absence de JavaScript :** la page redevient une suite
de sections ordinaires devant l'affiche du voyage ; les projets sont
présentés en cartes.

## Mesures

Lighthouse 13.5, build de production servi compressé avec les en-têtes de
`netlify.toml` :

| | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Mobile (3 passages) | 98 à 99 | 100 | 100 | 100 |
| Ordinateur (2 passages) | 100 | 100 | 100 | 100 |

Mobile : premier affichage 1,2 s, plus grand affichage 2,2 à 2,3 s,
blocage total 0 ms, décalage cumulé 0.

Le défilement est vérifié par un parcours automatisé : mêmes états à
l'aller et au retour, un seul panneau lisible à la fois, liens du menu
qui partent dès le clic et mènent à la bonne étape, fiche de projet qui
suspend le voyage puis le rend.

## Accessibilité

- Navigation complète au clavier ; un panneau qui reçoit le focus vient à
  l'écran ; la fiche d'un projet est une fenêtre modale (Échap la ferme).
- Lien d'évitement, focus visible, textes sur fonds sombres pour rester
  lisibles quelle que soit la lumière du décor.
- Préférence de mouvement réduit respectée.

## Sécurité

- Site entièrement statique : aucune clé, aucun secret.
- Politique de sécurité stricte (`netlify.toml`), sans `unsafe-inline` ni
  `unsafe-eval`. Le build échoue si le rendu serveur contient un attribut
  `style`.
- Aucune ressource externe : polices et visuels sont servis par le site.
- L'adresse e-mail n'apparaît pas en clair dans les fichiers servis.

## Structure

```
public/
  espace/      ciel, planète, astéroïdes (plans de l'image de référence),
               affiches du voyage (WebP)
  atelier/     calques du personnage (WebP), produits par le script
  captures/    captures des projets
  fonts/       Archivo, Archivo étendue et IBM Plex Mono (WOFF2)
sources/       image de référence, masques des astéroïdes, illustration
               du personnage
src/
  data/        projets, profil, compétences, logos — le contenu
  scene/       défilement et mise en scène, monde WebGL, shaders
  components/  sections de la page, personnage du poste de travail
  lib/         typographie française, chemins des médias
  hooks/       téléchargement du CV
scripts/       rendu au build, aperçu, découpage de l'image, personnage
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait, l'illustration du personnage, l'image de référence du
décor et les captures d'écran des projets, qui restent la propriété de
leur auteur.

La passerelle, l'astronaute et les effets du décor sont créés en code pour
ce site. Les logos des compétences proviennent de
[Simple Icons](https://simpleicons.org) (CC0 1.0) ; les marques restent la
propriété de leurs détenteurs. Les fontes Archivo et IBM Plex Mono sont
distribuées sous [SIL Open Font License 1.1](https://scripts.sil.org/OFL).
