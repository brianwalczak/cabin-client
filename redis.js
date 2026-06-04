import { Redis } from '@upstash/redis';

export default function createRedisClient(url, token) {
    if (!url || !token) {
        throw new Error('Missing URL or token for Redis REST API. Please check your settings.');
    }

    return new Redis({ url, token });
}