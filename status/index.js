const { Kafka, logLevel } = require('kafkajs')
const kafka = new Kafka({
  logLevel: logLevel.INFO,
  brokers: [`kafka:9092`],
  clientId: 'status-consumer-a',
})

const subTopic = 'postgres.public.events'
const consumer = kafka.consumer({ groupId: 'status-group' })


const Redis = require("ioredis");

const redis = new Redis({
  host: "cache",
  port: 6379,
});

async function ProcessStatus(tid, status, time) {
  console.log(`Processing status ${status}`);
  await redis.hset(`STATUS:${tid}`, time, status);
  await redis.hset(`STATUS:${tid}`, `$LATEST`, status);
}

const run = async () => {
  await consumer.connect()
  await consumer.subscribe({ topic: subTopic, fromBeginning: true })
  await consumer.run({

    eachMessage: async ({ topic, partition, message }) => {
      const prefix = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`;
      console.log(prefix);
      // console.log(`${message.value}`)
      const event = JSON.parse(message.value);
      const data = event?.payload?.after;
      if(data){
        await ProcessStatus(data.entityId, data.eventType, data.eventId);
      }
    },
  })
}

console.log("Status service ...");

run().catch(e => console.error(`[example/consumer] ${e.message}`, e));