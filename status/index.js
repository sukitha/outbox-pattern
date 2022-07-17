const Redis = require("ioredis");
const redisBlocking = new Redis({
  host: "cache",
  port: 6379,
});

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function ProcessStatus(order, status, time) {
  console.log(`Processing status ${status}`);
  await redis.hset(`STATUS:${order.tid}`, time, status);
  await redis.hset(`STATUS:${order.tid}`, `$LATEST`, status);
}

function StatusHandler() {
  redisBlocking.brpop(`QUEUE:STATUS`, 5).then(async (data) => {
    if (data && Array.isArray(data) && data.length > 1) {
      console.log(`Processing Status ${data[1]}`);
      let status = JSON.parse(data[1]);
      await ProcessStatus(status.order, status.status, status.time);
    }
    StatusHandler();
  });
}

StatusHandler();

console.log("Status service ...");