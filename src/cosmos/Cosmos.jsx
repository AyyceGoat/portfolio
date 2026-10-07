import { useEffect, useRef, useState } from 'react';

import { choisirNiveau, REGLAGES } from './niveau.js';
import { PLANS, source, variante } from './plans.js';

/**
 * Le ciel du site.
 *
 * Six photographies du telescope James Webb, une par section, se
 * succedent en fondu au fil de la lecture : on descend d'une region de
 * l'espace a une autre. L'image du hero est servie par le CSS des le
 * premier octet ; les suivantes ne sont telechargees qu'a l'approche de
 * leur section, et decodees avant d'apparaitre — jamais de fondu sur une
 * image a moitie peinte.
 *
 * Trois mouvements donnent la profondeur, tous confies au compositeur :
 *  - une derive tres lente de la photo affichee (animation CSS) ;
 *  - la parallaxe du plan photographique au curseur et au defilement ;
 *  - par-dessus, le champ d'etoiles WebGL, plus proche, donc plus mobile,
 *    qui scintille et porte les aigrettes des etoiles brillantes.
 */
export default function Cosmos() {
  const canvasRef = useRef(null);
  const photosRef = useRef(null);
  const [vivant, setVivant] = useState(false);

  /* --- Les photographies ----------------------------------------------
     Actives a tous les niveaux de rendu, y compris le ciel fixe : seul
     le mouvement disparait, jamais l'image. */
  useEffect(() => {
    const boite = photosRef.current;
    if (!boite) return undefined;
    const plans = {};
    boite.querySelectorAll('[data-plan]').forEach((el) => {
      plans[el.dataset.plan] = el;
    });

    let v = variante();
    const charges = new Map(); // region -> cadrage deja peint
    const enCours = new Map(); // region -> cadrage en cours de chargement
    let courant = 'haut';
    let affiche = 'haut';
    let monte = true;

    // Le hero est peint par le CSS, avec les memes requetes media.
    charges.set('haut', v);

    const afficher = (nom) => {
      if (nom === affiche || !charges.get(nom)) return;
      plans[affiche].classList.remove('is-actif');
      plans[nom].classList.add('is-actif');
      affiche = nom;
    };

    const charger = (nom) => {
      if (nom === 'haut' || !plans[nom]) return;
      if (charges.get(nom) === v || enCours.get(nom) === v) return;
      const voulue = v;
      const url = source(nom, voulue);
      enCours.set(nom, voulue);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      const pret = () => {
        if (!monte || voulue !== v) return;
        enCours.delete(nom);
        plans[nom].firstChild.style.backgroundImage = `url("${url}")`;
        charges.set(nom, voulue);
        if (nom === courant) afficher(nom);
      };
      (img.decode ? img.decode() : Promise.resolve()).then(pret, pret);
    };

    const voisins = (nom) => {
      const i = PLANS.indexOf(nom);
      charger(nom);
      if (PLANS[i + 1]) charger(PLANS[i + 1]);
      if (PLANS[i - 1]) charger(PLANS[i - 1]);
    };

    const montrer = (nom) => {
      if (!plans[nom]) return;
      courant = nom;
      voisins(nom);
      afficher(nom);
    };

    /* Passage d'une section a l'autre : une bande au milieu de l'ecran.
       La photo suit chaque passage ; l'impulsion du champ d'etoiles,
       elle, est espacee. */
    let derniere = null;
    let instant = 0;
    const obs =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entrees) => {
              for (const en of entrees) {
                if (!en.isIntersecting) continue;
                const id = en.target.id;
                if (id === derniere) continue;
                const premiere = derniere === null;
                derniere = id;
                montrer(id);
                const t = performance.now();
                if (premiere || t - instant < 900) continue;
                instant = t;
                window.dispatchEvent(new CustomEvent('cosmos:passage', { detail: { id } }));
              }
            },
            { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
          );
    if (obs) document.querySelectorAll('#haut, main > section').forEach((s) => obs.observe(s));

    // La region suivante se prepare des que la page est au repos.
    const viaIdle = typeof window.requestIdleCallback === 'function';
    const attente = viaIdle
      ? window.requestIdleCallback(() => voisins(courant), { timeout: 2500 })
      : window.setTimeout(() => voisins(courant), 1500);

    // Rotation de l'ecran : le cadrage change, on recharge ce qui se voit.
    let delai = 0;
    const surTaille = () => {
      window.clearTimeout(delai);
      delai = window.setTimeout(() => {
        const nv = variante();
        if (nv === v) return;
        v = nv;
        charges.set('haut', v);
        voisins(courant);
      }, 300);
    };
    window.addEventListener('resize', surTaille, { passive: true });

    return () => {
      monte = false;
      if (obs) obs.disconnect();
      if (viaIdle) window.cancelIdleCallback(attente);
      else window.clearTimeout(attente);
      window.clearTimeout(delai);
      window.removeEventListener('resize', surTaille);
    };
  }, []);

  /* --- Champ d'etoiles et parallaxe ----------------------------------- */
  useEffect(() => {
    let niveau = choisirNiveau();
    const racine = document.documentElement;
    racine.dataset.ciel = niveau;
    if (niveau === 'fixe') return undefined;

    let champ = null;
    let actif = true;
    let course = 1;

    const mesurer = () => {
      course = Math.max(1, racine.scrollHeight - window.innerHeight);
    };
    mesurer();
    window.addEventListener('resize', mesurer, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(mesurer) : null;
    if (ro) ro.observe(document.body);

    // Le plan photographique est lointain : il bouge peu, les etoiles
    // WebGL davantage. Reecrire un transform identique suffit a salir le
    // style ; on ne pose que ce qui change reellement.
    let dernier = '';
    const surCalques = (px, py, defil) => {
      const el = photosRef.current;
      if (!el) return;
      const p = Math.min(1, Math.max(0, defil / course)) - 0.5;
      const t = `translate3d(${(-px * 14).toFixed(1)}px, ${(-p * 3 + py * 0.9).toFixed(2)}vh, 0)`;
      if (t !== dernier) {
        el.style.transform = t;
        dernier = t;
      }
    };

    const surPassage = () => {
      if (champ) champ.elan();
    };
    window.addEventListener('cosmos:passage', surPassage);

    const demarrer = async () => {
      try {
        const { creerChamp } = await import('./champ.js');
        if (!actif || !canvasRef.current) return;
        champ = creerChamp(canvasRef.current, REGLAGES[niveau], {
          intro: window.scrollY < 80,
          surCalques,
          surDeclassement: (nv) => {
            niveau = nv;
            racine.dataset.ciel = nv;
            if (champ) champ.detruire();
            champ = null;
            setVivant(false);
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
    };
  }, []);

  return (
    <div className="ciel" aria-hidden="true">
      <div className="ciel__photos" ref={photosRef}>
        {PLANS.map((nom) => (
          <div
            key={nom}
            className={`ciel__plan ciel__plan--${nom}${nom === 'haut' ? ' is-actif' : ''}`}
            data-plan={nom}
          >
            <div className="ciel__image" />
          </div>
        ))}
      </div>
      <div className="ciel__voile" />
      <canvas className={`ciel__champ${vivant ? ' is-vivant' : ''}`} ref={canvasRef} />
    </div>
  );
}
