import { useEffect } from 'react';

const SOUPLESSE = 0.115; // part de l'ecart rattrapee a chaque image
const SEUIL = 0.08; // en deca, on considere le mouvement termine

/**
 * Defilement amorti.
 *
 * Le navigateur continue de defiler normalement — la barre, la molette,
 * les ancres et la position restent natives. On se contente de faire
 * suivre le contenu avec un retard, par un simple translate3d, ce qui
 * reste une operation de composition.
 *
 * Trois garde-fous :
 *  - rien au tactile : le defilement natif d'un telephone est deja
 *    meilleur que tout ce qu'on pourrait simuler, et moins couteux ;
 *  - rien si l'on demande moins d'animation ;
 *  - la boucle s'arrete des que le contenu a rattrape sa cible, et ne
 *    repart qu'au prochain defilement.
 */
export function useAmorti(shellRef) {
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduced) return undefined;

    const racine = document.documentElement;
    racine.classList.add('amorti');

    // Le contenu devient fixe : il faut rendre sa hauteur au document,
    // sans quoi il n'y aurait plus rien a faire defiler.
    const cale = document.createElement('div');
    cale.setAttribute('aria-hidden', 'true');
    cale.className = 'amorti-cale';
    shell.after(cale);

    let cible = window.scrollY;
    let courant = cible;
    let frame = 0;
    let anime = false;
    let ignorerFocus = false;

    const mesurer = () => {
      cale.style.height = `${shell.offsetHeight}px`;
    };

    const poser = () => {
      shell.style.transform = `translate3d(0, ${-courant.toFixed(2)}px, 0)`;
    };

    const boucle = () => {
      const ecart = cible - courant;
      if (Math.abs(ecart) < SEUIL) {
        courant = cible;
        poser();
        anime = false;
        // On rend la memoire video : plus rien ne bouge.
        shell.style.willChange = 'auto';
        return;
      }
      courant += ecart * SOUPLESSE;
      poser();
      frame = requestAnimationFrame(boucle);
    };

    const relancer = () => {
      if (anime) return;
      anime = true;
      shell.style.willChange = 'transform';
      frame = requestAnimationFrame(boucle);
    };

    const onScroll = () => {
      cible = window.scrollY;
      relancer();
    };

    const MARGE = 88; // hauteur de la barre, plus un peu d'air

    /**
     * Un contenu fixe ne peut plus etre atteint par le navigateur :
     * les liens d'ancrage, et le lien d'evitement, cesseraient de
     * fonctionner. On refait donc le calcul nous-memes, a partir du
     * decalage reellement applique.
     */
    const allerVers = (el, marge = MARGE) => {
      const r = el.getBoundingClientRect();
      const max = Math.max(0, cale.offsetHeight - window.innerHeight);
      const destination = Math.min(Math.max(0, courant + r.top - marge), max);
      window.scrollTo({ top: destination, behavior: 'auto' });
    };

    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const lien = e.target.closest && e.target.closest('a[href^="#"]');
      if (!lien) return;
      const href = lien.getAttribute('href');
      if (!href || href === '#') return;

      let el = null;
      try {
        el = document.getElementById(decodeURIComponent(href.slice(1)));
      } catch (err) {
        return;
      }
      if (!el) return;

      e.preventDefault();
      allerVers(el);

      // Le focus doit suivre la lecture, sinon le clavier resterait
      // en arriere — c'est tout l'objet du lien d'evitement. On neutralise
      // le rattrapage du focus le temps de le poser : la destination
      // vient d'etre calculee, il n'y a pas lieu de la recalculer.
      ignorerFocus = true;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      ignorerFocus = false;

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', href);
      }
    };

    // Arrivee directe sur une ancre : meme probleme, meme remede.
    const ancreInitiale = () => {
      if (!window.location.hash || window.location.hash === '#') return;
      let el = null;
      try {
        el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      } catch (err) {
        return;
      }
      if (el) allerVers(el);
    };

    // Au clavier, le navigateur ne peut plus faire defiler un contenu
    // fixe : on l'amene nous-memes dans le champ. Le calcul part de la
    // position reellement appliquee au contenu, jamais de window.scrollY
    // — les deux different tant que le mouvement n'est pas fini, et les
    // melanger ferait depasser la cible.
    const onFocus = (e) => {
      if (ignorerFocus) return;
      const el = e.target;
      if (!el || !el.getBoundingClientRect) return;
      const r = el.getBoundingClientRect();
      if (r.top >= 96 && r.bottom <= window.innerHeight - 24) return;
      allerVers(el, window.innerHeight * 0.35);
    };

    const ro = new ResizeObserver(mesurer);
    ro.observe(shell);
    mesurer();
    poser();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', mesurer, { passive: true });
    document.addEventListener('focusin', onFocus);
    document.addEventListener('click', onClick);

    // Le contenu vient d'etre mesure : on peut viser l'ancre d'arrivee.
    requestAnimationFrame(ancreInitiale);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', mesurer);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('click', onClick);
      racine.classList.remove('amorti');
      shell.style.transform = '';
      shell.style.willChange = '';
      cale.remove();
    };
  }, [shellRef]);
}
