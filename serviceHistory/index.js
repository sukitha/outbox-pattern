const Redis = require("ioredis");
const redis = new Redis({
  host: "cache",
  port: 6379,
});

const express = require("express");
const app = express();
app.use(express.json());

const port = 3001;

app.get("/history/:tid", async (req, res) => {
  const status = await redis.hgetall(`STATUS:${req.params.tid}`);
  res.send({
    tid: req.params.tid,
    status: status,
  });
});

app.listen(port, () => {
  console.log(`Service app listening at http://localhost:${port}`);
});