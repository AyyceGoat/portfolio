import { useCallback, useRef, useState } from 'react';

/**
 * Bouton de son. Coupe par defaut a chaque visite : rien ne joue tant
 * que le visiteur ne l'a pas demande, et la preference n'est pas
 * memorisee — un recruteur qui revient n'est jamais surpris.
 */
export default function BoutonSon() {
  const [actif, setActif] = useState(false);
  const [indispo, setIndispo] = useState(false);
  const moteur = useRef(null);

  const basculer = useCallback(async () => {
    try {
      if (!moteur.current) moteur.current = await import('./moteur.js');
      if (actif) {
        moteur.current.couper();
        setActif(false);
      } else {
        const ok = await moteur.current.activer();
        if (ok) setActif(true);
        else setIndispo(true);
      }
    } catch (e) {
      setIndispo(true);
    }
  }, [actif]);

  if (indispo) return null;

  return (
    <button
      type="button"
      className={`son${actif ? ' is-actif' : ''}`}
      aria-pressed={actif}
      onClick={basculer}
      title={actif ? 'Couper le son' : 'Activer le son'}
    >
      <svg className="son__icone" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        {actif ? (
          <>
            <path className="son__onde" d="M15.5 9a4.2 4.2 0 0 1 0 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path className="son__onde son__onde--2" d="M18.2 6.5a7.6 7.6 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
      <span className="son__texte">Son</span>
      <span className="son__etat" aria-hidden="true">{actif ? 'activé' : 'coupé'}</span>
    </button>
  );
}
