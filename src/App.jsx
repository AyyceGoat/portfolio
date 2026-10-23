import { useEffect } from 'react';

import Nav from './components/Nav.jsx';
import Ouverture from './components/Ouverture.jsx';
import Profil from './components/Profil.jsx';
import Projets from './components/Projets.jsx';
import Atelier from './components/Atelier.jsx';
import Contact from './components/Contact.jsx';
import Astronaute from './scene/Astronaute.jsx';

export default function App() {
  // La mise en scène (chronologie, navigation, monde WebGL) arrive dans
  // un second fichier, chargé après le premier affichage.
  useEffect(() => {
    let arreter = null;
    let annule = false;
    import('./scene/parcours.js').then(({ lancer }) => {
      if (!annule) arreter = lancer();
    });
    return () => {
      annule = true;
      if (arreter) arreter();
    };
  }, []);

  return (
    <>
      <a className="lien-evitement" href="#contenu">
        Aller au contenu
      </a>

      {/* Le monde : deux affiches rendues par le même moteur (affichées
          dès le premier octet, et seules sans processeur graphique), puis
          la scène calculée en temps réel par-dessus. */}
      <div className="monde" aria-hidden="true">
        <div className="monde__affiche monde__affiche--depart" />
        <div className="monde__affiche monde__affiche--orbite" />
        <canvas className="monde__toile" />
      </div>
      <Astronaute />

      <Nav />

      <main className="scene" id="contenu">
        <Ouverture />
        <Profil />
        <Projets />
        <Atelier />
        <Contact />
      </main>

      {/* Entrée dans l'atmosphère : éclair, puis onde de choc. */}
      <div className="eclat" aria-hidden="true" />
      <div className="onde" aria-hidden="true" />

      {/* Visite guidée : bandeaux de cinéma, chapitre en cours, arrêt. */}
      <div className="visite" role="status">
        <span className="visite__bande visite__bande--haut" aria-hidden="true" />
        <span className="visite__bande visite__bande--bas" aria-hidden="true" />
        <p className="visite__legende mono">
          <span className="visite__etiquette">Visite guidée</span>
          <span className="visite__titre">Départ</span>
        </p>
        <button type="button" className="visite__arret mono" data-arreter-visite>
          Arrêter la visite
          <span className="visite__touche" aria-hidden="true">
            Échap
          </span>
        </button>
      </div>

      <div className="parcours" aria-hidden="true" />
    </>
  );
}
