export class SlidewalkLane extends HTMLElement {}

if (!customElements.get('slidewalk-lane')) {
  customElements.define('slidewalk-lane', SlidewalkLane);
}
