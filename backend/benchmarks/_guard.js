/**
 * Shared safety checks for benchmark scripts.
 *
 * Benchmarks WRITE large amounts of fake data into the database in MONGODB_URI,
 * so this guard makes that visible and gives you a moment to cancel.
 *
 *  - Refuses to run when NODE_ENV=production.
 *  - Prints which database it is connected to.
 *  - For scripts that write, waits 5 seconds so you can cancel with Ctrl+C.
 */
import { config } from "dotenv";
import mongoose from "mongoose";

config();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connectForBenchmark({ writes = true } = {}) {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run benchmarks when NODE_ENV=production.");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const { host, name } = mongoose.connection;
  console.log(`Connected to database "${name}" on ${host}`);

  if (writes) {
    console.warn(
      `\n⚠️  This script will WRITE FAKE DATA into "${name}".\n` +
        "   Press Ctrl+C within 5 seconds to cancel.\n" +
        "   You can remove it afterwards with the --clean option.\n"
    );
    await sleep(5000);
  }

  return mongoose.connection;
}