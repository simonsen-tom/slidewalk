export type PresenterListener = (on: boolean) => void;

export class PresenterState {
  private on = false;
  private readonly listeners = new Set<PresenterListener>();

  get isPresenterMode(): boolean {
    return this.on;
  }

  toggle(): void {
    this.on = !this.on;
    for (const listener of this.listeners) {
      listener(this.on);
    }
  }

  onChange(listener: PresenterListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
