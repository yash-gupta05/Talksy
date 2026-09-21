import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const NEAR_BOTTOM_PX = 120;
const LOAD_OLDER_TRIGGER_PX = 80;

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    loadOlderMessages,
    isLoadingOlder,
    hasMoreMessages,
    unreadAtOpen,
    liveUnreadIds,
    addLiveUnread,
    markCurrentChatRead,
  } = useChatStore();
  const { authUser } = useAuthStore();

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const dividerRef = useRef(null);

  const isNearBottomRef = useRef(true);
  const prevLastIdRef = useRef(null);
  const prevFirstIdRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const justOpenedRef = useRef(true);

  const [showJumpButton, setShowJumpButton] = useState(false);
  const [newWhileAway, setNewWhileAway] = useState(0);

  // Frozen for this visit: unread count when the chat was opened
  const [unreadForVisit, setUnreadForVisit] = useState(unreadAtOpen);

  // Whether the tab is currently visible
  const isTabVisible = () => document.visibilityState === "visible";

  useEffect(() => {
    justOpenedRef.current = true;
    prevLastIdRef.current = null;
    prevFirstIdRef.current = null;
    isNearBottomRef.current = true;
    setShowJumpButton(false);
    setNewWhileAway(0);
    setUnreadForVisit(useChatStore.getState().unreadAtOpen);
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  // First unread message id. Two sources:
  //  1) messages unread when the chat was opened (Nth-from-last from the other person)
  //  2) messages that arrived live while the user wasn't looking (liveUnreadIds)
  const firstUnreadId = useMemo(() => {
    // Earliest wins: opened-unread comes before any live unread
    if (unreadForVisit > 0) {
      let remaining = unreadForVisit;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].senderId === selectedUser._id) {
          remaining--;
          if (remaining === 0) return messages[i]._id;
        }
      }
    }
    return liveUnreadIds.length > 0 ? liveUnreadIds[0] : null;
  }, [messages, unreadForVisit, liveUnreadIds, selectedUser._id]);

  // Total number shown on the divider
  const dividerCount = useMemo(() => {
    if (!firstUnreadId) return 0;
    const idx = messages.findIndex((m) => m._id === firstUnreadId);
    if (idx === -1) return 0;
    return messages
      .slice(idx)
      .filter((m) => m.senderId === selectedUser._id).length;
  }, [messages, firstUnreadId, selectedUser._id]);

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Mark read on the server if the user is really looking at the bottom
  const markReadIfSeen = () => {
    if (isNearBottomRef.current && isTabVisible()) {
      markCurrentChatRead();
    }
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;

    const first = messages[0];
    const last = messages[messages.length - 1];

    // 1) Chat just opened: go to the unread divider if there is one, else bottom
    if (justOpenedRef.current) {
      if (dividerRef.current) {
        dividerRef.current.scrollIntoView({ block: "start", behavior: "auto" });
        isNearBottomRef.current = false;
        setShowJumpButton(true);
      } else {
        scrollToBottom("auto");
        markReadIfSeen();
      }
      justOpenedRef.current = false;
      prevFirstIdRef.current = first._id;
      prevLastIdRef.current = last._id;
      return;
    }

    // 2) Older messages were prepended: keep the reading position
    if (first._id !== prevFirstIdRef.current && last._id === prevLastIdRef.current) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current + el.scrollTop;
      prevFirstIdRef.current = first._id;
      return;
    }

    // 3) A new message was appended at the bottom
    if (last._id !== prevLastIdRef.current) {
      const sentByMe = last.senderId === authUser._id;

      if (sentByMe) {
        scrollToBottom("smooth");
        setNewWhileAway(0);
        setShowJumpButton(false);
      } else if (isNearBottomRef.current && isTabVisible()) {
        // User is looking at the bottom: it's seen immediately
        scrollToBottom("smooth");
        setNewWhileAway(0);
        setShowJumpButton(false);
        markCurrentChatRead();
      } else {
        // Not seen: keep the view where it is, show the arrow, count it unread
        setNewWhileAway((n) => n + 1);
        setShowJumpButton(true);
        addLiveUnread(last._id);

        // If the user is at the bottom but the tab is hidden, still scroll so the
        // message is in view when they return
        if (isNearBottomRef.current) scrollToBottom("auto");
      }
      prevLastIdRef.current = last._id;
    }

    prevFirstIdRef.current = first._id;
  }, [messages, authUser._id]);

  // When the tab becomes visible again while at the bottom, mark as read
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") markReadIfSeen();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setShowJumpButton(false);
      setNewWhileAway(0);
      markReadIfSeen();
    } else if (distanceFromBottom > 300) {
      setShowJumpButton(true);
    }

    if (el.scrollTop < LOAD_OLDER_TRIGGER_PX && hasMoreMessages && !isLoadingOlder) {
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages();
    }
  };

  const handleJumpToBottom = () => {
    scrollToBottom("smooth");
    setShowJumpButton(false);
    setNewWhileAway(0);
    isNearBottomRef.current = true;
    markReadIfSeen();
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4 space-y-4"
        >
          {isLoadingOlder && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-5 animate-spin text-zinc-400" />
            </div>
          )}

          {!hasMoreMessages && messages.length > 0 && (
            <p className="text-center text-xs text-zinc-500 py-2">
              Start of conversation
            </p>
          )}

          {messages.map((message) => (
            <div key={message._id} className="space-y-4">
              {/* Unread divider */}
              {message._id === firstUnreadId && dividerCount > 0 && (
                <div ref={dividerRef} className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-primary/40" />
                  <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {dividerCount} unread message{dividerCount > 1 ? "s" : ""}
                  </span>
                  <div className="flex-1 h-px bg-primary/40" />
                </div>
              )}

              <div
                className={`chat ${
                  message.senderId === authUser._id ? "chat-end" : "chat-start"
                }`}
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={
                        message.senderId === authUser._id
                          ? authUser.profilePic || "/avatar.png"
                          : selectedUser.profilePic || "/avatar.png"
                      }
                      alt="profile pic"
                    />
                  </div>
                </div>
                <div className="chat-header mb-1">
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
                <div className="chat-bubble flex flex-col">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {showJumpButton && (
          <button
            onClick={handleJumpToBottom}
            className="absolute bottom-4 right-6 btn btn-circle btn-primary shadow-lg"
            aria-label="Scroll to latest messages"
          >
            <ChevronDown className="size-5" />
            {newWhileAway > 0 && (
              <span className="absolute -top-2 -right-1 badge badge-secondary badge-sm">
                {newWhileAway}
              </span>
            )}
          </button>
        )}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;