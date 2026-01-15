/**
 * In-Memory LRU Cache for Embeddings
 * Reduces redundant HuggingFace API calls for repeated text.
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number = 100, ttlMinutes: number = 30) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Generates a hash key for the given text.
   */
  private hash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Gets a value from cache, returns null if not found or expired.
   */
  get(key: string): T | null {
    const hashedKey = this.hash(key);
    const entry = this.cache.get(hashedKey);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(hashedKey);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(hashedKey);
    this.cache.set(hashedKey, entry);
    
    return entry.value;
  }

  /**
   * Sets a value in the cache.
   */
  set(key: string, value: T): void {
    const hashedKey = this.hash(key);
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(hashedKey, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clears all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns cache statistics.
   */
  stats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMinutes: this.ttlMs / 60 / 1000
    };
  }
}

// Singleton instances for different cache types
export const embeddingCache = new LRUCache<number[]>(200, 60); // 200 entries, 1 hour TTL
export const skillsCache = new LRUCache<string[]>(500, 120);   // 500 entries, 2 hour TTL

/**
 * Wrapper for cached embedding generation.
 */
export async function getCachedEmbedding(
  text: string,
  generateFn: (text: string) => Promise<number[]>
): Promise<number[]> {
  const cached = embeddingCache.get(text);
  if (cached) {
    console.log('[Cache] HIT for embedding');
    return cached;
  }
  
  console.log('[Cache] MISS - generating embedding');
  const embedding = await generateFn(text);
  embeddingCache.set(text, embedding);
  return embedding;
}
