/**
 * La mise en scène du voyage : le défilement pilote tout, en continu.
 *
 * Une chronologie GSAP, attachée au défilement (ScrollTrigger), fait
 * avancer l'astronaute sur la passerelle et la caméra avec lui. Les étapes
 * se succèdent pendant la marche : le titre, la présentation, le titre
 * « Mes réalisations », puis chaque projet ; au bout du chemin, la caméra
 * se tourne vers la plateforme, où attendent le poste de travail et ses
 * compétences, puis le contact.
 *
 * Chaque étape se lit à un point précis du défilement. Quand on s'arrête
 * entre deux étapes, le défilement achève doucement le geste vers la plus
 * proche dans le sens du mouvement : jamais plus d'une étape à la fois,
 * deux gestes au plus pour passer de l'une à la suivante. Quand on
 * remonte, tout repart en sens inverse.
 *
 * L'astronaute est une suite de huit images (components/Astronaute.jsx) :
 * le monde calcule où se posent ses pieds, la distance parcourue choisit
 * la position.
 *
 * Ne sont animés que `transform` et `opacity`. Avec une préférence de
 * mouvement réduit, ou sans JavaScript, la page reste une page ordinaire,
 * devant une image fixe.
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
const sortie = (x) => 1 - Math.pow(1 - x, 3);

/* Le voyage, en hauteurs d'écran de défilement. */
const PAS = 0.85; // d'une étape à la suivante
const PREMIER = 0.9; // du titre à la présentation
const ARRIVEE = 0.8; // du dernier projet au bout du chemin

/* L'astronaute : l'ordre des huit positions de la planche pour un cycle
   de marche (deux pas), et la longueur de ce cycle, en mètres. */
