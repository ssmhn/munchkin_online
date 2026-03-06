import gsap from 'gsap';

export type AnimationTask = () => gsap.core.Tween | gsap.core.Timeline | Promise<void>;

export class AnimationQueue {
  private queue: AnimationTask[] = [];
  private running = false;
  private onComplete: (() => void) | null = null;

  enqueue(task: AnimationTask): void {
    this.queue.push(task);
    if (!this.running) {
      this.processNext();
    }
  }

  setOnComplete(cb: () => void): void {
    this.onComplete = cb;
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.running = false;
      this.onComplete?.();
      return;
    }

    this.running = true;
    const task = this.queue.shift()!;

    try {
      const result = task();
      if (result instanceof Promise) {
        await result;
      } else {
        // It's a GSAP tween/timeline — wait for it
        await new Promise<void>((resolve) => {
          result.eventCallback('onComplete', resolve);
        });
      }
    } catch (err) {
      console.error('[AnimationQueue] Task error', err);
    }

    this.processNext();
  }

  clear(): void {
    this.queue = [];
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get length(): number {
    return this.queue.length;
  }
}
