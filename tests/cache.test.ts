import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache, embeddingCache, getCachedEmbedding } from '../lib/cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3, 1); // Max 3 items, 1 minute TTL
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should evict oldest entry when capacity exceeded', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on access', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // Access key1 to make it most recently used
    cache.get('key1');
    
    cache.set('key4', 'value4'); // Should evict key2 (oldest)
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeNull();
  });

  it('should report correct stats', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const stats = cache.stats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(3);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.stats().size).toBe(0);
  });
});

describe('getCachedEmbedding', () => {
  beforeEach(() => {
    embeddingCache.clear();
  });

  it('should call generator on cache miss', async () => {
    let callCount = 0;
    const generator = async (text: string) => {
      callCount++;
      return [0.1, 0.2, 0.3];
    };

    const result = await getCachedEmbedding('test text', generator);
    
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(callCount).toBe(1);
  });

  it('should return cached value on cache hit', async () => {
    let callCount = 0;
    const generator = async (text: string) => {
      callCount++;
      return [0.1, 0.2, 0.3];
    };

    await getCachedEmbedding('test text', generator);
    await getCachedEmbedding('test text', generator);
    
    expect(callCount).toBe(1); // Only called once
  });
});
