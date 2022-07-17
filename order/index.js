const Redis = require("ioredis");
const redisBlocking = new Redis({
  host: "cache",
  port: 6379,
});

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function ProcessOrder(order) {
  const time = Date.now();
  if (order && order.status && order.status === "DELIVERY_PROCESSED") {
    let status = "ORDER_COMPLETED";
    let cost = order.itemCount * order.itemId; // calculation login
    const orderRequest = {
      ...order,
      status: status,
      cost: cost,
    };
    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: orderRequest, status: status, time: time })
    );
  } else {
    let status = "ORDER_PROCESSED";
    let cost = order.itemCount * order.itemId; // calculation login
    const orderRequest = {
      ...order,
      status: status,
      cost: cost,
    };

    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: orderRequest, status: status, time: time })
    );
    await redis.lpush(`QUEUE:PAYMENT`, JSON.stringify(orderRequest));
  }
}

async function OrderReconciliation(order) {
  const time = Date.now();
  let status = "ORDER_CANCELED";

  const orderRequest = {
    ...order,
    status: status,
  };

  await redis.lpush(
    `QUEUE:STATUS`,
    JSON.stringify({ order: orderRequest, status: status, time: time })
  );
  await redis.lpush(
    `QUEUE:MANUAL:RECONCILIATION`,
    JSON.stringify(orderRequest)
  );
}

function OrderHandler() {
  redisBlocking
    .brpop(`QUEUE:ORDER`, `QUEUE:ORDER:RECONCILIATION`, 5)
    .then(async (data) => {
      if (data && Array.isArray(data) && data.length > 1) {
        if (data[0] === "QUEUE:ORDER") {
          console.log(`Processing order ${data[1]}`);
          await ProcessOrder(JSON.parse(data[1]));
        } else {
          await OrderReconciliation(JSON.parse(data[1]));
        }
      }
      OrderHandler();
    });
}

OrderHandler();

console.log("Order service ..");