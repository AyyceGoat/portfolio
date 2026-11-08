import { useEffect } from 'react';

import Nav from './components/Nav.jsx';
import Intro from './components/Intro.jsx';
import Astronaute from './components/Astronaute.jsx';
import Projets from './components/Projets.jsx';
import Profil from './components/Profil.jsx';
import Atelier from './components/Atelier.jsx';
import Contact from './components/Contact.jsx';

export default function App() {
  // La mise en scène (défilement, panneaux, monde WebGL) arrive dans un
  // second fichier, chargé après le premier affichage.
  useEffect(() => {
    let arreter = null;
    let annule = false;
    import('./scene/voyage.js').then(({ lancer }) => {
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

      {/* Le monde : une affiche rendue par le même moteur (affichée dès le
          premier octet, et seule sans processeur graphique), puis la scène
          calculée en temps réel par-dessus ; un voile pour la lecture. */}
      <div className="monde" aria-hidden="true">
        <div className="monde__affiche" />
        <canvas className="monde__toile" />
        <div className="monde__voile" />
      </div>

      <Nav />

      <main id="contenu">
        <div className="voyage">
          <div className="voyage__scene">
            <Astronaute />
            <Intro />
            <Profil />
            <Projets />
          </div>
        </div>
        <Atelier />
        <Contact />
      </main>
    </>
  );
}
