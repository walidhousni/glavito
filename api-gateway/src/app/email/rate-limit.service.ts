import { Injectable } from '@nestjs/common';

interface QueueItem<T> {
  run: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

@Injectable()
export class EmailRateLimitService {
  private readonly queues = new Map<string, Array<QueueItem<unknown>>>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly state = new Map<string, { lastRunAt: number; intervalMs: number }>();

  async schedule<T>(key: string, ratePerSecond: number, task: () => Promise<T>): Promise<T> {
    const intervalMs = Math.max(1000 / Math.max(1, ratePerSecond || 1), 50);
    const s = this.state.get(key) || { lastRunAt: 0, intervalMs };
    s.intervalMs = intervalMs;
    this.state.set(key, s);
    return new Promise<T>((resolve, reject) => {
      const queue = this.queues.get(key) || [];
      queue.push({ run: task, resolve, reject } as QueueItem<T> as any);
      this.queues.set(key, queue);
      this.pump(key).catch(() => {});
    });
  }

  private async pump(key: string): Promise<void> {
    if (this.timers.has(key)) return; // already scheduled
    const tick = async () => {
      const q = this.queues.get(key) || [];
      if (!q.length) {
        const t = this.timers.get(key);
        if (t) clearTimeout(t);
        this.timers.delete(key);
        return;
      }
      const st = this.state.get(key) || { lastRunAt: 0, intervalMs: 200 };
      const now = Date.now();
      const elapsed = now - st.lastRunAt;
      const wait = Math.max(0, st.intervalMs - elapsed);
      if (wait > 5) {
        const t = setTimeout(() => this.pump(key).catch(() => {}), wait);
        this.timers.set(key, t);
        return;
      }
      const item = q.shift()!;
      this.queues.set(key, q);
      st.lastRunAt = Date.now();
      this.state.set(key, st);
      try {
        const result = await item.run();
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      } finally {
        const t = setTimeout(() => this.pump(key).catch(() => {}), st.intervalMs);
        this.timers.set(key, t);
      }
    };
    const t = setTimeout(() => tick().catch(() => {}), 0);
    this.timers.set(key, t);
  }
}


