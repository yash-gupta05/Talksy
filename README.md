<img width="1907" height="982" alt="image" src="https://github.com/user-attachments/assets/a198002d-b817-4d73-84ab-aed426bf3fb2" /># ✨ Talksy ✨

A full-stack real-time chat application built with React, Express, Socket.io, and MongoDB, featuring JWT authentication, live messaging, unread tracking, and an efficient paginated message API.

[Live Demo](https://talksy-z6ya.onrender.com)

## 🚀 Highlights

- 🎃 **Authentication & authorization** with JWT (HTTP-only cookie) and bcrypt password hashing
- 👾 **Real-time messaging** over Socket.io, with text and image messages (Cloudinary)
- 🟢 **Online presence** tracking
- 📬 **Unread tracking**: per-chat unread badges that persist across refreshes, plus an "N unread messages" divider inside the chat
- 🕒 **Recency-sorted conversation list** with last-message preview and timestamp, computed in a single MongoDB aggregation
- 🔎 **Contact search** and an online-only filter
- 📜 **Cursor-based pagination**: loads the latest 50 messages and fetches older ones as you scroll up, with scroll-position preservation
- ⬇️ **Smart scrolling**: new messages don't yank you to the bottom while you're reading history; a jump-to-bottom button shows how many arrived
- 🧠 **Global state management** with Zustand
- 🐞 **Error handling** on both server and client
- ⭐ **Deployed on Render**

## ⚡ Performance

Measured on my machine against MongoDB Atlas. Scripts to reproduce these are in [`backend/benchmarks`](backend/benchmarks).

| Metric | Before | After |
|---|---|---|
| Fetch latency, 20k-message conversation | 1,151 ms | 36 ms |
| Documents scanned per fetch | 42,128 | 50 |

**What changed:** replaced an unbounded `find()` with cursor-based pagination (`createdAt < before`, sorted, limited) and added compound indexes on `(senderId, receiverId, createdAt)` and `(receiverId, senderId, createdAt)`, one per branch of the query's `$or`.

**Load test:** 100 concurrent WebSocket connections and 1,000 messages, with 0 failures and 100% delivery. The test client shares a machine with the server, so latency figures are indicative rather than absolute.

## 🖼 Screenshots

### Signup Page
<img width="800" height="600" alt="Signup Page" src="https://github.com/user-attachments/assets/488e7065-c518-45ae-8267-0309e062bb45" />

### Home Page
<img width="800" height="600" alt="Home Page" src="https://github.com/user-attachments/assets/e3ffca12-7d1e-4b56-9a5c-972debba5491" />

### Profile Page
<img width="800" height="600" alt="Profile Page" src="https://github.com/user-attachments/assets/6542e1d6-b89f-4fde-94ec-373c08729d7b" />

### Settings Page
<img width="800" height="600" alt="Settings Page" src="https://github.com/user-attachments/assets/c0b60b30-396b-4b06-8f41-707773e75844" />

## 🛠 Tech Stack

- **Frontend:** React, Zustand, Tailwind CSS, DaisyUI, Vite
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** MongoDB (Mongoose)
- **Other:** JWT, bcrypt, Cloudinary

## 🏗 How it works

- **Messaging:** messages are sent through a REST endpoint (`POST /api/messages/send/:id`), saved to MongoDB, then pushed to the receiver over Socket.io if they're online.
- **Sidebar:** `GET /api/messages/users` returns every contact with `lastMessageAt`, last-message preview, and `unreadCount`, computed with one aggregation rather than a query per user.
- **Unread state:** messages have an `isRead` flag. A chat's messages are marked read (`PUT /api/messages/read/:id`) only when you've actually seen them, meaning you're at the bottom with the tab visible.
- **Pagination:** `GET /api/messages/:id?before=<timestamp>&limit=50` returns one page. The client prepends older pages as you scroll up.

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

Creates 15 demo accounts (password: `123456`). Safe to run more than once.

## 📊 Optional: run the benchmarks

See [`backend/benchmarks/README.md`](backend/benchmarks/README.md). These scripts write fake data to the database in `MONGODB_URI`, so read the warnings there before running them.
