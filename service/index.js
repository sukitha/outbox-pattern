const Redis = require("ioredis");
const redis = new Redis({
  host: "cache",
  port: 6379,
});

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const app = express();
app.use(express.json());

const port = 3000;

app.post("/", async (req, res) => {
  let result = {
    status: "REJECTED",
  };
  if (req.body && req.body.itemId && req.body.itemCount && req.body.location) {
    let tid = uuidv4();
    let status = "ACCEPTED";
    result.tid = tid;
    result.status = status;
    const time = Date.now();
    const orderRequest = { ...req.body, ...result };
    await redis.lpush(
      `QUEUE:STATUS`,
      JSON.stringify({ order: orderRequest, status: status, time: time })
    );
    await redis.lpush(`QUEUE:ORDER`, JSON.stringify(orderRequest));
  }

  res.send(result);
});

app.get("/:tid", async (req, res) => {
  const status = await redis.hgetall(`STATUS:${req.params.tid}`);
  res.send({
    tid: req.params.tid,
    status: status,
  });
});

app.listen(port, () => {
  console.log(`Service app listening at http://localhost:${port}`);
});