import { IDENTITE } from '../data/profil.js';
import { typo } from '../lib/typo.js';

/**
 * Première scène : le nom, posé dans le ciel au-dessus de l'astronaute.
 * Un trait de lumière traverse l'écran et révèle le nom à son passage ;
 * puis le métier apparaît. Deux chevrons invitent à poursuivre.
 */
export default function Intro() {
  return (
    <header className="intro" id="haut">
      <h1 className="intro__titre">
        <span className="etiquette intro__sur">Portfolio</span>
        <span className="intro__nom">
          <span className="intro__lettres">{IDENTITE.court}</span>
          <span className="intro__trait" aria-hidden="true" />
          <span className="intro__eclair" aria-hidden="true" />
        </span>
        <span className="etiquette intro__metier">{typo(IDENTITE.titre)}</span>
        <span className="intro__anglais mono">{IDENTITE.sousTitre}</span>
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