const CYCLE = [0, 4, 3, 7, 2, 6, 5, 1];
const FOULEE = 1.5;
// Dans la bande : cadre de 640 × 1280, figure de 1210 px, pieds à 1240.
const FIGURE = 1210 / 1280;

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
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.1, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  const battre = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(battre);
  gsap.ticker.lagSmoothing(0);

  const panneaux = $$('.panneau');
  const n = panneaux.length;
  const C_PROFIL = PREMIER;
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

  /** Une étape : son entrée s'achève juste avant son point de lecture,
      sa sortie commence juste après. */
  const ENTREE = 0.5;
  const LECTURE = 0.06;
  function etape(el, c, de, vers, sortieVers, enfants) {
    if (!el) return;
    tl.fromTo(el, { ...de, opacity: 0 }, { ...vers, opacity: 1, duration: ENTREE, ease: 'power3.out' }, c - LECTURE - ENTREE);
    if (enfants && enfants.length) {
      tl.fromTo(
        enfants,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: ENTREE * 0.7, stagger: ENTREE * 0.08, ease: 'power2.out' },
        c - LECTURE - ENTREE * 0.75
      );
    }
    if (sortieVers) {
      tl.fromTo(
        el,
        { ...vers, opacity: 1 },
        { ...sortieVers, opacity: 0, duration: 0.3, ease: 'power2.in', immediateRender: false },
        c + LECTURE + 0.04
      );
    }
  }

  // Le titre s'élève et s'efface dès les premiers pas.
  const intro = $('.intro');
  tl.fromTo($('.intro__titre', intro), { y: 0, opacity: 1, scale: 1 }, { y: -70, opacity: 0, scale: 0.97, duration: 0.36, ease: 'power1.in' }, 0.05);
  tl.fromTo($('.intro__chevrons', intro), { opacity: 1 }, { opacity: 0, duration: 0.15 }, 0);

  // La présentation, à gauche de l'astronaute.
  const carteProfil = $('.identite__carte');
  etape(
    carteProfil,
    C_PROFIL,
    { xPercent: -14, rotationY: 12, transformPerspective: 1600 },
    { xPercent: 0, rotationY: 0, transformPerspective: 1600 },
    { xPercent: -10, rotationY: 8, transformPerspective: 1600 },
    carteProfil ? Array.from(carteProfil.children) : null
  );

  // « Mes réalisations », seul dans le ciel.
  const entete = $('.projets__entete');
  etape(entete, C_REAL, { y: 46, scale: 0.97 }, { y: 0, scale: 1 }, { y: -50, scale: 0.98 });

  // Les projets : de part et d'autre, en alternance. Le panneau pivote
  // légèrement vers le centre en entrant, son image se pose, son texte
  // monte ligne à ligne.
  const reperes = [];
  panneaux.forEach((p, i) => {
    const c = C_PROJET(i);
    const sens = i % 2 ? 1 : -1;
    etape(
      p,
      c,
      { xPercent: 16 * sens, rotationY: -13 * sens, transformPerspective: 1600 },
      { xPercent: 0, rotationY: 0, transformPerspective: 1600 },
      { xPercent: -9 * sens, rotationY: 7 * sens, transformPerspective: 1600 },
      $$('.panneau__texte > *', p)
    );
    const image = $('.panneau__visuel img', p);
    if (image) tl.fromTo(image, { scale: 1.12 }, { scale: 1, duration: ENTREE + 0.1, ease: 'power2.out' }, c - LECTURE - ENTREE);
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
  const declencheurAtelier = ScrollTrigger.create({
    trigger: atelier,
    start: 'top 80%',
    end: 'top top',
    animation: apparition,
    scrub: 0.5,
  });

  /* ---------- l'astronaute ---------- */
  const astronaute = $('.astronaute');
  const pose = $('.astronaute__pose');
  const corps = $('.astronaute__corps');
  const reflet = $('.astronaute__reflet');
  const bandes = $$('.astronaute__bande');
  const hd = window.matchMedia('(min-resolution: 1.5dppx) and (min-width: 48rem) and (min-height: 40rem)').matches;
  const imageAstro = new Promise((resoudre) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = img.onerror = () => {
      astronaute.classList.add('astro-charge');
      if (hd) astronaute.classList.add('astro-hd');
      resoudre();
    };
    img.src = new URL(`espace/astronaute-${hd ? 1280 : 640}.webp`, document.baseURI).href;
  });
  let dernier = { cadre: -1, x: 0, y: 0, s: 0, b: 0, o: -1 };
  function poserAstronaute() {
    const a = monde && monde.astro;
    const o = a && a.visible ? borne((0.6 - etat.apres) / 0.35, 0, 1) : 0;
    if (o !== dernier.o) {
      pose.style.opacity = String(o);
      pose.style.visibility = o > 0 ? 'visible' : 'hidden';
      dernier.o = o;
    }
    if (!o) return;
    const phase = (((a.marche / FOULEE) % 1) + 1) % 1;
    const cadre = CYCLE[Math.floor(phase * 8) % 8];
    if (cadre !== dernier.cadre) {
      const t = `translate3d(${-cadre * 12.5}%,0,0)`;
      bandes.forEach((b) => (b.style.transform = t));
      dernier.cadre = cadre;
    }
    // Un léger mouvement vertical à chaque pas (deux par cycle).
    const b = 5 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 4));
    if (Math.abs(b - dernier.b) > 0.05) {
      corps.style.transform = `translate3d(0,${-b.toFixed(2)}px,0)`;
      reflet.style.transform = `translate3d(0,${b.toFixed(2)}px,0) scaleY(-1)`;
      dernier.b = b;
    }
    const s = a.echelle / (640 * FIGURE);
    const x = a.x - 160;
    const y = a.y - 620;
    if (Math.abs(x - dernier.x) > 0.05 || Math.abs(y - dernier.y) > 0.05 || Math.abs(s - dernier.s) > 0.0002) {
      pose.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(4)})`;
      dernier.x = x;
      dernier.y = y;
      dernier.s = s;
    }
  }

  /* ---------- les étapes et l'aimant ---------- */
  /** Les points de lecture, en pixels de défilement. */
  function arrets() {
    // L'arrivée au bout du chemin et le poste de travail ne font qu'une
    // étape : on s'arrête quand le poste est en place.
    const pts = [0, C_PROFIL, C_REAL, ...reperes].map(auVoyage);
    const yAtelier = cible('competences');
    const yContact = cible('contact');
    if (yAtelier !== null) pts.push(yAtelier);
    if (yContact !== null) pts.push(yContact);
    return pts.sort((a, b) => a - b);
  }

  let minuteur = 0;
  let sens = 1;
  let aimantActif = false;
  let ficheOuverte = false;
  // À la molette, Lenis adoucit le geste : l'endroit visé est connu dès
  // le dernier cran (targetScroll), on n'attend pas la fin de l'élan.
  // Au doigt, à la barre ou au clavier, on attend que tout soit posé.
  let molette = false;
  function aimanter() {
    if (!vivant || ficheOuverte || lenis.isStopped) return;
    if (!molette && Math.abs(lenis.velocity) > 0.5) {
      minuteur = window.setTimeout(aimanter, 90);
      return;
    }
    const y = molette ? lenis.targetScroll : lenis.animatedScroll;
    const pts = arrets();
    if (y <= pts[0] + 1 || y >= pts[pts.length - 1] - 1) return;
    let i = 0;
    while (i < pts.length - 2 && y > pts[i + 1]) i += 1;
    const a = pts[i];
    const b = pts[i + 1];
    const f = (y - a) / Math.max(1, b - a);
    if (f < 0.015 || f > 0.985) return;
    const cible = sens > 0 ? (f > 0.28 ? b : a) : f < 0.72 ? a : b;
    const ecart = Math.abs(cible - lenis.animatedScroll) / window.innerHeight;
    aimantActif = true;
    lenis.scrollTo(cible, {
      duration: borne(0.5 + ecart * 0.8, 0.55, 1.2),
      easing: sortie,
      userData: { aimant: true },
      onComplete: () => {
        aimantActif = false;
      },
    });
  }
  ecouter(
    window,
    'wheel',
    (e) => {
      molette = true;
      aimantActif = false;
      if (e.deltaY) sens = Math.sign(e.deltaY);
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(aimanter, 140);
    },
    { passive: true }
  );
  const autreGeste = () => {
    molette = false;
  };
  ecouter(window, 'touchstart', autreGeste, { passive: true });
  ecouter(window, 'pointerdown', autreGeste, { passive: true });
  ecouter(window, 'keydown', autreGeste);
  lenis.on('scroll', () => {
    if (aimantActif && !(lenis.userData && lenis.userData.aimant)) aimantActif = false;
    if (aimantActif || molette) return;
    if (lenis.direction) sens = lenis.direction;
    window.clearTimeout(minuteur);
    minuteur = window.setTimeout(aimanter, 170);
  });

  /* ---------- le menu ---------- */
  const nav = $('.nav');
  const majNav = () => nav.classList.toggle('nav--visible', window.scrollY > 24);
  lenis.on('scroll', majNav);
  majNav();

  /** Où mène chaque lien : la bonne étape du voyage. */
  function cible(id) {
    if (id === 'haut') return 0;
    if (id === 'profil') return auVoyage(C_PROFIL);
    if (id === 'projets') return auVoyage(C_REAL);
    const el = document.getElementById(id);
    if (!el) return null;
    const haut = el.getBoundingClientRect().top + window.scrollY;
    // Le poste de travail est collé à l'écran : on s'arrête quand il est
    // entièrement en place.
    if (id === 'competences') return haut;
    // Le contact est la dernière section : au plus bas de la page.
    if (id === 'contact') return Math.min(haut, document.documentElement.scrollHeight - window.innerHeight);
    return haut;
  }

  ecouter(document, 'click', (e) => {
    const lien = e.target.closest && e.target.closest('a[href^="#"]');
    if (!lien) return;
    const id = lien.getAttribute('href').slice(1);
    if (id === 'contenu') return;
    const y = cible(id);
    if (y === null) return;
    e.preventDefault();
    window.clearTimeout(minuteur);
    const ecart = Math.abs(y - window.scrollY) / window.innerHeight;
    aimantActif = true;
    lenis.scrollTo(y, {
      duration: borne(1 + ecart * 0.12, 1.1, 3),
      easing: doux,
      userData: { aimant: true },
      onComplete: () => {
        aimantActif = false;
      },
    });
  });

  /* La fiche d'un projet suspend le voyage ; il reprend à la fermeture.
     La fiche elle-même défile normalement (data-lenis-prevent). */
  ecouter(document, 'fiche', (e) => {
    ficheOuverte = Boolean(e.detail);
    window.clearTimeout(minuteur);
    if (e.detail) lenis.stop();
    else lenis.start();
  });

  /* Au clavier, un panneau ou la présentation qui reçoit le focus vient
     à l'écran. */
  ecouter(document, 'focusin', (e) => {
    const el = e.target.closest && e.target.closest('.panneau, .identite');
    if (!el) return;
    const i = panneaux.indexOf(el);
    const t = i >= 0 ? reperes[i] : C_PROFIL;
    const y = auVoyage(t);
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
            // La scène n'apparaît qu'avec son astronaute.
            surPret: () => imageAstro.then(() => doc.classList.add('monde-pret')),
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
    if (!monde) return;
    monde.rendre(temps);
    poserAstronaute();
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
    window.clearTimeout(minuteur);
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
