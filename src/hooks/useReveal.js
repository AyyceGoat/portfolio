import { useEffect } from 'react';

const SETTLE_MS = 900;

/**
 * Revele les elements portant la classe .reveal quand ils entrent dans
 * le champ. On passe par IntersectionObserver plutot que par un
 * ecouteur de defilement : le calcul se fait hors du fil principal.
 *
 * Chaque element n'est observe qu'une fois, puis relache : la liste
 * d'observation se vide a mesure que la page defile.
 */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (els.length === 0) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sans animation demandee, ou sans API disponible : tout est
    // visible immediatement, rien n'est jamais masque a la lecture.
    if (reduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-visible', 'is-settled'));
      return;
    }

    const timers = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          el.classList.add('is-visible');
          observer.unobserve(el);

          // will-change coute de la memoire video : on le retire
          // une fois la transition jouee.
          const delay = Number.parseInt(el.style.getPropertyValue('--reveal-delay'), 10) || 0;
          const t = window.setTimeout(() => {
            el.classList.add('is-settled');
            timers.delete(t);
          }, SETTLE_MS + delay);
          timers.add(t);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );

    els.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
}
