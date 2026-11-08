import { IDENTITE } from '../data/profil.js';
import { typo } from '../lib/typo.js';

/**
 * Les lettres du nom, chacune dans sa boîte. Leur ordre d'apparition part
 * du centre du nom vers ses extrémités (classe `retard-k`).
 */
function Nom({ texte, eclat = false }) {
  const mots = texte.split(' ');
  const total = texte.replace(/ /g, '').length;
  let rang = 0;
  return mots.map((mot) => (
    <span className="intro__mot" key={mot}>
      {Array.from(mot).map((c) => {
        const k = Math.round(Math.abs(rang + 0.5 - total / 2));
        rang += 1;
        return (
          <span className={eclat ? undefined : `intro__lettre retard-${k}`} key={`${mot}-${rang}`}>
            {c}
          </span>
        );
      })}
    </span>
  ));
}

/**
 * Première scène : le nom, posé dans le ciel au-dessus de l'astronaute.
 * Ses lettres sortent de la profondeur, du centre vers les bords ; puis
 * la lumière de la planète passe une fois sur lui. Deux chevrons invitent
 * à poursuivre.
 */
export default function Intro() {
  return (
    <header className="intro" id="haut">
      <h1 className="intro__titre">
        <span className="intro__sur mono">Portfolio</span>
        <span className="visuellement-cache">{IDENTITE.court}</span>
        <span className="intro__nom" aria-hidden="true">
          <Nom texte={IDENTITE.court} />
          <span className="intro__eclat">
            <Nom texte={IDENTITE.court} eclat />
          </span>
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
