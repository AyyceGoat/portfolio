/**
 * Les réalisations présentées, dans leur ordre d'apparition.
 *
 * AJOUTER UN PROJET : copier un bloc ci-dessous, le compléter, et
 * déposer ses captures dans public/captures/. C'est tout : la scène,
 * la navigation et le compteur de projets s'adaptent seuls.
 *
 *  - id        identifiant unique, en minuscules, sans espace ;
 *  - tag       nature du projet (« Projet personnel », « Mission en
 *              entreprise »…) ;
 *  - shot      capture d'écran : `src` en 1400 px de large, `small`
 *              en 700 px, toutes deux en WebP au format 16:10, chemins
 *              écrits sans barre initiale (« captures/mon-projet.webp ») ;
 *  - links     `site` et `repo`, facultatifs l'un comme l'autre ;
 *  - schema    à la place de `shot` pour un projet sous
 *              confidentialité : les couches du système, sans
 *              aucun nom de client ni donnée d'exploitation ;
 *  - sealed    mention affichée à la place des liens dans ce cas.
 *
 * Les textes s'écrivent naturellement, avec des apostrophes droites :
 * l'apostrophe typographique et les espaces insécables de la
 * typographie française sont posées automatiquement à l'affichage.
 */

export const projects = [
  {
    id: 'babi-games',
    title: 'Babi Games',
    tag: 'Projet personnel',
    shot: {
      src: 'captures/babi-games.webp',
      small: 'captures/babi-games-700.webp',
      alt: "Le Versus de Babi Games : un duel entre deux footballeurs ivoiriens à départager, en huitièmes de finale.",
    },
    desc:
      "Plateforme de mini-jeux au contenu ivoirien, installable depuis le navigateur et jouable hors ligne. Trois jeux autour de la culture du pays : duels de personnalités, classements et estimation des prix du quotidien.",
    points: [
      "Chaîne d'approvisionnement en images juridiquement conforme, automatisée en Python à partir de Wikidata, Wikimedia Commons et Openverse.",
      "Interface d'administration éditoriale pour gérer les contenus sans toucher au code.",
    ],
    stack: ['React', 'Vite', 'PWA', 'Python'],
    links: {
      site: 'https://babi-games.netlify.app',
      repo: 'https://github.com/AyyceGoat/babi-games',
    },
  },
  {
    id: 'echiquier',
    title: 'Échiquier',
    tag: 'Projet personnel',
    shot: {
      src: 'captures/echiquier.webp',
      small: 'captures/echiquier-700.webp',
      alt: "Jeu assisté de l'Échiquier : après 1.e4 e5, le professeur Ephraim commente le coup joué et laisse le choix de le reprendre ou de le garder.",
    },
    desc:
      "Application d'échecs adossée au moteur Stockfish, exécuté directement sur l'appareil du joueur : sans compte, sans publicité et utilisable hors ligne. On affronte le moteur au niveau de son choix, on se fait corriger coup par coup et l'on relit ses parties avec une explication en français plutôt qu'un chiffre.",
    points: [
      "Quatre façons de travailler : partie libre, jeu assisté commenté, analyse de position et exercices tirés de ses propres erreurs.",
      "Jeu assisté : quatre professeurs aux styles distincts commentent chaque coup, l'évaluent et proposent de le reprendre avant de le valider.",
      "Import d'une position par photo, en notation FEN ou par fichier PGN, sans saisie pièce par pièce.",
    ],
    stack: ['React', 'Stockfish', 'WebAssembly', 'Netlify'],
    links: {
      site: 'https://echiquier-stockfish-analyse.netlify.app',
      repo: 'https://github.com/AyyceGoat/echiquier-stockfish-analyse',
    },
  },
  {
    id: 'nexus',
    title: 'NEXUS',
    tag: 'Projet personnel',
    shot: {
      src: 'captures/nexus.webp',
      small: 'captures/nexus-700.webp',
      alt: "Page d'accueil de NEXUS : « Mesurez vos aptitudes cognitives. », avec le robot en trois dimensions qui suit le curseur.",
    },
    desc:
      "Plateforme d'évaluation des aptitudes cognitives : 35 questions, environ 25 minutes, puis un indice, un rang sur cent personnes et un profil détaillé sur cinq aptitudes (matrices logiques, séries numériques, analogies verbales, rotation spatiale et mémoire de travail).",
    points: [
      "Questions tirées d'une banque de 770 items pour ne jamais repasser la même épreuve, et moteur de score conçu pour être statistiquement défendable plutôt qu'arbitraire.",
      "Section Apprendre : cinquante sujets de culture générale lus à voix haute par synthèse vocale, fiches des 195 pays et quiz de 464 questions répartis en neuf domaines.",
      "Classement public des meilleurs résultats, page d'entrée allégée de 577 Ko à 3,3 Ko et navigation entièrement utilisable au clavier.",
    ],
    stack: ['React', 'Vite', 'TypeScript', 'Netlify'],
    links: {
      site: 'https://nexus-evaluation-cognitive.netlify.app',
      repo: 'https://github.com/AyyceGoat/nexus-evaluation-cognitive',
    },
  },
  {
    id: 'erp',
    title: 'ERP de gestion industrielle pour une entreprise de carrières multisites',
    tag: 'Mission en entreprise',
    // Pas de capture ni de lien : code propriétaire, données confidentielles.
    schema: [
      { couche: 'Terrain', titre: 'Interface conducteur', detail: 'QR code, code PIN, saisie mobile' },
      { couche: 'Pilotage', titre: 'Tableau de bord React', detail: 'Recharts, rapports IA, export CSV' },
      { couche: 'Traitement', titre: 'Google Apps Script', detail: 'Règles métier, rôles, comptabilité analytique' },
      { couche: 'Données', titre: 'Google Sheets', detail: 'Source unique de données' },
    ],
    desc:
      "Système de gestion complet pour une entreprise de carrières en Côte d'Ivoire, conçu et développé en tant que développeur unique, de l'analyse du besoin au déploiement. Il couvre la production, le suivi terrain et le pilotage de la direction sur plusieurs sites.",
    points: [
      "Backend Google Apps Script d'environ 4 500 lignes, adossé à Google Sheets comme source unique de données.",
      "Interface mobile pour les conducteurs : scan de QR code et authentification par code PIN, pensée pour rester lisible en plein soleil.",
      "Tableau de bord administrateur en React : visualisations Recharts, rapports générés par IA et export CSV.",
      "Module de comptabilité analytique bâti sur le cahier des charges d'un contrôleur de gestion, structuré en dix-neuf centres de coûts.",
    ],
    stack: ['Google Apps Script', 'Google Sheets', 'React', 'Recharts'],
    sealed:
      "Code propriétaire et données confidentielles : ni dépôt, ni lien, ni capture. Le schéma ne montre que la forme du système.",
  },
];
