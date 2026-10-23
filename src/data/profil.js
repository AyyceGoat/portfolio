/**
 * Identité, présentation, compétences et liens de contact.
 *
 * Les chemins de fichiers s'écrivent sans barre initiale : ils sont
 * résolus par src/lib/media.js. Les textes sont mis en forme à
 * l'affichage (apostrophes et espaces insécables) par src/lib/typo.js.
 */

export const IDENTITE = {
  complet: 'Ahouet Yao Yann Christ Emmanuel',
  // Le nom est composé sur trois lignes dans la scène d'ouverture.
  lignes: ['Ahouet Yao', 'Yann Christ', 'Emmanuel'],
  titre: "Développeur d'applications full-stack",
  sousTitre: 'Software Engineer',
  lieu: "Abidjan, Côte d'Ivoire",
};

export const PORTRAIT = {
  src: 'portrait-400.webp',
  grand: 'portrait-800.webp',
  alt: 'Portrait de Ahouet Yao Yann Christ Emmanuel.',
};

export const PRESENTATION = [
  "Développeur d'applications full-stack basé à Abidjan, je conçois et développe des applications web et des systèmes de gestion complets, de l'analyse du besoin jusqu'au déploiement.",
  "Habitué à mener seul un projet face à un besoin métier réel, j'ai notamment traduit le cahier des charges d'un contrôleur de gestion en un ERP industriel déployé et utilisé chaque jour sur plusieurs sites.",
  "Côté interface, JavaScript et React ; côté serveur et données, Python, MySQL et PostgreSQL. Les bases sont modélisées en UML et Merise avant d'être écrites : un schéma juste au départ coûte toujours moins cher qu'une correction en production.",
];

export const FAITS = [
  { label: 'Formation', value: "Master 2 Informatique, développement d'applications web — AGITEL Formation, en cours" },
  { label: 'Recherche', value: 'CDI, CDD ou stage en développement' },
  { label: 'Lieu', value: 'Abidjan — ouvert au travail à distance' },
  { label: 'Langues', value: 'Français courant, anglais technique' },
];

/** Les compétences qui gravitent autour du poste de travail. */
export const COMPETENCES = [
  { id: 'javascript', nom: 'JavaScript' },
  { id: 'python', nom: 'Python' },
  { id: 'react', nom: 'React' },
  { id: 'html', nom: 'HTML' },
  { id: 'css', nom: 'CSS' },
  { id: 'git', nom: 'Git' },
  { id: 'mysql', nom: 'MySQL' },
  { id: 'postgresql', nom: 'PostgreSQL' },
];

/**
 * Liens de contact.
 *
 * L'adresse e-mail est stockée à l'envers et en morceaux : la chaîne
 * complète n'existe ni dans le HTML servi ni dans le JavaScript livré, ce
 * qui met en échec les moissonneurs d'adresses. Elle n'est reconstituée
 * qu'une fois la page ouverte.
 */
export const LIENS = {
  courriel: ['7tsirhcnnaY', 'liamg', 'moc'],
  github: 'https://github.com/AyyceGoat',

  // ▼ À RENSEIGNER : l'adresse complète du profil LinkedIn, par exemple
  //   'https://www.linkedin.com/in/votre-identifiant/'.
  //   Tant qu'elle est vide, le lien ouvre la recherche LinkedIn sur le nom.
  linkedin: '',
};

export const CV = {
  fichier: 'CV-Ahouet-Yann-Christ-Emmanuel.pdf',
  nom: 'CV-Ahouet-Yao-Yann-Christ-Emmanuel.pdf',
  poids: 'PDF · 2 pages · 87 Ko',
};
