# Portfolio — Ahouet Yann Christ Emmanuel

Portfolio personnel d'un développeur web basé à Abidjan, en Côte d'Ivoire.
Page unique, React et Vite, direction artistique « espace profond ».

**Le site :** [christ-ahouet.netlify.app](https://christ-ahouet.netlify.app)
**Me contacter :** [github.com/AyyceGoat](https://github.com/AyyceGoat)

---

## Ce qu'on y trouve

Une page qui se parcourt d'un seul défilement : présentation, quatre
réalisations, compétences, une section « Signal » depuis Abidjan, contact
et CV téléchargeable.

Le quatrième projet est une mission en entreprise sous confidentialité.
Ni dépôt, ni lien, ni capture : il est présenté par un schéma
d'architecture dessiné en SVG, qui ne montre que la forme du système.
Aucun nom de client ni donnée d'exploitation n'apparaît dans ce dépôt.

## Démarrer

```bash
npm install     # React et Vite, rien d'autre
npm run dev     # serveur de développement
npm run build   # build client, rendu serveur, injection dans dist/
npm run preview # sert le résultat du build
```

Node 20.11 ou plus récent.

## Parti pris

**Le ciel.** Six photographies du télescope spatial James Webb, une par
section : les Falaises cosmiques au hero, les Piliers de la Création au
profil, le premier champ profond aux projets, la nébuleuse de la Tarentule
aux compétences, NGC 346 à Signal, Rho Ophiuchi au contact. On descend
d'une région de l'espace à une autre, en fondu.

L'image du hero est servie par le CSS dès le premier octet ; les autres ne
sont téléchargées qu'à l'approche de leur section, puis **décodées avant
d'apparaître** : jamais de fondu sur une image à moitié peinte. Chaque
photo existe en trois cadrages (paysage 1920 et 1280, portrait pour les
téléphones), recadrés à la main sur le sujet.

La profondeur vient de trois mouvements, tous confiés au compositeur : une
dérive très lente de la photo affichée, la parallaxe du plan
photographique au curseur et au défilement, et par-dessus le champ
d'étoiles en WebGL brut, sans bibliothèque. Plus proche, il bouge
davantage, scintille, et ses étoiles les plus brillantes portent les
aigrettes à six branches caractéristiques des miroirs de Webb. Un voile
de lecture, fondu sur ses bords, assombrit la photo derrière le texte de
chaque section.

**La planète.** Une géante gazeuse calculée en temps réel par un seul
fragment shader : sphère et plan d'anneaux lancés en rayons. Bandes et
tempête forment une texture calculée une fois au démarrage, enroulée sur
la sphère et tournée lentement autour de l'axe des anneaux. Elle est
éclairée par une étoile hors champ : terminateur adouci par l'atmosphère,
liseré bleu lumineux sur le limbe éclairé. Les anneaux portent leur ombre
sur la planète, la planète la sienne sur les anneaux, la moitié avant
passe devant le globe et l'arrière derrière ; leurs divisions s'éteignent
quand elles deviennent plus fines que le pixel, ce qui supprime le moiré.

L'image de repli, affichée avant la première image calculée et seule en
version allégée, est rendue hors ligne **par le même shader**.

Une nuance de moteur mérite d'être notée : une toile WebGL que l'on ne
peint qu'au besoin doit conserver son tampon de dessin. Sans cela, WebKit
le vide après chaque composition et la page immobile se retrouve devant un
ciel noir, là où Chromium garde la dernière image. Vérifié sur les deux.

**Le CV se télécharge au premier clic.** Un lien `download` ordinaire ne
montre rien tant que le serveur n'a pas répondu, et chaque clic de plus
lance un téléchargement de plus. Ici, le PDF est rapatrié en mémoire dès
que l'on s'en approche (carte en vue, survol, focus, doigt posé) : au
clic, l'enregistrement part dans le geste même, en quelques dizaines de
millisecondes. Le bouton passe à « CV téléchargé ✓ », et les clics
suivants sont ignorés pendant quelques secondes, sur la carte comme dans
la navigation. Si le fichier n'est pas encore arrivé, le bouton affiche
« Préparation… » et l'attend. Sans JavaScript, le lien reste un lien de
téléchargement, et le serveur l'envoie de toute façon en pièce jointe.

Le PDF tient en deux pages A4 à une taille de lecture normale (corps
9,75 pt). Ses polices sont des instances statiques d'Archivo, embarquées
en TrueType plutôt que glyphe par glyphe : le fichier passe de 436 à
78 Ko et reste lisible par les logiciels de tri de candidatures.

**Signal.** Ce que la position d'Abidjan change concrètement pour une
équipe. Abidjan vit à UTC+0 toute l'année : les coordonnées réelles,
l'heure locale, et pour Paris, Londres et Montréal l'heure qu'il y est et
le nombre d'heures de travail réellement communes, calculées à partir du
décalage du jour relevé par `Intl` — pas d'une table figée.

**Rendu au build.** La page est rendue côté serveur au moment du build et
injectée dans le HTML : elle est lisible avant tout JavaScript, et même
sans. Les états d'apparition ne s'appliquent qu'une fois le script chargé,
après avoir marqué comme visible ce qui est déjà à l'écran : jamais d'écran
vide, jamais de clignotement.

**Version allégée automatique.** Mouvement réduit demandé, absence de
WebGL, mode économie de données ou appareil très modeste : les
photographies restent, immobiles, la planète est son image fixe, et ni le
champ d'étoiles ni le shader de la planète ne sont téléchargés. En cours de route, si l'appareil ne tient pas la cadence, le
moteur dessine moins d'étoiles, puis rend la main au ciel fixe.

**Économie d'énergie.** Le champ d'étoiles suit l'activité : 60 images par
seconde pendant un défilement ou un mouvement de souris, 30 au repos, moins
encore ensuite ; sur téléphone, il s'arrête tout à fait quand la page est
immobile. La planète tourne à 30 images par seconde sur poste de travail,
12 sur téléphone — à cette vitesse de rotation, moins d'un tiers de pixel
par image — et seulement quand le hero est à l'écran. Elle ne demande une
image au navigateur que lorsqu'elle est due. Onglet masqué : arrêt
complet. Les animations CSS sont finies ou
ne tournent que lorsque leur section est visible.

**Défilement amorti sur poste de travail.** Le contenu suit la position
native avec un retard, par une simple translation. Désactivé au tactile et
en mouvement réduit. Le contenu étant fixe, les liens d'ancrage, l'arrivée
sur une ancre et le focus clavier sont pris en charge explicitement dans
`useAmorti`.

**On n'anime que `transform` et `opacity`.**

## Mesures

Build de production, GPU réel, page préchauffée, médiane de cinq
répétitions :

| | durée médiane d'image | 95ᵉ centile | images au-delà de 33 ms |
|---|---|---|---|
| Poste de travail, au repos | 16,7 ms (60 i/s) | 16,7 ms | 0 |
| Poste de travail, défilement | 16,7 ms (60 i/s) | 16,7 ms | 1 |
| Téléphone moyen (processeur ÷4), au repos | 16,7 ms (60 i/s) | 16,8 ms | 2 |
| Téléphone moyen (processeur ÷4), défilement | 16,7 ms (60 i/s) | 16,8 ms | 2 |
| Téléphone lent (processeur ÷6), défilement | 16,7 ms (60 i/s) | 33,3 ms | 10 |

Les cinq répétitions donnent la même médiane, et l'intervalle entre la
plus courte et la plus longue des médianes est nul. La version précédente
du site, sans photographies ni planète calculée, mesurée le même jour sur
la même machine, laisse passer 9 images longues sur le téléphone lent :
photographies et planète ne coûtent rien de mesurable au défilement.

Au repos, après dix secondes sans interaction, la page occupe 5,1 % du fil
principal sur poste de travail. Sur téléphone, processeur bridé quatre
fois, elle en occupe 12,6 % : c'est le prix de la planète qui continue de
tourner, là où la version précédente s'arrêtait tout à fait (1,8 %).

Coûts supprimés après profilage de la trace :

- La planète demandait une image à chaque rafraîchissement d'écran pour
  n'en peindre qu'une sur trois, et imposait chaque fois au navigateur
  style, intersections et commit : 54 % du fil principal au repos sur
  téléphone. Elle n'en demande plus que lorsqu'elle est due.
- Le défilement des pointillés du schéma d'architecture ne tourne que
  lorsque la section est à l'écran.
- Le plan photographique et le champ d'étoiles ne reçoivent une nouvelle
  transformation que si elle diffère de la précédente.
- Le niveau mobile dessine moins d'étoiles, à une résolution plafonnée.

## Chargement

Réseau bridé à 1,6 Mbit/s avec 150 ms de latence, build de production :

| | premier affichage | plus grande image | décalage cumulé |
|---|---|---|---|
| Poste de travail | 1,76 s | 1,91 s | 0,012 |
| Téléphone (processeur ÷4) | 1,92 s | 1,92 s | 0 |

Treize requêtes, dont la photographie de la section suivante, préparée
pendant que la page est au repos. Les photographies sont en WebP, de 33 à
280 Ko selon la région et le cadrage ; le téléphone reçoit le cadrage
portrait, plus léger que le paysage 1920.

Les attributs `sizes` décrivent la largeur réellement occupée par chaque
image, et non une approximation : le navigateur choisit la variante de
700 px sur poste de travail là où il téléchargeait celle de 1200 ou de
1400. Les images de projets sont passées de 166 à 106 Ko sans perte
visible.

La fonte de titrage est doublée d'un **repli au même gabarit** : le
fichier Archivo, déjà préchargé, est redéclaré étiré de 24,8 % avec les
montants d'Unbounded. Les deux occupent la même place, et l'arrivée de la
vraie fonte ne déplace plus le titre — le décalage cumulé passe de 0,069
à 0,012.

## Accessibilité

- Aucune violation relevée par axe-core (WCAG 2.2 A et AA, plus les bonnes
  pratiques), sur poste de travail comme sur téléphone.
- Contraste mesuré au pixel, texte par texte, sur le ciel réellement rendu
  derrière lui — luminance du fond prise au 95ᵉ centile, donc au pire cas :
  les quarante-six styles de texte dépassent le seuil AA sur poste de
  travail comme sur téléphone, le plus faible à 4,6:1. Une bande sombre
  fixe protège la navigation de l'étoile qui passe derrière.
- Navigation au clavier complète, focus toujours visible, lien d'évitement
  en première position.
- Les titres découpés en lettres gardent leur texte entier pour les
  lecteurs d'écran, et un mot n'est jamais coupé en fin de ligne. Les
  barres de recouvrement horaire de Signal portent un libellé en toutes
  lettres.

## Sécurité

- Aucune clé, aucun jeton, aucun secret : le site est entièrement statique.
- En-têtes dans [`netlify.toml`](netlify.toml) : `Content-Security-Policy`,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security`.
- Politique de sécurité stricte, sans `unsafe-inline` ni `unsafe-eval`,
  vérifiée sur le site construit. Le build échoue si le rendu serveur
  contient un attribut `style`.
- Aucune ressource externe : polices, photographies et visuels sont
  servis par le site lui-même. Aucun son, aucun fichier audio, aucun contexte
  Web Audio.
- L'adresse e-mail n'apparaît pas en clair dans les fichiers servis.
- `npm audit` : aucune vulnérabilité.

## Structure

```
public/
  cosmos/webb/   photographies Webb, trois cadrages par region (WebP)
  cosmos/        image fixe de la planete (WebP)
  captures/      captures des projets en production
  fonts/         Unbounded, Archivo et IBM Plex Mono (WOFF2)
src/
  cosmos/        ciel : niveaux de rendu, photographies, champ d'etoiles
                 et planete en WebGL
  components/    sections de la page
  hooks/         apparitions, defilement amorti, inclinaison,
                 telechargement du CV
  entry-server   rendu au build
scripts/         injection du rendu dans dist/index.html
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait et les captures d'écran des projets, qui restent la
propriété de leur auteur.

Les fontes Unbounded, Archivo et IBM Plex Mono sont distribuées sous
[SIL Open Font License 1.1](https://scripts.sil.org/OFL).

Les photographies du ciel proviennent du télescope spatial James Webb et
sont publiées par [ESA/Webb](https://esawebb.org/copyright/) sous licence
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Elles ont été
recadrées et compressées pour le site. Crédits, tels que publiés :

- [Cosmic Cliffs](https://esawebb.org/images/weic2205a/) — NASA, ESA, CSA, and STScI
- [Pillars of Creation](https://esawebb.org/images/weic2216b/) — NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI).
- [Webb's First Deep Field](https://esawebb.org/images/weic2209a/) — NASA, ESA, CSA, and STScI
- [Tarantula Nebula](https://esawebb.org/images/weic2212a/) — NASA, ESA, CSA, and STScI
- [NGC 346](https://esawebb.org/images/weic2301a/) — NASA, ESA, CSA, STScI, A. Pagan (STScI)
- [Rho Ophiuchi](https://esawebb.org/images/weic2316a/) — NASA, ESA, CSA, STScI, K. Pontoppidan (STScI), A. Pagan (STScI)

Les mêmes crédits figurent en pied de page du site.
