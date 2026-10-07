import { useStuckNav } from '../hooks/useStuckNav.js';
import useTelechargement from '../hooks/useTelechargement.js';

const LINKS = [
  { href: '#profil', label: 'Profil', optional: true },
  { href: '#projets', label: 'Projets' },
  { href: '#competences', label: 'Compétences', optional: true },
  { href: '#signal', label: 'Signal', optional: true },
  { href: '#contact', label: 'Contact' },
];

const ANNONCES = {
  repos: '',
  prepa: 'Préparation du CV…',
  fait: 'CV téléchargé.',
};

export default function Nav() {
  const stuck = useStuckNav();
  const cv = useTelechargement();

  return (
    <nav className={`nav${stuck ? ' is-stuck' : ''}`} aria-label="Navigation principale">
      <div className="nav__inner">
        <a className="nav__mark" href="#haut">
          Christ<span>.</span>
        </a>
        <ul className="nav__links">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                className={`nav__link${link.optional ? ' nav__link--optional' : ''}`}
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              className={`nav__link nav__link--cv is-${cv.etat}`}
              aria-label="Télécharger le CV au format PDF"
              {...cv.props}
            >
              CV
              <span className="nav__cv-etat" aria-hidden="true" />
            </a>
            <span className="visually-hidden" role="status">
              {ANNONCES[cv.etat]}
            </span>
          </li>
        </ul>
      </div>
    </nav>
  );
}
