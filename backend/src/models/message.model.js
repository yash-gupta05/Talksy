import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Conversation fetch (getMessages), one index per $or branch
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

// Unread counts for the sidebar
messageSchema.index({ receiverId: 1, isRead: 1, senderId: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;