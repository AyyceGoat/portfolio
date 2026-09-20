/**
 * Les quatre realisations presentees.
 *
 * Le quatrieme projet est une mission en entreprise sous
 * confidentialite : ni lien, ni depot, ni capture. Il est illustre
 * par un schema d'architecture, et aucun nom de client ni donnee
 * d'exploitation n'apparait nulle part dans ce fichier.
 */

export const projects = [
  {
    id: 'babi-games',
    index: '01',
    title: 'Babi Games',
    tag: 'Projet personnel',
    shot: {
      src: '/captures/babi-games.webp',
      small: '/captures/babi-games-700.webp',
      alt: "Page d'accueil de Babi Games : « Tu connais ton pays ? », avec les trois jeux Versus, Tier List et Juste Prix.",
    },
    desc:
      'Plateforme de mini-jeux au contenu ivoirien, installable depuis le navigateur et jouable hors ligne. Trois jeux autour de la culture du pays : duels de personnalités, classements et estimation de prix du quotidien.',
    points: [
      "Chaîne d'approvisionnement d'images juridiquement conforme, automatisée en Python à partir de Wikidata, Wikimedia Commons et Openverse.",
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
    index: '02',
    title: 'Échiquier',
    tag: 'Projet personnel',
    shot: {
      src: '/captures/echiquier.webp',
      small: '/captures/echiquier-700.webp',
      alt: "Partie en cours sur l'Échiquier : plateau complet, panneau des coups joués et niveau du moteur.",
    },
    desc:
      "Application d'analyse de parties d'échecs adossée au moteur Stockfish, exécuté directement dans le navigateur et utilisable sur téléphone. Trois usages : partie libre, jeu assisté commenté par le moteur, et analyse complète coup par coup.",
    points: [
      "Import d'une position à partir d'une photo ou d'une capture d'écran, pour éviter la saisie pièce par pièce.",
      'Six niveaux de jeu, du débutant à la pleine force du moteur.',
    ],
    stack: ['React', 'Stockfish', 'WebAssembly', 'Netlify'],
    links: {
      site: 'https://echiquier-stockfish-analyse.netlify.app',
      repo: 'https://github.com/AyyceGoat/echiquier-stockfish-analyse',
    },
  },
  {
    id: 'nexus',
    index: '03',
    title: 'NEXUS',
    tag: 'Projet personnel',
    shot: {
      src: '/captures/nexus.webp',
      small: '/captures/nexus-700.webp',
      alt: "Page d'accueil de NEXUS : « Explorez l'Univers du Savoir », avec les compteurs de pays, domaines, articles et quiz.",
    },
    desc:
      "Encyclopédie interactive doublée d'une plateforme d'évaluation : exploration par domaines et par pays, articles, puis quiz qui mesurent ce qui en a été retenu. Le moteur de score est conçu pour être statistiquement défendable plutôt qu'arbitraire.",
    points: [
      'Page d’entrée ramenée de 577 Ko à 3,3 Ko : chargement différé, découpage du code et routage applicatif.',
      'Navigation entièrement utilisable au clavier et travail de référencement.',
    ],
    stack: ['React', 'Vite', 'TypeScript', 'Netlify'],
    links: {
      site: 'https://taupe-lily-ac2081.netlify.app',
      repo: 'https://github.com/AyyceGoat/nexus-evaluation-cognitive',
    },
  },
  {
    id: 'erp',
    index: '04',
    title: 'ERP de gestion industrielle multi-sites',
    tag: 'Mission en entreprise',
    mission: true,
    // Pas de bloc shot ni links : code propriétaire, données confidentielles.
    desc:
      "Système de gestion complet pour une entreprise de carrières en Côte d'Ivoire, conçu et développé en tant que seul développeur, de l'analyse du besoin au déploiement. Il couvre la production, le suivi terrain et le pilotage de la direction sur plusieurs sites.",
    points: [
      "Backend Google Apps Script d'environ 4 500 lignes, adossé à Google Sheets comme source unique de données.",
      "Interface mobile pour les conducteurs sur le terrain : scan de QR code et authentification par code PIN, pensée pour rester lisible en plein soleil.",
      "Tableau de bord administrateur en React : visualisations Recharts, rapports générés par IA et export CSV.",
      "Module de comptabilité analytique bâti sur le cahier des charges d'un contrôleur de gestion, structuré en dix-neuf centres de coûts.",
    ],
    stack: ['Google Apps Script', 'Google Sheets', 'React', 'Recharts'],
    sealed:
      'Code propriétaire et données confidentielles : ni dépôt, ni lien, ni capture. Le schéma ci-contre ne montre que la forme du système.',
  },
];
