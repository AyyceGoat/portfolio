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
 * marche alors jusqu'à l'étape suivante (quatre pas, un peu plus de deux
 * secondes), puis s'arrête, pieds au sol. Le décor avance exactement avec
 * ses pas : tant qu'un pied touche la passerelle, il y reste immobile.
 * Pendant ce temps, la page défile d'elle-même : une
 * chronologie GSAP, attachée au défilement (ScrollTrigger), fait avancer
 * la caméra et entrer les étapes.
 *
 * Molette et pavé tactile sont lus comme des intentions : un geste, si
 * fort soit-il, ne fait qu'une étape ; son élan (l'inertie, qui peut
 * durer deux secondes) ne compte jamais. Un nouveau geste volontaire est
 * toujours reconnu, même pendant cet élan. Pendant une transition, un
 * nouveau geste dans le même sens est mémorisé (un seul) et joué ensuite ;
 * dans l'autre sens, il ramène aussitôt à l'étape de départ.
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
const ELAN = 0.14;
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

/* D'une étape à la suivante, quatre pas : deux cycles de la vidéo.
   L'astronaute part et s'arrête ainsi toujours sur le même appui, pieds
   au sol. */
const CYCLES_ETAPE = 2;
const DUREE_PAS = 2.3;
const DUREE_ARRIVEE = 2.6;
const DUREE_SECTION = 1.2;
const N = MARCHE.images;
const AVANCE = MARCHE.avance;
/** De combien le sol a avancé après c cycles de marche, en hauteurs de
    figure : image par image, celle du sol de la vidéo sous le pied
    d'appui (scripts/marche.py), interpolée entre deux images. */
