import { useLayoutEffect } from 'react';

const SETTLE_MS = 1100;

/**
 * Revele les elements .reveal quand ils entrent dans le champ.
 *
 * La page arrive rendue par le serveur, entierement visible. Avant de
 * poser la classe html.anime — qui seule autorise l'etat cache — on
 * marque comme deja visibles les elements presents a l'ecran. Le tout
 * se fait avant la premiere peinture : rien de ce que le lecteur voit
 * deja ne disparait, et rien n'est jamais masque sans raison.
 */
export function useReveal() {
  useLayoutEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (els.length === 0 || reduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-visible', 'is-settled'));
      return undefined;
    }

    const h = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.92 && r.bottom > 0) el.classList.add('is-visible', 'is-settled');
    }
    document.documentElement.classList.add('anime');

    const timers = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          el.classList.add('is-visible');
          observer.unobserve(el);
          const t = window.setTimeout(() => {
            el.classList.add('is-settled');
            timers.delete(t);
          }, SETTLE_MS);
          timers.add(t);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    els.forEach((el) => {
      if (!el.classList.contains('is-visible')) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
}
