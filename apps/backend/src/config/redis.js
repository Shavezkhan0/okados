const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true, // REQUIRED for Redis Cloud
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

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Redis connection failed:", error);
    setTimeout(connectRedis, 5000);
  }
};

module.exports = { redisClient, connectRedis };
