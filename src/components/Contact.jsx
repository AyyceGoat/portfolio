import { useEffect, useRef, useState } from 'react';
import useTelechargement, { prechargerCV } from '../hooks/useTelechargement.js';
import { CV as FICHE, IDENTITE, LIENS } from '../data/profil.js';
import { typo } from '../lib/typo.js';
import { Coche, FlecheBas, FlecheOblique } from './Icones.jsx';

const inverser = (s) => s.split('').reverse().join('');

// Tant que l'adresse du profil n'est pas renseignée dans les données, le
// lien ouvre la recherche LinkedIn sur le nom complet.
const LINKEDIN =
  LIENS.linkedin ||
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(IDENTITE.complet)}`;

const LIBELLES = {
  repos: 'Télécharger mon CV',
  prepa: 'Préparation…',
  fait: 'CV téléchargé',
};
const ANNONCES = {
  repos: '',
  prepa: 'Préparation du CV…',
  fait: 'CV téléchargé.',
};

export default function Contact() {
  const [gmail, setGmail] = useState('');
  const cv = useTelechargement();
  const boutonRef = useRef(null);

  // L'adresse n'est reconstituée qu'ici, une fois la page ouverte.
  useEffect(() => {
    const [nom, domaine, ext] = LIENS.courriel.map(inverser);
    setGmail(`https://mail.google.com/mail/?view=cm&fs=1&to=${nom}@${domaine}.${ext}`);
  }, []);

  // Le CV est rapatrié à l'approche : au clic, il est déjà là. Pas en
  // mode économie de données, où l'on attend le geste.
  useEffect(() => {
    const bouton = boutonRef.current;
    const nav = window.navigator || {};
    if (!bouton || (nav.connection && nav.connection.saveData)) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((en) => en.isIntersecting)) return;
        obs.disconnect();
        prechargerCV().catch(() => {});
      },
      { rootMargin: '0px 0px 600px 0px' }
    );
    obs.observe(bouton);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="plan plan--contact" id="contact" aria-labelledby="titre-contact">
      <div className="plan__corps contact">
        <p className="entete mono">
          <span className="entete__num">04</span> Contact
        </p>
        <h2 className="contact__titre" id="titre-contact">
          Construisons la suite.
        </h2>
        <p className="contact__texte">
          {typo(
            "Disponible pour un CDI, un CDD ou un stage en développement d'applications, à Abidjan ou à distance."
          )}
        </p>

        <div className="contact__cv">
          <a className={`bouton bouton--plein bouton--cv est-${cv.etat}`} ref={boutonRef} {...cv.props}>
            {LIBELLES[cv.etat]}
            {cv.etat === 'fait' ? <Coche /> : cv.etat === 'repos' ? <FlecheBas /> : null}
          </a>
          <span className="contact__poids mono">{FICHE.poids}</span>
          <span className="visuellement-cache" role="status">
            {ANNONCES[cv.etat]}
          </span>
        </div>

        <ul className="contact__liens">
          <li>
            <a className="lien-contact" href={gmail || undefined} target="_blank" rel="noreferrer noopener">
              <span className="lien-contact__nom mono">E-mail</span>
              <span className="lien-contact__valeur">Écrire via Gmail</span>
              <span className="lien-contact__fleche">
                <FlecheOblique />
              </span>
              <span className="visuellement-cache"> (nouvel onglet)</span>
            </a>
          </li>
          <li>
            <a className="lien-contact" href={LIENS.github} target="_blank" rel="noreferrer noopener">
              <span className="lien-contact__nom mono">GitHub</span>
              <span className="lien-contact__valeur">github.com/AyyceGoat</span>
              <span className="lien-contact__fleche">
                <FlecheOblique />
              </span>
              <span className="visuellement-cache"> (nouvel onglet)</span>
            </a>
          </li>
          <li>
            <a className="lien-contact" href={LINKEDIN} target="_blank" rel="noreferrer noopener">
              <span className="lien-contact__nom mono">LinkedIn</span>
              <span className="lien-contact__valeur">{LIENS.linkedin ? 'Profil professionnel' : IDENTITE.complet}</span>
              <span className="lien-contact__fleche">
                <FlecheOblique />
              </span>
              <span className="visuellement-cache"> (nouvel onglet)</span>
            </a>
          </li>
        </ul>

        <footer className="pied">
          <p>
            © {IDENTITE.complet} — {typo(IDENTITE.lieu)}
          </p>
          <a className="pied__haut" href="#haut">
            Revenir au départ <span aria-hidden="true">↑</span>
          </a>
        </footer>
      </div>
    </section>
  );
}
