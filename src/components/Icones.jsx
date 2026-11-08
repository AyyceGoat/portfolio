/* Petites icônes vectorielles : les polices du site ne contiennent ni la
   flèche oblique ni la coche, et un glyphe de secours détonnerait. */

export function FlecheOblique() {
  return (
    <svg className="icone" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3 9 L9 3 M4 3 H9 V8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Coche() {
  return (
    <svg className="icone" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 6.5 L5 9 L9.5 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlecheBas() {
  return (
    <svg className="icone" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M6 2 V10 M2.5 6.5 L6 10 L9.5 6.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Un diplôme (mortier), pour le parcours. */
export function Diplome() {
  return (
    <svg className="icone icone--diplome" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 9.5 L12 5 L22 9.5 L12 14 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <path d="M6.5 11.6 V15.6 C6.5 17.2 9 18.5 12 18.5 C15 18.5 17.5 17.2 17.5 15.6 V11.6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M21 10 V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Le liseré lumineux d'un panneau de verre : il se dessine à l'entrée. */
export function Bordure() {
  return (
    <svg className="verre__bord" aria-hidden="true" focusable="false">
      <rect width="100%" height="100%" rx="22" ry="22" pathLength="1" />
    </svg>
  );
}
