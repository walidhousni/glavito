import { Injectable, Logger } from '@nestjs/common';
import { AIIntelligenceService } from './ai-intelligence.service';

export interface VectorDoc {
  id: string;
  tenantId: string;
  text: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly index = new Map<string, VectorDoc>(); // key: tenant:docId

  constructor(private readonly ai: AIIntelligenceService) {}

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async upsert(doc: VectorDoc): Promise<void> {
    try {
      const embedding = doc.embedding && doc.embedding.length ? doc.embedding : await this.ai.computeEmbedding(doc.text);
      this.index.set(this.key(doc.tenantId, doc.id), { ...doc, embedding });
    } catch (e) {
      this.logger.warn(`upsert failed for ${doc.id}: ${(e as Error).message}`);
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    this.index.delete(this.key(tenantId, id));
  }

  async similaritySearch(tenantId: string, query: string, topK = 5): Promise<Array<{ doc: VectorDoc; score: number }>> {
    try {
      const q = await this.ai.computeEmbedding(query);
      if (!q.length) return [];
      const items: Array<{ doc: VectorDoc; score: number }> = [];
      for (const [k, d] of this.index.entries()) {
        if (!k.startsWith(`${tenantId}:`)) continue;
        const score = this.cosineSim(q, d.embedding || []);
        if (!Number.isFinite(score)) continue;
        items.push({ doc: d, score });
      }
      return items.sort((a, b) => b.score - a.score).slice(0, topK);
    } catch (e) {
      this.logger.warn(`similaritySearch error: ${(e as Error).message}`);
      return [];
    }
  }

  private cosineSim(a: number[], b: number[]): number {
    if (!a.length || !b.length) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < len; i++) {
      const x = a[i];
      const y = b[i];
      dot += x * y;
      na += x * x;
      nb += y * y;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom ? dot / denom : 0;
  }
}


