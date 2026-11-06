import { IDENTITE } from '../data/profil.js';

/**
 * Première scène : le titre, et deux chevrons qui invitent à défiler.
 * Chaque ligne se révèle en montant derrière son propre masque.
 */
export default function Intro() {
  return (
    <header className="intro" id="haut">
      <h1 className="intro__titre">
        <span className="intro__ligne intro__ligne--sur">
          <span className="intro__texte">Portfolio</span>
        </span>
        <span className="intro__ligne">
          <span className="intro__texte">{IDENTITE.court}</span>
        </span>
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
