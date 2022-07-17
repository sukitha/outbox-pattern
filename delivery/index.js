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

  let orderRequest = {
    ...order,
    status: "DELIVERY_PROCESSED",
  };
  if (order.itemId === "200") {
    console.log(`Delivery process failed ${order.location}`); // payment login
    orderRequest = {
      ...orderRequest,
      status: "DELIVERY_FAILED",
      reason: "ITEM_NOT_AVAILABLE",
    };
  } else {
    console.log(`Delivery processed ${order.location}`); // payment login
  }
  await redis.lpush('QUEUE:DELIVERY:REPLY', JSON.stringify(orderRequest));
}

function DeliveryHandler() {
  redisBlocking.brpop("QUEUE:DELIVERY", 5).then(async (data) => {
    if (data && Array.isArray(data) && data.length > 1) {
      console.log(`Processing delivery ${data[1]}`);
      await ProcessDelivery(JSON.parse(data[1]));
    }
    DeliveryHandler();
  });
}

DeliveryHandler();

console.log("Delivery service ..");