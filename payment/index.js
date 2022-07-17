const Redis = require("ioredis");
const redisBlocking = new Redis({
  host: "cache",
  port: 6379,
});

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function ProcessPayment(order) {
  const time = Date.now();
  let status = "PAYMENT_PROCESSED";
  console.log(`Payment processed ${order.cost}`);
  const orderRequest = {
    ...order,
    status: status,
  };

  await redis.lpush(
    `QUEUE:STATUS`,
    JSON.stringify({ order: orderRequest, status: status, time: time })
  );
  await redis.lpush(`QUEUE:DELIVERY`, JSON.stringify(orderRequest));
}

async function PaymentReconciliation(order) {
  const time = Date.now();
  let status = "PAYMENT_REVERSED";

  const orderRequest = {
    ...order,
    status: status,
  };

  await redis.lpush(`QUEUE:ORDER:RECONCILIATION`, JSON.stringify(orderRequest));
  await redis.lpush(
    `QUEUE:STATUS`,
    JSON.stringify({ order: orderRequest, status: status, time: time })
  );
}

function PaymentHandler() {
  redisBlocking
    .brpop(`QUEUE:PAYMENT`, "QUEUE:PAYMENT:RECONCILIATION`", 5)
    .then(async (data) => {
      if (data && Array.isArray(data) && data.length > 1) {
        if (data[0] === "QUEUE:PAYMENT") {
          console.log(`Processing payment ${data[1]}`);
          await ProcessPayment(JSON.parse(data[1]));
        } else {
          PaymentReconciliation(JSON.parse(data[1]));
        }
      }

      PaymentHandler();
    });
}

PaymentHandler();

console.log("Payment service ..");