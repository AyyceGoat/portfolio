import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';

import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';
import './styles/app.css';

const racine = document.getElementById('root');
const arbre = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Le HTML a ete rendu au build : React se contente de s'y raccrocher,
// sans rien redessiner. En developpement, la racine est vide.
if (racine.hasChildNodes()) hydrateRoot(racine, arbre);
else createRoot(racine).render(arbre);
