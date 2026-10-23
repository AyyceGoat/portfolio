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
