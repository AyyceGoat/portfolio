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
      alt: "Le Versus de Babi Games : un duel entre deux footballeurs ivoiriens à départager, en huitièmes de finale.",
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
      alt: "Jeu assisté de l'Échiquier : après 1.e4 e5, le professeur Ephraim commente le coup joué et laisse le choix de le reprendre ou de le garder.",
    },
    desc:
      "Application d'échecs adossée au moteur Stockfish, exécuté directement sur l'appareil du joueur : sans compte, sans publicité, et utilisable hors ligne. On affronte le moteur au niveau de son choix, on se fait corriger coup par coup, et l'on relit ses parties avec une explication en français plutôt qu'un chiffre.",
    points: [
      "Quatre façons de travailler : partie libre, jeu assisté commenté, analyse de position et apprentissage par exercices tirés de ses propres erreurs.",
      'Jeu assisté : quatre professeurs aux styles distincts commentent chaque coup, l’évaluent et laissent la possibilité de le reprendre avant de le valider.',
      "Import d'une position par photo, par notation FEN ou par fichier PGN, pour éviter la saisie pièce par pièce.",
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
      alt: "Page d'accueil de NEXUS : « Mesurez vos aptitudes cognitives. », avec le robot en trois dimensions qui suit le curseur.",
    },
    desc:
      "Plateforme d'évaluation des aptitudes cognitives : 35 questions, environ 25 minutes, puis un indice, une place sur cent personnes et un profil sur cinq aptitudes — matrices logiques, séries numériques, analogies verbales, rotation spatiale et mémoire de travail.",
    points: [
      'Questions tirées dans une banque de 770 items, pour ne jamais repasser deux fois la même épreuve, et un moteur de score conçu pour être statistiquement défendable plutôt qu’arbitraire.',
      'Section Apprendre : cinquante sujets de culture générale lus à voix haute par synthèse vocale, fiches des cent quatre-vingt-quinze pays et quiz de 464 questions en neuf domaines.',
      'Classement public des meilleurs résultats, page d’entrée ramenée de 577 Ko à 3,3 Ko et navigation entièrement utilisable au clavier.',
    ],
    stack: ['React', 'Vite', 'TypeScript', 'Netlify'],
    links: {
      site: 'https://nexus-evaluation-cognitive.netlify.app',
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
