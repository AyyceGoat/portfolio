import { StrictMode, startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';

import './styles/fonts.css';
import './styles/base.css';
import './styles/app.css';

const racine = document.getElementById('root');
const arbre = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Le HTML a été rendu au build : React se contente de s'y raccrocher,
// sans rien redessiner. On attend que la première image soit peinte
// (rAF, puis une tâche), et l'hydratation se fait en transition : elle
// rend la main au navigateur par tranches au lieu d'une longue tâche.
// En développement, la racine est vide.
const hydrater = () => startTransition(() => hydrateRoot(racine, arbre));
if (racine.hasChildNodes()) requestAnimationFrame(() => window.setTimeout(hydrater, 0));
else createRoot(racine).render(arbre);
