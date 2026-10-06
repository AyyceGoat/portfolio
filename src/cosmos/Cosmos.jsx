import { useEffect, useRef, useState } from 'react';

import { choisirNiveau, REGLAGES } from './niveau.js';

/**
 * Le ciel du site.
 *
 * Trois plans peints en CSS sont presents des le HTML rendu au serveur :
 * le fond de nebuleuse, une poussiere d'etoiles, un voile lumineux. La
 * page n'est donc jamais vide, meme avant le moindre JavaScript.
 *
 * Par-dessus, si l'appareil le permet, deux couches WebGL chargees apres
 * le premier affichage prennent le relais :
 *
 *  - les nuees, un seul quad peint par shader, qui traversent six regions
 *    de l'espace au fil du defilement : une par section ;
 *  - le champ d'etoiles, sa parallaxe et ses sauts en vitesse lumiere.
 *
 * Les nuees ne se repeignent que si la position de lecture a reellement
 * bouge : page immobile, cout nul.
 */
export default function Cosmos() {
  const canvasRef = useRef(null);
  const nueesRef = useRef(null);
  const fondRef = useRef(null);
  const voileRef = useRef(null);
  const [vivant, setVivant] = useState(false);
  const [nuageux, setNuageux] = useState(false);

  /* --- Passage d'une section a l'autre ------------------------------
     Signal commun au champ d'etoiles (impulsion de vitesse lumiere) et
     a l'ambiance sonore. Actif a tous les niveaux de rendu. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    let derniere = null;
    let instant = 0;
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const en of entrees) {
          if (!en.isIntersecting) continue;
          const id = en.target.id;
          if (id === derniere) continue;
          const premiere = derniere === null;
          derniere = id;
          const t = performance.now();
          if (premiere || t - instant < 900) continue;
          instant = t;
          window.dispatchEvent(new CustomEvent('cosmos:passage', { detail: { id } }));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    document.querySelectorAll('#haut, main > section').forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  /* --- Champ d'etoiles ------------------------------------------------ */
  useEffect(() => {
    let niveau = choisirNiveau();
    const racine = document.documentElement;
    racine.dataset.ciel = niveau;
    if (niveau === 'fixe') return undefined;

    let champ = null;
    let nuees = null;
    let actif = true;
    let course = 1;

    const mesurer = () => {
      course = Math.max(1, racine.scrollHeight - window.innerHeight);
    };
    mesurer();
    window.addEventListener('resize', mesurer, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(mesurer) : null;
    if (ro) ro.observe(document.body);

    // Les nebuleuses derivent lentement sur toute la longueur de la page :
    // on traverse le ciel en lisant. Seul transform est ecrit.
    // Reecrire un transform identique suffit a salir le style et a
    // relancer la passe de mise en forme pour rien. On ne pose que ce
    // qui change reellement.
    let dernierFond = '';
    let dernierVoile = '';
    const surCalques = (px, py, defil) => {
      const avance = Math.min(1, Math.max(0, defil / course));
      if (nuees) nuees.majour(px, avance);
      const p = avance - 0.5;
      if (fondRef.current) {
        const t = `translate3d(${(-px * 10).toFixed(1)}px, ${(-p * 7 + py * 0.6).toFixed(2)}vh, 0)`;
        if (t !== dernierFond) {
          fondRef.current.style.transform = t;
          dernierFond = t;
        }
      }
      if (voileRef.current) {
        const t = `translate3d(${(-px * 26).toFixed(1)}px, ${(-p * 22 + py * 1.2).toFixed(2)}vh, 0) scale(1.08)`;
        if (t !== dernierVoile) {
          voileRef.current.style.transform = t;
          dernierVoile = t;
        }
      }
    };

    const surPassage = () => {
      if (champ) champ.elan();
    };
    window.addEventListener('cosmos:passage', surPassage);

    const demarrer = async () => {
      try {
        const [{ creerChamp }, { creerNuees }] = await Promise.all([
          import('./champ.js'),
          import('./nebuleuse.js'),
        ]);
        if (!actif || !canvasRef.current) return;
        if (nueesRef.current) {
          nuees = creerNuees(nueesRef.current, REGLAGES[niveau].nuees);
          if (nuees) setNuageux(true);
        }
        champ = creerChamp(canvasRef.current, REGLAGES[niveau], {
          intro: window.scrollY < 80,
          surCalques,
          surDeclassement: (nv) => {
            niveau = nv;
            racine.dataset.ciel = nv;
            if (champ) champ.detruire();
            champ = null;
            setVivant(false);
            if (nuees) {
              nuees.detruire();
              nuees = null;
              setNuageux(false);
            }
          },
        });
        if (!champ) {
          racine.dataset.ciel = 'fixe';
          return;
        }
        setVivant(true);
      } catch (err) {
        racine.dataset.ciel = 'fixe';
      }
    };

    // Le texte d'abord, les etoiles ensuite.
    const viaIdle = typeof window.requestIdleCallback === 'function';
    const attente = viaIdle
      ? window.requestIdleCallback(demarrer, { timeout: 900 })
      : window.setTimeout(demarrer, 120);

    return () => {
      actif = false;
      if (viaIdle) window.cancelIdleCallback(attente);
      else window.clearTimeout(attente);
      window.removeEventListener('resize', mesurer);
      window.removeEventListener('cosmos:passage', surPassage);
      if (ro) ro.disconnect();
      if (champ) champ.detruire();
      if (nuees) nuees.detruire();
    };
  }, []);

  return (
    <div className={`ciel${nuageux ? ' ciel--nuees' : ''}`} aria-hidden="true">
      <div className="ciel__fond" ref={fondRef} />
      <div className="ciel__poussiere" />
      <div className="ciel__voile" ref={voileRef} />
      <canvas className={`ciel__nuees${nuageux ? ' is-vivant' : ''}`} ref={nueesRef} />
      <canvas className={`ciel__champ${vivant ? ' is-vivant' : ''}`} ref={canvasRef} />
    </div>
  );
}
