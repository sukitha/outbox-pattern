const Redis = require("ioredis");
const db = require("./model/db");
const Event = db.event;

const redisBlocking = new Redis({
  host: "cache",
  port: 6379,
});

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function StoreEvent(entityType, entityId, eventType, eventId) {
  await Event.create({
    entityType: entityType,
    eventId: eventId,
    eventType: eventType,
    entityId: entityId,
  });
}

async function ProcessOrder(order) {
  if (order && order.status && order.status === "DELIVERY_PROCESSED") {
    let status = "ORDER_COMPLETED";
    let cost = order.itemCount * order.itemId; // calculation login
    const orderRequest = {
      ...order,
      status: status,
      cost: cost,
    };
    await redis.lpush(
      "QUEUE:STATUS",
      JSON.stringify({ order: orderRequest, status: status, time: time })
    );
    await StoreEvent('order', order.tid, order.status, time);
  } else {
    let status = "ORDER_PROCESSED";
    let cost = order.itemCount * order.itemId; // calculation login
    const orderRequest = {
      ...order,
      status: status,
      cost: cost,
    };

    const time1 = Date.now();
    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: order, status: order.status, time: time1 })
    );

    await StoreEvent('order', order.tid, order.status, time1);

    const time2 = Date.now();
    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: orderRequest, status: status, time: time2 })
    );

    await StoreEvent('order', order.tid, order.status, time2);
    await redis.lpush(`QUEUE:PAYMENT`, JSON.stringify(orderRequest));
  }
}

async function OrderReconciliation(order) {
  console.log(`Order Reconciliation - ${order.status}`);
  const time1 = Date.now();

  let status = "ORDER_CANCELED";

  await redis.lpush(
    "QUEUE:STATUS",
    JSON.stringify({ order: order, status: order.status, time: time1 })
  );

  await StoreEvent('order', order.tid, order.status, time1);

  const orderRequest = {
    ...order,
    status: status,
  };

  const time2 = Date.now();
  await redis.lpush(
    "QUEUE:STATUS",
    JSON.stringify({ order: orderRequest, status: status, time: time2 })
  );

  await StoreEvent('order', order.tid, order.status, time2);
  await redis.lpush(
    "QUEUE:MANUAL:RECONCILIATION",
    JSON.stringify(orderRequest)
  );
}

async function ProcessPaymentReply(order) {
  const time = Date.now();
  console.log(`Payment processed ${order.cost}`);
  const orderRequest = {
    ...order,
  };

  await redis.lpush(
    "QUEUE:STATUS",
    JSON.stringify({
      order: orderRequest,
      status: orderRequest.status,
      time: time,
    })
  );
  await StoreEvent('order', order.tid, order.status, time);
  await redis.lpush("QUEUE:DELIVERY", JSON.stringify(orderRequest));

  
}

async function ProcessDeliveryReply(order) {
  const time = Date.now();
  console.log(`Delivery reply processed ${order.cost} - ${order.status}`);
  const orderRequest = {
    ...order,
  };

  if (order.status === "DELIVERY_FAILED") {
    await redis.lpush(
      "QUEUE:PAYMENT:RECONCILIATION",
      JSON.stringify(orderRequest)
    );
  }
  await redis.lpush(
    "QUEUE:STATUS",
    JSON.stringify({
      order: orderRequest,
      status: orderRequest.status,
      time: time,
    })
  );
  await StoreEvent('order', order.tid, order.status, time);
}


function OrderHandler() {
  redisBlocking
    .brpop(
      "QUEUE:ORDER",
      "QUEUE:ORDER:RECONCILIATION",
      "QUEUE:PAYMENT:REPLY",
      "QUEUE:DELIVERY:REPLY",
      "QUEUE:PAYMENT:RECONCILIATION:REPLY",
      5
    )
    .then(async (data) => {
      if (data && Array.isArray(data) && data.length > 1) {
        switch (data[0]) {
          case "QUEUE:ORDER":
            await ProcessOrder(JSON.parse(data[1]));
            break;
          case "QUEUE:PAYMENT:REPLY":
            await ProcessPaymentReply(JSON.parse(data[1]));
            break;
          case "QUEUE:DELIVERY:REPLY":
            await ProcessDeliveryReply(JSON.parse(data[1]));
            break;
          case "QUEUE:PAYMENT:RECONCILIATION:REPLY":
            await OrderReconciliation(JSON.parse(data[1]));
            break;
        }
      }
      OrderHandler();
    });
}

OrderHandler();

console.log("Order service ..");
