import useTelechargement from '../hooks/useTelechargement.js';
import { Coche, FlecheBas } from './Icones.jsx';

const LIENS = [
  { href: '#profil', label: 'Profil' },
  { href: '#projets', label: 'Projets' },
  { href: '#competences', label: 'Compétences' },
  { href: '#contact', label: 'Contact' },
];

const ANNONCES = {
  repos: '',
  prepa: 'Préparation du CV…',
  fait: 'CV téléchargé.',
};

/** Le menu : discret, il n'apparaît qu'une fois le voyage commencé. */
export default function Nav() {
  const cv = useTelechargement();

  return (
    <nav className="nav" aria-label="Navigation principale">
      <ul className="nav__liens">
        {LIENS.map((lien) => (
          <li key={lien.href}>
            <a className="nav__lien" href={lien.href}>
              {lien.label}
            </a>
          </li>
        ))}
        <li>
          <a className={`nav__cv est-${cv.etat}`} aria-label="Télécharger le CV au format PDF" {...cv.props}>
            CV {cv.etat === 'fait' ? <Coche /> : <FlecheBas />}
          </a>
          <span className="visuellement-cache" role="status">
            {ANNONCES[cv.etat]}
          </span>
        </li>
      </ul>
    </nav>
  );
}
