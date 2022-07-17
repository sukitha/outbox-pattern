const user = process.env.POSTGRES_USER;
const host = "postgres";
const database = "orderapp";
const password = process.env.POSTGRES_PASSWORD;
const port = 5432;

const { Sequelize, Model, DataTypes } = require("sequelize");

const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: "postgres",
  reconnect: true,
  logging: true,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.event = sequelize.define("event", {
  entityType: {
    type: Sequelize.STRING,
  },
  eventId: {
    type: Sequelize.BIGINT,
  },
  eventType: {
    type: Sequelize.STRING,
  },
  entityId: {
    type: Sequelize.STRING,
    primaryKey: true
  },
});

db.event
  .sync()
  .then(() => {
    console.log("Connected to DB...");
  })
  .catch((err) => {
    console.log("Error connecting to DB: " + err.message);
  });

module.exports = db;
