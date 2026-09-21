# ✨ Talksy ✨

A full-stack real-time chat application built with React, Express, Socket.io, and MongoDB, featuring JWT authentication, live messaging, unread tracking, and an efficient paginated message API.

[Live Demo](https://talksy-z6ya.onrender.com) (hosted on Render's free tier, so the first load after inactivity can take up to a minute)

## 🚀 Highlights

- 🎃 **Authentication & authorization** with JWT (HTTP-only cookie) and bcrypt password hashing
- 👾 **Real-time messaging** over Socket.io, with text and image messages (Cloudinary)
- 🟢 **Online presence** tracking
- 📬 **Unread tracking**: per-chat unread badges that persist across refreshes, plus an "N unread messages" divider inside the chat
- 🕒 **Recency-sorted conversation list** with last-message preview and timestamp, computed in a single MongoDB aggregation
- 🔎 **Contact search** and an online-only filter
- 📜 **Cursor-based pagination**: loads the latest 50 messages and fetches older ones as you scroll up, preserving scroll position
- ⬇️ **Smart scrolling**: new messages don't pull you to the bottom while you're reading history, and a jump-to-bottom button shows how many arrived
- 🎨 **32 themes** (daisyUI) with a live preview of the real chat layout
- 🧠 **Global state management** with Zustand
- 🐞 **Error handling** on both server and client
- ⭐ **Deployed on Render**

## ⚡ Performance

All numbers were measured on my local machine against MongoDB Atlas. Scripts to reproduce them are in [`backend/benchmarks`](backend/benchmarks).

### Message fetch: pagination + indexes

| Metric | Before | After |
|---|---|---|
| Fetch latency, 20k-message conversation (median of 5 runs) | ~890 ms | ~34 ms (≈26x faster) |
| Documents scanned per fetch | 42,128 | 50 |

### Load test: WebSocket connections and message delivery

Each socket is a simulated user. Users are paired, and one user in each pair sends messages to the other, so half the sockets are active senders.

| Sockets | Total messages | Failures | Delivered | Throughput | p50 latency |
|---|---|---|---|---|---|
| 20 | 1,000 | 0 | 100% | 47 msg/s | 79 ms |
| 100 | 5,000 | 0 | 100% | 61 msg/s | 969 ms |
| 200 | 2,000 | 0 | 100% | 62 msg/s | 1,111 ms |
| 500 | 5,000 | 0 | 98.2% (483/500 connected) | 68 msg/s | 3,049 ms |

**Reading the results:** throughput saturates at roughly 60-70 msg/s on a single Node process, so latency at higher connection counts is queueing rather than slow requests (a single request costs about 70 ms of server work, matching the 79 ms median at 20 sockets). Delivery is reliable up to 200 connections and starts to degrade at 500. The test client runs on the same machine as the server, so figures are indicative rather than absolute.

## 🖼 Screenshots

### Signup Page
<img width="1907" height="982" alt="Signup Page" src="https://github.com/user-attachments/assets/488e7065-c518-45ae-8267-0309e062bb45" />

### Home Page
<img width="1907" height="982" alt="Signup Page" src="https://github.com/user-attachments/assets/6344ea07-fc58-4882-b648-52dea8da006a" />

### Profile Page
<img width="1907" height="982" alt="Profile Page" src="https://github.com/user-attachments/assets/6542e1d6-b89f-4fde-94ec-373c08729d7b" />

### Settings Page
<img width="1907" height="982" alt="Settings Page" src="https://github.com/user-attachments/assets/62682dbe-801f-4cbf-a366-6d68b0b632d5" />


## 🛠 Tech Stack

- **Frontend:** React, Zustand, Tailwind CSS, daisyUI, Vite
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** MongoDB (Mongoose)
- **Other:** JWT, bcrypt (bcryptjs), Cloudinary

## 🏗 How it works

- **Messaging:** messages are sent through a REST endpoint (`POST /api/messages/send/:id`), saved to MongoDB, then pushed to the receiver over Socket.io if they're online.
- **Sidebar:** `GET /api/messages/users` returns every contact with `lastMessageAt`, a last-message preview, and `unreadCount`, computed with one aggregation instead of a query per user.
- **Unread state:** messages carry an `isRead` flag. A chat's messages are marked read (`PUT /api/messages/read/:id`) only once you've actually seen them, meaning you're at the bottom of the chat with the tab visible.
- **Pagination:** `GET /api/messages/:id?before=<timestamp>&limit=50` returns one page, and the client prepends older pages as you scroll up.

## ⚙️ Setup

### 1. Environment variables

Create `backend/.env`:

```
MONGODB_URI=...
PORT=5001
JWT_SECRET=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

NODE_ENV=development
```

### 2. Run in development

```
cd backend
npm install
npm run dev
```

In a second terminal:

```
cd frontend
npm install
npm run dev
```

### 3. Build and run for production

```
npm run build
npm start
```

## 🌱 Optional: seed demo users

```
cd backend
node src/seeds/user.seed.js
```

Creates 15 demo accounts (password: `123456`). Safe to run more than once: existing demo accounts are reset to the seed values.

## 📊 Optional: run the benchmarks

See [`backend/benchmarks/README.md`](backend/benchmarks/README.md). These scripts write fake data to the database in `MONGODB_URI`, so read the warnings there before running them.
