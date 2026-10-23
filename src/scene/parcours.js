/**
 * La mise en scène : une seule chronologie GSAP, une navigation par
 * chapitres, et le monde WebGL.
 *
 * La chronologie est attachée au défilement (ScrollTrigger) : déplacer la
 * page, c'est déplacer la tête de lecture. Marche de l'astronaute, caméra,
 * soleil et contenus en découlent ; revenir en arrière rejoue tout à
 * l'envers, exactement.
 *
 * Le défilement est découpé en chapitres : un geste de molette, de doigt
 * ou de clavier mène au chapitre suivant ou précédent par une transition
 * animée (Lenis anime la position, la chronologie suit). La barre de
 * défilement reste libre et se recale sur le chapitre le plus proche.
 * La visite guidée et le retour au départ enchaînent ces transitions.
 *
 * Ne sont animés que `transform` et `opacity`. Avec une préférence de
 * mouvement réduit, ou sans JavaScript, la page reste une page ordinaire.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const UNITE = 70; // une unité de chronologie = 70 % de la hauteur d'écran
const MARCHE = 120; // mètres parcourus à pied pendant le voyage
const FOULEE = 2.6; // mètres par cycle de marche (deux pas)
const TAILLE = 1.55; // l'astronaute est grandi à l'écran, pour la lisibilité

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* Hasard déterministe : l'envol des lettres est toujours le même. */
const hasard = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const auRepos = (f) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(f, { timeout: 1200 })
    : window.setTimeout(f, 250);

const attendre = (ms) => new Promise((r) => window.setTimeout(r, ms));
const doux = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const tresDoux = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2);

