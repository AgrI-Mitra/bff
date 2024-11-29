import { Injectable } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import * as cacheManager from 'cache-manager';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export class CacheProvider {
  private cache: cacheManager.Cache;
  private redisClient: RedisClientType;

  constructor() {
    this.redisClient = createClient({ url: 'redis://localhost:6379' });
    this.cache = cacheManager.caching({
      store: redisStore,
      client: this.redisClient,
      ttl: 60 * 5, // Time to live in seconds
    });
  }

  // Method to get a value from cache
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key);
  }

  // Method to set a value in cache
  async set<T>(key: string, value: T): Promise<void> {
    return this.cache.set(key, value);
  }

  // Optional: Method to delete a key from cache
  async del(key: string): Promise<void> {
    return this.cache.del(key);
  }

  async increment(key: string): Promise<void> {
    return this.cache.increment(key);
  }
}