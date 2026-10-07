import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Telechargement du CV, instantane et a l'abri des doubles clics.
 *
 * Un lien `download` ordinaire ne montre rien tant que le serveur n'a pas
 * repondu : on reclique, et chaque clic lance un telechargement de plus.
 * Ici, le fichier est rapatrie en memoire des que l'on s'en approche
 * (section en vue, survol, focus, doigt pose). Au clic, il est donc deja
 * la : l'enregistrement part dans le geste meme de l'utilisateur. Si le
 * fichier n'est pas encore arrive, le bouton le dit et l'attend.
 *
 * Le verrou est commun aux deux liens de la page (navigation et carte
 * de contact) : quelques secondes apres un telechargement, tout nouveau
 * clic est ignore. Sans JavaScript, le lien reste un lien `download`.
 */

export const CV = '/CV-Ahouet-Yann-Christ-Emmanuel.pdf';
const NOM = 'CV-Ahouet-Yann-Christ-Emmanuel.pdf';
const REPOS = 4000;

let promesse = null;
let fichier = null;
let verrou = 0;

export function prechargerCV() {
  if (fichier) return Promise.resolve(fichier);
  if (!promesse) {
    promesse = fetch(CV, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((b) => {
        fichier = b;
        return b;
      })
      .catch((err) => {
        promesse = null;
        throw err;
      });
  }
  return promesse;
}

function enregistrer(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = NOM;
  a.rel = 'noopener';
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const prechargerSansErreur = () => {
  prechargerCV().catch(() => {});
};

/**
 * @returns {{ etat: 'repos'|'prepa'|'fait', props: object }}
 */
export default function useTelechargement() {
  const [etat, setEtat] = useState('repos');
  const minuteur = useRef(0);

  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const terminer = useCallback(() => {
    verrou = Date.now() + REPOS;
    setEtat('fait');
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setEtat('repos'), REPOS);
  }, []);

  const surClic = useCallback(
    (e) => {
      // Ouvrir dans un onglet, enregistrer sous : le navigateur s'en charge.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (Date.now() < verrou) return;

      if (fichier) {
        enregistrer(fichier);
        terminer();
        return;
      }

      verrou = Infinity;
      setEtat('prepa');
      prechargerCV().then(
        (b) => {
          enregistrer(b);
          terminer();
        },
        () => {
          // Reseau capricieux : on rend la main au lien ordinaire.
          verrou = Date.now() + REPOS;
          setEtat('repos');
          window.location.assign(CV);
        }
      );
    },
    [terminer]
  );

  return {
    etat,
    props: {
      href: CV,
      download: NOM,
      onClick: surClic,
      onPointerEnter: prechargerSansErreur,
      onFocus: prechargerSansErreur,
      onTouchStart: prechargerSansErreur,
      'aria-busy': etat === 'prepa' ? true : undefined,
    },
  };
}
