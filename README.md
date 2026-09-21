# Portfolio — Ahouet Yann Christ Emmanuel

Portfolio personnel d'un développeur web basé à Abidjan, en Côte d'Ivoire.
Page unique, React et Vite, sans dépendance d'interface.

**Le site :** [christ-ahouet.netlify.app](https://christ-ahouet.netlify.app) — à réserver au déploiement
**Me contacter :** [github.com/AyyceGoat](https://github.com/AyyceGoat)

---

## Ce qu'on y trouve

Une page qui se parcourt d'un seul défilement : présentation, quatre
réalisations, compétences, contact et CV téléchargeable.

Le quatrième projet est une mission en entreprise sous confidentialité.
Ni dépôt, ni lien, ni capture : il est présenté par un schéma
d'architecture dessiné en SVG, qui ne montre que la forme du système.
Aucun nom de client ni donnée d'exploitation n'apparaît dans ce dépôt.

## Démarrer

```bash
npm install     # 20 paquets : React, Vite et three.js
npm run dev     # serveur de développement
npm run build   # produit dist/
npm run preview # sert le résultat du build
```

Node 20 ou plus récent.

## Parti pris techniques

**Le mouvement de la page est en CSS**, piloté par `IntersectionObserver`.
Seul le globe du hero utilise three.js, chargé après le premier affichage
dans un fichier séparé. L'ondulation des captures est en WebGL brut : 2 ko,
chargés au premier survol.

**Un globe en WebGL comme élément signature.** Des dizaines de milliers de
points, uniquement sur les terres émergées, Abidjan seule allumée et des
arcs vers douze villes. Shaders GLSL écrits à la main, sans bibliothèque de
globe. Le masque des continents vient de Natural Earth (domaine public) :
il est rasterisé puis embarqué, aucune ressource externe. Le rendu
s'interrompt hors écran et quand l'onglet est masqué. Sans WebGL, ou en
animation réduite, une image fixe le remplace et three.js n'est jamais
téléchargé.

**Défilement amorti sur poste de travail.** Le contenu suit la position
native avec un retard, par une simple translation. Désactivé au tactile, où
le défilement natif est meilleur, et en animation réduite.
Contrepartie assumée : le contenu étant fixe, le navigateur ne peut plus
atteindre une ancre de lui-même. Les liens d'ancrage, l'arrivée directe sur
une ancre et le déplacement du focus au clavier sont donc pris en charge
explicitement dans `useAmorti`. Un `scrollIntoView()` appelé par du code
tiers resterait sans effet tant que l'amorti est actif.

**On n'anime que `transform` et `opacity`.** Aucune propriété qui déclenche
un recalcul de mise en page n'est animée, nulle part.

Mesures prises sur le build de production, GPU réel, après préchauffage
complet de la page, médiane de cinq répétitions :

| | durée médiane d'image | 95ᵉ centile |
|---|---|---|
| Poste de travail, globe actif | 16,7 ms (60 i/s) | 16,7 ms |
| Poste de travail, défilement | 16,7 ms (60 i/s) | 16,7 ms |
| Mobile, processeur bridé ×6 | 16,7 ms (60 i/s) | 16,8 ms |
| Survol avec ondulation | 16,7 ms (60 i/s) | 16,8 ms |

Un rendu du globe coûte 0,3 ms de processeur. Sur appareil modeste, sa
densité est réduite, sa cadence plafonnée à 30 i/s, et il s'efface dès
le début du défilement — le moment où la fluidité compte le plus.

**`prefers-reduced-motion` est respecté.** Qui demande moins d'animation
voit la page complète immédiatement : pas d'apparition différée, pas de
défilement adouci, pas d'inclinaison au survol, et le flux animé du schéma
s'arrête.

**Polices auto-hébergées.** Archivo et IBM Plex Mono, toutes deux sous
licence SIL Open Font 1.1, servies depuis le domaine du site. Aucune
requête vers un tiers, et donc aucune fuite d'adresse IP des visiteurs.
Découpage par plage Unicode : seuls 64 Ko de fontes sont réellement
téléchargés.

**Images en WebP, chargement différé**, avec `srcset` en deux largeurs et
dimensions déclarées pour éviter tout saut de mise en page.

**Deux rendus pour le schéma d'architecture.** Le tracé SVG au-delà de
48 rem, une version empilée en dessous — un schéma large rendrait ses
libellés illisibles sur téléphone. Un seul des deux est présent dans
l'arbre d'accessibilité à la fois.

## Accessibilité

- Aucune violation relevée par axe-core (règles WCAG 2.1 A et AA, plus les
  bonnes pratiques), sur poste de travail comme sur mobile.
- Contrastes vérifiés élément par élément sur le rendu : tous au-delà du
  seuil AA, le plus faible à 4,8:1.
- Navigation au clavier complète, ordre de tabulation conforme à la
  lecture, focus toujours visible, lien d'évitement en première position.
- Le schéma SVG porte un `<title>` et une `<desc>` qui décrivent
  l'architecture en toutes lettres.

## Sécurité

- Aucune clé, aucun jeton, aucun secret : le site est entièrement statique
  et n'appelle aucune API.
- En-têtes configurés dans [`netlify.toml`](netlify.toml) :
  `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` et `Strict-Transport-Security`.
- La politique de sécurité est stricte : ni `unsafe-inline` ni
  `unsafe-eval`. Elle a été vérifiée sur le site construit, sans aucune
  violation — ce qui a demandé de n'avoir aucun style en ligne dans les
  composants.
- Pas de formulaire de contact, donc aucune entrée utilisateur à valider
  et aucune surface d'attaque côté serveur.
- L'adresse e-mail n'apparaît en clair ni dans le HTML servi, ni comme
  chaîne unique dans le JavaScript : elle est reconstituée à l'affichage,
  ce qui met en échec les moissonneurs d'adresses.
- `npm audit` : aucune vulnérabilité.

## Structure

```
public/
  captures/      captures des projets en ligne, en WebP
  land-mask.png  masque des continents (Natural Earth, domaine public)
  fonts/         Archivo et IBM Plex Mono (WOFF2)
  CV-*.pdf       CV téléchargeable
src/
  components/    Nav, Hero, About, Projects, ProjectCard,
                 Architecture, Skills, Contact, Footer
  data/          contenu des quatre projets
  globe/         globe WebGL : scene, shaders GLSL, villes
  effets/        ondulation WebGL des captures
  hooks/         useReveal, useStuckNav, useTilt, useAmorti
  styles/        tokens, fonts, base, app
netlify.toml     déploiement et en-têtes de sécurité
```

## Licences

Le code de ce dépôt est publié sous licence MIT (voir [LICENSE](LICENSE)).

Ne sont **pas** couverts par cette licence : le contenu rédactionnel, le
CV, le portrait et les captures d'écran des projets, qui restent la
propriété de leur auteur.

Les fontes Archivo et IBM Plex Mono sont distribuées sous
[SIL Open Font License 1.1](https://scripts.sil.org/OFL).