function avanceFigure(c) {
  const n = Math.floor(c);
  const f = (c - n) * N;
  const k = Math.min(Math.floor(f), N - 1);
  return n * AVANCE[N] + AVANCE[k] + (AVANCE[k + 1] - AVANCE[k]) * (f - k);
}
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
  let hauteurCamera = 1.82;

  /* ---------- la chronologie du voyage ---------- */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
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
  // Le titre recule dans la profondeur de la scène dès les premiers pas.
  const intro = $('.intro');
  tl.fromTo(
    $('.intro__titre', intro),
    { y: 0, opacity: 1, scale: 1 },
    { y: -26, opacity: 0, scale: 0.9, duration: 0.42, ease: 'power2.in' },
    0.04
  );
  tl.fromTo($('.intro__chevrons', intro), { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0);

  /* Un panneau de verre se révèle en plusieurs temps : il glisse et se pose
     en profondeur ; son liseré lumineux se dessine tout autour ; son image
     (ou la photo) se dévoile ; son titre arrive mot à mot ; puis ses
     paragraphes, l'un après l'autre ; enfin ses mots-clés s'illuminent. */
  const P3 = { transformPerspective: 1800 };
  function reveler(el, carte, c, sens) {
    if (!el || !carte) return;
    const debut = c - LECTURE - ENTREE;
    etape(
      el,
      c,
      { xPercent: 8 * sens, z: -240, rotationY: -14 * sens, ...P3 },
      { xPercent: 0, z: 0, rotationY: 0, ...P3 },
      { xPercent: -5 * sens, z: -200, rotationY: 9 * sens, ...P3 }
    );
    const bord = $('.verre__bord rect', carte);
    if (bord) tl.fromTo(bord, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: ENTREE * 0.75, ease: 'power2.inOut' }, debut + 0.04);
    const etiquette = $(':scope > .etiquette', carte);
    if (etiquette) tl.fromTo(etiquette, { opacity: 0, letterSpacing: '0.7em' }, { opacity: 1, letterSpacing: '0.42em', duration: ENTREE * 0.6, ease: 'power2.out' }, debut + 0.1);
    const photo = $('.identite__photo', carte);
    if (photo) tl.fromTo(photo, { clipPath: 'circle(0% at 50% 50%)', scale: 0.86 }, { clipPath: 'circle(72% at 50% 50%)', scale: 1, duration: ENTREE * 0.6, ease: 'power3.out' }, debut + 0.12);
    const visuel = $('.panneau__visuel', carte);
    if (visuel) {
      tl.fromTo(visuel, { clipPath: 'inset(100% 0% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: ENTREE * 0.6, ease: 'power3.inOut' }, debut + 0.12);
      const image = visuel.firstElementChild;
      if (image) tl.fromTo(image, { scale: 1.14 }, { scale: 1, duration: ENTREE * 0.8, ease: 'power2.out' }, debut + 0.12);
    }
    const mots = $$('.degrade .mot', carte);
    if (mots.length) tl.fromTo(mots, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: ENTREE * 0.4, stagger: ENTREE * 0.035, ease: 'power3.out' }, debut + 0.18);
    const suite = $$('.identite__titre, .identite__paragraphe, .identite__parcours, .panneau__resume, .pile, .panneau__actions', carte);
    if (suite.length) tl.fromTo(suite, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: ENTREE * 0.4, stagger: ENTREE * 0.07, ease: 'power2.out' }, debut + 0.26);
    const cles = $$('.cle', carte);
    if (cles.length) {
      tl.fromTo(
        cles,
        { color: 'rgba(238, 230, 212, 0.78)', textShadow: '0 0 0px rgba(110, 165, 255, 0)' },
        { color: '#9cc4ff', textShadow: '0 0 14px rgba(110, 165, 255, 0.55)', duration: ENTREE * 0.35, stagger: ENTREE * 0.02, ease: 'sine.inOut' },
        debut + ENTREE * 0.72
      );
    }
  }

  // La présentation, à gauche de l'astronaute.
  const carteProfil = $('.identite__carte');
  reveler(carteProfil, carteProfil, C_PROFIL, -1);

  // « Mes réalisations », seul dans le ciel.
  const entete = $('.projets__entete');
  etape(entete, C_REAL, { y: 30, scale: 1.06 }, { y: 0, scale: 1 }, { y: -24, scale: 0.94 });

  // Les projets : de part et d'autre, en alternance, pour laisser
  // l'astronaute visible.
  const reperes = [];
  panneaux.forEach((p, i) => {
    const c = C_PROJET(i);
    reveler(p, $('.panneau__cadre', p), c, i % 2 ? 1 : -1);
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
  /* Combien de cycles de marche à chaque étape : deux de plus à chaque
     étape, jusqu'au bout du chemin (le poste de travail). */
  const cyclesA = (i) => Math.min(i, I_ATELIER) * CYCLES_ETAPE;
  let cycles = 0;
  // mètres par hauteur de figure, pour la caméra de l'écran actuel
  let metresParFigure = 0;

  // Réservé aux vérifications : transitions ralenties (?ralenti=10).
  const ralenti = borne(Number(new URLSearchParams(window.location.search).get('ralenti')) || 1, 1, 40);
  let courante = 0;
  let enTransition = false;
  let ficheOuverte = false;
  // La transition en cours : d'où elle part, sa durée, son début.
  const trajet = { depart: 0, duree: 1, debut: 0 };
  // Un nouveau geste fait pendant une transition (jamais un élan) est
  // mémorisé, un seul, et joué dès qu'elle s'achève.
  let enAttente = 0;
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
    deplacement.c = cycles;
    if (immediat) {
      poserDefilement(pts[i]);
      cycles = cyclesA(i);
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
        d = borne(DUREE_PAS + (ecart - 1) * 0.6, DUREE_PAS, 4.2);
      }
    }
    enTransition = true;
    trajet.depart = depart;
    trajet.duree = d * ralenti;
    trajet.debut = performance.now();
    majNav();
    const versSection = Math.max(i, depart) > I_ATELIER;
    tween = gsap.to(deplacement, {
      y: pts[i],
      c: cyclesA(i),
      duration: d * ralenti,
      ease: versSection && Math.min(i, depart) >= I_ATELIER ? 'power2.inOut' : allure,
      onUpdate: () => {
        cycles = deplacement.c;
        poserDefilement(deplacement.y);
      },
      onComplete: () => {
        tween = null;
        enTransition = false;
        majNav();
        const s = enAttente;
        enAttente = 0;
        if (s) geste(s);
      },
    });
  }

  /** Un geste dans un sens : une étape, jamais plus. */
  function geste(sens) {
    if (ficheOuverte || !vivant || !sens) return;
    if (enTransition) {
      const sensTrajet = Math.sign(courante - trajet.depart);
      if (sensTrajet && sens !== sensTrajet) {
        // Demi-tour : retour à l'étape de départ, en autant de temps qu'il
        // en a fallu pour venir.
        enAttente = 0;
        const fait = borne((performance.now() - trajet.debut) / trajet.duree, 0.25, 1);
        allerA(trajet.depart, { duree: (trajet.duree / ralenti) * fait });
      } else {
        enAttente = sens;
      }
      return;
    }
    const i = courante + sens;
    if (i < 0 || i >= NOMS.length) return;
    allerA(i);
  }

  /* Molette et pavé tactile : chaque geste produit un flux d'événements,
     que prolonge son élan (le pavé continue d'émettre, en décroissant,
     jusqu'à deux ou trois secondes après un geste fort). Seul le début
     d'un geste compte. Un nouveau geste est reconnu :
       - quand le sens change (un élan ne change jamais de sens) ;
       - après un silence de 150 ms, sauf si le flux reprend en continuant
         de décroître, ou par crans égaux après un long flux (c'est encore
         l'élan, que le navigateur a espacé) ;
       - quand, l'élan étant bien retombé, l'amplitude remonte nettement
         deux fois de suite : un nouveau coup de doigt.
     Deux débuts de geste à moins de 350 ms n'en font qu'un. L'écoute est
     sur la fenêtre entière : ni le curseur, ni le survol, ni le focus n'y
     jouent. */
  const flux = { n: 0, dernier: -1e9, derniere: 0, sens: 0, pic: 0, creux: 0, decru: false, montee: 0, arme: false, cumul: 0, dernierGeste: -1e9 };
  ecouter(
    window,
    'wheel',
    (e) => {
      if (e.target.closest && e.target.closest('dialog')) return;
      e.preventDefault();
      if (e.ctrlKey) return; // zoom au pavé
      const maintenant = performance.now();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      const a = Math.abs(delta);
      const sens = Math.sign(delta);
      if (!sens) return;
      const ecart = maintenant - flux.dernier;
      const precedente = flux.derniere;
      flux.dernier = maintenant;
      flux.derniere = a;
      let nouveau = false;
      if (sens !== flux.sens) {
        nouveau = true;
      } else if (ecart > CALME) {
        // (une molette libre qui ralentit espace ses crans, égaux : après un
        // long flux, c'est encore l'élan)
        const elan = ecart < 450 && (a < precedente || (a <= precedente && (a < 6 || flux.n >= 8)));
        if (elan) {
          flux.decru = true;
          flux.creux = Math.min(flux.creux, a);
          flux.montee = 0;
        } else {
          nouveau = true;
        }
      } else {
        if (a < flux.pic * 0.4) flux.decru = true;
        if (flux.decru && a > precedente && a >= flux.creux * 3 + 8 && a >= 12) flux.montee += 1;
        else flux.montee = 0;
        flux.creux = Math.min(flux.creux, a);
        if (flux.montee >= 2) nouveau = true;
      }
      flux.sens = sens;
      flux.n = nouveau ? 1 : flux.n + 1;
      if (nouveau) {
        flux.pic = a;
        flux.creux = a;
        flux.decru = false;
        flux.montee = 0;
        flux.arme = true;
        flux.cumul = 0;
      } else {
        flux.pic = Math.max(flux.pic, a);
      }
      // Un geste naissant s'affirme sur quelques événements (au pavé, les
      // premiers sont minuscules) : il compte dès qu'il a parcouru 8 px.
      if (!flux.arme) return;
      flux.cumul += a;
      if (flux.cumul < 8) return;
      flux.arme = false;
      if (maintenant - flux.dernierGeste < 350) return;
      flux.dernierGeste = maintenant;
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
      if (!e.repeat) {
        enAttente = 0;
        allerA(e.key === 'Home' ? 0 : NOMS.length - 1);
      }
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
    enAttente = 0;
    if (i !== courante || enTransition) allerA(i);
  });

  /* La fiche d'un projet suspend le voyage ; elle défile normalement. */
  ecouter(document, 'fiche', (e) => {
    ficheOuverte = Boolean(e.detail);
    enAttente = 0;
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
  function poserAstronaute() {
    const a = monde && monde.astro;
    const o = a && a.visible && finesse ? borne((0.6 - etat.apres) / 0.35, 0, 1) : 0;
    if (o !== dernier.o) {
      pose.style.opacity = String(o);
      pose.style.visibility = o > 0 ? 'visible' : 'hidden';
      dernier.o = o;
    }
    if (!o) return;
    const c = cycles;
    // (un centième d'image de marge : l'arrêt tombe juste sur l'appui)
    const n = Math.floor(c + 0.01 / N);
    const cadre = Math.min(N - 1, Math.max(0, Math.floor((c - n) * N + 0.01)));
    const image = cadre !== dernier.cadre ? imageProche(cadre) : null;
    if (image) {
      contextes.forEach((ctx, k) => {
        ctx.clearRect(0, 0, toiles[k].width, toiles[k].height);
        ctx.drawImage(image, 0, 0, toiles[k].width, toiles[k].height);
      });
      dernier.cadre = cadre;
      pose.dataset.cadre = String(cadre);
    }
    if (ralenti > 1) pose.dataset.cycles = c.toFixed(5);
    const s = a.echelle / (BOITE_H * (MARCHE.figure / MARCHE.hauteur));
    const x = a.x - BOITE_L / 2;
    // Entre deux images de la marche, le sol continue d'avancer : l'image
    // descend d'autant (le pied d'appui suit le sol au pixel près), puis la
    // suivante prend le relais.
    const ecart = avanceFigure(c) - avanceFigure(n + cadre / N);
    const y = a.y - PIEDS + ecart * a.echelle;
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
      .then(({ creerMonde, choisirQualite, CAMERA }) => {
        if (!vivant || !toile) return;
        const params = new URLSearchParams(window.location.search);
        try {
          monde = creerMonde(toile, {
            qualite: params.get('qualite') || choisirQualite(),
            adaptatif: params.get('adaptatif') !== 'non',
            // Réservé aux captures de l'affiche, rendues sans GPU.
            logiciel: params.get('logiciel') === 'oui',
            etat,
            // L'astronaute parcourt quelques mètres, au rythme de ses pas ;
            // la passerelle continue au-delà jusqu'à la plateforme, que la
            // caméra rejoint en glissant à l'arrivée.
            parcours: avanceFigure(cyclesA(I_ATELIER)) * ((1.8 * CAMERA.distance) / CAMERA.hauteur),
            longueur: avanceFigure(cyclesA(I_ATELIER)) * ((1.8 * CAMERA.distancePortrait) / CAMERA.hauteur) + 30,
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
        hauteurCamera = CAMERA.hauteur;
        // Réservé aux vérifications du pied d'appui (?ralenti=…).
        if (ralenti > 1) window.__voyage = { monde, etat };
        metresParFigure = (1.8 * monde.distanceCamera()) / hauteurCamera;
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
    // La distance parcourue découle des pas : le décor avance avec eux.
    etat.marche = avanceFigure(cycles) * metresParFigure;
    monde.rendre(temps);
    poserAstronaute();
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    if (monde) {
      monde.redimensionner();
      metresParFigure = (1.8 * monde.distanceCamera()) / hauteurCamera;
    }
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
