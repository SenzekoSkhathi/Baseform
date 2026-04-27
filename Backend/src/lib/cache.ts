/**
 * Thin Upstash Redis wrapper for cross-process caching (email analyzer, etc).
 * Falls back to a no-op cache if Upstash env vars are missing so local dev
 * without Redis still works.
 */

import { Redis } from "@upstash/redis";
import { createLogger } from "./logger.js";

const log = createLogger("cache");

interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

class NoopCache implements CacheClient {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }
  async set<T>(_key: string, _value: T, _ttlSeconds: number): Promise<void> {
    /* no-op */
  }
}

class RedisCache implements CacheClient {
  constructor(private redis: Redis) {}
  async get<T>(key: string): Promise<T | null> {
    try {
      return (await this.redis.get<T>(key)) ?? null;
    } catch (err) {
      log.warn("get failed", { key, error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      log.warn("set failed", { key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const cache: CacheClient = url && token
  ? new RedisCache(new Redis({ url, token }))
  : new NoopCache();

if (!url || !token) {
  log.warn("Upstash env vars missing — cache is a no-op");
}
