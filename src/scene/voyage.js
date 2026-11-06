/**
 * La mise en scène du voyage : le défilement pilote tout, en continu.
 *
 * Une chronologie GSAP, attachée au défilement (ScrollTrigger), fait
 * avancer l'astronaute sur la passerelle et la caméra avec lui, et fait
 * entrer puis sortir les panneaux des projets. Lenis adoucit le
 * défilement ; quand on remonte, tout repart en sens inverse. À l'arrivée,
 * trois plans de caméra accompagnent la présentation, le poste de travail
 * et le contact.
 *
 * Ne sont animés que `transform`, `opacity` et le léger flou d'entrée des
 * panneaux. Avec une préférence de mouvement réduit, ou sans JavaScript,
 * la page reste une page ordinaire, devant une image fixe.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const auRepos = (f) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(f, { timeout: 1200 })
    : window.setTimeout(f, 250);
const borne = (x, a, b) => Math.min(b, Math.max(a, x));
const doux = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/* Le voyage, en hauteurs d'écran de défilement. */
const INTRO = 0.9; // avant le premier projet
const PROJET = 1.5; // par projet : entrée, lecture, sortie
const ARRIVEE = 1.6; // fin de la passerelle et arrivée

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

  /* ---------- le défilement ---------- */
  gsap.registerPlugin(ScrollTrigger);
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  const battre = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(battre);
  gsap.ticker.lagSmoothing(0);

  const panneaux = $$('.panneau');
  const n = panneaux.length;
  const total = INTRO + n * PROJET + ARRIVEE;
  const voyage = $('.voyage');
  voyage.style.height = `${(total + 1) * 100}svh`;

  const etat = { marche: 0, arrivee: 0, apres: 0, astro: 1 };
  let monde = null;
  let vivant = true;
  let fin = 1;

  /* ---------- la chronologie du voyage ---------- */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  // La marche : régulière, de la première à la dernière foulée.
  const marche = { p: 0 };
  tl.to(marche, { p: 1, duration: total - 0.7 }, 0);
  tl.to(etat, { arrivee: 1, duration: 1.1, ease: 'power1.inOut' }, total - 1.1);
  tl.set({}, {}, total);

  // L'introduction s'efface dès les premiers pas.
  const intro = $('.intro');
  tl.fromTo($('.intro__titre', intro), { y: 0, opacity: 1 }, { y: -40, opacity: 0, duration: 0.45, ease: 'power1.in' }, 0.05);
  tl.fromTo($('.intro__chevrons', intro), { opacity: 1 }, { opacity: 0, duration: 0.2 }, 0);

  // Les panneaux : ils glissent depuis un côté, grandissent un peu,
  // s'éclaircissent et se précisent ; puis repartent de l'autre côté.
  const reperes = [];
  panneaux.forEach((p, i) => {
    const a = INTRO + i * PROJET;
    const sens = i % 2 ? 1 : -1;
    tl.fromTo(
      p,
      { xPercent: 55 * sens, scale: 0.9, opacity: 0, filter: 'blur(10px)' },
      { xPercent: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.38, ease: 'power2.out' },
      a
    );
    tl.fromTo(
      p,
      { xPercent: 0, scale: 1, opacity: 1, filter: 'blur(0px)' },
      { xPercent: -40 * sens, scale: 0.94, opacity: 0, filter: 'blur(8px)', duration: 0.34, ease: 'power2.in', immediateRender: false },
      a + 1.08
    );
    reperes.push(a + 0.7);
  });

  // L'arrivée : un voile léger se pose sur la scène, pour la lecture.
  const voile = $('.monde__voile');
  tl.fromTo(voile, { opacity: 0 }, { opacity: 0.38, duration: 0.9, ease: 'power1.inOut' }, total - 0.9);

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

  /* ---------- après le voyage : présentation, poste, contact ---------- */
  const apres = [$('#profil'), $('#competences'), $('#contact')].map((section, k) =>
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: k === 1 ? 'top top' : 'top 35%',
      onUpdate: () => {
        etat.apres = apres.reduce((s, t) => s + (t ? t.progress : 0), 0);
      },
    })
  );
  etat.apres = 0;

  /* Le poste de travail : il s'anime quand il est à l'écran ; ses
     compétences apparaissent l'une après l'autre en y arrivant. */
  const atelier = $('#competences');
  const poste = ScrollTrigger.create({ trigger: atelier, start: 'top bottom', end: 'bottom top', toggleClass: 'est-visible' });
  const apparition = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  apparition.fromTo($$('.liaison', atelier), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, 0.2);
  apparition.fromTo($$('.competence', atelier), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05 }, 0.25);
  const declencheurAtelier = ScrollTrigger.create({
    trigger: atelier,
    start: 'top 75%',
    end: 'top top',
    animation: apparition,
    scrub: true,
  });

  /* ---------- le menu ---------- */
  const nav = $('.nav');
  const majNav = () => nav.classList.toggle('nav--visible', window.scrollY > 24);
  lenis.on('scroll', majNav);
  majNav();

  /** Où mène chaque lien : la bonne étape du voyage. */
  function cible(id) {
    if (id === 'haut') return 0;
    if (id === 'projets') {
      const t = reperes[0] ?? INTRO;
      return declencheur.start + ((declencheur.end - declencheur.start) * t) / total;
    }
    const el = document.getElementById(id);
    if (!el) return null;
    const haut = el.getBoundingClientRect().top + window.scrollY;
    // Le poste de travail est collé à l'écran : on s'arrête quand il est
    // entièrement en place.
    if (id === 'competences') return haut;
    return haut - window.innerHeight * 0.05;
  }

  ecouter(document, 'click', (e) => {
    const lien = e.target.closest && e.target.closest('a[href^="#"]');
    if (!lien) return;
    const id = lien.getAttribute('href').slice(1);
    if (id === 'contenu') return;
    const y = cible(id);
    if (y === null) return;
    e.preventDefault();
    const ecart = Math.abs(y - window.scrollY) / window.innerHeight;
    lenis.scrollTo(y, { duration: borne(1 + ecart * 0.12, 1.1, 3), easing: doux });
  });

  /* La fiche d'un projet suspend le voyage ; il reprend à la fermeture.
     La fiche elle-même défile normalement (data-lenis-prevent). */
  ecouter(document, 'fiche', (e) => {
    if (e.detail) lenis.stop();
    else lenis.start();
  });

  /* Au clavier, un panneau qui reçoit le focus vient à l'écran. */
  ecouter(document, 'focusin', (e) => {
    const p = e.target.closest && e.target.closest('.panneau');
    if (!p) return;
    const i = panneaux.indexOf(p);
    if (i < 0) return;
    const t = reperes[i];
    const y = declencheur.start + ((declencheur.end - declencheur.start) * t) / total;
    if (Math.abs(y - window.scrollY) > 4) lenis.scrollTo(y, { duration: 0.9, easing: doux });
  });

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
            surPret: () => doc.classList.add('monde-pret'),
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
        if (monde) monde.orienterSouris((e.clientX / window.innerWidth - 0.5) * 2, -(e.clientY / window.innerHeight - 0.5) * 2);
      },
      { passive: true }
    );
  }

  const dessiner = (temps) => {
    if (monde) monde.rendre(temps);
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    if (monde) monde.redimensionner();
  });

  /* Un lien direct (#projets, #contact…) y mène dès l'arrivée. */
  const ancre = window.location.hash.slice(1);
  if (ancre) {
    window.setTimeout(() => {
      const y = vivant ? cible(ancre) : null;
      if (y !== null) lenis.scrollTo(y, { immediate: true });
    }, 60);
  }

  return () => {
    vivant = false;
    nettoyages.forEach((f) => f());
    gsap.ticker.remove(dessiner);
    gsap.ticker.remove(battre);
    declencheur.kill();
    apres.forEach((t) => t.kill());
    poste.kill();
    declencheurAtelier.kill();
    tl.kill();
    lenis.destroy();
    if (monde) monde.detruire();
  };
}
