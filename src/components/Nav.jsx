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

export default function Nav() {
  const cv = useTelechargement();

  return (
    <>
      <nav className="nav" aria-label="Navigation principale">
        <a className="nav__marque" href="#haut">
          Christ<span aria-hidden="true">.</span>
        </a>
        <ul className="nav__liens">
          {LIENS.map((lien) => (
            <li key={lien.href} className="nav__item">
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

      {/* Jauge de progression et chapitre en cours. */}
      <div className="hud" aria-hidden="true">
        <span className="hud__chapitre mono">Départ</span>
        <span className="hud__rail">
          <span className="hud__barre" />
        </span>
      </div>
    </>
  );
}
