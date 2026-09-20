import { useCallback, useEffect, useRef } from 'react';

const MAX_DEG = 4.5;   // au-dela, l'effet devient un gadget
const LIFT_PX = 6;

/**
 * Incline legerement un element selon la position du curseur.
 *
 * Trois garde-fous : rien au tactile (ou le survol n'existe pas),
 * rien si l'utilisateur demande moins d'animation, et une seule
 * ecriture de style par image grace a requestAnimationFrame.
 *
 * On n'ecrit que des variables consommees par un transform : aucune
 * propriete touchee ici ne declenche de recalcul de mise en page.
 */
export function useTilt() {
  const ref = useRef(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    enabled.current = fine && !reduced;

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const onMove = useCallback((event) => {
    if (!enabled.current || !ref.current) return;
    const el = ref.current;
    const { clientX, clientY } = event;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      // Position du curseur ramenee dans l'intervalle [-0.5, 0.5]
      const px = (clientX - r.left) / r.width - 0.5;
      const py = (clientY - r.top) / r.height - 0.5;

      el.style.setProperty('--rx', `${(-py * MAX_DEG).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(px * MAX_DEG).toFixed(2)}deg`);
      el.style.setProperty('--lift', `${-LIFT_PX}px`);
      // Valeurs nues, reutilisables dans un calc() pour decaler des
      // plans les uns par rapport aux autres (parallaxe du schema).
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      // Position du reflet, exprimee en pourcentage de la surface
      el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
    });
  }, []);

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    const el = ref.current;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--lift', '0px');
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    });
  }, []);

  return { ref, onMouseMove: onMove, onMouseLeave: onLeave };
}
