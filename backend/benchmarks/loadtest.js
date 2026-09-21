/**
 * BENCHMARK: load test for WebSocket connections and message delivery.
 *
 * WARNING: this WRITES to whatever database the RUNNING SERVER is connected to.
 *  - It creates N*2 fake users (loadtestN@test.com) and N*20 messages.
 *  - Start the server against a separate database (set MONGODB_URI to your bench
 *    DB for that run) to keep real data clean.
 *  - By default it deletes nothing; see the README for cleanup queries.
 *
 * Usage (from backend/, with the server already running):
 *   node benchmarks/loadtest.js
 *   PAIRS=50 BASE_URL=http://localhost:5001 node benchmarks/loadtest.js
 *
 * Reports: connected sockets, delivered messages, throughput, and
 * send-to-receive latency percentiles.
 *
 * Note: the client and server share one machine, so latency here includes the
 * test client's own event loop. Treat numbers as indicative, not absolute.
 */
import http from "http";
import { io } from "socket.io-client";
import axios from "axios";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run the load test when NODE_ENV=production.");
  process.exit(1);
}

const BASE = process.env.BASE_URL || "http://localhost:5001";
const N = parseInt(process.env.PAIRS || "25", 10); // user pairs; sockets = N * 2
const MSGS_PER_PAIR = parseInt(process.env.MSGS_PER_PAIR || "20", 10);

if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  console.error(
    `Refusing to load-test a non-local server (${BASE}). ` +
      "Set BASE_URL to localhost, or edit this check if you are sure."
  );
  process.exit(1);
}

const agent = new http.Agent({ keepAlive: true, maxSockets: 200 });

async function makeUser(i) {
  const email = `loadtest${i}@test.com`;
  const body = { fullName: `Load ${i}`, email, password: "password123" };
  let res;
  try {
    res = await axios.post(`${BASE}/api/auth/signup`, body, { httpAgent: agent });
  } catch (e) {
    try {
      res = await axios.post(
        `${BASE}/api/auth/login`,
        { email, password: body.password },
        { httpAgent: agent }
      );
    } catch (e2) {
      console.error(
        `Signup and login both failed for ${email}:`,
        e2.response?.status,
        e2.response?.data || e2.message
      );
      process.exit(1);
    }
  }
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { id: res.data._id, cookie };
}

const users = [];
for (let i = 0; i < N * 2; i++) users.push(await makeUser(i));
console.log(`Created/logged in ${users.length} users`);

const latencies = [];
let delivered = 0;
const sendTimes = new Map();
const early = new Map(); // socket events that arrive before the HTTP response

const sockets = users.map((u) => {
  const s = io(BASE, { query: { userId: u.id } });
  s.on("newMessage", (msg) => {
    const t = sendTimes.get(msg._id);
    if (t) {
      latencies.push(Date.now() - t);
      delivered++;
    } else {
      early.set(msg._id, Date.now());
    }
  });
  return s;
});

await new Promise((r) => setTimeout(r, 3000));
console.log(
  `Connected sockets: ${sockets.filter((s) => s.connected).length}/${users.length}`
);

let sent = 0;
let failed = 0;
const start = Date.now();

await Promise.all(
  Array.from({ length: N }, async (_, k) => {
    const sender = users[2 * k];
    const receiver = users[2 * k + 1];
    for (let m = 0; m < MSGS_PER_PAIR; m++) {
      const t0 = Date.now();
      try {
        const res = await axios.post(
          `${BASE}/api/messages/send/${receiver.id}`,
          { text: `hello ${m}` },
          { headers: { Cookie: sender.cookie }, httpAgent: agent }
        );
        const id = res.data._id;
        if (early.has(id)) {
          latencies.push(early.get(id) - t0);
          delivered++;
          early.delete(id);
        } else {
          sendTimes.set(id, t0);
        }
        sent++;
      } catch {
        failed++;
      }
    }
  })
);

await new Promise((r) => setTimeout(r, 2000));
const elapsed = (Date.now() - start) / 1000;

latencies.sort((a, b) => a - b);
const pct = (p) => latencies[Math.floor(latencies.length * p)] ?? "n/a";

console.log("---- RESULTS ----");
console.log(`Concurrent sockets: ${users.length}`);
console.log(
  `Messages sent: ${sent}, failed: ${failed}, delivered via socket: ${delivered}`
);
console.log(`Throughput: ${(sent / elapsed).toFixed(1)} msg/s`);
console.log(
  `Delivery latency (send→receive): p50=${pct(0.5)}ms p95=${pct(0.95)}ms p99=${pct(0.99)}ms`
);

sockets.forEach((s) => s.close());
process.exit();