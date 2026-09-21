import { useEffect, useRef, useState } from 'react';

const ACCENT = '#6E9BFF';
const BASE = '#8493A6';

/** Le navigateur sait-il rendre du WebGL ? */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Regle la densite selon l'appareil. Un telephone recoit trois fois
 * moins de points et une resolution plafonnee : c'est ce qui permet
 * de tenir la meme fluidite que sur un poste de travail.
 */
function pickQuality() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 820;
  const cores = navigator.hardwareConcurrency || 4;
  const modeste = coarse || narrow || cores <= 4;

  return modeste
    ? { points: 9000, maxPixelRatio: 1.5, segments: 36, minFrameMs: 32 }
    : { points: 38000, maxPixelRatio: 2, segments: 64, minFrameMs: 0 };
}

export default function Globe({ heroRef }) {
  const canvasRef = useRef(null);
  const globeRef = useRef(null);
  // 'attente' | 'vivant' | 'fixe' — 'fixe' declenche l'image de repli.
  const [mode, setMode] = useState('attente');

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Sans WebGL, ou si l'on demande moins d'animation : image fixe,
    // et three.js n'est jamais telecharge.
    if (reduced || !hasWebGL()) {
      setMode('fixe');
      return undefined;
    }

    let alive = true;
    let handle = null;

    const boot = async () => {
      try {
        const { createGlobe } = await import('./createGlobe.js');
        if (!alive || !canvasRef.current) return;

        const globe = await createGlobe({
          canvas: canvasRef.current,
          accent: ACCENT,
          base: BASE,
          quality: pickQuality(),
        });
        if (!alive) {
          globe.destroy();
          return;
        }

        globeRef.current = globe;
        globe.resize(window.innerWidth, window.innerHeight);
        globe.start();
        setMode('vivant');
      } catch (e) {
        // Pilote defaillant, memoire insuffisante, chunk indisponible :
        // on retombe sur l'image plutot que de laisser un trou.
        if (alive) setMode('fixe');
      }
    };

    // On attend que le navigateur ait fini d'afficher le texte du
    // hero avant de reclamer three.js.
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 300));
    handle = idle(boot, { timeout: 2500 });

    return () => {
      alive = false;
      if (window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      }
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, []);

  /* --- Dimension, defilement, visibilite -------------------------- */

  useEffect(() => {
    if (mode !== 'vivant') return undefined;
    const globe = globeRef.current;
    if (!globe) return undefined;

    let ticking = false;
    // Hauteur du hero mise en cache : la lire pendant le defilement
    // forcerait le navigateur a recalculer la mise en page a chaque
    // image. On ne la remesure qu'au redimensionnement.
    let span = Math.max(1, (heroRef.current?.offsetHeight || window.innerHeight) * 0.85);

    const onResize = () => {
      globe.resize(window.innerWidth, window.innerHeight);
      span = Math.max(1, (heroRef.current?.offsetHeight || window.innerHeight) * 0.85);
    };

    // Sur appareil modeste, le globe ne se disperse pas pendant le
    // defilement : il s'efface en opacite, ce qui est composite par le
    // processeur graphique, et son rendu s'arrete net. Le defilement
    // est le moment ou la fluidite compte le plus — on lui rend la
    // totalite du fil principal.
    const menage = globe.allege;
    let efface = false;

    const readScroll = () => {
      ticking = false;
      const p = window.scrollY / span;

      if (menage) {
        const doitEffacer = p > 0.04;
        if (doitEffacer !== efface) {
          efface = doitEffacer;
          canvasRef.current?.classList.toggle('is-faded', efface);
          globe.setOnScreen(!efface);
        }
        if (efface) return;
      }

      globe.setScroll(p);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(readScroll);
    };

    const onVisibility = () => {
      globe.setVisible(document.visibilityState !== 'hidden');
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    // Le rendu s'arrete des que le hero a quitte l'ecran.
    let observer = null;
    if (!menage && heroRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => globe.setOnScreen(entry.isIntersecting),
        { threshold: 0 }
      );
      observer.observe(heroRef.current);
    }

    readScroll();

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (observer) observer.disconnect();
    };
  }, [mode, heroRef]);

  /* --- Curseur et glisser ----------------------------------------- */

  useEffect(() => {
    if (mode !== 'vivant') return undefined;
    const globe = globeRef.current;
    if (!globe) return undefined;

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pending = null;

    const flush = () => {
      pending = null;
    };

    const onMove = (e) => {
      if (dragging) {
        globe.dragMove(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      if (!fine) return;
      if (pending) return;
      pending = requestAnimationFrame(() => {
        flush();
        globe.setPointer(
          (e.clientX / window.innerWidth) * 2 - 1,
          (e.clientY / window.innerHeight) * 2 - 1
        );
      });
    };

    const onDown = (e) => {
      const hero = heroRef.current;
      if (!hero) return;
      // On ne prend la main ni en dehors du hero, ni sur un element
      // avec lequel on peut interagir.
      const r = hero.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      if (e.target.closest('a, button, [tabindex]')) return;

      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      globe.dragStart();
      document.body.classList.add('globe-saisi');
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      globe.dragEnd();
      document.body.classList.remove('globe-saisi');
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.classList.remove('globe-saisi');
      if (pending) cancelAnimationFrame(pending);
    };
  }, [mode, heroRef]);

  /* --- Rendu ------------------------------------------------------- */

  // Purement decoratif : l'information du hero est dans le texte,
  // jamais dans le globe. Rien n'est donc expose aux lecteurs d'ecran.
  return (
    <div className="globe" aria-hidden="true">
      {mode === 'fixe' ? (
        <img className="globe__still" src="/globe-still.webp" alt="" decoding="async" />
      ) : (
        <canvas
          className={`globe__canvas${mode === 'vivant' ? ' is-live' : ''}`}
          ref={canvasRef}
        />
      )}
    </div>
  );
}
