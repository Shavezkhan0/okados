import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis reconnect failed");
        return new Error("Redis reconnect failed");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) =>
  console.error("❌ Redis Client Error:", err.message)
);

redisClient.on("connect", () =>
  console.log("✅ Redis Cloud Connected")
);

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Redis connection failed:", error);
    setTimeout(connectRedis, 5000);
  }
};

export { redisClient };
export default { redisClient, connectRedis };
