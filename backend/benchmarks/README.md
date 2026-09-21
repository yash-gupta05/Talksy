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

| Metric | Before | After |
|---|---|---|
| Fetch latency, 20k-message chat | 1,151 ms | 36 ms |
| Documents scanned | 42,128 | 50 |

Load test: 100 concurrent WebSocket connections, 1,000 messages, 0 failures,
100% delivery.

Notes: the load-test client runs on the same machine as the server, so latency
figures include client-side overhead and are indicative only.