/**
 * La mise en scène du voyage : un geste, une étape.
 *
 * Le voyage est une suite d'étapes : le titre, la présentation, « Mes
 * réalisations », chaque projet, le poste de travail au bout du chemin,
 * le contact. Un geste — un cran de molette, un glissement sur le pavé
 * tactile, un balayage au doigt, une flèche du clavier — fait passer à
 * l'étape suivante ; le geste inverse ramène à la précédente.
 *
 * Le geste ne fait pas défiler la marche : il la déclenche. L'astronaute
 * marche alors à son allure naturelle jusqu'à l'étape suivante (un pas,
 * environ une seconde), puis s'arrête, sur l'un de ses deux appuis. Pendant ce temps, la page défile d'elle-même : une
 * chronologie GSAP, attachée au défilement (ScrollTrigger), fait avancer
 * la caméra et entrer les étapes. Tant qu'une transition dure, les
 * gestes sont ignorés ; ensuite, un nouveau geste n'est accepté qu'une
 * fois l'élan de la molette ou du pavé retombé (150 ms sans événement).
 *
 * L'astronaute est un cycle de marche tiré d'une vidéo, agrandi et
 * détouré (scripts/marche.py) : ses images sont préchargées, la moins
 * fine d'abord. Le monde calcule où se posent ses pieds.
 *
 * Ne sont animés que `transform`, `opacity` et le dévoilement des images
 * des projets. Avec une préférence de mouvement réduit, ou sans
 * JavaScript, la page reste une page ordinaire, devant une image fixe.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MARCHE } from './marche.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const auRepos = (f) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(f, { timeout: 1200 })
    : window.setTimeout(f, 250);
const borne = (x, a, b) => Math.min(b, Math.max(a, x));

/** L'allure d'une marche : on part, on marche d'un pas égal, on s'arrête. */
const ELAN = 0.22;
const allure = (x) => {
  const v = 1 / (1 - ELAN);
  if (x < ELAN) return (v * x * x) / (2 * ELAN);
  if (x > 1 - ELAN) return 1 - (v * (1 - x) * (1 - x)) / (2 * ELAN);
  return v * (x - ELAN / 2);
};

/* Le voyage, en hauteurs d'écran de défilement (la page défile d'elle-même,
   ces longueurs ne règlent que l'enchaînement des animations). */
const PAS = 0.85;
const ARRIVEE = 0.8;

/* D'une étape à la suivante, un pas : un demi-cycle de la vidéo, à
   l'allure naturelle sur le palier de vitesse. L'astronaute s'arrête
   ainsi toujours sur l'un de ses deux appuis. */
const PAS_PAR_ETAPE = 0.5;
const DUREE_PAS = borne((MARCHE.cycle * PAS_PAR_ETAPE) / (1 - ELAN), 1.0, 1.4);
const DUREE_ARRIVEE = 1.5;
const DUREE_SECTION = 1.1;
const CALME = 150; // ms sans événement : l'élan est retombé

