# Benchmarks

Scripts used to measure Talksy's performance. Run everything from `backend/`.

> ⚠️ These scripts write fake data into the database in `MONGODB_URI`.
> Each one prints the database name first, and the data scripts wait 5 seconds
> so you can cancel with Ctrl+C. Clean up afterwards using the steps below.

## 1. Query benchmark (pagination + indexes)

    node benchmarks/messages.seed.js               # seeds 20k messages, prints two IDs
    node benchmarks/query-bench.js <idA> <idB>     # read-only timing + explain
    node benchmarks/messages.seed.js --clean <idA> <idB>   # remove the seeded data

Compares fetching a whole conversation against the latest 50 messages, and
prints how many documents MongoDB examined. The seeded messages belong to
random user IDs, so they never show up in a real user's chat.

## 2. Load test (WebSocket connections + message delivery)

Start the backend, then:

    node benchmarks/loadtest.js
    PAIRS=50 node benchmarks/loadtest.js

It creates `loadtestN@test.com` users and their messages. Remove them afterwards
(in mongosh or Atlas):

    db.users.deleteMany({ email: /^loadtest/ })

then delete their messages (or `db.messages.deleteMany({})` if you have no real
chat data you want to keep).

## Results (my machine, MongoDB Atlas)

Query benchmark (median of 5 runs, 20k-message conversation):

| Metric | Before | After |
|---|---|---|
| Fetch latency | ~890 ms | ~34 ms |
| Documents scanned | 42,128 | 50 |

Load test (sockets are simulated users; half are active senders):

| Sockets | Total messages | Failures | Delivered | Throughput | p50 latency |
|---|---|---|---|---|---|
| 20 | 1,000 | 0 | 100% | 47 msg/s | 79 ms |
| 100 | 5,000 | 0 | 100% | 61 msg/s | 969 ms |
| 200 | 2,000 | 0 | 100% | 62 msg/s | 1,111 ms |
| 500 | 5,000 | 0 | 98.2% | 68 msg/s | 3,049 ms |

Notes: the load-test client runs on the same machine as the server, so latency
figures include client-side overhead and are indicative only. Run each
benchmark several times and report the median, since latency to Atlas varies.