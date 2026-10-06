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

**Le ciel.** Deux plans peints en CSS — une plaque de nébuleuse et une
poussière d'étoiles — sont présents dès le premier octet. Par-dessus, deux
couches WebGL brut, sans bibliothèque, chargées après le premier affichage.

Les *nuées* sont un seul quadrilatère peint par un shader : trois plans de
nuages à des vitesses différentes, des galaxies spirales, des cœurs
lumineux. La palette se déplace avec la position de lecture, si bien que
chaque section a son propre paysage — bleu d'encre au hero, violet au
profil, bleu profond aux projets, magenta aux compétences, turquoise à
Signal, pourpre et or au contact. On descend d'une région de l'espace à
une autre. Le shader ne se repeint que si la lecture a réellement bougé :
page immobile, coût nul.

Le *champ d'étoiles* ajoute la parallaxe au curseur et au défilement, le
scintillement, et un étirement des étoiles en traînées proportionnel à la
vitesse de défilement, renforcé au passage de chaque section. À
l'ouverture, les étoiles jaillissent du centre.

La plaque de repli est calculée hors ligne **avec le même shader** que les
nuées, puis exportée en WebP : le premier affichage et le rendu animé sont
la même image. La géante aux anneaux du hero est peinte de la même façon.

Une nuance de moteur mérite d'être notée : une toile WebGL que l'on ne
peint qu'au besoin doit conserver son tampon de dessin. Sans cela, WebKit
le vide après chaque composition et la page immobile se retrouve devant un
ciel noir, là où Chromium garde la dernière image. Vérifié sur les deux.

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
WebGL, mode économie de données ou appareil très modeste : le ciel reste
peint en CSS, sans animation, et le champ d'étoiles n'est jamais
téléchargé. En cours de route, si l'appareil ne tient pas la cadence, le
moteur dessine moins d'étoiles, puis rend la main au ciel fixe.

**Économie d'énergie.** Le champ d'étoiles suit l'activité : 60 images par
seconde pendant un défilement ou un mouvement de souris, 30 au repos, moins
encore ensuite ; sur téléphone, il s'arrête tout à fait quand la page est
immobile. Onglet masqué : arrêt complet. Les animations CSS sont finies ou
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

| | durée médiane d'image | 95ᵉ centile |
|---|---|---|
| Poste de travail, au repos | 16,7 ms (60 i/s) | 16,7 ms |
| Poste de travail, défilement | 16,7 ms (60 i/s) | 16,8 ms |
| Téléphone moyen (processeur ÷4), au repos | 16,7 ms (60 i/s) | 16,8 ms |
| Téléphone moyen (processeur ÷4), défilement | 16,7 ms (60 i/s) | 16,8 ms |
| Téléphone lent (processeur ÷6), défilement | 16,7 ms (60 i/s) | 33,3 ms |

Les cinq répétitions donnent la même médiane à la décimale près : la
mesure est stable, elle n'est pas une moyenne qui masque des à-coups.

Au repos, après dix secondes sans interaction, le téléphone consacre
2,9 % de son fil principal à la page avec un processeur bridé quatre
fois, et 0,2 % sans bridage : les deux couches WebGL cessent de dessiner,
il ne reste que la dérive de la planète, confiée au compositeur. Sur
poste de travail, le champ d'étoiles continue de tourner pour les étoiles
filantes : 7,2 % du fil principal.

## Accessibilité

- Aucune violation relevée par axe-core (WCAG 2.2 A et AA, plus les bonnes
  pratiques), sur poste de travail comme sur téléphone.
- Contraste mesuré au pixel, texte par texte, sur le ciel réellement rendu
  derrière lui : tout le texte visible dépasse le seuil AA, le plus faible
  à 6,1:1.
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
- Aucune ressource externe : polices et visuels sont produits ou servis
  par le site lui-même. Aucun son, aucun fichier audio, aucun contexte
  Web Audio.
- L'adresse e-mail n'apparaît pas en clair dans les fichiers servis.
- `npm audit` : aucune vulnérabilité.

## Structure

```
public/
  cosmos/        plaque de nebuleuse, poussiere d'etoiles, planete (WebP)
  captures/      captures des projets en production
  fonts/         Unbounded, Archivo et IBM Plex Mono (WOFF2)
src/
  cosmos/        ciel : niveaux de rendu, nuees et champ d'etoiles WebGL
  components/    sections de la page
  hooks/         apparitions, defilement amorti, inclinaison
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