export function lancer() {
  const doc = document.documentElement;
  const cinema = window.matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference)').matches;
  const nettoyages = [];
  const ecouter = (cible, type, f, opts) => {
    cible.addEventListener(type, f, opts);
    nettoyages.push(() => cible.removeEventListener(type, f, opts));
  };

  /* Les calques du personnage de l'atelier, une fois la page chargée. */
  const preparerAtelier = () => auRepos(() => doc.classList.add('atelier-pret'));
  if (document.readyState === 'complete') preparerAtelier();
  else ecouter(window, 'load', preparerAtelier, { once: true });

  if (!cinema) {
    return () => nettoyages.forEach((f) => f());
  }

  /* ---------- la page ne défile plus que d'elle-même ---------- */
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  doc.classList.add('par-etapes');

  const panneaux = $$('.panneau');
  const n = panneaux.length;
  const C_PROFIL = PAS;
  const C_REAL = C_PROFIL + PAS;
  const C_PROJET = (i) => C_REAL + PAS * (i + 1);
  const C_DERNIER = C_PROJET(n - 1);
  const total = C_DERNIER + ARRIVEE;
  const voyage = $('.voyage');
  voyage.style.height = `${(total + 1) * 100}svh`;

  const etat = { marche: 0, arrivee: 0, apres: 0 };
  let monde = null;
  let vivant = true;
  let fin = 1;

  /* ---------- la chronologie du voyage ---------- */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const marche = { p: 0 };
  tl.to(marche, { p: 1, duration: total }, 0);
  tl.to(etat, { arrivee: 1, duration: ARRIVEE - 0.1, ease: 'power1.inOut' }, C_DERNIER + 0.1);
  tl.set({}, {}, total);

  const ENTREE = 0.55;
  const LECTURE = 0.05;
  /** Une étape : entrée achevée juste avant son point de lecture, sortie
      juste après. */
  function etape(el, c, de, vers, sortieVers) {
    if (!el) return;
    tl.fromTo(el, { ...de, opacity: 0 }, { ...vers, opacity: 1, duration: ENTREE, ease: 'power3.out' }, c - LECTURE - ENTREE);
    if (sortieVers) {
      tl.fromTo(
        el,
        { ...vers, opacity: 1 },
        { ...sortieVers, opacity: 0, duration: 0.3, ease: 'power2.in', immediateRender: false },
        c + LECTURE + 0.04
      );
    }
  }
  /** Le contenu d'une étape se révèle ligne à ligne, après son cadre. */
  function lignes(enfants, c, decalage = 0.16) {
    if (!enfants.length) return;
    tl.fromTo(
      enfants,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: ENTREE * 0.62, stagger: 0.045, ease: 'power2.out' },
      c - LECTURE - ENTREE + decalage
    );
  }

  // Le titre recule dans la profondeur de la scène dès les premiers pas.
  const intro = $('.intro');
  tl.fromTo(
    $('.intro__titre', intro),
    { y: 0, opacity: 1, scale: 1 },
    { y: -26, opacity: 0, scale: 0.9, duration: 0.42, ease: 'power2.in' },
    0.04
  );
  tl.fromTo($('.intro__chevrons', intro), { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0);

  // La présentation, à gauche de l'astronaute.
  const carteProfil = $('.identite__carte');
  const P3 = { transformPerspective: 1800 };
  etape(
    carteProfil,
    C_PROFIL,
    { xPercent: -10, z: -160, rotationY: 14, ...P3 },
    { xPercent: 0, z: 0, rotationY: 0, ...P3 },
    { xPercent: -6, z: -120, rotationY: 9, ...P3 }
  );
  if (carteProfil) lignes(Array.from(carteProfil.children), C_PROFIL);

  // « Mes réalisations », seul dans le ciel.
  const entete = $('.projets__entete');
  etape(entete, C_REAL, { y: 30, scale: 1.06 }, { y: 0, scale: 1 }, { y: -24, scale: 0.94 });

  // Les projets : de part et d'autre, en alternance. Le panneau sort de la
  // profondeur en pivotant vers le centre ; son image se dévoile de bas en
  // haut ; son texte monte ligne à ligne. Il repart dans la profondeur.
  const reperes = [];
  panneaux.forEach((p, i) => {
    const c = C_PROJET(i);
    const sens = i % 2 ? 1 : -1;
    etape(
      p,
      c,
      { xPercent: 9 * sens, z: -260, rotationY: -15 * sens, ...P3 },
      { xPercent: 0, z: 0, rotationY: 0, ...P3 },
      { xPercent: -5 * sens, z: -200, rotationY: 10 * sens, ...P3 }
    );
    const visuel = $('.panneau__visuel', p);
    if (visuel) {
      tl.fromTo(
        visuel,
        { clipPath: 'inset(100% 0% 0% 0% round 14px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: ENTREE * 0.8, ease: 'power3.inOut' },
        c - LECTURE - ENTREE + 0.06
      );
      const image = visuel.firstElementChild;
      if (image) tl.fromTo(image, { scale: 1.16 }, { scale: 1, duration: ENTREE, ease: 'power2.out' }, c - LECTURE - ENTREE + 0.06);
    }
    lignes($$('.panneau__texte > *', p), c, 0.2);
    reperes.push(c);
  });

  // L'arrivée : un voile léger se pose sur la scène, pour la lecture.
  const voile = $('.monde__voile');
  tl.fromTo(voile, { opacity: 0 }, { opacity: 0.32, duration: ARRIVEE, ease: 'power1.inOut' }, total - ARRIVEE);

  const declencheur = ScrollTrigger.create({
    trigger: voyage,
    start: 'top top',
    end: 'bottom bottom',
    animation: tl,
    scrub: true,
    onUpdate: () => {
      etat.marche = marche.p * fin;
    },
  });
  const auVoyage = (t) => declencheur.start + ((declencheur.end - declencheur.start) * t) / total;

  /* ---------- au bout du chemin : le poste de travail, le contact ---------- */
  const atelier = $('#competences');
  const contact = $('#contact');
  const apres = [atelier, contact].map((section, k) =>
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: k === 0 ? 'top top' : 'top 35%',
      onUpdate: () => {
        etat.apres = apres.reduce((s, t) => s + (t ? t.progress : 0), 0);
      },
    })
  );
  etat.apres = 0;

  /* Le poste de travail s'anime quand il est à l'écran ; ses filets se
     tracent depuis le bureau, puis chaque compétence vient se poser. */
  const poste = ScrollTrigger.create({ trigger: atelier, start: 'top bottom', end: 'bottom top', toggleClass: 'est-visible' });
  const apparition = gsap.timeline({ paused: true });
  apparition.fromTo($('.atelier__entete', atelier), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0);
  apparition.fromTo($$('.liaison', atelier), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, stagger: 0.04, ease: 'power2.inOut' }, 0.15);
  apparition.fromTo(
    $$('.competence', atelier),
    { y: 16, scale: 0.82, opacity: 0 },
    { y: 0, scale: 1, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'back.out(1.6)' },
    0.42
  );
  // Il apparaît sur place : la scène reste immobile à l'écran pendant que
  // la page monte, et se pose en fondu, à peine agrandie.
  const sceneAtelier = $('.atelier__scene-fixe', atelier);
  const surPlace = gsap.timeline({ paused: true });
  surPlace.fromTo(sceneAtelier, { y: () => -window.innerHeight }, { y: 0, ease: 'none', duration: 1 }, 0);
  surPlace.fromTo(sceneAtelier, { opacity: 0, scale: 0.965 }, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.55 }, 0.45);
  const arrivee = ScrollTrigger.create({ trigger: atelier, start: 'top bottom', end: 'top top', animation: surPlace, scrub: true, invalidateOnRefresh: true });
  // Le contact lui succède de la même façon : l'un s'efface, l'autre se pose.
  const carteContact = $('.contact__carte', contact);
  const relais = gsap.timeline({ paused: true });
  relais.fromTo(atelier, { y: 0 }, { y: () => window.innerHeight, ease: 'none', duration: 1 }, 0);
  relais.fromTo(atelier, { opacity: 1 }, { opacity: 0, ease: 'power2.in', duration: 0.5 }, 0);
  relais.fromTo(carteContact, { y: () => -window.innerHeight }, { y: 0, ease: 'none', duration: 1 }, 0);
  relais.fromTo(carteContact, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.55 }, 0.45);
  const versContact = ScrollTrigger.create({ trigger: contact, start: 'top bottom', end: 'top top', animation: relais, scrub: true, invalidateOnRefresh: true });
  const declencheurAtelier = ScrollTrigger.create({
    trigger: atelier,
    start: 'top 80%',
    end: 'top top',
    animation: apparition,
    scrub: true,
  });

  /* ---------- les étapes ---------- */
  /** Où se lit chaque étape, en pixels de défilement. */
  function positions() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    // Position dans la page, sans les transformations en cours.
    const haut = (el) => {
      let y = 0;
      for (let e = el; e; e = e.offsetParent) y += e.offsetTop;
      return y;
    };
    return [
      ...[0, C_PROFIL, C_REAL, ...reperes].map(auVoyage),
      // L'arrivée au bout du chemin et le poste de travail ne font qu'une
      // étape : on s'arrête quand le poste est en place.
      haut(atelier),
      Math.min(haut(contact), max),
    ];
  }
  const NOMS = ['haut', 'profil', 'projets', ...panneaux.map((p) => p.id), 'competences', 'contact'];
  const I_ATELIER = NOMS.length - 2;
  /* Où en est la marche à chaque étape : la distance parcourue y est
     relevée, pour que chaque transition fasse un pas entier. */
  const MARCHE_ETAPE = [0, C_PROFIL, C_REAL, ...reperes, total].map((t) => t / total);

  let courante = 0;
  let enTransition = false;
  let dernierEvenement = 0;
  let attendreCalme = false;
  let ficheOuverte = false;
  const deplacement = { y: 0 };
  let tween = null;

  const nav = $('.nav');
  const majNav = () => {
    nav.classList.toggle('nav--visible', courante > 0 || enTransition);
    doc.classList.toggle('en-marche', enTransition);
  };

  function poserDefilement(y) {
    window.scrollTo(0, y);
    ScrollTrigger.update();
  }

  /** Va à l'étape i : la marche, puis l'arrêt. */
  function allerA(i, { immediat = false, duree = null } = {}) {
    const pts = positions();
    i = borne(i, 0, pts.length - 1);
    const depart = courante;
    courante = i;
    if (tween) tween.kill();
    deplacement.y = window.scrollY;
    if (immediat) {
      poserDefilement(pts[i]);
      enTransition = false;
      majNav();
      return;
    }
    const ecart = Math.abs(i - depart);
    let d = duree;
    if (d === null) {
      if (ecart <= 1) {
        const haut = Math.max(i, depart);
        d = haut === I_ATELIER ? DUREE_ARRIVEE : haut > I_ATELIER ? DUREE_SECTION : DUREE_PAS;
      } else {
        d = borne(0.9 + ecart * 0.18, 1.2, 2.2);
      }
    }
    enTransition = true;
    majNav();
    const versSection = Math.max(i, depart) > I_ATELIER;
    tween = gsap.to(deplacement, {
      y: pts[i],
      duration: d,
      ease: versSection ? 'power2.inOut' : allure,
      onUpdate: () => poserDefilement(deplacement.y),
      onComplete: () => {
        tween = null;
        enTransition = false;
        attendreCalme = true;
        majNav();
      },
    });
  }

  /** Un geste dans un sens : une étape, jamais plus. */
  function geste(sens) {
    if (enTransition || ficheOuverte || !vivant) return;
    const i = courante + sens;
    if (i < 0 || i >= NOMS.length) return;
    allerA(i);
  }

  // Molette et pavé tactile : un flux d'événements par geste. Le premier
  // décide ; les suivants, et l'élan qui prolonge le geste, sont ignorés
  // jusqu'à 150 ms de calme.
  let cumul = 0;
  ecouter(
    window,
    'wheel',
    (e) => {
      if (e.target.closest && e.target.closest('dialog')) return;
      e.preventDefault();
      if (e.ctrlKey) return; // zoom au pavé
      const maintenant = performance.now();
      const calme = maintenant - dernierEvenement > CALME;
      dernierEvenement = maintenant;
      if (enTransition || ficheOuverte) return;
      if (attendreCalme && !calme) return;
      if (calme) cumul = 0;
      attendreCalme = false;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      cumul += delta;
      // Un cran de molette décide aussitôt ; au pavé, quelques pixels.
      if (Math.abs(cumul) < 6) return;
      const sens = Math.sign(cumul);
      cumul = 0;
      attendreCalme = true;
      geste(sens);
    },
    { passive: false }
  );

  // Au doigt : un balayage vertical d'au moins 36 px.
  let toucherY = null;
  let toucherFait = false;
  ecouter(
    window,
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      toucherY = e.touches[0].clientY;
      toucherFait = false;
    },
    { passive: true }
  );
  ecouter(
    window,
    'touchmove',
    (e) => {
      if (e.target.closest && e.target.closest('dialog')) return;
      if (e.cancelable) e.preventDefault();
      if (toucherY === null || toucherFait) return;
      const dy = toucherY - e.touches[0].clientY;
      if (Math.abs(dy) < 36) return;
      toucherFait = true;
      geste(Math.sign(dy));
    },
    { passive: false }
  );
  ecouter(window, 'touchend', () => {
    toucherY = null;
  });

  // Au clavier : flèches, pages, espace ; début et fin.
  ecouter(window, 'keydown', (e) => {
    if (ficheOuverte || e.altKey || e.ctrlKey || e.metaKey) return;
    const cible = e.target;
    const saisie = cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName));
    if (saisie) return;
    const surCommande = cible && /^(BUTTON|A|SUMMARY)$/.test(cible.tagName);
    let sens = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && !surCommande)) sens = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && !surCommande)) sens = -1;
    else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (!enTransition && !e.repeat) allerA(e.key === 'Home' ? 0 : NOMS.length - 1);
      return;
    } else return;
    e.preventDefault();
    if (e.repeat) return;
    geste(sens);
  });

  /* Les liens du menu mènent à l'étape, d'une traite. */
  ecouter(document, 'click', (e) => {
    const lien = e.target.closest && e.target.closest('a[href^="#"]');
    if (!lien) return;
    const id = lien.getAttribute('href').slice(1);
    if (id === 'contenu') return;
    const i = NOMS.indexOf(id);
    if (i < 0) return;
    e.preventDefault();
    if (i !== courante || enTransition) allerA(i);
  });

  /* La fiche d'un projet suspend le voyage ; elle défile normalement. */
  ecouter(document, 'fiche', (e) => {
    ficheOuverte = Boolean(e.detail);
    attendreCalme = true;
  });

  /* Au clavier, une étape dont un élément reçoit le focus vient à l'écran. */
  ecouter(document, 'focusin', (e) => {
    const el = e.target;
    if (!el.closest || el.closest('.nav, dialog')) return;
    let i = -1;
    const p = el.closest('.panneau');
    if (p) i = 3 + panneaux.indexOf(p);
    else if (el.closest('.identite')) i = 1;
    else if (el.closest('#competences')) i = I_ATELIER;
    else if (el.closest('#contact')) i = NOMS.length - 1;
    if (i >= 0 && (i !== courante || Math.abs(window.scrollY - positions()[i]) > 2)) allerA(i, { duree: 0.9 });
  });

  /* ---------- l'astronaute ---------- */
  const astronaute = $('.astronaute');
  const pose = $('.astronaute__pose');
  const toiles = $$('.astronaute canvas');
  const contextes = toiles.map((t) => t.getContext('2d'));
  // La boîte de l'astronaute : la taille d'une image de la marche, en
  // pixels CSS de référence ; l'origine est au ras des semelles.
  const BOITE_L = 320;
  const BOITE_H = (BOITE_L * MARCHE.hauteur) / MARCHE.largeur;
  const PIEDS = (BOITE_H * MARCHE.pieds) / MARCHE.hauteur;
  pose.style.width = `${BOITE_L}px`;
  pose.style.height = `${BOITE_H}px`;
  pose.style.transformOrigin = `50% ${PIEDS}px`;
  const reflet = $('.astronaute__reflet');
  reflet.style.transformOrigin = `50% ${PIEDS}px`;
  // Le reflet s'estompe en s'éloignant des semelles ; l'ombre est dessous.
  const sousPieds = (100 * (BOITE_H - PIEDS)) / BOITE_H;
  const masque = `linear-gradient(to top, transparent ${sousPieds - 0.5}%, #000 ${sousPieds}%, transparent ${sousPieds + 34}%)`;
  reflet.style.webkitMaskImage = masque;
  reflet.style.maskImage = masque;
  const ombre = $('.astronaute__ombre');
  ombre.style.top = `${PIEDS - BOITE_H * 0.025}px`;
  ombre.style.height = `${BOITE_H * 0.05}px`;

  const hd = window.matchMedia('(min-resolution: 1.5dppx) and (min-width: 48rem) and (min-height: 40rem)').matches;
  const images = new Array(MARCHE.images).fill(null);
  let finesse = 0; // 0 : rien ; 1 : images légères ; 2 : fines
  const nom = (taille, k) => new URL(`espace/marche/${taille}/${String(k).padStart(2, '0')}.webp`, document.baseURI).href;
  const charger = (url) =>
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(url))))
      .then((b) => (typeof createImageBitmap === 'function' ? createImageBitmap(b) : Promise.reject(new Error('bitmap'))));
  /** Charge une série d'images ; se résout dès que les deux appuis (les
      images où l'astronaute s'arrête) sont là, les autres suivent. */
  function serie(taille) {
    const appuis = [0, Math.round(MARCHE.images / 2)];
    const ordre = [...appuis, ...images.map((_, k) => k).filter((k) => !appuis.includes(k))];
    let dimensionne = false;
    const une = (k) =>
      charger(nom(taille, k)).then((b) => {
        if (!dimensionne) {
          dimensionne = true;
          toiles.forEach((t) => {
            t.width = b.width;
            t.height = b.height;
          });
          dernier.cadre = -1; // la toile redimensionnée est vide : on redessine
        }
        const ancienne = images[k];
        images[k] = b;
        if (ancienne && ancienne.close) ancienne.close();
        if (k === dernier.cadre) dernier.cadre = -1;
      });
    const premieres = Promise.all(ordre.slice(0, 2).map(une));
    const toutes = premieres.then(() => Promise.all(ordre.slice(2).map(une)));
    return { premieres, toutes };
  }
  // Les images légères d'abord (la scène s'ouvre dès les deux appuis), puis,
  // sur les écrans qui en profitent, les fines, une fois les légères là.
  const legeres = serie('s');
  const imagesMarche = legeres.premieres
    .then(() => {
      finesse = 1;
      astronaute.classList.add('astro-charge');
      legeres.toutes
        .then(() => {
          if (hd) auRepos(() => serie('l').toutes.then(() => (finesse = 2)).catch(() => {}));
        })
        .catch(() => {});
    })
    .catch(() => {});

  /** L'image demandée, ou la plus proche déjà chargée. */
  function imageProche(k) {
    for (let d = 0; d < MARCHE.images; d += 1) {
      const a = images[(k + d) % MARCHE.images];
      if (a) return a;
      const b = images[(k - d + MARCHE.images) % MARCHE.images];
      if (b) return b;
    }
    return null;
  }

  const dernier = { cadre: -1, x: 0, y: 0, s: 0, o: -1 };
  /** Combien de cycles de marche à cette distance (un demi par étape). */
  function cycles(m) {
    const p = fin > 0 ? m / fin : 0;
    let k = 0;
    while (k < MARCHE_ETAPE.length - 2 && p > MARCHE_ETAPE[k + 1]) k += 1;
    const a = MARCHE_ETAPE[k];
    const b = MARCHE_ETAPE[k + 1];
    return (k + borne((p - a) / Math.max(1e-6, b - a), 0, 1)) * PAS_PAR_ETAPE;
  }
  function poserAstronaute() {
    const a = monde && monde.astro;
    const o = a && a.visible && finesse ? borne((0.6 - etat.apres) / 0.35, 0, 1) : 0;
    if (o !== dernier.o) {
      pose.style.opacity = String(o);
      pose.style.visibility = o > 0 ? 'visible' : 'hidden';
      dernier.o = o;
    }
    if (!o) return;
    const c = cycles(a.marche);
    // (un dixième d'image de marge : l'arrêt tombe juste sur l'appui)
    const cadre = Math.floor((c - Math.floor(c)) * MARCHE.images + 0.1) % MARCHE.images;
    const image = cadre !== dernier.cadre ? imageProche(cadre) : null;
    if (image) {
      contextes.forEach((ctx, k) => {
        ctx.clearRect(0, 0, toiles[k].width, toiles[k].height);
        ctx.drawImage(image, 0, 0, toiles[k].width, toiles[k].height);
      });
      dernier.cadre = cadre;
      pose.dataset.cadre = String(cadre);
    }
    const s = a.echelle / (BOITE_H * (MARCHE.figure / MARCHE.hauteur));
    const x = a.x - BOITE_L / 2;
    const y = a.y - PIEDS;
    if (Math.abs(x - dernier.x) > 0.05 || Math.abs(y - dernier.y) > 0.05 || Math.abs(s - dernier.s) > 0.0002) {
      pose.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(4)})`;
      dernier.x = x;
      dernier.y = y;
      dernier.s = s;
    }
  }
  /* ---------- le titre suit, à peine, le regard ---------- */
  const titre = $('.intro__nom');

  /* ---------- le monde ---------- */
  const toile = $('.monde__toile');
  auRepos(() => {
    import('./monde.js')
      .then(({ creerMonde, choisirQualite, longueurPont }) => {
        if (!vivant || !toile) return;
        const params = new URLSearchParams(window.location.search);
        try {
          monde = creerMonde(toile, {
            qualite: params.get('qualite') || choisirQualite(),
            adaptatif: params.get('adaptatif') !== 'non',
            // Réservé aux captures de l'affiche, rendues sans GPU.
            logiciel: params.get('logiciel') === 'oui',
            etat,
            longueur: longueurPont(n),
            // La scène n'apparaît qu'avec son astronaute.
            surPret: () => imagesMarche.then(() => doc.classList.add('monde-pret')),
          });
        } catch (err) {
          monde = null;
        }
        if (!monde) {
          doc.classList.add('monde-fixe');
          return;
        }
        fin = monde.fin;
        etat.marche = marche.p * fin;
      })
      .catch(() => doc.classList.add('monde-fixe'));
  });

  if (!window.matchMedia('(pointer: coarse)').matches) {
    ecouter(
      window,
      'pointermove',
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = -(e.clientY / window.innerHeight - 0.5) * 2;
        if (monde) monde.orienterSouris(x, y);
        // Le nom flotte dans la scène : il glisse un peu moins que le ciel.
        if (titre) gsap.to(titre, { x: -x * 6, y: y * 4, duration: 1.2, ease: 'power2.out', overwrite: 'auto' });
      },
      { passive: true }
    );
  }

  const dessiner = (temps) => {
    if (!monde) return;
    monde.rendre(temps);
    poserAstronaute();
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    if (monde) monde.redimensionner();
    if (!enTransition) {
      ScrollTrigger.refresh();
      allerA(courante, { immediat: true });
    }
  });

  /* Au départ : la première étape, ou celle d'un lien direct (#projets…). */
  const ancre = NOMS.indexOf(window.location.hash.slice(1));
  window.setTimeout(() => {
    if (!vivant) return;
    if (ancre > 0) allerA(ancre, { immediat: true });
    else {
      // Si la page avait déjà défilé (avant le script), l'étape la plus proche.
      const pts = positions();
      let i = 0;
      pts.forEach((y, k) => {
        if (Math.abs(y - window.scrollY) < Math.abs(pts[i] - window.scrollY)) i = k;
      });
      allerA(i, { immediat: true });
    }
  }, 60);

  return () => {
    vivant = false;
    if (tween) tween.kill();
    doc.classList.remove('par-etapes');
    nettoyages.forEach((f) => f());
    gsap.ticker.remove(dessiner);
    declencheur.kill();
    apres.forEach((t) => t.kill());
    poste.kill();
    declencheurAtelier.kill();
    arrivee.kill();
    versContact.kill();
    tl.kill();
    images.forEach((b) => b && b.close && b.close());
    if (monde) monde.detruire();
  };
}
