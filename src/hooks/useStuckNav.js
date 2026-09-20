import { useEffect, useState } from 'react';

/**
 * Indique si la page a quitte le haut. On observe une sentinelle
 * placee sous la barre plutot que d'ecouter le defilement : aucun
 * travail n'est fait pendant le scroll lui-meme.
 */
export function useStuckNav() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;';
    document.body.prepend(sentinel);

    if (typeof IntersectionObserver === 'undefined') {
      sentinel.remove();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  return stuck;
}
