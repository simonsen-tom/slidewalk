// Inert custom element. We only register it so the console doesn't warn
// about an unknown <slidewalk-deck> element. The real parsing happens in
// deck/parser.ts, with plain DOM queries against the markup (base.css hides it).
export class SlidewalkDeck extends HTMLElement {}

if (!customElements.get('slidewalk-deck')) {
  customElements.define('slidewalk-deck', SlidewalkDeck);
}
