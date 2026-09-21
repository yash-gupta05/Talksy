import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const PAGE_SIZE = 50;
const MAX_PAGES_FOR_UNREAD = 20; // safety cap: at most 20 * 50 = 1000 messages

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isLoadingOlder: false,
  hasMoreMessages: true,
  unreadCounts: {}, // { userId: number } for the sidebar
  lastMessageAt: {}, // { userId: timestamp in ms }
  lastMessages: {}, // { userId: { text, hasImage, sentByMe, at } }
  unreadAtOpen: 0, // unread count when the chat was opened
  liveUnreadIds: [], // ids of messages that arrived in the open chat while unseen

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");

      const unreadCounts = {};
      const lastMessageAt = {};
      const lastMessages = {};
      res.data.forEach((u) => {
        unreadCounts[u._id] = u.unreadCount || 0;
        lastMessageAt[u._id] = u.lastMessageAt
          ? new Date(u.lastMessageAt).getTime()
          : 0;
        if (u.lastMessageAt) {
          lastMessages[u._id] = {
            text: u.lastMessageText || "",
            hasImage: !!u.lastMessageHasImage,
            sentByMe: !!u.lastMessageSentByMe,
            at: new Date(u.lastMessageAt).getTime(),
          };
        }
      });

      set({ users: res.data, unreadCounts, lastMessageAt, lastMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, hasMoreMessages: true, liveUnreadIds: [] });
    try {
      const unreadTarget = get().unreadAtOpen || 0;

      const res = await axiosInstance.get(`/messages/${userId}`);
      let all = res.data;
      let hasMore = res.data.length >= PAGE_SIZE;

      const countFromOther = (list) =>
        list.reduce((n, m) => (m.senderId === userId ? n + 1 : n), 0);

      let pages = 1;
      while (
        unreadTarget > 0 &&
        hasMore &&
        countFromOther(all) < unreadTarget &&
        pages < MAX_PAGES_FOR_UNREAD
      ) {
        const older = await axiosInstance.get(`/messages/${userId}`, {
          params: { before: all[0].createdAt },
        });

        if (get().selectedUser?._id !== userId) return;

        all = [...older.data, ...all];
        hasMore = older.data.length >= PAGE_SIZE;
        pages++;
      }

      if (get().selectedUser?._id !== userId) return;

      set({ messages: all, hasMoreMessages: hasMore });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  loadOlderMessages: async () => {
    const { messages, selectedUser, isLoadingOlder, hasMoreMessages } = get();
    if (!selectedUser || isLoadingOlder || !hasMoreMessages || messages.length === 0) {
      return;
    }

    set({ isLoadingOlder: true });
    try {
      const oldest = messages[0].createdAt;
      const res = await axiosInstance.get(`/messages/${selectedUser._id}`, {
        params: { before: oldest },
      });

      if (get().selectedUser?._id !== selectedUser._id) return;

      set({
        messages: [...res.data, ...get().messages],
        hasMoreMessages: res.data.length >= PAGE_SIZE,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load older messages"
      );
    } finally {
      set({ isLoadingOlder: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, lastMessageAt, lastMessages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      const at = new Date(res.data.createdAt).getTime();
      set({
        messages: [...messages, res.data],
        lastMessageAt: { ...lastMessageAt, [selectedUser._id]: at },
        lastMessages: {
          ...lastMessages,
          [selectedUser._id]: {
            text: res.data.text || "",
            hasImage: !!res.data.image,
            sentByMe: true,
            at,
          },
        },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // Called by ChatContainer when the user has actually seen the latest messages
  // (scrolled to the bottom with the tab visible).
  markCurrentChatRead: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    axiosInstance.put(`/messages/read/${selectedUser._id}`).catch(() => {});
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const {
        selectedUser,
        messages,
        unreadCounts,
        lastMessageAt,
        lastMessages,
        liveUnreadIds,
      } = get();
      const senderId = newMessage.senderId;
      const isOpenChat = selectedUser?._id === senderId;
      const at = new Date(newMessage.createdAt).getTime();

      set({
        lastMessageAt: { ...lastMessageAt, [senderId]: at },
        lastMessages: {
          ...lastMessages,
          [senderId]: {
            text: newMessage.text || "",
            hasImage: !!newMessage.image,
            sentByMe: false,
            at,
          },
        },
        ...(isOpenChat
          ? {
              // Append to the open chat. Whether it counts as unread is decided
              // by ChatContainer, which knows the scroll position.
              messages: [...messages, newMessage],
            }
          : {
              unreadCounts: {
                ...unreadCounts,
                [senderId]: (unreadCounts[senderId] || 0) + 1,
              },
            }),
      });
    });
  },

  // Lets ChatContainer record that a live message arrived while unseen
  addLiveUnread: (messageId) => {
    set({ liveUnreadIds: [...get().liveUnreadIds, messageId] });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => {
    const { unreadCounts } = get();

    // Remember how many were unread BEFORE we clear the badge
    const unreadAtOpen = selectedUser ? unreadCounts[selectedUser._id] || 0 : 0;

    set({
      selectedUser,
      unreadAtOpen,
      liveUnreadIds: [],
      unreadCounts: selectedUser
        ? { ...unreadCounts, [selectedUser._id]: 0 }
        : unreadCounts,
    });

    // Note: we no longer mark as read here. ChatContainer does it once the
    // user has actually seen the latest messages.
  },
}));