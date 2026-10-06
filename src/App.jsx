import { useRef } from 'react';

import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';
import Projects from './components/Projects.jsx';
import Skills from './components/Skills.jsx';
import Signal from './components/Signal.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import Cosmos from './cosmos/Cosmos.jsx';
import { useReveal } from './hooks/useReveal.js';
import { useAmorti } from './hooks/useAmorti.js';

export default function App() {
  useReveal();
  const shellRef = useRef(null);
  useAmorti(shellRef);

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>

      {/* Le ciel : peint en CSS des le premier octet, anime ensuite. */}
      <Cosmos />

      <Nav />

      <div className="shell" ref={shellRef}>
        <Hero />

        <main id="contenu">
          <About />
          <Projects />
          <Skills />
          <Signal />
          <Contact />
        </main>

        <Footer />
      </div>
    </>
  );
}
