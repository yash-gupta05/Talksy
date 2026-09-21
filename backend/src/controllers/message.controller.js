import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .lean();

    const stats = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"],
          },
          isUnreadForMe: {
            $and: [
              { $eq: ["$receiverId", loggedInUserId] },
              { $eq: ["$isRead", false] },
            ],
          },
          sentByMe: { $eq: ["$senderId", loggedInUserId] },
        },
      },
      // newest first, so $first in the group below is the latest message
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$otherUser",
          lastMessageAt: { $first: "$createdAt" },
          lastMessageText: { $first: "$text" },
          lastMessageHasImage: { $first: { $cond: [{ $ifNull: ["$image", false] }, true, false] } },
          lastMessageSentByMe: { $first: "$sentByMe" },
          unreadCount: { $sum: { $cond: ["$isUnreadForMe", 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map(stats.map((s) => [s._id.toString(), s]));

    const result = users.map((u) => {
      const s = statsMap.get(u._id.toString());
      return {
        ...u,
        lastMessageAt: s ? s.lastMessageAt : null,
        lastMessageText: s ? s.lastMessageText || "" : "",
        lastMessageHasImage: s ? s.lastMessageHasImage : false,
        lastMessageSentByMe: s ? s.lastMessageSentByMe : false,
        unreadCount: s ? s.unreadCount : 0,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const filter = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };
    if (req.query.before) {
      filter.createdAt = { $lt: new Date(req.query.before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    const result = await Message.updateMany(
      { senderId: otherUserId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ updated: result.modifiedCount });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};