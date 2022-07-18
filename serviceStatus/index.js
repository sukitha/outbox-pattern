const express = require("express");
const db = require("./model/db");
const Event = db.event;

const app = express();
app.use(express.json());

const port = 3002;

app.get("/status/:tid", async (req, res) => {
  const status = await Event.findOne({where: {entityId: req.params.tid}});
  res.send({
    tid: req.params.tid,
    status: status,
  });
});

app.listen(port, () => {
  console.log(`Service app listening at http://localhost:${port}`);
});