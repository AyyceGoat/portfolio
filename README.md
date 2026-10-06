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

**Le ciel.** Trois plans peints en CSS — nébuleuse, poussière d'étoiles,
voile lumineux — sont présents dès le premier octet. Par-dessus, un champ
d'étoiles en WebGL brut, sans bibliothèque : parallaxe au curseur et au
défilement, scintillement, et un étirement des étoiles en traînées
proportionnel à la vitesse de défilement, renforcé au passage de chaque
section. À l'ouverture, les étoiles jaillissent du centre. Les visuels de
nébuleuse et l'éclipse du hero sont calculés par shader puis exportés en
WebP.

**Le son.** Une ambiance discrète et de légers effets au survol et entre
les sections, entièrement synthétisés par la Web Audio API — aucun fichier
audio. Coupé à chaque visite, activé uniquement par le bouton de la barre
de navigation. Le moteur n'est téléchargé qu'au premier clic ; coupé, le
contexte audio est suspendu et ne calcule plus rien.

**Signal.** Les coordonnées réelles d'Abidjan, l'heure locale, et la
distance qu'a parcourue, depuis l'ouverture de la page, un signal lumineux
parti d'Abidjan — avec ses jalons : la Lune, Vénus, le Soleil, Mars,
Jupiter, Voyager 1.

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
| Poste de travail, au repos | 16,7 ms (60 i/s) | 16,8 ms |
| Poste de travail, défilement | 16,7 ms (60 i/s) | 16,8 ms |
| Téléphone moyen (processeur ÷4), défilement | 16,7 ms (60 i/s) | 16,8 ms |
| Téléphone lent (processeur ÷6), défilement | 16,7 ms (60 i/s) | 33,3 ms |

Au repos, après dix secondes sans interaction, le téléphone consacre moins
de 3 % de son fil principal à la page.

## Accessibilité

- Aucune violation relevée par axe-core (WCAG 2.2 A et AA, plus les bonnes
  pratiques), sur poste de travail comme sur téléphone.
- Contraste mesuré au pixel, texte par texte, sur le ciel réellement rendu
  derrière lui : tout le texte visible dépasse le seuil AA, le plus faible
  à 6,1:1.
- Navigation au clavier complète, focus toujours visible, lien d'évitement
  en première position.
- Les titres découpés en lettres gardent leur texte entier pour les
  lecteurs d'écran. Le bouton de son expose son état par `aria-pressed`.

## Sécurité

- Aucune clé, aucun jeton, aucun secret : le site est entièrement statique.
- En-têtes dans [`netlify.toml`](netlify.toml) : `Content-Security-Policy`,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security`.
- Politique de sécurité stricte, sans `unsafe-inline` ni `unsafe-eval`,
  vérifiée sur le site construit. Le build échoue si le rendu serveur
  contient un attribut `style`.
- Aucune ressource externe : polices, visuels et sons sont produits ou
  servis par le site lui-même.
- L'adresse e-mail n'apparaît pas en clair dans les fichiers servis.
- `npm audit` : aucune vulnérabilité.

## Structure

```
public/
  cosmos/        nebuleuses, poussiere d'etoiles, eclipse (WebP)
  captures/      captures des projets en production
  fonts/         Archivo et IBM Plex Mono (WOFF2)
src/
  cosmos/        ciel : niveaux de rendu, champ d'etoiles WebGL
  son/           moteur Web Audio et bouton
  components/    sections de la page
  effets/        ondulation WebGL des captures
  hooks/         apparitions, defilement amorti, inclinaison
  entry-server   rendu au build
scripts/         injection du rendu dans dist/index.html
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait et les captures d'écran des projets, qui restent la
propriété de leur auteur.

Les fontes Archivo et IBM Plex Mono sont distribuées sous
[SIL Open Font License 1.1](https://scripts.sil.org/OFL).
