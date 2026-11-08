import { IDENTITE } from '../data/profil.js';
import { typo } from '../lib/typo.js';

/** Les lettres d'un mot, chacune dans sa propre boîte (apparition). */
function Lettres({ mot }) {
  return (
    <span className="intro__mot">
      {Array.from(mot).map((c, i) => (
        <span className="intro__lettre" key={i}>
          {c}
        </span>
      ))}
    </span>
  );
}

/**
 * Première scène : le titre, posé dans le ciel au-dessus de l'astronaute,
 * et deux chevrons qui invitent à défiler.
 */
export default function Intro() {
  const mots = IDENTITE.court.split(' ');
  return (
    <header className="intro" id="haut">
      <h1 className="intro__titre">
        <span className="intro__sur mono">Portfolio</span>
        <span className="visuellement-cache">{IDENTITE.court}</span>
        <span className="intro__nom" aria-hidden="true">
          {mots.map((m) => (
            <Lettres mot={m} key={m} />
          ))}
        </span>
        <span className="intro__metier">{typo(IDENTITE.titre)}</span>
      </h1>
      <span className="intro__chevrons" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 7.5 L12 13 L18 7.5" />
          <path d="M6 12.5 L12 18 L18 12.5" />
        </svg>
      </span>
    </header>
  );
}
