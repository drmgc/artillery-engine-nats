const { connect, StringCodec } = require('nats');

(async () => {
  const conn = await connect({ servers: process.env.NATS_SERVER });

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

  const code = Math.floor(Math.random() * 1000).toString();

  async function handleGetCode(sub) {
    console.log(`listening for ${sub.getSubject()} requests...`);
    for await (const m of sub) {
      if (m.respond(sc.encode(JSON.stringify({ code })))) {
        console.info(`[time] handled #${sub.getProcessed()}`);
      } else {
        console.log(`[time] #${sub.getProcessed()} ignored - no reply subject`);
      }
    }
    console.log(`subscription ${sub.getSubject()} drained.`);
  }

  async function handleCode(sub) {
    console.log(`listening for ${sub.getSubject()} requests...`);
    for await (const m of sub) {
      if (m.respond(sc.encode("ok"))) {
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
    handleGetCode(conn.subscribe('get-code')),
    handleCode(conn.subscribe('code-' + code)),
  ]);
})();
