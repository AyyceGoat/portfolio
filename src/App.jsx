import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';
import Projects from './components/Projects.jsx';
import Skills from './components/Skills.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import { useReveal } from './hooks/useReveal.js';

export default function App() {
  useReveal();

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <div className="blueprint" aria-hidden="true" />

      <Nav />

      <div className="shell">
        <Hero />

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
