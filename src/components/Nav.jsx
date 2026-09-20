import { useStuckNav } from '../hooks/useStuckNav.js';

const LINKS = [
  { href: '#profil', label: 'Profil', optional: true },
  { href: '#projets', label: 'Projets' },
  { href: '#competences', label: 'Compétences', optional: true },
  { href: '#contact', label: 'Contact' },
  { href: '/CV-Ahouet-Yann-Christ-Emmanuel.pdf', label: 'CV', download: true },
];

export default function Nav() {
  const stuck = useStuckNav();

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
                className={`nav__link${link.optional ? ' nav__link--optional' : ''}${
                  link.download ? ' nav__link--cv' : ''
                }`}
                href={link.href}
                {...(link.download
                  ? { download: true, 'aria-label': 'Télécharger le CV au format PDF' }
                  : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
