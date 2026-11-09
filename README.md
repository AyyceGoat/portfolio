# Portfolio — Ahouet Yao Yann Christ Emmanuel

Portfolio de développeur d'applications full-stack basé à Abidjan, en Côte
d'Ivoire. Page unique en React et Vite : un voyage dans l'espace, étape
par étape.

**Le site :** [christ-ahouet.netlify.app](https://christ-ahouet.netlify.app)
**Me contacter :** [github.com/AyyceGoat](https://github.com/AyyceGoat)

---

## Le parcours

Un geste, une étape : un cran de molette, un glissement sur le pavé
tactile, un balayage au doigt ou une flèche du clavier. Le geste déclenche
la marche : quatre pas, un peu plus de deux secondes ; la caméra suit
l'astronaute, la passerelle avance exactement avec ses pas (le pied
d'appui reste immobile sur le plancher tant qu'il le touche), la planète
grandit ; il s'arrête à l'étape suivante, pieds au sol. Le geste inverse
le ramène, en marchant à reculons. Un geste fait pendant la marche est
mémorisé et joué ensuite ; un geste inverse fait demi-tour aussitôt. Au
repos, l'astronaute se tient debout, immobile et d'aplomb.

1. **Le titre** — l'astronaute, vu de dos, sur une passerelle suspendue
   dans l'espace, face à une planète ; au-dessus de lui, « Portfolio »
   entre deux filets, puis « Christ Emmanuel » en très grand, dans un
   dégradé lumineux, qu'un trait de lumière révèle en balayant l'écran ;
   puis le métier et « Software Engineer ». Deux chevrons invitent à
   poursuivre. Le décor vit : étoiles qui scintillent et défilent sur
   plusieurs plans, nébuleuses qui glissent lentement, astéroïdes qui
   dérivent et tournent, météores et leur traînée, poussière qui passe au
   premier plan pendant la marche, reflets qui frémissent sur la
   passerelle.
2. **La présentation** — un grand panneau de verre sombre au liseré
   bleu, à gauche : la photo dans un anneau de lumière, le nom en dégradé,
   la présentation (mots-clés en bleu clair) et le parcours.
3. **Mes réalisations** — le titre, seul dans le ciel.
4. **Les projets** — dans le même verre, à gauche ou à droite en
   alternance : le panneau glisse et se pose en profondeur, son liseré se
   dessine, son image se dévoile, son titre arrive mot à mot, puis le
   texte, et les mots-clés s'illuminent. Grande image, nom, une phrase,
   technologies, liens. Un clic ouvre la présentation détaillée, sans
   quitter le voyage.
5. **Au bout du chemin** — sur la plateforme, le développeur à son poste
   de travail, la planète derrière lui ; ses compétences l'entourent,
   logos dans leurs couleurs officielles, reliés au bureau par des filets.
6. **Contact** — CV, e-mail (rédaction dans Gmail), GitHub et LinkedIn.

Le menu (Profil, Projets, Compétences, Contact), centré dans une pilule
de verre, et le CV à part, apparaissent dès le premier geste et mènent
directement à chaque étape.

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
npm install     # React, Vite, GSAP
npm run dev     # serveur de développement
npm run build   # build client, rendu serveur, injection dans dist/
npm run preview # sert le résultat du build
npm run apercu  # version hébergeable dans un sous-dossier (apercu/site)
```

Node 20.11 ou plus récent.

## Technique

**Des images nettes.** L'image de référence du décor et la marche de
l'astronaute ont été agrandies quatre fois par Real-ESRGAN
([`scripts/agrandir.py`](scripts/agrandir.py) : le réseau, réécrit pour
onnxruntime, sans PyTorch). Aucune image n'est affichée au-delà de sa
définition : les textures existent en deux tailles, la plus légère
d'abord, la plus fine ensuite, sur les écrans qui en profitent.

**L'image de référence, découpée en plans.** Le ciel, la planète et les
astéroïdes viennent de la référence agrandie
([`sources/reference-x4.webp`](sources/reference-x4.webp)), découpée par
[`scripts/plans.py`](scripts/plans.py) : un ciel vide (4096 × 2048, sans
planète, sans astéroïdes, sans passerelle ni astronaute), la planète
détourée avec son atmosphère (2048 × 2048) et un atlas d'astéroïdes,
chacun détouré à pleine définition. Ils sont posés sur une sphère à
l'infini, dans [`src/scene/monde.js`](src/scene/monde.js).

**L'astronaute, tiré d'une vidéo.** Des deux vidéos fournies
([`sources/videos/`](sources/videos/)), la seconde est la plus nette et
sa marche la plus régulière. [`scripts/marche.py`](scripts/marche.py) en
extrait un cycle de deux pas (36 images, 1,5 s) qui se referme sur
lui-même, l'agrandit ×4, le détoure (BiRefNet), retire le reflet de la
vidéo sous les semelles (l'axe de symétrie entre l'astronaute et son
reflet donne la ligne du sol), nettoie chaque image (bord resserré et
décontaminé, fibres et points clairs effacés), redresse chaque image
d'aplomb (le casque exactement au-dessus du bassin) et accorde les
couleurs à la scène. La vidéo ne le montre jamais immobile : la pose
d'attente est composée à partir de l'image où ses jambes se croisent, la
jambe d'appui reportée en miroir de l'autre côté ; il en part et s'y
arrête en fondu, sur une image et demie. Les images légères sont chargées
d'abord, les fines ensuite. Son reflet sur le plancher et son ombre douce
le posent sur la passerelle.

**Le pied verrouillé.** Dans la vidéo, le sol défile plus vite que les
pieds : la vidéo glisse. Le script suit donc, image par image, la ligne
où le pied d'appui touche son reflet ; sa descente vers la caméra, en
fraction de la hauteur de la figure, est l'avance du décor
(`src/scene/marche.js`). La mise en scène la convertit en mètres selon sa
caméra et la projette : entre deux images de la marche, l'astronaute
descend du même nombre de pixels que le plancher. Vérifié image par image
sur des transitions ralenties, à l'aller et au retour : le pied d'appui
reste sur le même point du plancher à moins d'un demi-pixel près.

**La passerelle est calculée.** Une image ne permet pas d'avancer : elle
est reconstruite en 3D le long de son tracé (plancher de métal
réfléchissant, joints, tranches, lisses, montants, vitres, bandeaux
lumineux, plateforme d'arrivée).

**WebGL brut, sans bibliothèque** ([`monde.js`](src/scene/monde.js),
[`glsl.js`](src/scene/glsl.js)) : un ciel plein écran (nébuleuses qui
ondulent, étoiles qui scintillent, planète qui grandit à l'approche,
météores rares), la passerelle en un seul maillage, les étoiles et la
poussière proches en parallaxe, les astéroïdes. Les textures sont
chargées une fois ; l'initialisation est découpée en étapes, une par
image.

**Les étapes** ([`src/scene/voyage.js`](src/scene/voyage.js)) : la page
ne défile plus que d'elle-même. Un geste accepté lance quatre pas (deux
cycles de la marche, 2,3 s ; 2,6 s pour l'arrivée), avec l'allure d'une
marche (départ, pas égal, arrêt) ; une chronologie GSAP attachée à ScrollTrigger
fait avancer la caméra et entrer les étapes. Molette et pavé tactile sont
lus comme des intentions, pas comme un défilement : un nouveau geste est
reconnu après un silence, quand le sens change, ou quand l'amplitude
remonte nettement pendant l'élan du précédent ; l'élan lui-même ne compte
pas. Pendant une transition, un geste dans le même sens est mémorisé (un
seul) ; dans l'autre sens, il ramène aussitôt à l'étape de départ. Au bout du chemin,
la caméra glisse jusqu'à la plateforme et se tourne vers la planète, puis
deux plans accompagnent le poste de travail et le contact.

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
| Mobile (3 passages) | 98 à 100 | 100 | 100 | 100 |
| Ordinateur | 100 | 100 | 100 | 100 |

Mobile : premier affichage 0,8 à 1,2 s, plus grand affichage 1,4 à 2,4 s,
blocage total 10 ms, décalage cumulé 0.

Les étapes sont vérifiées par un parcours automatisé : à la molette (un
cran, puis six crans rapides), au pavé tactile (glissement avec élan), au
clavier (flèches, pages) et au doigt, à l'aller comme au retour, une étape
par geste, arrêt de l'astronaute pieds au sol ; gestes successifs sans
bouger le curseur, geste pendant la marche (mémorisé), demi-tour pendant
la marche, remontée aussitôt après une descente, nouveau geste pendant
l'élan du précédent, élan de 2,5 s compté comme un seul geste ; liens du
menu ; fiche de projet qui suspend le voyage.

## Accessibilité

- Navigation complète au clavier : flèches, Page précédente / suivante,
  Espace, Début et Fin passent d'étape en étape ; un élément qui reçoit le
  focus amène son étape à l'écran ; la fiche d'un projet est une fenêtre modale (Échap la ferme).
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
               marche de l'astronaute (marche/l et marche/s), affiches du
               voyage (WebP)
  atelier/     calques du personnage (WebP), produits par le script
  captures/    captures des projets
  fonts/       Archivo, Archivo étendue et IBM Plex Mono (WOFF2)
sources/       image de référence (et sa version agrandie), vidéos de
               l'astronaute, masques des astéroïdes, illustration du
               personnage
src/
  data/        projets, profil, compétences, logos — le contenu
  scene/       défilement et mise en scène, monde WebGL, shaders
  components/  sections de la page, personnage du poste de travail
  lib/         typographie française, chemins des médias
  hooks/       téléchargement du CV
scripts/       rendu au build, aperçu, agrandissement des images,
               découpage de la référence, marche, personnage
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait, l'illustration du personnage, les vidéos de
l'astronaute, l'image de référence du décor et les captures d'écran des
projets, qui restent la propriété de leur auteur.

La passerelle et les effets du décor sont créés en code pour ce site. Les logos des compétences proviennent de
[Simple Icons](https://simpleicons.org) (CC0 1.0) ; les marques restent la
propriété de leurs détenteurs. Les fontes Archivo et IBM Plex Mono sont
distribuées sous [SIL Open Font License 1.1](https://scripts.sil.org/OFL).
