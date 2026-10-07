/* Photographies du ciel : ESA/Webb, licence CC BY 4.0. Les credits sont
   reproduits tels que publies, en anglais, comme le demande la licence. */
const CREDITS = [
  ['weic2205a', 'Cosmic Cliffs', 'NASA, ESA, CSA, and STScI'],
  ['weic2216b', 'Pillars of Creation', 'NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI).'],
  ['weic2209a', 'Webb’s First Deep Field', 'NASA, ESA, CSA, and STScI'],
  ['weic2212a', 'Tarantula Nebula', 'NASA, ESA, CSA, and STScI'],
  ['weic2301a', 'NGC 346', 'NASA, ESA, CSA, STScI, A. Pagan (STScI)'],
  ['weic2316a', 'Rho Ophiuchi', 'NASA, ESA, CSA, STScI, K. Pontoppidan (STScI), A. Pagan (STScI)'],
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <p className="footer__note">
          Ahouet Yann Christ Emmanuel — Abidjan, Côte d’Ivoire
        </p>
        <a className="footer__top" href="#haut">
          Retour en haut ↑
        </a>
      </div>

      <div className="wrap footer__credits">
        <p>
          Ciel : photographies du télescope spatial James Webb,{' '}
          <a href="https://esawebb.org/copyright/">ESA/Webb</a>, sous licence{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.fr">CC BY 4.0</a>, recadrées
          et compressées pour le site.
        </p>
        <ul>
          {CREDITS.map(([id, titre, credit]) => (
            <li key={id}>
              <a href={`https://esawebb.org/images/${id}/`}>{titre}</a> — {credit}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
