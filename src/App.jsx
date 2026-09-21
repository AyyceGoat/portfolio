import { useRef } from 'react';

import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';
import Projects from './components/Projects.jsx';
import Skills from './components/Skills.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import Globe from './globe/Globe.jsx';
import { useReveal } from './hooks/useReveal.js';

export default function App() {
  useReveal();
  const heroRef = useRef(null);

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <div className="blueprint" aria-hidden="true" />

      {/* Decoratif, et charge seulement une fois le texte affiche. */}
      <Globe heroRef={heroRef} />

      <Nav />

      <div className="shell">
        <Hero innerRef={heroRef} />

        <main id="contenu">
          <About />
          <Projects />
          <Skills />
          <Contact />
        </main>

        <Footer />
      </div>
    </>
  );
}
