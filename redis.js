import { Redis } from "@upstash/redis";

function createRedisClient(url, token) {
	if (!url || !token) {
		throw new Error("Missing URL or token for Redis REST API. Please check your settings.");
	}

	return new Redis({ url, token });
}

async function isRedisClientValid(client) {
	try {
		await client.ping();
		return true;
	} catch {
		return false;
	}
}

export { createRedisClient, isRedisClientValid };
