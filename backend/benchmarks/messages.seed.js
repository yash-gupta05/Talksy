/**
 * BENCHMARK DATA: inserts 20,000 fake messages between two random user IDs.
 *
 * WARNING: this WRITES a large amount of fake data into the database in
 * MONGODB_URI (your real one).
 *  - The two "users" are random ObjectIds, not real accounts, so the messages
 *    never appear in a real user's chat.
 *  - They DO count toward collection size, so remove them when you're done:
 *      node benchmarks/messages.seed.js --clean <userA_id> <userB_id>
 *
 * Usage (from backend/):
 *   node benchmarks/messages.seed.js                      # seed, prints two IDs
 *   node benchmarks/messages.seed.js --clean <idA> <idB>  # delete that seeded data
 */
import mongoose from "mongoose";
import Message from "../src/models/message.model.js";
import { connectForBenchmark } from "./_guard.js";

const COUNT = 20000;
const args = process.argv.slice(2);

const run = async () => {
  await connectForBenchmark({ writes: true });

  // Clean mode: delete messages between the two given IDs
  if (args[0] === "--clean") {
    const [, idA, idB] = args;
    if (!idA || !idB) {
      console.error("Usage: node benchmarks/messages.seed.js --clean <idA> <idB>");
      process.exit(1);
    }
    const A = new mongoose.Types.ObjectId(idA);
    const B = new mongoose.Types.ObjectId(idB);
    const r = await Message.deleteMany({
      $or: [
        { senderId: A, receiverId: B },
        { senderId: B, receiverId: A },
      ],
    });
    console.log(`Deleted ${r.deletedCount} messages.`);
    return;
  }

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  const docs = Array.from({ length: COUNT }, (_, i) => ({
    senderId: i % 2 ? userA : userB,
    receiverId: i % 2 ? userB : userA,
    text: `message ${i}`,
    isRead: true,
    createdAt: new Date(Date.now() - i * 1000),
  }));

  await Message.insertMany(docs);
  console.log(`Seeded ${COUNT} messages.`);
  console.log("userA:", userA.toString());
  console.log("userB:", userB.toString());
  console.log(
    `Clean up later with: node benchmarks/messages.seed.js --clean ${userA} ${userB}`
  );
};

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());