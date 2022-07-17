const Redis = require("ioredis");
const redisBlocking = new Redis({
  host: "cache",
  port: 6379,
});

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function ProcessDelivery(order) {
  const time = Date.now();

  if (order.itemId === "200") {
    let status = "DELIVERY_FAILED";
    console.log(`Delivery process failed ${order.location}`); // payment login
    const orderRequest = {
      ...order,
      status: status,
      reason: "ITEM_NOT_AVAILABLE",
    };

    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: orderRequest, status: status, time: time })
    );
    await redis.lpush(
      `QUEUE:ORDER:RECONCILIATION`,
      JSON.stringify(orderRequest)
    );
  } else {
    let status = "DELIVERY_PROCESSED";
    console.log(`Delivery processed ${order.location}`); // payment login
    const orderRequest = {
      ...order,
      status: status,
    };

    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: orderRequest, status: status, time: time })
    );
    await redis.lpush(`QUEUE:ORDER`, JSON.stringify(orderRequest));
  }
}

function DeliveryHandler() {
  redisBlocking.brpop(`QUEUE:DELIVERY`, 5).then(async (data) => {
    if (data && Array.isArray(data) && data.length > 1) {
      console.log(`Processing delivery ${data[1]}`);
      await ProcessDelivery(JSON.parse(data[1]));
    }
    DeliveryHandler();
  });
}

DeliveryHandler();

console.log("Delivery service ..");