import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';

/** Rendu au moment du build : la page arrive deja ecrite dans le HTML. */
export function rendre() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
