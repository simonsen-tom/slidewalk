let nextInstanceId = 0;

/**
 * Keeps any <style> blocks a slide author put in their markdown confined to
 * this panel, using CSS @scope. Otherwise they'd leak onto other .sw-slide
 * panels that are live in the page at the same time (during transitions, in
 * the presenter preview, or as overview thumbnails).
 */
export function scopeSlideStyles(panel: HTMLElement): void {
  const styles = panel.querySelectorAll('style');
  if (styles.length === 0) return;
  if (!panel.id) {
    panel.id = `sw-slide-instance-${++nextInstanceId}`;
  }
  for (const style of styles) {
    style.textContent = `@scope (#${panel.id}) {\n${style.textContent}\n}`;
  }
}
