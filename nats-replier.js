const { connect, StringCodec } = require('nats');

(async () => {
  const conn = await connect({ servers: process.env.NATS_SERVER });

  // console.log(conn);

  const sc = new StringCodec();

  async function handleTime(sub) {
    console.log(`listening for ${sub.getSubject()} requests...`);
    for await (const m of sub) {
      if (m.respond(sc.encode(new Date().toISOString()))) {
        console.info(`[time] handled #${sub.getProcessed()}`);
      } else {
        console.log(`[time] #${sub.getProcessed()} ignored - no reply subject`);
      }
    }
    console.log(`subscription ${sub.getSubject()} drained.`);
  }

  async function handlePing(sub) {
    console.log(`listening for ${sub.getSubject()} requests...`);
    for await (const m of sub) {
      if (m.respond(sc.encode("pong"))) {
        console.info(`[time] handled #${sub.getProcessed()}`);
      } else {
        console.log(`[time] #${sub.getProcessed()} ignored - no reply subject`);
      }
    }
    console.log(`subscription ${sub.getSubject()} drained.`);
  }

  await Promise.all([
    handlePing(conn.subscribe('ping')),
    handleTime(conn.subscribe('time')),
  ]);
})();
