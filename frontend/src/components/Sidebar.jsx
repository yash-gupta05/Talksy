import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Search, X } from "lucide-react";

// "10:42 AM" today, "Yesterday", weekday within a week, otherwise a date
const formatSidebarTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;

  if (date >= startOfToday) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (date >= new Date(startOfToday.getTime() - dayMs)) return "Yesterday";
  if (date >= new Date(startOfToday.getTime() - 6 * dayMs)) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const getPreview = (last) => {
  if (!last) return null;
  const prefix = last.sentByMe ? "You: " : "";
  if (last.text) return prefix + last.text;
  if (last.hasImage) return prefix + "📷 Photo";
  return null;
};

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    unreadCounts,
    lastMessageAt,
    lastMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { onlineUsers, socket } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Global message listener: stays active while the sidebar is mounted
  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  // Most recent conversation first
  const sortedUsers = [...users].sort(
    (a, b) => (lastMessageAt[b._id] || 0) - (lastMessageAt[a._id] || 0)
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredUsers = sortedUsers
    .filter((user) => !showOnlineOnly || onlineUsers.includes(user._id))
    .filter((user) => !query || user.fullName.toLowerCase().includes(query));

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* Search bar (large screens) */}
        <div className="mt-3 hidden lg:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="input input-bordered input-sm w-full pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-base-content"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => {
          const last = lastMessages[user._id];
          const preview = getPreview(last);
          const unread = unreadCounts[user._id] || 0;
          const isOnline = onlineUsers.includes(user._id);

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0 shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {isOnline && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
                {/* Unread dot for the collapsed (mobile) sidebar */}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 size-3 bg-primary rounded-full lg:hidden" />
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:flex flex-col flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{user.fullName}</span>
                  {last && (
                    <span
                      className={`text-xs shrink-0 ${
                        unread > 0 ? "text-primary font-medium" : "text-zinc-400"
                      }`}
                    >
                      {formatSidebarTime(last.at)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm truncate ${
                      unread > 0 ? "text-base-content font-medium" : "text-zinc-400"
                    }`}
                  >
                    {preview ?? (isOnline ? "Online" : "Offline")}
                  </span>
                  {unread > 0 && (
                    <span className="badge badge-primary badge-sm shrink-0">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4 px-3 text-sm">
            {query
              ? `No contacts match "${searchQuery.trim()}"`
              : showOnlineOnly
              ? "No online users"
              : "No contacts yet"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;