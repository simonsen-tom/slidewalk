export class SlidewalkSlide extends HTMLElement {}

if (!customElements.get('slidewalk-slide')) {
  customElements.define('slidewalk-slide', SlidewalkSlide);
}