export function lancer() {
  const doc = document.documentElement;
  const cinema = window.matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference)').matches;
  const tactile = window.matchMedia('(pointer: coarse)').matches;
  const toile = $('.monde__toile');

  const etat = {
    pas: 0,
    vol: 0,
    approche: 0,
    soleil: 0,
    plongee: 0,
    orbite: 0,
    derive: 0,
    chemin: 1,
    expo: 1.15,
    regard: 0,
    astro: 1,
  };

  let monde = null;
  let vivant = true;
  const nettoyages = [];
  const ecouter = (cible, type, f, opts) => {
    cible.addEventListener(type, f, opts);
    nettoyages.push(() => cible.removeEventListener(type, f, opts));
  };

  /* Le monde WebGL naît quand le navigateur souffle : jamais avant le
     premier affichage, jamais en concurrence avec lui. */
  const naissance = new Promise((resoudre) => {
    auRepos(() => {
      import('./monde.js')
        .then(({ creerMonde, choisirQualite }) => {
          if (!vivant || !toile) return resoudre(null);
          try {
            const params = new URLSearchParams(window.location.search);
            monde = creerMonde(toile, {
              qualite: params.get('qualite') || choisirQualite(),
              adaptatif: params.get('adaptatif') !== 'non',
              // Réservé aux captures de l'affiche, rendues sans GPU.
              logiciel: params.get('logiciel') === 'oui',
              etat,
              surPret: () => doc.classList.add('monde-pret'),
            });
          } catch (err) {
            monde = null;
          }
          if (!monde) doc.classList.add('monde-fixe');
          return resoudre(monde);
        })
        .catch(() => resoudre(null));
    });
  });

  /* Les calques du personnage de l'atelier, une fois la page chargée. */
  const preparerAtelier = () => auRepos(() => doc.classList.add('atelier-pret'));
  if (document.readyState === 'complete') preparerAtelier();
  else ecouter(window, 'load', preparerAtelier, { once: true });

  /* ---------- page ordinaire : le monde n'est qu'un décor ---------- */
  if (!cinema) {
    const peindre = () => {
      if (!monde) return;
      monde.preparer();
      monde.redimensionner();
      monde.rendre(12);
    };
    naissance.then(peindre);
    ecouter(window, 'resize', peindre);

    // Visite guidée sans mouvement : on passe de section en section.
    let visite = 0;
    ecouter(document, 'click', async (e) => {
      if (!e.target.closest || !e.target.closest('[data-visite]')) return;
      const jeton = (visite += 1);
      for (const s of $$('.plan')) {
        if (jeton !== visite) return;
        s.scrollIntoView({ behavior: 'auto', block: 'start' });
        await attendre(2600);
      }
    });
    ecouter(window, 'wheel', () => (visite += 1), { passive: true });
    ecouter(window, 'keydown', () => (visite += 1));
    return () => {
      vivant = false;
      nettoyages.forEach((f) => f());
      if (monde) monde.detruire();
    };
  }

  /* ---------- la scène ---------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Lenis n'écoute ni la molette ni le doigt : la navigation par chapitres
  // s'en charge. Il anime la position de la page, en douceur.
  const lenis = new Lenis({ smoothWheel: false, syncTouch: false, autoRaf: false, virtualScroll: () => false });
  lenis.on('scroll', ScrollTrigger.update);
  const battre = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(battre);
  gsap.ticker.lagSmoothing(0);

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const chapitres = [];
  const chapitre = (id, nom, t, plan) => chapitres.push({ id, nom, t, plan });

  /** Un contenu arrive du fond, se laisse lire, puis passe derrière nous. */
  function profondeur(plan, t, { approche = 0.85, tenue = 1.4, sortie = 0.55 } = {}) {
    const corps = $('.plan__corps', plan);
    tl.fromTo(corps, { z: -2200, rotationX: 8 }, { z: -40, rotationX: 0, duration: approche, ease: 'power3.out' }, t);
    tl.fromTo(corps, { opacity: 0 }, { opacity: 1, duration: approche * 0.55, ease: 'power1.in' }, t);
    tl.fromTo(corps, { z: -40 }, { z: 40, duration: tenue, immediateRender: false }, t + approche);
    const fin = t + approche + tenue;
    tl.fromTo(corps, { z: 40, rotationX: 0 }, { z: 760, rotationX: -6, duration: sortie, ease: 'power1.in', immediateRender: false }, fin);
    tl.fromTo(corps, { opacity: 1 }, { opacity: 0, duration: sortie * 0.6, ease: 'power1.in', immediateRender: false }, fin);
    return { lecture: t + approche, milieu: t + approche + tenue * 0.45, fin: fin + sortie };
  }

  /* --- 1. Ouverture : le nom se disloque et vole vers nous. --- */
  const ouverture = $('.plan--ouverture');
  const lettres = $$('.nom__texte .lettre', ouverture);
  tl.fromTo(
    lettres,
    { z: 0, x: 0, y: 0, rotationX: 0, rotationY: 0, opacity: 1 },
    {
      z: (i) => 500 + hasard(i) * 800,
      x: (i) => (hasard(i + 7) - 0.5) * 360,
      y: (i) => (hasard(i + 3) - 0.6) * 280,
      rotationX: (i) => (hasard(i + 11) - 0.5) * 90,
      rotationY: (i) => (hasard(i + 5) - 0.5) * 60,
      opacity: 0,
      duration: 0.75,
      ease: 'power2.in',
      stagger: { each: 0.01, from: 'center' },
      immediateRender: false,
    },
    0.12
  );
  tl.fromTo(
    $$('.nom__lueur, .nom__reflet', ouverture),
    { opacity: 1 },
    { opacity: 0, duration: 0.3, immediateRender: false },
    0.1
  );
  tl.fromTo(
    ['.ouverture__lieu', '.ouverture__titre', '.ouverture__sous-titre', '.ouverture__actions', '.nom__trait'],
    { z: 0, opacity: 1 },
    { z: 420, opacity: 0, duration: 0.55, ease: 'power2.in', stagger: 0.04, immediateRender: false },
    0.08
  );
  chapitre('haut', 'Départ', 0, ouverture);

  /* --- 2. Profil --- */
  const planProfil = $('.plan--profil');
  const profil = profondeur(planProfil, 0.7, { tenue: 1.3 });
  tl.fromTo($('.profil__cadre', planProfil), { z: -260, rotationY: 18 }, { z: 0, rotationY: 0, duration: 1, ease: 'power3.out' }, 0.7);
  tl.fromTo(
    $$('.profil__texte > *', planProfil),
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', stagger: 0.05 },
    0.85
  );
  chapitre('profil', '01 — Profil', profil.milieu, planProfil);

  /* --- 3. Projets --- */
  const planTitre = $('.plan--projets');
  const titre = profondeur(planTitre, profil.fin - 0.2, { approche: 0.8, tenue: 0.7, sortie: 0.5 });
  tl.fromTo(
    $$('.projets-titre__mot .lettre', planTitre),
    { z: -600, opacity: 0, rotationY: -50 },
    { z: 0, opacity: 1, rotationY: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 },
    profil.fin - 0.1
  );
  chapitre('projets', '02 — Projets', titre.milieu, planTitre);

  let t = titre.fin - 0.2;
  let finProjets = t;
  $$('.plan--projet').forEach((article, i) => {
    const sens = i % 2 ? -1 : 1;
    const p = profondeur(article, t, { approche: 0.85, tenue: 1.4, sortie: 0.55 });
    const ecran = $('.projet__ecran', article);
    const cadre = $$('.projet__coin', article);
    const lignes = $$(
      '.projet__meta, .projet__titre, .projet__desc, .projet__points li, .projet__pile li, .projet__liens > *, .projet__scelle',
      article
    );
    tl.fromTo(ecran, { rotationY: 34 * sens, z: -200, x: 120 * sens }, { rotationY: 9 * sens, z: 0, x: 0, duration: 1, ease: 'power3.out' }, t);
    tl.fromTo(cadre, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.05 }, t + 0.3);
    tl.fromTo($('.projet__balayage', article), { xPercent: -130 }, { xPercent: 270, duration: 0.9, ease: 'power2.inOut' }, t + 0.45);
    tl.fromTo(lignes, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out', stagger: 0.035 }, t + 0.15);
    tl.fromTo(ecran, { rotationY: 9 * sens }, { rotationY: -18 * sens, duration: 0.55, ease: 'power2.in', immediateRender: false }, p.fin - 0.55);
    const nom = $('.projet__titre', article);
    // Le chapitre se pose une fois toutes les lignes arrivées.
    chapitre(article.id, `02 — ${nom ? nom.textContent : 'Projet'}`, t + 1.15, article);
    finProjets = p.fin;
    t = p.fin - 0.2;
  });

  /* --- Le voyage : marche, approche, course du soleil. --- */
  const arrivee = finProjets - 0.1;
  tl.fromTo(etat, { pas: 0, vol: 0, approche: 0 }, { pas: MARCHE, vol: 1500, approche: 1, duration: arrivee + 0.6 }, 0);
  tl.fromTo(etat, { soleil: 0 }, { soleil: 0.6, duration: arrivee * 0.8, ease: 'sine.inOut' }, 0);
  tl.fromTo(etat, { soleil: 0.6 }, { soleil: 1, duration: arrivee * 0.2 + 0.6, ease: 'sine.out', immediateRender: false }, arrivee * 0.8);
  chapitre('arrivee', 'Arrivée — la planète', arrivee + 0.6, null);

  /* Sans processeur graphique, l'affiche fixe joue le voyage : elle se
     rapproche lentement de la planète, puis plonge. */
  const afficheDepart = $('.monde__affiche--depart');
  const afficheOrbite = $('.monde__affiche--orbite');
  tl.fromTo(afficheDepart, { scale: 1 }, { scale: 1.3, duration: arrivee + 0.6 }, 0);
  tl.fromTo(afficheDepart, { scale: 1.3 }, { scale: 2.6, duration: 1.8, ease: 'power2.in', immediateRender: false }, arrivee + 0.7);

  /* --- 4. L'entrée dans la planète. --- */
  const plonge = arrivee + 0.7;
  const eclat = $('.eclat');
  const onde = $('.onde');
  tl.fromTo(etat, { plongee: 0, expo: 1.15 }, { plongee: 1, expo: 1.75, duration: 1.8, ease: 'power1.in' }, plonge);
  tl.fromTo(etat, { astro: 1 }, { astro: 0, duration: 0.6, ease: 'power1.in' }, plonge + 0.2);
  tl.fromTo(eclat, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.in' }, plonge + 1.35);
  tl.set(etat, { orbite: 1, expo: 1.15 }, plonge + 1.8);
  tl.set(afficheOrbite, { opacity: 1 }, plonge + 1.8);
  tl.fromTo(afficheOrbite, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: 'power2.out' }, plonge + 1.8);
  tl.fromTo(eclat, { opacity: 1 }, { opacity: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, plonge + 1.8);
  tl.fromTo(onde, { opacity: 0 }, { opacity: 0.9, duration: 0.02 }, plonge + 1.8);
  tl.fromTo(onde, { scale: 0.05, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 1.1, ease: 'power2.out', immediateRender: false }, plonge + 1.82);

  /* --- 5. L'atelier : le développeur et ses compétences. --- */
  const atelier = $('.plan--atelier');
  const corpsAtelier = $('.plan__corps', atelier);
  const tA = plonge + 1.95;
  tl.fromTo(corpsAtelier, { z: -1300, opacity: 0 }, { z: 0, opacity: 1, duration: 1, ease: 'power3.out' }, tA);
  tl.fromTo($('.plateforme', atelier), { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: 'power3.out' }, tA + 0.1);
  tl.fromTo($('.perso', atelier), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, tA + 0.2);
  tl.fromTo(
    $$('.competence', atelier),
    { scale: 0.3, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)', stagger: { each: 0.06, from: 'edges' } },
    tA + 0.45
  );
  tl.fromTo($$('.liaison', atelier), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.04 }, tA + 0.75);
  chapitre('competences', '03 — Compétences', tA + 1.35, atelier);

  /* --- 6. Contact : l'atelier s'efface, le regard se lève vers les
     étoiles (l'horizon descend), le contact s'avance. --- */
  const tC = tA + 1.9;
  tl.fromTo(corpsAtelier, { z: 0, opacity: 1 }, { z: -900, opacity: 0, duration: 0.8, ease: 'power2.in', immediateRender: false }, tC);
  tl.fromTo(etat, { regard: 0 }, { regard: 14, duration: 1.1, ease: 'power2.inOut' }, tC);
  const contact = $('.plan--contact');
  tl.fromTo($('.plan__corps', contact), { z: -1400, opacity: 0 }, { z: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, tC + 0.35);
  tl.fromTo(
    $$('.contact > *', contact),
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.05 },
    tC + 0.5
  );
  const fin = tC + 1.6;
  chapitre('contact', '04 — Contact', fin, contact);
  tl.fromTo(etat, { derive: 0 }, { derive: 1, duration: fin - plonge - 1.8 }, plonge + 1.8);
  tl.set({}, {}, fin);

  /* ---------- le défilement ---------- */
  const parcours = $('.parcours');
  parcours.style.height = `${tl.duration() * UNITE + 100}svh`;

  const hudChapitre = $('.hud__chapitre');
  const hudBarre = $('.hud__barre');
  let actif = -1;

  /** Le chapitre affiché : celui dont l'instant est le plus proche. */
  function chapitreA(temps) {
    let k = 0;
    for (let i = 1; i < chapitres.length; i += 1) {
      if (temps >= (chapitres[i - 1].t + chapitres[i].t) / 2) k = i;
    }
    return k;
  }

  function surMiseAJour() {
    const temps = tl.time();
    hudBarre.style.transform = `scaleY(${(temps / tl.duration()).toFixed(4)})`;
    const k = chapitreA(temps);
    if (k !== actif) {
      const avant = chapitres[actif];
      if (avant && avant.plan) avant.plan.classList.remove('est-actif');
      actif = k;
      const c = chapitres[k];
      if (c.plan) c.plan.classList.add('est-actif');
      hudChapitre.textContent = c.nom;
      doc.dataset.chapitre = c.id;
    }
  }

  const declencheur = ScrollTrigger.create({
    trigger: parcours,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate: surMiseAJour,
  });
  surMiseAJour();

  /* ---------- navigation par chapitres ---------- */
  const positionDe = (temps) => declencheur.start + ((declencheur.end - declencheur.start) * temps) / tl.duration();
  let enMouvement = false;
  let calme = 0;

  function aller(index, { duree = null, facon = doux } = {}) {
    const i = Math.max(0, Math.min(chapitres.length - 1, index));
    const depart = tl.time();
    const arrivee2 = chapitres[i].t;
    const ecart = Math.abs(arrivee2 - depart);
    const d = duree ?? Math.min(3.4, Math.max(1.05, 0.75 + ecart * 0.42));
    enMouvement = true;
    return new Promise((fini) => {
      lenis.scrollTo(positionDe(arrivee2), {
        duration: d,
        easing: facon,
        force: true,
        onComplete: () => {
          enMouvement = false;
          calme = performance.now();
          fini();
        },
      });
    });
  }

  /** Un élément intérieur qui peut encore défiler dans ce sens garde le geste. */
  function interieurDefile(cibleEv, sens) {
    const zone = cibleEv.closest && cibleEv.closest('.plan__defile');
    if (!zone || zone.scrollHeight <= zone.clientHeight + 2) return false;
    if (sens > 0) return zone.scrollTop + zone.clientHeight < zone.scrollHeight - 2;
    return zone.scrollTop > 2;
  }

  let cumul = 0;
  function geste(sens) {
    const maintenant = performance.now();
    // Un geste à la fois : l'inertie d'un pavé tactile ne doit pas sauter
    // deux chapitres.
    if (enMouvement || maintenant - calme < 260) return;
    const k = chapitreA(tl.time());
    aller(k + sens);
  }

  ecouter(
    window,
    'wheel',
    (e) => {
      if (e.ctrlKey) return;
      const sens = Math.sign(e.deltaY);
      if (interieurDefile(e.target, sens)) return;
      e.preventDefault();
      arreterVisite();
      if (enMouvement || performance.now() - calme < 260) {
        calme = Math.max(calme, performance.now() - 120);
        cumul = 0;
        return;
      }
      cumul += e.deltaY;
      if (Math.abs(cumul) > 24) {
        geste(Math.sign(cumul));
        cumul = 0;
      }
    },
    { passive: false }
  );

  let departDoigt = null;
  let defileDoigt = false;
  ecouter(
    window,
    'touchstart',
    (e) => {
      departDoigt = e.touches[0].clientY;
      defileDoigt = false;
    },
    { passive: true }
  );
  ecouter(
    window,
    'touchmove',
    (e) => {
      if (departDoigt === null) return;
      const dy = departDoigt - e.touches[0].clientY;
      if (interieurDefile(e.target, Math.sign(dy))) {
        defileDoigt = true;
        return;
      }
      if (!defileDoigt) e.preventDefault();
    },
    { passive: false }
  );
  ecouter(
    window,
    'touchend',
    (e) => {
      if (departDoigt === null) return;
      const dy = departDoigt - e.changedTouches[0].clientY;
      departDoigt = null;
      if (defileDoigt || Math.abs(dy) < 36) return;
      arreterVisite();
      geste(Math.sign(dy));
    },
    { passive: true }
  );

  ecouter(window, 'keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const champ = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if (champ) return;
    const bouton = e.target.closest && e.target.closest('a, button');
    let sens = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && !bouton)) sens = 1;
    if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && !bouton)) sens = -1;
    if (e.key === 'Escape') arreterVisite();
    if (e.key === 'Home') {
      e.preventDefault();
      retourAuDepart();
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      aller(chapitres.length - 1);
      return;
    }
    if (!sens) return;
    e.preventDefault();
    arreterVisite();
    geste(sens);
  });

  // Barre de défilement déplacée à la main : on se recale doucement sur
  // le chapitre le plus proche, une fois le geste terminé.
  let recalage = 0;
  ecouter(
    window,
    'scroll',
    () => {
      if (enMouvement || visiteEnCours) return;
      window.clearTimeout(recalage);
      recalage = window.setTimeout(() => {
        if (enMouvement || visiteEnCours) return;
        const k = chapitreA(tl.time());
        if (Math.abs(window.scrollY - positionDe(chapitres[k].t)) > 4) aller(k, { duree: 0.8 });
      }, 220);
    },
    { passive: true }
  );

  /* Les ancres mènent au bon chapitre. */
  ecouter(document, 'click', (e) => {
    const lien = e.target.closest && e.target.closest('a[href^="#"]');
    if (!lien) return;
    const id = lien.getAttribute('href').slice(1);
    const i = chapitres.findIndex((c) => c.id === id);
    if (i < 0) return;
    e.preventDefault();
    arreterVisite();
    if (id === 'haut') retourAuDepart();
    else aller(i);
  });

  /* Au clavier, un élément qui reçoit le focus amène sa scène à l'écran. */
  ecouter(document, 'focusin', (e) => {
    const plan = e.target.closest && e.target.closest('.plan');
    if (!plan || visiteEnCours) return;
    const i = chapitres.findIndex((c) => c.plan === plan);
    if (i >= 0 && i !== chapitreA(tl.time())) aller(i, { duree: 0.9 });
  });

  /* ---------- visite guidée et retour au départ ---------- */
  const bandeauTitre = $('.visite__titre');
  let visiteEnCours = false;
  let jetonVisite = 0;

  function arreterVisite() {
    if (!visiteEnCours) return;
    visiteEnCours = false;
    jetonVisite += 1;
    doc.classList.remove('en-visite');
    lenis.stop();
    lenis.start();
    enMouvement = false;
    calme = performance.now();
  }

  async function lancerVisite() {
    if (visiteEnCours) return;
    visiteEnCours = true;
    const jeton = (jetonVisite += 1);
    doc.classList.add('en-visite');
    const pauses = { haut: 900, profil: 2600, projets: 1400, arrivee: 600, competences: 3000, contact: 2400 };
    if (chapitreA(tl.time()) !== 0) {
      bandeauTitre.textContent = 'Retour au départ';
      await aller(0, { duree: 2.2, facon: tresDoux });
    }
    for (let i = 1; i < chapitres.length; i += 1) {
      if (jeton !== jetonVisite) return;
      bandeauTitre.textContent = chapitres[i].nom;
      const ecart = chapitres[i].t - chapitres[i - 1].t;
      await aller(i, { duree: Math.min(3.2, 1.2 + ecart * 0.38), facon: tresDoux });
      if (jeton !== jetonVisite) return;
      await attendre(pauses[chapitres[i].id] ?? 2400);
    }
    if (jeton === jetonVisite) arreterVisite();
  }

  async function retourAuDepart() {
    if (visiteEnCours) arreterVisite();
    bandeauTitre.textContent = 'Retour au départ';
    doc.classList.add('en-retour');
    const ecart = tl.time();
    await aller(0, { duree: Math.min(4.2, 1.4 + ecart * 0.12), facon: tresDoux });
    doc.classList.remove('en-retour');
    const marque = $('.nav__marque');
    if (marque) marque.focus({ preventScroll: true });
  }

  ecouter(document, 'click', (e) => {
    if (e.target.closest && e.target.closest('[data-visite]')) {
      e.preventDefault();
      lancerVisite();
    }
    if (e.target.closest && e.target.closest('[data-arreter-visite]')) {
      e.preventDefault();
      arreterVisite();
    }
  });

  /* ---------- le regard suit légèrement la souris ---------- */
  const souris = { x: 0, y: 0, cx: 0, cy: 0 };
  if (!tactile) {
    ecouter(
      window,
      'pointermove',
      (e) => {
        souris.x = (e.clientX / window.innerWidth - 0.5) * 2;
        souris.y = -(e.clientY / window.innerHeight - 0.5) * 2;
        if (monde) monde.orienterSouris(souris.x, souris.y);
      },
      { passive: true }
    );
  }
  const lignesNom = $$('.nom__ligne', ouverture);

  /* ---------- l'astronaute ---------- */
  const astronaute = $('.astronaute');
  const corps = $('.astronaute__corps', astronaute);
  const [jambeG, jambeD] = $$('.astronaute__jambe', astronaute);
  const [brasG, brasD] = $$('.astronaute__bras', astronaute);
  const [semelleG, semelleD] = $$('.astronaute__semelle', astronaute);
  const lisere = $('.astronaute__lisere', astronaute);
  let dernierPas = -1;
  let derniereCle = '';

  function poserAstronaute() {
    const a = monde.astro;
    const opacite = a.visible ? etat.astro : 0;
    const cle = `${a.x.toFixed(1)}|${a.y.toFixed(1)}|${a.echelle.toFixed(3)}|${opacite.toFixed(3)}`;
    if (cle !== derniereCle) {
      derniereCle = cle;
      astronaute.style.transform = `translate3d(${(a.x - 60).toFixed(1)}px, ${(a.y - 196).toFixed(1)}px, 0) scale(${((a.echelle * TAILLE) / 186).toFixed(4)})`;
      astronaute.style.opacity = opacite.toFixed(3);
      lisere.setAttribute('opacity', (0.55 + 0.45 * Math.min(etat.soleil / 0.6, 1)).toFixed(3));
    }
    if (etat.pas === dernierPas) return;
    dernierPas = etat.pas;
    // Cycle de marche vu de dos : la jambe qui avance se raccourcit et se
    // soulève, celle qui pousse découvre sa semelle ; les bras balancent à
    // contretemps, le buste se balance au-dessus de la jambe d'appui.
    const phi = (etat.pas / FOULEE) * Math.PI * 2;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    const jambe = (lev) => {
      const k = 1 - lev * 0.17;
      return `translate(0 ${(116 * (1 - k) - lev * 8).toFixed(2)}) scale(1 ${k.toFixed(3)})`;
    };
    jambeG.setAttribute('transform', jambe(Math.max(0, s)));
    jambeD.setAttribute('transform', jambe(Math.max(0, -s)));
    semelleG.setAttribute('opacity', (Math.max(0, -s) * Math.max(0, c) * 1.6).toFixed(2));
    semelleD.setAttribute('opacity', (Math.max(0, s) * Math.max(0, -c) * 1.6).toFixed(2));
    brasG.setAttribute('transform', `rotate(${(-s * 6).toFixed(2)} 33 56) translate(0 ${(Math.max(0, -s) * -2).toFixed(2)})`);
    brasD.setAttribute('transform', `rotate(${(-s * 6).toFixed(2)} 87 56) translate(0 ${(Math.max(0, s) * -2).toFixed(2)})`);
    corps.setAttribute(
      'transform',
      `translate(${(s * 1.3).toFixed(2)} ${(-(1 - Math.abs(s)) * 2).toFixed(2)}) rotate(${(s * 1.2).toFixed(2)} 60 196)`
    );
  }

  /* Une seule boucle d'images : Lenis, puis la chronologie, puis le monde. */
  const dessiner = (temps) => {
    souris.cx += (souris.x - souris.cx) * 0.06;
    souris.cy += (souris.y - souris.cy) * 0.06;
    if (actif === 0 && lignesNom.length) {
      for (let i = 0; i < lignesNom.length; i += 1) {
        const p = 1 + i * 0.6;
        lignesNom[i].style.transform = `translate3d(${(souris.cx * 7 * p).toFixed(2)}px, ${(-souris.cy * 4 * p).toFixed(2)}px, 0)`;
      }
    }
    if (!monde) return;
    monde.rendre(temps);
    poserAstronaute();
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    if (monde) monde.redimensionner();
  });

  return () => {
    vivant = false;
    arreterVisite();
    nettoyages.forEach((f) => f());
    gsap.ticker.remove(dessiner);
    gsap.ticker.remove(battre);
    declencheur.kill();
    tl.kill();
    lenis.destroy();
    if (monde) monde.detruire();
  };
}
