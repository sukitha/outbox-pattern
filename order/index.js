const Redis = require("ioredis");
const db = require("./model/db");
const Event = db.event;

db.connect();

const redisBlocking = new Redis({
  host: "cache",
  port: 6379,
});

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function StoreEvent(entityType, entityId, eventType, eventId) {
  let event = {
    entityType: entityType,
    eventId: eventId,
    eventType: eventType,
  };

  const foundItem = await Event.findOne({ where: { entityId: entityId } });
  console.log(foundItem);
  if (!foundItem) {
    console.log("Create new item");
    const item = await Event.create({ ...event, entityId });
    return { item: item, created: true };
  } else {
    console.log("Update the item");
    const item = await Event.update(event, { where: { entityId: entityId } });
    return { item, created: false };
  }
}

async function ProcessOrder(order) {
  if (order && order.status && order.status === "DELIVERY_PROCESSED") {
    await StoreEvent("order", order.tid, order.status, time);
  } else {
    let status = "ORDER_PROCESSED";
    let cost = order.itemCount * order.itemId; // calculation login
    const orderRequest = {
      ...order,
      status: status,
      cost: cost,
    };

    const time = Date.now();
    await StoreEvent("order", order.tid, order.status, time);
    await redis.lpush(`QUEUE:PAYMENT`, JSON.stringify(orderRequest));
  }
}

async function OrderReconciliation(order) {
  console.log(`Order Reconciliation - ${order.status}`);
  let time = Date.now();

  let status = "ORDER_CANCELED";
  await StoreEvent("order", order.tid, order.status, time);

  const orderRequest = {
    ...order,
    status: status,
  };
  await redis.lpush(
    "QUEUE:MANUAL:RECONCILIATION",
    JSON.stringify(orderRequest)
  );

  time = Date.now();
  await StoreEvent("order", order.tid, "ORDER_FAILED", time);
}

async function ProcessPaymentReply(order) {
  const time = Date.now();
  console.log(`Payment processed ${order.cost}`);
  const orderRequest = {
    ...order,
  };

  await StoreEvent("payment", order.tid, order.status, time);
  await redis.lpush("QUEUE:DELIVERY", JSON.stringify(orderRequest));
}

async function ProcessDeliveryReply(order) {
  let time = Date.now();
  console.log(`Delivery reply processed ${order.cost} - ${order.status}`);
  const orderRequest = {
    ...order,
  };

  await StoreEvent("delivery", order.tid, order.status, time);
  if (order.status === "DELIVERY_FAILED") {
    await redis.lpush(
      "QUEUE:PAYMENT:RECONCILIATION",
      JSON.stringify(orderRequest)
    );
  } else {
    time = Date.now();
    await StoreEvent("order", order.tid, "ORDER_PROCESSED", time);
  }
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
