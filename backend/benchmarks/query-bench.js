/**
 * BENCHMARK: compares fetching a whole conversation vs. the latest 50 messages.
 *
 * READ-ONLY: this script does not modify data. Run messages.seed.js first.
 *
 * Usage (from backend/):
 *   node benchmarks/query-bench.js <userA_id> <userB_id>
 *
 * To reproduce the "before indexes" numbers, drop the indexes on the messages
 * collection, run this, then rebuild them (restart the server) and run it again.
 */
import mongoose from "mongoose";
import Message from "../src/models/message.model.js";
import { connectForBenchmark } from "./_guard.js";

const [idA, idB] = process.argv.slice(2);
if (!idA || !idB) {
  console.error("Usage: node benchmarks/query-bench.js <userA_id> <userB_id>");
  process.exit(1);
}

const A = new mongoose.Types.ObjectId(idA);
const B = new mongoose.Types.ObjectId(idB);
const filter = {
  $or: [
    { senderId: A, receiverId: B },
    { senderId: B, receiverId: A },
  ],
};

async function time(label, fn, runs = 10) {
  await fn(); // warm-up
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t0 = Date.now();
    await fn();
    times.push(Date.now() - t0);
  }
  times.sort((a, b) => a - b);
  console.log(
    `${label}: median ${times[Math.floor(runs / 2)]} ms, max ${times[runs - 1]} ms`
  );
}

const run = async () => {
  await connectForBenchmark({ writes: false });

  await time("OLD  (all messages)", () => Message.find(filter).lean());
  await time("NEW  (latest 50, sorted)", () =>
    Message.find(filter).sort({ createdAt: -1 }).limit(50).lean()
  );

  const explain = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .explain("executionStats");
  console.log("docsExamined:", explain.executionStats.totalDocsExamined);
  console.log("returned:", explain.executionStats.nReturned);
};

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());